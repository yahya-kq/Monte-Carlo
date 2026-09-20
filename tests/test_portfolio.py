"""Unit tests for portfolio weights validation and analytical moments."""

import numpy as np
import pytest

from src.analytics.portfolio import (
    calculate_portfolio_moments,
    validate_portfolio_weights,
)
from src.domain.exceptions import InvalidWeightsError


def test_validate_portfolio_weights_valid():
    weights = [0.4, 0.35, 0.25]
    res = validate_portfolio_weights(weights, expected_count=3)
    assert len(res) == 3
    assert np.isclose(np.sum(res), 1.0, atol=1e-7)


def test_validate_portfolio_weights_dimension_mismatch():
    weights = [0.5, 0.5]
    with pytest.raises(InvalidWeightsError, match="Dimension mismatch"):
        validate_portfolio_weights(weights, expected_count=3)


def test_validate_portfolio_weights_negative_rejected():
    weights = [1.2, -0.2]
    with pytest.raises(InvalidWeightsError, match="Negative weights detected"):
        validate_portfolio_weights(weights, expected_count=2, allow_short=False)


def test_validate_portfolio_weights_invalid_sum():
    weights = [0.3, 0.3, 0.2]  # sum = 0.8
    with pytest.raises(InvalidWeightsError, match="must sum to 1.0"):
        validate_portfolio_weights(weights, expected_count=3)


def test_validate_portfolio_weights_empty():
    with pytest.raises(InvalidWeightsError, match="cannot be empty"):
        validate_portfolio_weights([])


def test_portfolio_moments_single_asset():
    w = np.array([1.0])
    mu = np.array([0.001])
    cov = np.array([[0.0004]])  # std = 0.02

    daily_ret, ann_ret, daily_vol, ann_vol = calculate_portfolio_moments(
        weights=w,
        mean_daily_returns=mu,
        covariance_matrix=cov,
        trading_days=252,
    )

    assert np.isclose(daily_ret, 0.001, atol=1e-7)
    assert np.isclose(ann_ret, 0.001 * 252, atol=1e-7)
    assert np.isclose(daily_vol, 0.02, atol=1e-7)
    assert np.isclose(ann_vol, 0.02 * np.sqrt(252), atol=1e-7)


def test_portfolio_diversification_effect():
    # Two uncorrelated assets with same volatility
    w = np.array([0.5, 0.5])
    mu = np.array([0.001, 0.001])
    cov = np.array([
        [0.0004, 0.0],
        [0.0, 0.0004],
    ])
    # Individual vol = 0.02.
    # 50/50 uncorrelated portfolio vol should be 0.02 / sqrt(2) ~ 0.01414
    daily_ret, ann_ret, daily_vol, ann_vol = calculate_portfolio_moments(
        weights=w,
        mean_daily_returns=mu,
        covariance_matrix=cov,
        trading_days=252,
    )

    expected_port_vol = 0.02 / np.sqrt(2)
    assert np.isclose(daily_ret, 0.001, atol=1e-7)
    assert np.isclose(daily_vol, expected_port_vol, atol=1e-6)
    assert daily_vol < 0.02  # Diversification benefit verified!
