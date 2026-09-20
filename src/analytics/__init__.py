"""Statistical and mathematical analytics modules."""

from src.analytics.returns import (
    calculate_log_returns,
    calculate_simple_returns,
    calculate_asset_statistics,
)
from src.analytics.covariance import (
    calculate_covariance_matrix,
    calculate_correlation_matrix,
    repair_positive_definite,
)
from src.analytics.portfolio import (
    validate_portfolio_weights,
    calculate_portfolio_moments,
)

__all__ = [
    "calculate_log_returns",
    "calculate_simple_returns",
    "calculate_asset_statistics",
    "calculate_covariance_matrix",
    "calculate_correlation_matrix",
    "repair_positive_definite",
    "validate_portfolio_weights",
    "calculate_portfolio_moments",
]
