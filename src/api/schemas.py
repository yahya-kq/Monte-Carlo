"""Pydantic v2 schemas for API requests, responses, and dashboard serialization."""

from datetime import datetime
from typing import Any
from pydantic import BaseModel, Field, field_validator
from src.domain.models import MarketType


# ---------------------------------------------------------
# Health & Market Metadata
# ---------------------------------------------------------

class HealthResponse(BaseModel):
    status: str = Field(default="ok", example="ok")
    app_name: str
    version: str
    timestamp: str
    supported_markets: list[str]


class MarketInfo(BaseModel):
    id: MarketType
    name: str
    exchange: str
    currency: str
    data_provider: str
    available_stocks: int
    default_trading_days: int


class MarketsResponse(BaseModel):
    markets: list[MarketInfo]


class AssetItem(BaseModel):
    symbol: str
    name: str
    sector: str
    exchange: str
    currency: str
    market: MarketType
    description: str


class AssetsResponse(BaseModel):
    market: MarketType
    total_count: int
    count: int = 0
    assets: list[AssetItem]


# ---------------------------------------------------------
# Historical Market Data
# ---------------------------------------------------------

class DataQualityReportSchema(BaseModel):
    market: MarketType
    requested_symbols: list[str]
    resolved_symbols: list[str]
    failed_symbols: list[str]
    start_date: str
    end_date: str
    total_calendar_days: int
    aligned_trading_days: int
    dropped_dates_count: int
    used_series: str
    data_source: str
    warnings: list[str]


class OHLCVRecord(BaseModel):
    date: str
    open: float
    high: float
    low: float
    close: float
    adj_close: float
    volume: float


class MarketDataResponse(BaseModel):
    market: MarketType
    symbol: str | None = None
    symbols: list[str] = Field(default_factory=list)
    records_count: int = 0
    data: list[OHLCVRecord] = Field(default_factory=list)
    dates: list[str] = Field(default_factory=list)
    close_prices: dict[str, list[float]] = Field(default_factory=dict)
    quality_report: DataQualityReportSchema | None = None


# ---------------------------------------------------------
# Analytics
# ---------------------------------------------------------

class AssetAnalyticsRequest(BaseModel):
    market: MarketType = Field(..., description="Target market: 'international' or 'psx'")
    symbols: list[str] = Field(..., min_length=1, description="List of stock symbols")
    start_date: str | None = None
    end_date: str | None = None
    period: str = Field(default="2y", description="Data period (e.g., '1y', '2y', '5y')")
    trading_days: int | None = Field(default=None, description="Optional override for annual trading days")


class AssetStatisticsItem(BaseModel):
    symbol: str
    observations: int
    mean_daily_return: float
    annualized_return_arithmetic: float
    annualized_return_geometric: float
    daily_volatility: float
    annualized_volatility: float
    min_return: float
    max_return: float


class AssetAnalyticsResponse(BaseModel):
    market: MarketType
    symbols: list[str]
    trading_days_per_year: int
    asset_statistics: dict[str, AssetStatisticsItem]
    covariance_matrix: list[list[float]]
    correlation_matrix: list[list[float]]
    quality_report: DataQualityReportSchema
    regularization_applied: bool
    regularization_details: str | None = None


# ---------------------------------------------------------
# Portfolio Simulation
# ---------------------------------------------------------

class PortfolioRiskRequest(BaseModel):
    portfolio_name: str = Field(default="My Portfolio", description="Name/Label of portfolio")
    market: MarketType = Field(..., description="'international' or 'psx'")
    assets: list[str] = Field(..., min_length=1, description="List of stock symbols")
    weights: list[float] = Field(..., min_length=1, description="Portfolio weights summing to 1.0")
    initial_capital: float = Field(default=100_000.0, gt=0, description="Initial investment amount")
    simulations: int = Field(default=10_000, ge=100, le=500_000, description="Number of Monte Carlo simulations")
    horizon_days: int = Field(default=1, ge=1, le=252, description="Simulation forecast horizon in trading days")
    confidence_level: float = Field(default=0.95, gt=0.0, lt=1.0, description="Tail confidence level (e.g. 0.95)")
    random_seed: int | None = Field(default=None, description="Optional seed for reproducible simulation")
    start_date: str | None = None
    end_date: str | None = None
    period: str = "2y"
    trading_days: int | None = None

    @field_validator("assets")
    @classmethod
    def validate_unique_assets(cls, v: list[str]) -> list[str]:
        cleaned = [s.strip().upper() for s in v]
        if len(cleaned) != len(set(cleaned)):
            raise ValueError("Asset symbols in portfolio must be unique")
        return cleaned


class RiskMetricsSchema(BaseModel):
    confidence_level: float
    var_percent: float
    var_monetary: float
    cvar_percent: float
    cvar_monetary: float
    mean_simulated_loss_percent: float
    mean_simulated_loss_monetary: float
    max_simulated_loss_percent: float
    max_simulated_loss_monetary: float
    max_gain_percent: float
    max_gain_monetary: float
    probability_of_loss: float
    loss_volatility_percent: float
    loss_volatility_monetary: float
    skewness: float
    kurtosis: float
    percentiles: dict[str, float]


class SimulationResponse(BaseModel):
    simulation_id: str
    timestamp: str
    portfolio_name: str
    market: MarketType
    initial_capital: float
    assets: list[str]
    weights: list[float]
    horizon_days: int
    simulations_count: int
    confidence_level: float
    random_seed: int | None
    trading_days_per_year: int
    portfolio_daily_expected_return: float
    portfolio_annualized_expected_return: float
    portfolio_daily_volatility: float
    portfolio_annualized_volatility: float
    risk_metrics: RiskMetricsSchema
    loss_distribution_sample: list[float]
    model_assumptions: str
    sign_convention: str
    quality_report: DataQualityReportSchema
    regularization_applied: bool
    regularization_details: str | None = None
    warnings: list[str]


# ---------------------------------------------------------
# Scenario Comparison
# ---------------------------------------------------------

class ScenarioComparisonRequest(BaseModel):
    comparison_name: str = Field(default="Scenario Comparison", description="Comparison title")
    scenarios: list[PortfolioRiskRequest] = Field(..., min_length=2, description="At least two scenarios to compare")


class ScenarioSummaryItem(BaseModel):
    portfolio_name: str
    market: MarketType
    horizon_days: int
    confidence_level: float
    initial_capital: float
    portfolio_annualized_return: float
    portfolio_annualized_volatility: float
    var_percent: float
    var_monetary: float
    cvar_percent: float
    cvar_monetary: float
    worst_loss_percent: float
    probability_of_loss: float


class ScenarioComparisonResponse(BaseModel):
    comparison_id: str
    comparison_name: str = "Scenario Comparison"
    timestamp: str
    total_scenarios: int
    summary_table: list[ScenarioSummaryItem]
    risk_rankings_by_var: list[str]
    risk_rankings_by_cvar: list[str]
    safest_portfolio: str
    highest_return_portfolio: str
    results: list[SimulationResponse]
    observations: list[str]


# ---------------------------------------------------------
# Standard Error Response Schema
# ---------------------------------------------------------

class ErrorResponse(BaseModel):
    error: str
    message: str
    details: dict[str, Any] = Field(default_factory=dict)
    timestamp: str
