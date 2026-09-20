"""Unit tests for returns calculations, annualization, and moments."""

import numpy as np
import pandas as pd
import pytest

from src.analytics.returns import (
    annualize_return,
    annualize_volatility,
    calculate_asset_statistics,
    calculate_log_returns,
    calculate_simple_returns,
)


def test_calculate_log_returns_basic():
    # Simple known sequence: [100.0, 110.0, 99.0]
    prices = pd.Series([100.0, 110.0, 99.0], index=pd.date_range("2024-01-01", periods=3))
    log_rets = calculate_log_returns(prices)

    expected_1 = np.log(110.0 / 100.0)
    expected_2 = np.log(99.0 / 110.0)

    assert len(log_rets) == 2
    assert np.isclose(log_rets.iloc[0], expected_1, atol=1e-7)
    assert np.isclose(log_rets.iloc[1], expected_2, atol=1e-7)


def test_calculate_simple_returns_basic():
    prices = pd.Series([100.0, 120.0, 90.0], index=pd.date_range("2024-01-01", periods=3))
    simple_rets = calculate_simple_returns(prices)

    assert len(simple_rets) == 2
    assert np.isclose(simple_rets.iloc[0], 0.20, atol=1e-7)
    assert np.isclose(simple_rets.iloc[1], -0.25, atol=1e-7)


def test_log_returns_rejects_non_positive_prices():
    prices = pd.Series([100.0, -5.0, 90.0])
    with pytest.raises(ValueError, match="zero or negative values"):
        calculate_log_returns(prices)

    prices_zero = pd.Series([100.0, 0.0, 90.0])
    with pytest.raises(ValueError, match="zero or negative values"):
        calculate_log_returns(prices_zero)


def test_annualize_return_arithmetic_and_geometric():
    daily_mu = 0.001
    trading_days = 252

    arith_ann = annualize_return(daily_mu, trading_days=trading_days, method="arithmetic")
    geom_ann = annualize_return(daily_mu, trading_days=trading_days, method="geometric")

    # Arithmetic: 0.001 * 252 = 0.252 (25.2%)
    assert np.isclose(arith_ann, 0.252, atol=1e-6)

    # Geometric: exp(0.001 * 252) - 1 = exp(0.252) - 1 ~ 0.286596
    expected_geom = np.exp(0.252) - 1.0
    assert np.isclose(geom_ann, expected_geom, atol=1e-6)


def test_annualize_volatility_square_root_scaling():
    daily_vol = 0.015
    trading_days = 252

    ann_vol = annualize_volatility(daily_vol, trading_days=trading_days)
    expected = 0.015 * np.sqrt(252)
    assert np.isclose(ann_vol, expected, atol=1e-6)

    # PSX 250 days
    ann_vol_psx = annualize_volatility(daily_vol, trading_days=250)
    assert np.isclose(ann_vol_psx, 0.015 * np.sqrt(250), atol=1e-6)


def test_calculate_asset_statistics(synthetic_prices):
    stats = calculate_asset_statistics(synthetic_prices, trading_days=252)

    assert "AAPL" in stats
    assert "JPM" in stats
    assert "XOM" in stats

    aapl_stats = stats["AAPL"]
    assert aapl_stats.observations == len(synthetic_prices) - 1
    assert aapl_stats.daily_volatility > 0.0
    assert aapl_stats.annualized_volatility > aapl_stats.daily_volatility
    assert aapl_stats.min_return < aapl_stats.max_return
