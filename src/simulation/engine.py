"""Vectorized Monte Carlo multi-portfolio risk simulation engine."""

import logging
import uuid
import numpy as np
import pandas as pd

from src.analytics.covariance import (
    calculate_covariance_matrix,
    repair_positive_definite,
)
from src.analytics.portfolio import (
    calculate_portfolio_moments,
    validate_portfolio_weights,
)
from src.analytics.returns import calculate_log_returns
from src.domain.exceptions import NumericalCalculationError
from src.domain.models import (
    DataQualityReport,
    MarketType,
    Portfolio,
    SimulationConfig,
    SimulationResult,
)
from src.simulation.risk_metrics import compute_comprehensive_risk_metrics

logger = logging.getLogger(__name__)


class MonteCarloEngine:
    """High-performance vectorized Monte Carlo simulation engine for multi-asset portfolios."""

    def simulate_portfolio(
        self,
        portfolio: Portfolio,
        prices: pd.DataFrame | None = None,
        config: SimulationConfig = None,
        quality_report: DataQualityReport = None,
        prices_df: pd.DataFrame | None = None,
    ) -> SimulationResult:
        if prices is None:
            prices = prices_df
        if prices is None:
            raise ValueError("Prices DataFrame must be provided.")
        """Run vectorized Monte Carlo simulation for a given portfolio using historical price series.

        Model:
            Correlated Geometric Brownian Motion (GBM) / Multivariate Log-Normal.
            Log-returns over H trading days:
            r_H = H * (mu - 0.5 * diag(Sigma)) + sqrt(H) * L * Z
            where L @ L.T = Sigma (Cholesky factor), Z ~ N(0, I) [N x M].
            Asset simple return: R_i,H = exp(r_i,H) - 1.
            Portfolio simple return: R_p = sum(w_i * R_i,H).
            Loss: V_0 - V_H = - V_0 * R_p.
        """
        # 1. Align and validate assets and weights
        asset_symbols = [s.upper().strip() for s in portfolio.assets]
        missing_in_df = [s for s in asset_symbols if s not in prices.columns]
        if missing_in_df:
            raise ValueError(f"Prices DataFrame missing requested portfolio assets: {missing_in_df}")

        ordered_prices = prices[asset_symbols]
        normalized_weights = validate_portfolio_weights(portfolio.weights, expected_count=len(asset_symbols))

        # 2. Historical log returns and statistics
        log_rets = calculate_log_returns(ordered_prices)
        mu = log_rets.mean().to_numpy(dtype=np.float64)  # shape (N,)
        raw_cov, _ = calculate_covariance_matrix(log_rets)

        # 3. Positive-definite regularization for Cholesky
        cov_matrix, reg_applied, reg_details = repair_positive_definite(raw_cov)

        try:
            L = np.linalg.cholesky(cov_matrix)  # shape (N, N)
        except np.linalg.LinAlgError as e:
            raise NumericalCalculationError(
                f"Cholesky decomposition failed even after regularization: {str(e)}"
            ) from e

        # 4. Portfolio moments (daily and annualized)
        daily_ret, ann_ret, daily_vol, ann_vol = calculate_portfolio_moments(
            normalized_weights, mu, cov_matrix, trading_days=config.trading_days_per_year
        )

        # 5. Vectorized Monte Carlo draw
        rng = np.random.default_rng(config.random_seed)
        n_assets = len(asset_symbols)
        n_sims = config.simulations
        h = config.horizon_days

        # Drift correction term: H * (mu - 0.5 * diag(Sigma))
        drift = h * (mu - 0.5 * np.diag(cov_matrix))  # shape (N,)

        # Random standard normal draws: shape (N, M)
        Z = rng.standard_normal(size=(n_assets, n_sims))

        # Correlated diffusion: sqrt(H) * L * Z
        correlated_diffusion = np.sqrt(h) * (L @ Z)  # shape (N, M)

        # Simulated log returns over H days: shape (N, M)
        simulated_log_returns = drift[:, np.newaxis] + correlated_diffusion

        # Simulated simple returns over H days: shape (N, M)
        simulated_asset_simple_returns = np.exp(simulated_log_returns) - 1.0

        # Portfolio simple returns: shape (M,)
        simulated_portfolio_returns = normalized_weights @ simulated_asset_simple_returns

        # Terminal portfolio values: shape (M,)
        terminal_values = portfolio.initial_capital * (1.0 + simulated_portfolio_returns)

        # Simulated monetary losses: shape (M,)
        # Sign convention: Loss = Initial Capital - Terminal Value
        # Positive = Loss, Negative = Gain/Profit
        simulated_losses = portfolio.initial_capital - terminal_values

        # 6. Comprehensive Risk Metrics
        risk_metrics = compute_comprehensive_risk_metrics(
            simulated_losses=simulated_losses,
            initial_capital=portfolio.initial_capital,
            confidence_level=config.confidence_level,
        )

        # Downsample loss distribution for frontend charting (e.g. 500 evenly spaced points from sorted losses)
        sorted_losses = np.sort(simulated_losses)
        sample_step = max(1, len(sorted_losses) // 500)
        loss_sample = sorted_losses[::sample_step].tolist()

        warnings = list(quality_report.warnings)
        if reg_applied and reg_details:
            warnings.append(f"Covariance Regularization: {reg_details}")

        return SimulationResult(
            simulation_id=str(uuid.uuid4()),
            portfolio_name=portfolio.name,
            market=portfolio.market,
            initial_capital=portfolio.initial_capital,
            assets=asset_symbols,
            weights=normalized_weights.tolist(),
            horizon_days=config.horizon_days,
            simulations_count=config.simulations,
            confidence_level=config.confidence_level,
            random_seed=config.random_seed,
            trading_days_per_year=config.trading_days_per_year,
            portfolio_daily_expected_return=daily_ret,
            portfolio_annualized_expected_return=ann_ret,
            portfolio_daily_volatility=daily_vol,
            portfolio_annualized_volatility=ann_vol,
            risk_metrics=risk_metrics,
            loss_distribution_sample=loss_sample,
            model_assumptions="Correlated Geometric Brownian Motion (GBM) with Cholesky factorization",
            sign_convention="Loss > 0 represents a financial loss; Loss < 0 represents a profit",
            quality_report=quality_report,
            regularization_applied=reg_applied,
            regularization_details=reg_details,
            warnings=warnings,
        )
