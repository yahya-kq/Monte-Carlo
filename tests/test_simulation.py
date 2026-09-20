"""Unit tests for the vectorized Monte Carlo simulation engine."""

import numpy as np
import pytest

from src.domain.models import (
    DataQualityReport,
    MarketType,
    Portfolio,
    SimulationConfig,
)
from src.simulation.engine import MonteCarloEngine


@pytest.fixture
def mock_quality_report() -> DataQualityReport:
    return DataQualityReport(
        market=MarketType.INTERNATIONAL,
        requested_symbols=["AAPL", "JPM", "XOM"],
        resolved_symbols=["AAPL", "JPM", "XOM"],
        failed_symbols=[],
        start_date="2024-01-01",
        end_date="2024-05-01",
        total_calendar_days=120,
        aligned_trading_days=80,
        dropped_dates_count=0,
        used_series="adj_close",
        data_source="mock",
        warnings=[],
    )


def test_simulation_reproducibility_with_fixed_seed(synthetic_prices, mock_quality_report, simulation_engine):
    portfolio = Portfolio(
        id="p1",
        name="Test Portfolio",
        market=MarketType.INTERNATIONAL,
        assets=["AAPL", "JPM", "XOM"],
        weights=[0.5, 0.3, 0.2],
        initial_capital=100_000.0,
    )
    config = SimulationConfig(
        simulations=5000,
        horizon_days=5,
        confidence_level=0.95,
        random_seed=12345,
    )

    res1 = simulation_engine.simulate_portfolio(portfolio, synthetic_prices, config, mock_quality_report)
    res2 = simulation_engine.simulate_portfolio(portfolio, synthetic_prices, config, mock_quality_report)

    # Identical seed must yield exact same results
    assert np.isclose(res1.risk_metrics.var_monetary, res2.risk_metrics.var_monetary, atol=1e-5)
    assert np.isclose(res1.risk_metrics.cvar_monetary, res2.risk_metrics.cvar_monetary, atol=1e-5)
    assert np.isclose(res1.risk_metrics.mean_simulated_loss_monetary, res2.risk_metrics.mean_simulated_loss_monetary, atol=1e-5)
    assert res1.loss_distribution_sample == res2.loss_distribution_sample


def test_simulation_horizon_scaling(synthetic_prices, mock_quality_report, simulation_engine):
    portfolio = Portfolio(
        id="p2",
        name="Test Portfolio",
        market=MarketType.INTERNATIONAL,
        assets=["AAPL", "JPM", "XOM"],
        weights=[0.333333, 0.333333, 0.333334],
        initial_capital=100_000.0,
    )
    config_1day = SimulationConfig(simulations=5000, horizon_days=1, random_seed=42)
    config_10days = SimulationConfig(simulations=5000, horizon_days=10, random_seed=42)

    res_1 = simulation_engine.simulate_portfolio(portfolio, synthetic_prices, config_1day, mock_quality_report)
    res_10 = simulation_engine.simulate_portfolio(portfolio, synthetic_prices, config_10days, mock_quality_report)

    # Multi-day horizon increases simulated loss variance and VaR
    assert res_10.risk_metrics.loss_volatility_monetary > res_1.risk_metrics.loss_volatility_monetary
    assert res_10.risk_metrics.var_monetary > res_1.risk_metrics.var_monetary


def test_simulation_capital_scaling_invariance(synthetic_prices, mock_quality_report, simulation_engine):
    p_100k = Portfolio(
        id="p100k",
        name="Portfolio 100k",
        market=MarketType.INTERNATIONAL,
        assets=["AAPL", "JPM"],
        weights=[0.6, 0.4],
        initial_capital=100_000.0,
    )
    p_200k = Portfolio(
        id="p200k",
        name="Portfolio 200k",
        market=MarketType.INTERNATIONAL,
        assets=["AAPL", "JPM"],
        weights=[0.6, 0.4],
        initial_capital=200_000.0,
    )
    config = SimulationConfig(simulations=5000, horizon_days=1, random_seed=777)

    res_100k = simulation_engine.simulate_portfolio(p_100k, synthetic_prices, config, mock_quality_report)
    res_200k = simulation_engine.simulate_portfolio(p_200k, synthetic_prices, config, mock_quality_report)

    # Percentage VaR and CVaR must be invariant to initial capital scale
    assert np.isclose(res_100k.risk_metrics.var_percent, res_200k.risk_metrics.var_percent, atol=1e-5)
    assert np.isclose(res_100k.risk_metrics.cvar_percent, res_200k.risk_metrics.cvar_percent, atol=1e-5)

    # Monetary VaR and CVaR must scale by exactly 2x
    assert np.isclose(res_200k.risk_metrics.var_monetary, 2.0 * res_100k.risk_metrics.var_monetary, atol=1e-2)
    assert np.isclose(res_200k.risk_metrics.cvar_monetary, 2.0 * res_100k.risk_metrics.cvar_monetary, atol=1e-2)
