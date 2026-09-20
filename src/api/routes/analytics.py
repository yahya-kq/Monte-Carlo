"""Multi-asset statistics, covariance, and correlation analytics route."""

from fastapi import APIRouter, Depends
from src.analytics.covariance import (
    calculate_correlation_matrix,
    calculate_covariance_matrix,
    repair_positive_definite,
)
from src.analytics.returns import (
    calculate_asset_statistics,
    calculate_log_returns,
)
from src.api.dependencies import get_data_service
from src.api.schemas import (
    AssetAnalyticsRequest,
    AssetAnalyticsResponse,
    AssetStatisticsItem,
    DataQualityReportSchema,
)
from src.config import settings
from src.data.data_service import DataService
from src.domain.models import MarketType

router = APIRouter(tags=["Analytics"])


@router.post("/analytics/assets", response_model=AssetAnalyticsResponse)
async def analyze_assets(
    request: AssetAnalyticsRequest,
    data_service: DataService = Depends(get_data_service),
) -> AssetAnalyticsResponse:
    """Compute statistical moments, covariance matrix, correlation matrix, and data quality audit for a group of assets."""
    trading_days = request.trading_days or (
        settings.trading_days_psx if request.market == MarketType.PSX else settings.trading_days_international
    )

    # 1. Retrieve aligned historical prices
    prices_df, quality_report = await data_service.get_aligned_prices(
        symbols=request.symbols,
        market=request.market,
        start_date=request.start_date,
        end_date=request.end_date,
    )

    # 2. Asset statistics
    asset_stats_entities = calculate_asset_statistics(prices_df, trading_days=trading_days)
    stats_dict = {
        sym: AssetStatisticsItem(
            symbol=s.symbol,
            observations=s.observations,
            mean_daily_return=round(s.mean_daily_return, 6),
            annualized_return_arithmetic=round(s.annualized_return_arithmetic, 6),
            annualized_return_geometric=round(s.annualized_return_geometric, 6),
            daily_volatility=round(s.daily_volatility, 6),
            annualized_volatility=round(s.annualized_volatility, 6),
            min_return=round(s.min_return, 6),
            max_return=round(s.max_return, 6),
        )
        for sym, s in asset_stats_entities.items()
    }

    # 3. Covariance & Correlation
    log_rets = calculate_log_returns(prices_df)
    cov_matrix, symbols = calculate_covariance_matrix(log_rets)
    repaired_cov, reg_applied, reg_details = repair_positive_definite(cov_matrix)
    corr_matrix = calculate_correlation_matrix(repaired_cov)

    # 4. Map quality report schema
    qr_schema = DataQualityReportSchema(
        market=quality_report.market,
        requested_symbols=quality_report.requested_symbols,
        resolved_symbols=quality_report.resolved_symbols,
        failed_symbols=quality_report.failed_symbols,
        start_date=quality_report.start_date,
        end_date=quality_report.end_date,
        total_calendar_days=quality_report.total_calendar_days,
        aligned_trading_days=quality_report.aligned_trading_days,
        dropped_dates_count=quality_report.dropped_dates_count,
        used_series=quality_report.used_series,
        data_source=quality_report.data_source,
        warnings=quality_report.warnings,
    )

    return AssetAnalyticsResponse(
        market=request.market,
        symbols=symbols,
        trading_days_per_year=trading_days,
        asset_statistics=stats_dict,
        covariance_matrix=[[round(float(val), 8) for val in row] for row in repaired_cov],
        correlation_matrix=[[round(float(val), 6) for val in row] for row in corr_matrix],
        quality_report=qr_schema,
        regularization_applied=reg_applied,
        regularization_details=reg_details,
    )
