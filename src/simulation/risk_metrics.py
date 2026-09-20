"""Value at Risk (VaR), Conditional VaR (CVaR / Expected Shortfall), and distribution metrics."""

import numpy as np
from scipy import stats

from src.domain.models import RiskMetrics


def calculate_var(losses: np.ndarray, confidence_level: float = 0.95) -> float:
    """Calculate Value at Risk (VaR) at the specified confidence level.

    Loss sign convention: positive values indicate a financial loss.
    """
    if not (0.0 < confidence_level < 1.0):
        raise ValueError(f"Confidence level must be strictly between 0 and 1, got {confidence_level}")
    if losses.size == 0:
        raise ValueError("Cannot calculate VaR on empty losses array.")

    return float(np.percentile(losses, confidence_level * 100.0, method="linear"))


def calculate_cvar(
    losses: np.ndarray,
    confidence_level: float = 0.95,
    var_threshold: float | None = None,
) -> float:
    """Calculate Conditional Value at Risk (CVaR / Expected Shortfall).

    Arithmetic mean of tail losses that are greater than or equal to VaR.
    """
    if var_threshold is None:
        var_threshold = calculate_var(losses, confidence_level)

    tail_losses = losses[losses >= var_threshold]
    if tail_losses.size == 0:
        return float(var_threshold)

    return float(np.mean(tail_losses))


def compute_comprehensive_risk_metrics(
    simulated_losses: np.ndarray,
    initial_capital: float,
    confidence_level: float = 0.95,
) -> RiskMetrics:
    """Calculate complete risk and statistical distribution metrics from simulated portfolio losses.

    Sign Convention:
      Loss > 0: Financial Loss (Portfolio Value dropped below initial capital)
      Loss < 0: Financial Profit (Portfolio Value grew above initial capital)
    """
    if simulated_losses.size == 0:
        raise ValueError("Cannot compute risk metrics from empty loss distribution.")
    if initial_capital <= 0:
        raise ValueError(f"Initial capital must be positive, got {initial_capital}")

    # Monetary losses
    losses = np.asarray(simulated_losses, dtype=np.float64)
    # Percentage losses relative to initial capital
    losses_pct = losses / initial_capital

    # 1. VaR
    var_monetary = calculate_var(losses, confidence_level)
    var_pct = var_monetary / initial_capital

    # 2. CVaR
    cvar_monetary = calculate_cvar(losses, confidence_level, var_threshold=var_monetary)
    cvar_pct = cvar_monetary / initial_capital

    # 3. Moments and Extremes
    mean_loss_monetary = float(np.mean(losses))
    mean_loss_pct = mean_loss_monetary / initial_capital

    max_loss_monetary = float(np.max(losses))
    max_loss_pct = max_loss_monetary / initial_capital

    # Max simulated profit (negative loss)
    min_loss_monetary = float(np.min(losses))
    max_gain_monetary = max(0.0, -min_loss_monetary)
    max_gain_pct = max_gain_monetary / initial_capital

    # Probability of loss (loss > 0)
    prob_loss = float(np.mean(losses > 0))

    # Volatility of loss distribution
    loss_vol_monetary = float(np.std(losses, ddof=1)) if len(losses) > 1 else 0.0
    loss_vol_pct = loss_vol_monetary / initial_capital

    # Skewness & Kurtosis
    skew_val = float(stats.skew(losses)) if len(losses) > 2 else 0.0
    # Fisher kurtosis: normal distribution = 0.0
    kurt_val = float(stats.kurtosis(losses, fisher=True)) if len(losses) > 3 else 0.0

    # Empirical percentiles
    percentiles_dict = {
        "p10": float(np.percentile(losses, 10.0)),
        "p25": float(np.percentile(losses, 25.0)),
        "p50": float(np.percentile(losses, 50.0)),
        "p75": float(np.percentile(losses, 75.0)),
        "p90": float(np.percentile(losses, 90.0)),
        "p95": float(np.percentile(losses, 95.0)),
        "p99": float(np.percentile(losses, 99.0)),
        "p99_9": float(np.percentile(losses, 99.9)),
    }

    return RiskMetrics(
        confidence_level=confidence_level,
        var_percent=var_pct,
        var_monetary=var_monetary,
        cvar_percent=cvar_pct,
        cvar_monetary=cvar_monetary,
        mean_simulated_loss_percent=mean_loss_pct,
        mean_simulated_loss_monetary=mean_loss_monetary,
        max_simulated_loss_percent=max_loss_pct,
        max_simulated_loss_monetary=max_loss_monetary,
        max_simulated_gain_percent=max_gain_pct,
        max_simulated_gain_monetary=max_gain_monetary,
        probability_of_loss=prob_loss,
        loss_volatility_percent=loss_vol_pct,
        loss_volatility_monetary=loss_vol_monetary,
        skewness=skew_val,
        kurtosis=kurt_val,
        percentiles=percentiles_dict,
    )
