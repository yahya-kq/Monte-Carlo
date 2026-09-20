"""Official Pakistan Stock Exchange (PSX) DPS data provider with Yahoo Finance fallback."""

from datetime import date, datetime
import logging
import httpx
import pandas as pd

from src.config import settings
from src.data.base_provider import MarketDataProvider
from src.data.yfinance_provider import YFinanceProvider
from src.domain.exceptions import (
    DataProviderUnavailableError,
    InsufficientDataError,
    SymbolNotFoundError,
)
from src.domain.models import Asset, MarketType

logger = logging.getLogger(__name__)


class PsxDpsProvider(MarketDataProvider):
    """Primary data provider for PSX via official dps.psx.com.pk portal,

    with automated fallback to Yahoo Finance (`{SYMBOL}.KA`).
    """

    BASE_URL = "https://dps.psx.com.pk/timeseries/eod"

    def __init__(self, timeout_seconds: float | None = None):
        self._timeout = timeout_seconds or settings.http_timeout_seconds
        self._fallback_provider = YFinanceProvider(timeout_seconds=self._timeout)
        self._headers = {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            ),
            "Accept": "application/json, text/plain, */*",
        }

    @property
    def provider_name(self) -> str:
        return "psx_dps"

    @property
    def supported_market(self) -> MarketType:
        return MarketType.PSX

    async def _fetch_from_dps(self, symbol: str) -> pd.DataFrame:
        """Fetch timeseries from official PSX DPS endpoint."""
        url = f"{self.BASE_URL}/{symbol.upper()}"
        dps_timeout = min(self._timeout, 4.0)
        async with httpx.AsyncClient(timeout=dps_timeout, headers=self._headers) as client:
            resp = await client.get(url)
            if resp.status_code == 404:
                raise SymbolNotFoundError(
                    f"Symbol '{symbol}' not found on PSX DPS portal (HTTP 404).",
                    details={"symbol": symbol, "url": url},
                )
            resp.raise_for_status()
            data = resp.json()

        items = []
        if isinstance(data, dict):
            if "data" in data and isinstance(data["data"], list):
                items = data["data"]
            elif "timeseries" in data and isinstance(data["timeseries"], list):
                items = data["timeseries"]
        elif isinstance(data, list):
            items = data

        if not items:
            raise SymbolNotFoundError(
                f"PSX DPS portal returned empty dataset for symbol '{symbol}'.",
                details={"symbol": symbol},
            )

        # Expected row format: [unix_timestamp, close_price, volume, open_price]
        rows = []
        for item in items:
            try:
                if len(item) >= 4:
                    ts = item[0]
                    close_val = float(item[1])
                    vol_val = float(item[2])
                    open_val = float(item[3])
                elif len(item) == 3:
                    ts = item[0]
                    close_val = float(item[1])
                    vol_val = float(item[2])
                    open_val = close_val
                elif len(item) == 2:
                    ts = item[0]
                    close_val = float(item[1])
                    vol_val = 0.0
                    open_val = close_val
                else:
                    continue

                if close_val <= 0:
                    continue

                # Parse timestamp: DPS timestamps are usually seconds
                dt = pd.to_datetime(ts, unit="s", utc=True).tz_localize(None).normalize()
                high_val = max(open_val, close_val)
                low_val = min(open_val, close_val)

                rows.append({
                    "date": dt,
                    "open": open_val if open_val > 0 else close_val,
                    "high": high_val,
                    "low": low_val,
                    "close": close_val,
                    "adj_close": close_val,  # DPS provides unadjusted close; used as primary
                    "volume": vol_val,
                })
            except (ValueError, TypeError):
                continue

        if not rows:
            raise SymbolNotFoundError(
                f"Failed to parse valid price entries for '{symbol}' from PSX DPS response.",
                details={"symbol": symbol},
            )

        df = pd.DataFrame(rows)
        df.set_index("date", inplace=True)
        df = df[~df.index.duplicated(keep="last")]
        df = df.sort_index()

        return df[["open", "high", "low", "close", "adj_close", "volume"]]

    async def _fetch_from_fallback(
        self,
        asset: Asset,
        start_date: str | date | datetime | None = None,
        end_date: str | date | datetime | None = None,
    ) -> pd.DataFrame:
        """Fallback to Yahoo Finance with .KA suffix."""
        fallback_symbol = f"{asset.symbol.upper()}.KA"
        logger.info("Attempting Yahoo Finance fallback for %s with symbol %s", asset.symbol, fallback_symbol)
        fallback_asset = Asset(
            symbol=asset.symbol,
            name=asset.name,
            sector=asset.sector,
            exchange="PSX",
            currency="PKR",
            provider_symbol=fallback_symbol,
            market=MarketType.PSX,
            description=asset.description,
        )
        return await self._fallback_provider.fetch_historical_ohlcv(
            fallback_asset,
            start_date=start_date,
            end_date=end_date,
        )

    async def fetch_historical_ohlcv(
        self,
        asset: Asset,
        start_date: str | date | datetime | None = None,
        end_date: str | date | datetime | None = None,
    ) -> pd.DataFrame:
        """Fetch historical data from DPS, falling back to Yahoo Finance .KA if needed."""
        df: pd.DataFrame | None = None
        dps_error: Exception | None = None

        try:
            df = await self._fetch_from_dps(asset.provider_symbol)
            logger.debug("Successfully fetched %d records from PSX DPS for %s", len(df), asset.symbol)
        except Exception as e:
            logger.warning("PSX DPS portal failed for %s (%s). Trying Yahoo Finance fallback...", asset.symbol, e)
            dps_error = e

        if df is None or df.empty:
            try:
                df = await self._fetch_from_fallback(asset, start_date, end_date)
            except Exception as fb_err:
                logger.error("Both PSX DPS and Yahoo Finance fallback failed for %s: %s", asset.symbol, fb_err)
                raise DataProviderUnavailableError(
                    f"Unable to retrieve market data for PSX symbol '{asset.symbol}'. "
                    f"DPS Portal error: {str(dps_error)}. Fallback error: {str(fb_err)}",
                    details={"symbol": asset.symbol, "dps_error": str(dps_error), "fallback_error": str(fb_err)},
                ) from fb_err

        # Filter date range if specified
        if start_date is not None:
            s_ts = pd.to_datetime(start_date).tz_localize(None).normalize()
            df = df[df.index >= s_ts]
        if end_date is not None:
            e_ts = pd.to_datetime(end_date).tz_localize(None).normalize()
            df = df[df.index <= e_ts]

        if len(df) < 5:
            raise InsufficientDataError(
                f"PSX ticker '{asset.symbol}' has only {len(df)} observations in requested window.",
                details={"symbol": asset.symbol, "observations": len(df)},
            )

        return df
