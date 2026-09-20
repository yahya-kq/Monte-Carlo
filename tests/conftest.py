"""Pytest fixtures and synthetic market data for unit and integration testing."""

import numpy as np
import pandas as pd
import pytest
from fastapi.testclient import TestClient
from httpx import ASGITransport, AsyncClient

from main import app
from src.data.base_provider import MarketDataProvider
from src.data.cache_manager import CacheManager
from src.data.data_service import DataService
from src.domain.exceptions import SymbolNotFoundError
from src.domain.models import Asset, MarketType
from src.simulation.engine import MonteCarloEngine


@pytest.fixture
def sample_dates() -> pd.DatetimeIndex:
    """Generate 100 consecutive business days."""
    return pd.bdate_range(start="2024-01-01", periods=100, freq="B")


@pytest.fixture
def synthetic_prices(sample_dates) -> pd.DataFrame:
    """Generate 3 realistic correlated asset price series over 100 days using known parameters."""
    np.random.seed(42)
    n_days = len(sample_dates)

    r1 = np.random.normal(0.001, 0.02, n_days)
    p1 = 150.0 * np.exp(np.cumsum(r1))

    r2 = 0.6 * r1 + np.random.normal(0.0005, 0.012, n_days)
    p2 = 80.0 * np.exp(np.cumsum(r2))

    r3 = 0.3 * r1 + np.random.normal(0.0008, 0.022, n_days)
    p3 = 110.0 * np.exp(np.cumsum(r3))

    df = pd.DataFrame(
        {
            "AAPL": p1,
            "JPM": p2,
            "XOM": p3,
        },
        index=sample_dates,
    )
    return df


@pytest.fixture
def sample_prices_df(synthetic_prices) -> pd.DataFrame:
    """Alias for synthetic_prices for backward test compatibility."""
    return synthetic_prices


@pytest.fixture
def mock_ohlcv_df(sample_dates) -> pd.DataFrame:
    """Generate mock OHLCV dataframe for a single ticker."""
    np.random.seed(123)
    n = len(sample_dates)
    closes = 100.0 * np.exp(np.cumsum(np.random.normal(0.0005, 0.015, n)))
    highs = closes * (1.0 + np.abs(np.random.normal(0.005, 0.003, n)))
    lows = closes * (1.0 - np.abs(np.random.normal(0.005, 0.003, n)))
    opens = (highs + lows) / 2.0
    vols = np.random.uniform(1_000_000, 5_000_000, n)

    df = pd.DataFrame(
        {
            "open": opens,
            "high": highs,
            "low": lows,
            "close": closes,
            "adj_close": closes,
            "volume": vols,
        },
        index=sample_dates,
    )
    return df


class MockProvider(MarketDataProvider):
    """Mock market data provider returning synthetic data."""

    def __init__(self, market: MarketType = MarketType.INTERNATIONAL):
        self._market = market

    @property
    def provider_name(self) -> str:
        return f"mock_provider_{self._market.value}"

    @property
    def supported_market(self) -> MarketType:
        return self._market

    async def fetch_historical_ohlcv(
        self,
        asset: Asset,
        start_date=None,
        end_date=None,
    ) -> pd.DataFrame:
        clean = asset.symbol.strip().upper()
        if clean in ("NONEXISTENT", "INVALID", "UNKNOWN", "BAD"):
            raise SymbolNotFoundError(
                f"Symbol '{asset.symbol}' not found on mock provider.",
                details={"symbol": asset.symbol},
            )

        dates = pd.bdate_range(start="2024-01-01", periods=100, freq="B")
        seed = abs(hash(clean)) % (2**31)
        rng = np.random.default_rng(seed)
        n = len(dates)
        base = 100.0 + (seed % 100)
        closes = base * np.exp(np.cumsum(rng.normal(0.0005, 0.015, n)))
        df = pd.DataFrame(
            {
                "open": closes * 0.995,
                "high": closes * 1.01,
                "low": closes * 0.99,
                "close": closes,
                "adj_close": closes,
                "volume": 1_000_000.0,
            },
            index=dates,
        )
        return df


@pytest.fixture
def mock_data_service(tmp_path) -> DataService:
    """DataService backed by MockProvider and temporary cache directory."""
    cache = CacheManager(cache_dir=tmp_path / "cache", ttl_seconds=3600)
    service = DataService(
        cache_manager=cache,
        providers={
            MarketType.INTERNATIONAL: MockProvider(MarketType.INTERNATIONAL),
            MarketType.PSX: MockProvider(MarketType.PSX),
        },
    )
    return service


@pytest.fixture
def simulation_engine() -> MonteCarloEngine:
    return MonteCarloEngine()


@pytest.fixture
def client(mock_data_service):
    """Synchronous FastAPI TestClient fixture with mocked data service."""
    from src.api.dependencies import get_data_service
    app.dependency_overrides[get_data_service] = lambda: mock_data_service
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
async def async_client(mock_data_service):
    """Async HTTP test client for FastAPI application with mocked data service."""
    from src.api.dependencies import get_data_service
    app.dependency_overrides[get_data_service] = lambda: mock_data_service
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as ac:
        yield ac
    app.dependency_overrides.clear()
