"""Data orchestration service: caching, provider routing, multi-asset date alignment, and audit."""

import asyncio
from datetime import date, datetime
import logging
import pandas as pd

from src.config import settings
from src.data.base_provider import MarketDataProvider
from src.data.cache_manager import CacheManager
from src.data.psx_dps_provider import PsxDpsProvider
from src.data.stock_universe import get_market_assets
from src.data.yfinance_provider import YFinanceProvider
from src.domain.exceptions import (
    InsufficientDataError,
    SymbolNotFoundError,
    UnsupportedMarketError,
)
from src.domain.models import Asset, DataQualityReport, MarketType

logger = logging.getLogger(__name__)


class DataService:
    """Orchestrates market data fetching, caching, multi-asset alignment, and data quality reporting."""

    def __init__(
        self,
        cache_manager: CacheManager | None = None,
        providers: dict[MarketType, MarketDataProvider] | None = None,
    ):
        self.cache = cache_manager or CacheManager()
        self.providers = providers or {
            MarketType.INTERNATIONAL: YFinanceProvider(),
            MarketType.PSX: PsxDpsProvider(),
        }

    def get_provider(self, market: MarketType) -> MarketDataProvider:
        """Get the active provider for the given market."""
        if market not in self.providers:
            raise UnsupportedMarketError(f"No provider configured for market '{market}'")
        return self.providers[market]

    def get_available_assets(self, market: MarketType) -> dict[str, Asset]:
        """Return the dictionary of configured assets for a market."""
        return get_market_assets(market)

    async def fetch_aligned_prices(
        self,
        market: MarketType,
        symbols: list[str],
        start_date: str | date | datetime | None = None,
        end_date: str | date | datetime | None = None,
        period: str = "2y",
        use_adj_close: bool = True,
        min_observations: int = 10,
    ) -> tuple[pd.DataFrame, DataQualityReport]:
        """Alias for get_aligned_prices matching parameter ordering."""
        price_field = "adj_close" if use_adj_close else "close"
        return await self.get_aligned_prices(
            symbols=symbols,
            market=market,
            start_date=start_date,
            end_date=end_date,
            price_field=price_field,
        )

    async def get_single_asset_data(
        self,
        symbol: str,
        market: MarketType,
        start_date: str | date | datetime | None = None,
        end_date: str | date | datetime | None = None,
    ) -> pd.DataFrame:
        """Retrieve historical OHLCV data for a single asset with caching."""
        universe = get_market_assets(market)
        clean_symbol = symbol.upper().strip()

        # If symbol in preconfigured universe, use configured Asset entity
        if clean_symbol in universe:
            asset = universe[clean_symbol]
        else:
            # Dynamically resolve asset
            asset = Asset(
                symbol=clean_symbol,
                name=clean_symbol,
                sector="Unknown",
                exchange="PSX" if market == MarketType.PSX else "US",
                currency="PKR" if market == MarketType.PSX else "USD",
                provider_symbol=clean_symbol,
                market=market,
            )

        start_str = str(start_date) if start_date else "default"
        end_str = str(end_date) if end_date else "default"
        cache_key = f"{market.value}_{clean_symbol}_{start_str}_{end_str}"

        # 1. Try cache
        cached_df = self.cache.get(cache_key)
        if cached_df is not None and not cached_df.empty:
            logger.debug("Cache hit for %s", cache_key)
            return cached_df

        # 2. Fetch from provider
        provider = self.get_provider(market)
        df = await provider.fetch_historical_ohlcv(asset, start_date=start_date, end_date=end_date)

        # 3. Store in cache
        if df is not None and not df.empty:
            self.cache.set(cache_key, df)

        return df

    async def get_aligned_prices(
        self,
        symbols: list[str],
        market: MarketType,
        start_date: str | date | datetime | None = None,
        end_date: str | date | datetime | None = None,
        price_field: str = "adj_close",
    ) -> tuple[pd.DataFrame, DataQualityReport]:
        """Fetch and inner-join price series for multiple assets, producing an aligned DataFrame

        and a comprehensive DataQualityReport.
        """
        if not symbols:
            raise SymbolNotFoundError("At least one symbol must be provided.")

        clean_symbols = [s.upper().strip() for s in symbols]
        unique_symbols = list(dict.fromkeys(clean_symbols))

        # Fetch in parallel
        tasks = [
            self.get_single_asset_data(s, market, start_date, end_date)
            for s in unique_symbols
        ]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        dfs: dict[str, pd.DataFrame] = {}
        failed_symbols: list[str] = []
        warnings: list[str] = []

        for sym, res in zip(unique_symbols, results):
            if isinstance(res, Exception):
                logger.warning("Failed to retrieve data for %s: %s", sym, res)
                failed_symbols.append(sym)
                warnings.append(f"Symbol '{sym}' failed: {str(res)}")
            elif isinstance(res, pd.DataFrame):
                if res.empty:
                    failed_symbols.append(sym)
                    warnings.append(f"Symbol '{sym}' returned an empty dataset.")
                else:
                    # Check requested price field
                    if price_field in res.columns:
                        dfs[sym] = res[price_field]
                    elif "close" in res.columns:
                        dfs[sym] = res["close"]
                        warnings.append(f"'{price_field}' not found for {sym}, used 'close'.")
                    else:
                        failed_symbols.append(sym)
                        warnings.append(f"No usable price column for {sym}.")

        if failed_symbols:
            raise SymbolNotFoundError(
                f"Failed to retrieve valid market data for symbol(s): {', '.join(failed_symbols)}. "
                f"Warnings: {'; '.join(warnings)}",
                details={"failed_symbols": failed_symbols, "warnings": warnings},
            )

        if not dfs:
            raise SymbolNotFoundError(
                f"Failed to retrieve valid market data for all requested symbols: {symbols}. "
                f"Warnings: {'; '.join(warnings)}",
                details={"failed_symbols": failed_symbols, "warnings": warnings},
            )

        resolved_symbols = list(dfs.keys())

        # Combine into single DataFrame and inner-join on dates
        price_df = pd.DataFrame(dfs)

        # Count total unaligned dates before dropping
        total_unique_dates = len(price_df)
        # Inner join: drop dates where any asset has NaN
        price_df_clean = price_df.dropna(how="any").sort_index()

        aligned_count = len(price_df_clean)
        dropped_count = total_unique_dates - aligned_count

        if aligned_count < 10:
            raise InsufficientDataError(
                f"After date alignment, only {aligned_count} common trading days remained "
                f"for symbols {resolved_symbols}. A minimum of 10 observations is required.",
                details={
                    "aligned_days": aligned_count,
                    "dropped_days": dropped_count,
                    "resolved_symbols": resolved_symbols,
                },
            )

        # Check alignment ratio warning
        if total_unique_dates > 0 and (dropped_count / total_unique_dates) > 0.10:
            pct_dropped = (dropped_count / total_unique_dates) * 100
            warnings.append(
                f"{dropped_count} trading dates ({pct_dropped:.1f}%) were dropped due to non-intersecting "
                f"holidays or differing calendar histories across assets."
            )

        # Build quality report
        start_dt_str = price_df_clean.index[0].strftime("%Y-%m-%d")
        end_dt_str = price_df_clean.index[-1].strftime("%Y-%m-%d")
        cal_days = (price_df_clean.index[-1] - price_df_clean.index[0]).days + 1

        provider_used = self.get_provider(market).provider_name

        quality_report = DataQualityReport(
            market=market,
            requested_symbols=unique_symbols,
            resolved_symbols=resolved_symbols,
            failed_symbols=failed_symbols,
            start_date=start_dt_str,
            end_date=end_dt_str,
            total_calendar_days=cal_days,
            aligned_trading_days=aligned_count,
            dropped_dates_count=dropped_count,
            used_series=price_field,
            data_source=provider_used,
            warnings=warnings,
        )

        return price_df_clean, quality_report
