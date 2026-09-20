"""Calculations for daily log returns, simple returns, annualization, and moments."""

import numpy as np
import pandas as pd

from src.domain.models import AssetStatistics


def calculate_log_returns(prices: pd.DataFrame | pd.Series) -> pd.DataFrame | pd.Series:
    """Calculate daily continuously compounded (logarithmic) returns.

    r_t = ln(P_t / P_{t-1})
    """
    if (prices <= 0).any().any() if isinstance(prices, pd.DataFrame) else (prices <= 0).any():
        raise ValueError("Price series contains zero or negative values; log returns undefined.")

    log_rets = np.log(prices / prices.shift(1))
    return log_rets.dropna()


def calculate_simple_returns(prices: pd.DataFrame | pd.Series) -> pd.DataFrame | pd.Series:
    """Calculate daily discrete (simple) returns.

    R_t = (P_t - P_{t-1}) / P_{t-1}
    """
    simple_rets = (prices / prices.shift(1)) - 1.0
    return simple_rets.dropna()


def annualize_return(
    mean_daily_return: float | np.ndarray | pd.Series,
    trading_days: int = 252,
    method: str = "arithmetic",
) -> float | np.ndarray | pd.Series:
    """Annualize daily mean return.

    - arithmetic: mu * N_trading_days
    - geometric: exp(mu * N_trading_days) - 1
    """
    if method == "arithmetic":
        return mean_daily_return * trading_days
    elif method == "geometric":
        return np.exp(mean_daily_return * trading_days) - 1.0
    else:
        raise ValueError(f"Unknown annualization method: {method}. Choose 'arithmetic' or 'geometric'.")


def annualize_volatility(
    daily_volatility: float | np.ndarray | pd.Series,
    trading_days: int = 252,
) -> float | np.ndarray | pd.Series:
    """Annualize daily standard deviation using square-root-of-time scaling.

    sigma_ann = sigma_daily * sqrt(N_trading_days)
    """
    return daily_volatility * np.sqrt(trading_days)


def calculate_asset_statistics(
    prices: pd.DataFrame,
    trading_days: int = 252,
) -> dict[str, AssetStatistics]:
    """Calculate summary return and risk statistics for each asset in the price DataFrame."""
    log_returns = calculate_log_returns(prices)
    stats: dict[str, AssetStatistics] = {}

    for symbol in prices.columns:
        series = log_returns[symbol].dropna()
        n_obs = len(series)
        if n_obs < 2:
            raise ValueError(f"Insufficient return observations ({n_obs}) for symbol {symbol}")

        mean_daily = float(series.mean())
        daily_vol = float(series.std(ddof=1))
        ann_ret_arith = float(annualize_return(mean_daily, trading_days, method="arithmetic"))
        ann_ret_geom = float(annualize_return(mean_daily, trading_days, method="geometric"))
        ann_vol = float(annualize_volatility(daily_vol, trading_days))

        stats[symbol] = AssetStatistics(
            symbol=symbol,
            observations=n_obs,
            mean_daily_return=mean_daily,
            annualized_return_arithmetic=ann_ret_arith,
            annualized_return_geometric=ann_ret_geom,
            daily_volatility=daily_vol,
            annualized_volatility=ann_vol,
            min_return=float(series.min()),
            max_return=float(series.max()),
        )

    return stats
