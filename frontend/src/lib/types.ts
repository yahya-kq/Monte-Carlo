/**
 * TypeScript definitions matching FastAPI backend schemas.
 */

export type MarketType = 'international' | 'psx';

export interface MarketInfo {
  id: MarketType;
  name: string;
  exchange: string;
  currency: string;
  data_provider: string;
  available_stocks?: number;
  annual_trading_days?: number;
  default_trading_days?: number;
  description?: string;
}

export interface AssetItem {
  symbol: string;
  name: string;
  sector: string;
  exchange: string;
  currency: string;
  market: MarketType;
  description?: string;
}

export interface OHLCVRecord {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  adj_close: number;
  volume: number;
}

export interface MarketDataResponse {
  market: MarketType;
  symbol?: string;
  symbols?: string[];
  records_count: number;
  data?: OHLCVRecord[];
  dates?: string[];
  close_prices?: Record<string, number[]>;
  quality_report?: DataQualityReportSchema;
}

export interface DataQualityReportSchema {
  market: MarketType;
  requested_symbols: string[];
  resolved_symbols: string[];
  failed_symbols: string[];
  start_date: string;
  end_date: string;
  total_calendar_days: number;
  aligned_trading_days: number;
  dropped_dates_count: number;
  used_series: string;
  data_source: string;
  warnings: string[];
}

export interface RiskMetrics {
  confidence_level: number;
  var_percent: number;
  var_monetary: number;
  cvar_percent: number;
  cvar_monetary: number;
  mean_simulated_loss_percent: number;
  mean_simulated_loss_monetary: number;
  max_simulated_loss_percent: number;
  max_simulated_loss_monetary: number;
  max_gain_percent?: number;
  max_gain_monetary?: number;
  max_simulated_gain_percent?: number;
  max_simulated_gain_monetary?: number;
  probability_of_loss: number;
  loss_volatility_percent: number;
  loss_volatility_monetary: number;
  skewness: number;
  kurtosis: number;
  percentiles: Record<string, number>;
}

export interface PortfolioRiskRequest {
  portfolio_name: string;
  market: MarketType;
  assets: string[];
  weights: number[];
  initial_capital: number;
  simulations?: number;
  horizon_days?: number;
  confidence_level?: number;
  random_seed?: number | null;
  start_date?: string | null;
  end_date?: string | null;
  trading_days?: number | null;
}

export interface SimulationResponse {
  simulation_id: string;
  timestamp?: string;
  portfolio_name: string;
  market: MarketType;
  initial_capital: number;
  assets: string[];
  weights: number[];
  horizon_days: number;
  simulations_count: number;
  confidence_level: number;
  random_seed: number | null;
  trading_days_per_year: number;
  portfolio_daily_expected_return: number;
  portfolio_annualized_expected_return: number;
  portfolio_daily_volatility: number;
  portfolio_annualized_volatility: number;
  risk_metrics: RiskMetrics;
  loss_distribution_sample: number[];
  model_assumptions: string;
  sign_convention: string;
  quality_report: DataQualityReportSchema;
  regularization_applied: boolean;
  regularization_details: string | null;
  warnings: string[];
}

export interface ScenarioSummaryItem {
  portfolio_name: string;
  market: MarketType;
  horizon_days: number;
  confidence_level: number;
  initial_capital: number;
  portfolio_annualized_return: number;
  portfolio_annualized_volatility: number;
  var_percent: number;
  var_monetary: number;
  cvar_percent: number;
  cvar_monetary: number;
  worst_loss_percent: number;
  probability_of_loss: number;
  sharpe_ratio_proxy?: number;
}

export interface ScenarioComparisonRequest {
  comparison_name: string;
  scenarios: PortfolioRiskRequest[];
}

export interface ScenarioComparisonResponse {
  comparison_id: string;
  comparison_name: string;
  timestamp: string;
  total_scenarios: number;
  summary_table: ScenarioSummaryItem[];
  risk_rankings_by_var: string[];
  risk_rankings_by_cvar: string[];
  safest_portfolio: string;
  highest_return_portfolio: string;
  results: SimulationResponse[];
  observations: string[];
}

export interface AssetStatisticsItem {
  symbol: string;
  observations: number;
  mean_daily_return: number;
  annualized_return_arithmetic: number;
  annualized_return_geometric: number;
  daily_volatility: number;
  annualized_volatility: number;
  min_return: number;
  max_return: number;
}

export interface AssetAnalyticsResponse {
  market: MarketType;
  symbols: string[];
  trading_days_per_year: number;
  asset_statistics: Record<string, AssetStatisticsItem>;
  covariance_matrix: number[][];
  correlation_matrix: number[][];
  quality_report: DataQualityReportSchema;
  regularization_applied: boolean;
  regularization_details: string | null;
}
