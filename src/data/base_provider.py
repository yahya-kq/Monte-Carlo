"""Abstract base class for market data providers."""

from abc import ABC, abstractmethod
from datetime import date, datetime
import pandas as pd

from src.domain.models import Asset, MarketType


class MarketDataProvider(ABC):
    """Abstract interface for fetching historical OHLCV data."""

    @property
    @abstractmethod
    def provider_name(self) -> str:
        """Name of the data provider."""
        pass

    @property
    @abstractmethod
    def supported_market(self) -> MarketType:
        """Market type handled by this provider."""
        pass

    @abstractmethod
    async def fetch_historical_ohlcv(
        self,
        asset: Asset,
        start_date: str | date | datetime | None = None,
        end_date: str | date | datetime | None = None,
    ) -> pd.DataFrame:
        """Fetch daily historical OHLCV data for an asset.

        Returns:
            DataFrame with standardized lowercase columns:
            ['open', 'high', 'low', 'close', 'adj_close', 'volume']
            Index is a normalized DatetimeIndex (YYYY-MM-DD) sorted ascending.
        """
        pass
