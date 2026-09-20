"""Unit tests for DataService, cache layer, and multi-asset date alignment."""

import pandas as pd
import pytest

from src.data.cache_manager import CacheManager
from src.data.data_service import DataService
from src.domain.exceptions import InsufficientDataError, SymbolNotFoundError
from src.domain.models import Asset, MarketType


def test_cache_manager_in_memory_and_disk(tmp_path):
    cache = CacheManager(cache_dir=tmp_path / "test_cache", ttl_seconds=10)
    df = pd.DataFrame({"close": [10.0, 11.0, 12.0]}, index=pd.date_range("2024-01-01", periods=3))

    key = "test_key_1"
    assert cache.get(key) is None

    cache.set(key, df)
    cached_df = cache.get(key)
    assert cached_df is not None
    assert len(cached_df) == 3
    assert "close" in cached_df.columns


@pytest.mark.asyncio
async def test_data_service_multi_asset_alignment(mock_data_service):
    symbols = ["AAPL", "MSFT", "NVDA"]
    prices_df, report = await mock_data_service.get_aligned_prices(
        symbols=symbols,
        market=MarketType.INTERNATIONAL,
    )

    assert set(prices_df.columns) == {"AAPL", "MSFT", "NVDA"}
    assert len(prices_df) >= 10
    assert report.aligned_trading_days == len(prices_df)
    assert report.resolved_symbols == symbols
    assert report.failed_symbols == []


@pytest.mark.asyncio
async def test_data_service_empty_symbols_raises(mock_data_service):
    with pytest.raises(SymbolNotFoundError, match="At least one symbol"):
        await mock_data_service.get_aligned_prices(
            symbols=[],
            market=MarketType.INTERNATIONAL,
        )


@pytest.mark.asyncio
async def test_data_service_caching_behavior(mock_data_service):
    # Fetch once to populate cache
    df1 = await mock_data_service.get_single_asset_data("AAPL", MarketType.INTERNATIONAL)
    # Fetch second time should return from cache
    df2 = await mock_data_service.get_single_asset_data("AAPL", MarketType.INTERNATIONAL)

    assert df1.equals(df2)
