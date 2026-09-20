"""Core domain entities and data structures."""

from dataclasses import dataclass, field
from datetime import date
from enum import Enum


class MarketType(str, Enum):
    INTERNATIONAL = "international"
    PSX = "psx"


class ReturnType(str, Enum):
    LOG = "log"
    SIMPLE = "simple"


@dataclass(frozen=True)
class Asset:
    symbol: str
    name: str
    sector: str
    exchange: str
    currency: str
    provider_symbol: str
    market: MarketType
    description: str = ""


@dataclass
class Portfolio:
    id: str
    name: str
    market: MarketType
    assets: list[str]
    weights: list[float]
    initial_capital: float = 100_000.0

    def __post_init__(self):
        if len(self.assets) != len(self.weights):
            raise ValueError(
                f"Asset count ({len(self.assets)}) must match weights count ({len(self.weights)})"
            )
        if self.initial_capital <= 0:
            raise ValueError(f"Initial capital must be positive, got {self.initial_capital}")


@dataclass
class DataQualityReport:
    market: MarketType
    requested_symbols: list[str]
    resolved_symbols: list[str]
    failed_symbols: list[str]
    start_date: str
    end_date: str
    total_calendar_days: int
    aligned_trading_days: int
    dropped_dates_count: int
    used_series: str  # "adj_close" or "close"
    data_source: str
    warnings: list[str] = field(default_factory=list)


@dataclass
class AssetStatistics:
    symbol: str
    observations: int
    mean_daily_return: float
    annualized_return_arithmetic: float
    annualized_return_geometric: float
    daily_volatility: float
    annualized_volatility: float
    min_return: float
    max_return: float


@dataclass
class MultiAssetAnalytics:
    market: MarketType
    symbols: list[str]
    trading_days_per_year: int
    asset_stats: dict[str, AssetStatistics]
    covariance_matrix: list[list[float]]
    correlation_matrix: list[list[float]]
    quality_report: DataQualityReport
    regularization_applied: bool = False
    regularization_details: str | None = None


@dataclass
class SimulationConfig:
    simulations: int = 10_000
    horizon_days: int = 1
    confidence_level: float = 0.95
    random_seed: int | None = None
    trading_days_per_year: int = 252

    def __post_init__(self):
        if self.simulations < 100:
            raise ValueError(f"Simulations count must be at least 100, got {self.simulations}")
        if self.horizon_days < 1:
            raise ValueError(f"Horizon must be at least 1 day, got {self.horizon_days}")
        if not (0.0 < self.confidence_level < 1.0):
            raise ValueError(f"Confidence level must be between 0 and 1, got {self.confidence_level}")


@dataclass
class RiskMetrics:
    confidence_level: float
    var_percent: float
    var_monetary: float
    cvar_percent: float
    cvar_monetary: float
    mean_simulated_loss_percent: float
    mean_simulated_loss_monetary: float
    max_simulated_loss_percent: float
    max_simulated_loss_monetary: float
    max_simulated_gain_percent: float
    max_simulated_gain_monetary: float
    probability_of_loss: float
    loss_volatility_percent: float
    loss_volatility_monetary: float
    skewness: float
    kurtosis: float
    percentiles: dict[str, float]  # e.g. {"p50": ..., "p75": ..., "p90": ..., "p95": ..., "p99": ...}


@dataclass
class SimulationResult:
    simulation_id: str
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
    risk_metrics: RiskMetrics
    loss_distribution_sample: list[float]
    model_assumptions: str
    sign_convention: str
    quality_report: DataQualityReport
    regularization_applied: bool = False
    regularization_details: str | None = None
    warnings: list[str] = field(default_factory=list)


@dataclass
class ScenarioComparisonResult:
    comparison_id: str
    timestamp: str
    scenarios: list[SimulationResult]
    summary_table: list[dict]
    rankings_by_risk: list[str]
    observations: list[str]
