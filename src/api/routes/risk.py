"""Portfolio risk simulation and scenario comparison routes."""

from datetime import datetime, timezone
import uuid
from fastapi import APIRouter, Depends
from src.api.dependencies import get_data_service, get_simulation_engine
from src.api.schemas import (
    DataQualityReportSchema,
    PortfolioRiskRequest,
    RiskMetricsSchema,
    ScenarioComparisonRequest,
    ScenarioComparisonResponse,
    ScenarioSummaryItem,
    SimulationResponse,
)
from src.analytics.portfolio import validate_portfolio_weights
from src.config import settings
from src.data.data_service import DataService
from src.domain.models import MarketType, Portfolio, SimulationConfig, SimulationResult
from src.simulation.engine import MonteCarloEngine

router = APIRouter(tags=["Risk & Simulation"])


def _map_simulation_result_to_response(result: SimulationResult) -> SimulationResponse:
    quality_schema = DataQualityReportSchema(
        market=result.quality_report.market,
        requested_symbols=result.quality_report.requested_symbols,
        resolved_symbols=result.quality_report.resolved_symbols,
        failed_symbols=result.quality_report.failed_symbols,
        start_date=result.quality_report.start_date,
        end_date=result.quality_report.end_date,
        total_calendar_days=result.quality_report.total_calendar_days,
        aligned_trading_days=result.quality_report.aligned_trading_days,
        dropped_dates_count=result.quality_report.dropped_dates_count,
        used_series=result.quality_report.used_series,
        data_source=result.quality_report.data_source,
        warnings=result.quality_report.warnings,
    )

    rm = result.risk_metrics
    risk_metrics_schema = RiskMetricsSchema(
        confidence_level=rm.confidence_level,
        var_percent=round(rm.var_percent, 6),
        var_monetary=round(rm.var_monetary, 2),
        cvar_percent=round(rm.cvar_percent, 6),
        cvar_monetary=round(rm.cvar_monetary, 2),
        mean_simulated_loss_percent=round(rm.mean_simulated_loss_percent, 6),
        mean_simulated_loss_monetary=round(rm.mean_simulated_loss_monetary, 2),
        max_simulated_loss_percent=round(rm.max_simulated_loss_percent, 6),
        max_simulated_loss_monetary=round(rm.max_simulated_loss_monetary, 2),
        max_gain_percent=round(getattr(rm, "max_simulated_gain_percent", getattr(rm, "max_gain_percent", 0.0)), 6),
        max_gain_monetary=round(getattr(rm, "max_simulated_gain_monetary", getattr(rm, "max_gain_monetary", 0.0)), 2),
        probability_of_loss=round(rm.probability_of_loss, 4),
        loss_volatility_percent=round(rm.loss_volatility_percent, 6),
        loss_volatility_monetary=round(rm.loss_volatility_monetary, 2),
        skewness=round(rm.skewness, 4),
        kurtosis=round(rm.kurtosis, 4),
        percentiles={k: round(v, 2) for k, v in rm.percentiles.items()},
    )

    return SimulationResponse(
        simulation_id=result.simulation_id,
        timestamp=datetime.now(timezone.utc).isoformat(),
        portfolio_name=result.portfolio_name,
        market=result.market,
        initial_capital=result.initial_capital,
        assets=result.assets,
        weights=result.weights,
        horizon_days=result.horizon_days,
        simulations_count=result.simulations_count,
        confidence_level=result.confidence_level,
        random_seed=result.random_seed,
        trading_days_per_year=result.trading_days_per_year,
        portfolio_daily_expected_return=round(result.portfolio_daily_expected_return, 6),
        portfolio_annualized_expected_return=round(result.portfolio_annualized_expected_return, 6),
        portfolio_daily_volatility=round(result.portfolio_daily_volatility, 6),
        portfolio_annualized_volatility=round(result.portfolio_annualized_volatility, 6),
        risk_metrics=risk_metrics_schema,
        loss_distribution_sample=[round(x, 2) for x in result.loss_distribution_sample],
        model_assumptions=result.model_assumptions,
        sign_convention=result.sign_convention,
        quality_report=quality_schema,
        regularization_applied=result.regularization_applied,
        regularization_details=result.regularization_details,
        warnings=result.warnings,
    )


@router.post("/risk/simulate", response_model=SimulationResponse)
async def simulate_portfolio_risk(
    request: PortfolioRiskRequest,
    data_service: DataService = Depends(get_data_service),
    engine: MonteCarloEngine = Depends(get_simulation_engine),
) -> SimulationResponse:
    """Run Monte Carlo simulation to calculate portfolio return, volatility, VaR, CVaR, and losses."""
    # 0. Validate portfolio weights
    validate_portfolio_weights(request.weights, expected_count=len(request.assets))

    trading_days = request.trading_days
    if not trading_days:
        trading_days = (
            settings.trading_days_international
            if request.market == MarketType.INTERNATIONAL
            else settings.trading_days_psx
        )

    # 1. Fetch aligned prices
    prices_df, quality_report = await data_service.get_aligned_prices(
        symbols=request.assets,
        market=request.market,
        start_date=request.start_date,
        end_date=request.end_date,
    )

    # 2. Build portfolio and config
    portfolio = Portfolio(
        id=f"port_{uuid.uuid4().hex[:8]}",
        name=request.portfolio_name,
        market=request.market,
        assets=request.assets,
        weights=request.weights,
        initial_capital=request.initial_capital,
    )

    config = SimulationConfig(
        simulations=request.simulations,
        horizon_days=request.horizon_days,
        confidence_level=request.confidence_level,
        random_seed=request.random_seed,
        trading_days_per_year=trading_days,
    )

    # 3. Execute simulation
    result = engine.simulate_portfolio(
        portfolio=portfolio,
        prices=prices_df,
        config=config,
        quality_report=quality_report,
    )

    return _map_simulation_result_to_response(result)


