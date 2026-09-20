"""Unit tests for VaR, CVaR, and risk distribution metrics against analytical benchmarks."""

import numpy as np
import pytest
from scipy import stats

from src.simulation.risk_metrics import (
    calculate_cvar,
    calculate_var,
    compute_comprehensive_risk_metrics,
)


def test_var_cvar_analytical_normal_benchmark():
    """Verify VaR and CVaR against standard normal distribution analytical values.

    For Z ~ N(0, 1) and c=0.95:
      VaR_0.95 = 1.64485
      CVaR_0.95 = phi(1.64485) / 0.05 = 2.0627
    """
    np.random.seed(999)
    # Generate large sample to reduce standard error
    losses = np.random.normal(0.0, 1.0, size=200_000)

    var_95 = calculate_var(losses, confidence_level=0.95)
    cvar_95 = calculate_cvar(losses, confidence_level=0.95)

    expected_var = float(stats.norm.ppf(0.95))
    expected_cvar = float(stats.norm.pdf(expected_var) / 0.05)

    # Within 1.5% sampling tolerance
    assert np.isclose(var_95, expected_var, rtol=0.015)
    assert np.isclose(cvar_95, expected_cvar, rtol=0.015)


def test_var_cvar_mathematical_inequality():
    """CVaR is the tail expectation beyond VaR, so CVaR >= VaR must hold strictly."""
    np.random.seed(42)
    losses = np.random.laplace(0.0, 1000.0, size=10_000)

    for c in [0.90, 0.95, 0.99]:
        v = calculate_var(losses, confidence_level=c)
        cv = calculate_cvar(losses, confidence_level=c)
        assert cv >= v, f"Failed at confidence {c}: CVaR={cv} < VaR={v}"


def test_confidence_level_monotonicity():
    """VaR must increase monotonically with confidence level."""
    np.random.seed(42)
    losses = np.random.normal(50.0, 200.0, size=20_000)

    var_90 = calculate_var(losses, 0.90)
    var_95 = calculate_var(losses, 0.95)
    var_99 = calculate_var(losses, 0.99)

    assert var_90 < var_95 < var_99


def test_compute_comprehensive_risk_metrics():
    np.random.seed(42)
    initial_capital = 100_000.0
    # Simulate realistic losses
    losses = np.random.normal(100.0, 2_000.0, size=10_000)

    rm = compute_comprehensive_risk_metrics(losses, initial_capital, confidence_level=0.95)

    assert rm.confidence_level == 0.95
    assert rm.var_monetary > 0
    assert rm.cvar_monetary > rm.var_monetary
    assert rm.var_percent == rm.var_monetary / initial_capital
    assert rm.cvar_percent == rm.cvar_monetary / initial_capital
    assert 0.0 <= rm.probability_of_loss <= 1.0
    assert rm.max_simulated_loss_monetary >= rm.var_monetary
    assert "p50" in rm.percentiles
    assert "p95" in rm.percentiles
    assert "p99" in rm.percentiles


def test_risk_metrics_invalid_inputs():
    with pytest.raises(ValueError, match=r"(?i)confidence level"):
        calculate_var(np.array([10, 20]), confidence_level=1.5)

    with pytest.raises(ValueError, match="empty losses"):
        calculate_var(np.array([]), confidence_level=0.95)

    with pytest.raises(ValueError, match="Initial capital must be positive"):
        compute_comprehensive_risk_metrics(np.array([10, 20]), initial_capital=-100.0)
