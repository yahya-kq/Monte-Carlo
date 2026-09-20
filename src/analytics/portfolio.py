"""Portfolio weight validation and analytical moments (expected return, volatility)."""

import numpy as np

from src.domain.exceptions import InvalidWeightsError


def validate_portfolio_weights(
    weights: list[float] | np.ndarray,
    expected_count: int | None = None,
    allow_short: bool = False,
    tolerance: float = 1e-4,
) -> np.ndarray:
    """Validate that portfolio weights satisfy financial and numerical constraints.

    1. Must match asset count if provided.
    2. Long-only: all w_i >= 0 unless allow_short=True.
    3. Sum(w_i) == 1.0 within tolerance.

    Returns:
        Normalized numpy array of weights summing strictly to 1.0.
    """
    w = np.array(weights, dtype=np.float64)

    if w.size == 0:
        raise InvalidWeightsError("Portfolio weights cannot be empty.")

    if expected_count is not None and len(w) != expected_count:
        raise InvalidWeightsError(
            f"Dimension mismatch: expected {expected_count} weights for {expected_count} assets, "
            f"but received {len(w)} weights.",
            details={"expected_count": expected_count, "received_count": len(w)},
        )

    if not allow_short and np.any(w < 0):
        negative_indices = np.where(w < 0)[0].tolist()
        raise InvalidWeightsError(
            f"Negative weights detected at indices {negative_indices}. "
            "Only long positions (weights >= 0) are currently supported.",
            details={"negative_indices": negative_indices, "weights": w.tolist()},
        )

    total_weight = float(np.sum(w))
    if abs(total_weight - 1.0) > tolerance:
        raise InvalidWeightsError(
            f"Portfolio weights must sum to 1.0 (100%), but sum to {total_weight:.6f} "
            f"(diff: {abs(total_weight - 1.0):.6f}, tolerance: {tolerance}).",
            details={"sum_of_weights": total_weight, "tolerance": tolerance},
        )

    # Normalize subtle float precision drift so sum is exactly 1.0
    return w / total_weight


def calculate_portfolio_moments(
    weights: np.ndarray,
    mean_daily_returns: np.ndarray,
    covariance_matrix: np.ndarray,
    trading_days: int = 252,
) -> tuple[float, float, float, float]:
    """Compute analytical portfolio expected daily and annualized return and volatility.

    Returns:
        (daily_expected_return, annualized_expected_return, daily_volatility, annualized_volatility)
    """
    w = np.asarray(weights, dtype=np.float64)
    mu = np.asarray(mean_daily_returns, dtype=np.float64)
    cov = np.asarray(covariance_matrix, dtype=np.float64)

    # Daily moments
    daily_ret = float(np.dot(w, mu))
    daily_var = float(np.dot(w.T, np.dot(cov, w)))
    daily_vol = float(np.sqrt(max(0.0, daily_var)))

    # Annualized moments
    ann_ret = daily_ret * trading_days
    ann_vol = daily_vol * np.sqrt(trading_days)

    return daily_ret, ann_ret, daily_vol, ann_vol