@router.post("/risk/compare", response_model=ScenarioComparisonResponse)
async def compare_scenarios(
    request: ScenarioComparisonRequest,
    data_service: DataService = Depends(get_data_service),
    engine: MonteCarloEngine = Depends(get_simulation_engine),
) -> ScenarioComparisonResponse:
    """Compare risk and return profiles across multiple portfolios or simulation parameters."""
    comparison_id = f"cmp_{uuid.uuid4().hex[:10]}"
    responses: list[SimulationResponse] = []
    summary_items: list[ScenarioSummaryItem] = []

    for scenario_req in request.scenarios:
        validate_portfolio_weights(scenario_req.weights, expected_count=len(scenario_req.assets))
        trading_days = scenario_req.trading_days
        if not trading_days:
            trading_days = (
                settings.trading_days_international
                if scenario_req.market == MarketType.INTERNATIONAL
                else settings.trading_days_psx
            )

        prices_df, quality_report = await data_service.get_aligned_prices(
            symbols=scenario_req.assets,
            market=scenario_req.market,
            start_date=scenario_req.start_date,
            end_date=scenario_req.end_date,
        )

        portfolio = Portfolio(
            id=f"port_{uuid.uuid4().hex[:8]}",
            name=scenario_req.portfolio_name,
            market=scenario_req.market,
            assets=scenario_req.assets,
            weights=scenario_req.weights,
            initial_capital=scenario_req.initial_capital,
        )

        config = SimulationConfig(
            simulations=scenario_req.simulations,
            horizon_days=scenario_req.horizon_days,
            confidence_level=scenario_req.confidence_level,
            random_seed=scenario_req.random_seed,
            trading_days_per_year=trading_days,
        )

        result = engine.simulate_portfolio(
            portfolio=portfolio,
            prices=prices_df,
            config=config,
            quality_report=quality_report,
        )

        resp = _map_simulation_result_to_response(result)
        responses.append(resp)

        summary_items.append(
            ScenarioSummaryItem(
                portfolio_name=resp.portfolio_name,
                market=resp.market,
                horizon_days=resp.horizon_days,
                confidence_level=resp.confidence_level,
                initial_capital=resp.initial_capital,
                portfolio_annualized_return=resp.portfolio_annualized_expected_return,
                portfolio_annualized_volatility=resp.portfolio_annualized_volatility,
                var_percent=resp.risk_metrics.var_percent,
                var_monetary=resp.risk_metrics.var_monetary,
                cvar_percent=resp.risk_metrics.cvar_percent,
                cvar_monetary=resp.risk_metrics.cvar_monetary,
                worst_loss_percent=resp.risk_metrics.max_simulated_loss_percent,
                probability_of_loss=resp.risk_metrics.probability_of_loss,
            )
        )

    # Rank by risk (lowest VaR percent to highest)
    ranked_by_var = sorted(summary_items, key=lambda x: x.var_percent)
    ranked_by_cvar = sorted(summary_items, key=lambda x: x.cvar_percent)
    ranked_by_return = sorted(summary_items, key=lambda x: x.portfolio_annualized_return, reverse=True)

    rank_names_var = [f"{item.portfolio_name} (VaR: {item.var_percent*100:.2f}%)" for item in ranked_by_var]
    rank_names_cvar = [f"{item.portfolio_name} (CVaR: {item.cvar_percent*100:.2f}%)" for item in ranked_by_cvar]

    safest_portfolio = ranked_by_var[0].portfolio_name
    highest_return_portfolio = ranked_by_return[0].portfolio_name

    observations = [
        f"Safest portfolio by VaR: '{safest_portfolio}' with {ranked_by_var[0].var_percent*100:.2f}% VaR.",
        f"Highest return portfolio: '{highest_return_portfolio}' with {ranked_by_return[0].portfolio_annualized_return*100:.2f}% annualized return.",
        f"Lowest tail-risk portfolio by CVaR: '{ranked_by_cvar[0].portfolio_name}' with {ranked_by_cvar[0].cvar_percent*100:.2f}% Expected Shortfall.",
    ]

    return ScenarioComparisonResponse(
        comparison_id=comparison_id,
        comparison_name=request.comparison_name,
        timestamp=datetime.now(timezone.utc).isoformat(),
        total_scenarios=len(responses),
        summary_table=summary_items,
        risk_rankings_by_var=rank_names_var,
        risk_rankings_by_cvar=rank_names_cvar,
        safest_portfolio=safest_portfolio,
        highest_return_portfolio=highest_return_portfolio,
        results=responses,
        observations=observations,
    )
