"""Yahoo Finance market data provider for international and fallback symbols."""

import asyncio
from datetime import date, datetime
import logging
import pandas as pd
import yfinance as yf

from src.config import settings
from src.data.base_provider import MarketDataProvider
from src.domain.exceptions import (
    DataProviderUnavailableError,
    InsufficientDataError,
    SymbolNotFoundError,
)
from src.domain.models import Asset, MarketType

logger = logging.getLogger(__name__)


class YFinanceProvider(MarketDataProvider):
    """Fetches historical price data via Yahoo Finance."""

    def __init__(self, timeout_seconds: float | None = None):
        self._timeout = timeout_seconds or settings.http_timeout_seconds

    @property
    def provider_name(self) -> str:
        return "yfinance"

    @property
    def supported_market(self) -> MarketType:
        return MarketType.INTERNATIONAL

    def _sync_fetch(
        self,
        provider_symbol: str,
        start_date: str | date | datetime | None = None,
        end_date: str | date | datetime | None = None,
    ) -> pd.DataFrame:
        """Synchronously download history for a symbol with explicit parameters."""
        try:
            ticker = yf.Ticker(provider_symbol)
            # Default period: 2 years if start_date is None
            if start_date is None:
                raw_df = ticker.history(period="2y", interval="1d", auto_adjust=False, timeout=self._timeout)
            else:
                s_str = start_date.strftime("%Y-%m-%d") if isinstance(start_date, (date, datetime)) else str(start_date)
                e_str = end_date.strftime("%Y-%m-%d") if isinstance(end_date, (date, datetime)) else (str(end_date) if end_date else None)
                raw_df = ticker.history(start=s_str, end=e_str, interval="1d", auto_adjust=False, timeout=self._timeout)

            if raw_df is None or raw_df.empty:
                raise SymbolNotFoundError(
                    f"No price data returned by Yahoo Finance for ticker '{provider_symbol}'. "
                    f"Check if symbol is valid or delisted.",
                    details={"symbol": provider_symbol},
                )

            # Standardize columns
            col_map = {
                "Open": "open",
                "High": "high",
                "Low": "low",
                "Close": "close",
                "Adj Close": "adj_close",
                "Volume": "volume",
            }
            # Sometimes yfinance auto-adjusts or missing 'Adj Close', fall back to 'Close'
            df = raw_df.rename(columns=col_map)
            for standard_col in ["open", "high", "low", "close", "volume"]:
                if standard_col not in df.columns:
                    # check case insensitive
                    matches = [c for c in raw_df.columns if c.lower() == standard_col]
                    if matches:
                        df[standard_col] = raw_df[matches[0]]
                    else:
                        df[standard_col] = 0.0

            if "adj_close" not in df.columns:
                df["adj_close"] = df["close"]

            # Filter standard columns and sort index
            df = df[["open", "high", "low", "close", "adj_close", "volume"]].copy()

            # Normalize DatetimeIndex to tz-naive UTC date
            if df.index.tz is not None:
                df.index = df.index.tz_convert("UTC").tz_localize(None)
            df.index = pd.to_datetime(df.index.normalize())
            df = df[~df.index.duplicated(keep="last")]
            df = df.sort_index()

            # Drop non-positive prices
            df = df[(df["close"] > 0) & (df["adj_close"] > 0)]

            if len(df) < 5:
                raise InsufficientDataError(
                    f"Ticker '{provider_symbol}' returned only {len(df)} observations, "
                    f"which is insufficient for statistical calculations.",
                    details={"symbol": provider_symbol, "observations": len(df)},
                )

            return df

        except (SymbolNotFoundError, InsufficientDataError):
            raise
        except Exception as e:
            logger.error("Yahoo finance provider error for %s: %s", provider_symbol, e)
            raise DataProviderUnavailableError(
                f"Yahoo Finance request failed for '{provider_symbol}': {str(e)}",
                details={"symbol": provider_symbol, "error": str(e)},
            ) from e

    async def fetch_historical_ohlcv(
        self,
        asset: Asset,
        start_date: str | date | datetime | None = None,
        end_date: str | date | datetime | None = None,
    ) -> pd.DataFrame:
        """Asynchronously fetch historical OHLCV data using thread pool."""
        return await asyncio.to_thread(
            self._sync_fetch,
            asset.provider_symbol,
            start_date,
            end_date,
        )
