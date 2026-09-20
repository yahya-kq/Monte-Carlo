/**
 * Typed API client for FastAPI backend with robust error handling and fallback capability.
 */

import {
  AssetAnalyticsResponse,
  AssetItem,
  MarketDataResponse,
  MarketInfo,
  MarketType,
  PortfolioRiskRequest,
  ScenarioComparisonRequest,
  ScenarioComparisonResponse,
  SimulationResponse,
} from './types';
import {
  runClientAnalytics,
  runClientComparison,
  runClientMarketData,
  runClientSimulation,
} from './simulation-fallback';

// Use 127.0.0.1 by default on client/server to bypass Windows IPv6 resolution latency
const rawApiBase = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
const API_BASE = rawApiBase.replace('//localhost:', '//127.0.0.1:');

// Check if running in browser under HTTPS while API_BASE is insecure localhost
function isLocalhostBlocked(): boolean {
  if (typeof window === 'undefined') return false;
  const isHttps = window.location.protocol === 'https:';
  const isLocalApi = API_BASE.startsWith('http://127.0.0.1') || API_BASE.startsWith('http://localhost');
  return isHttps && isLocalApi;
}

// Track backend reachability in-memory so UI never hangs
let isBackendAvailable: boolean | null = null;

// In-memory cache for fast, zero-latency metadata access
const assetsCache = new Map<MarketType, AssetItem[]>();
let marketsCache: MarketInfo[] | null = null;

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  // If backend is already detected offline or blocked by browser mixed-content, fail fast immediately
  if (isBackendAvailable === false || isLocalhostBlocked()) {
    isBackendAvailable = false;
    throw new Error('Backend unreachable; using instant client fallback');
  }

  const url = `${API_BASE}${endpoint}`;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1200);

    const res = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
      ...options,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      let errorMessage = `HTTP ${res.status}: ${res.statusText}`;
      try {
        const errorData = await res.json();
        if (errorData.error) {
          errorMessage = errorData.message || errorData.error.message || JSON.stringify(errorData.error);
        }
      } catch {
        // use default error message
      }
      throw new Error(errorMessage);
    }

    isBackendAvailable = true;
    return await res.json();
  } catch (err: unknown) {
    isBackendAvailable = false;
    console.warn(`API request failed [${endpoint}], activating instant local fallback:`, err);
    throw err;
  }
}

export async function checkBackendHealth(): Promise<{ status: string; uptime: boolean }> {
  if (isLocalhostBlocked() || isBackendAvailable === false) {
    isBackendAvailable = false;
    return { status: 'offline', uptime: false };
  }
  try {
    const data = await request<{ status: string }>('/health');
    isBackendAvailable = data.status === 'ok';
    return { status: data.status, uptime: data.status === 'ok' };
  } catch {
    isBackendAvailable = false;
    return { status: 'offline', uptime: false };
  }
}

export async function getMarkets(): Promise<MarketInfo[]> {
  if (marketsCache) {
    return marketsCache;
  }
  try {
    const data = await request<{ markets: MarketInfo[] }>('/markets');
    marketsCache = data.markets;
    return data.markets;
  } catch (err) {
    console.warn('Using fallback markets list:', err);
    return [
      {
        id: 'international',
        name: 'International Equity Markets',
        exchange: 'NASDAQ / NYSE (US)',
        currency: 'USD',
        data_provider: 'Yahoo Finance (yfinance)',
        available_stocks: 10,
        default_trading_days: 252,
      },
      {
        id: 'psx',
        name: 'Pakistan Stock Exchange (PSX)',
        exchange: 'PSX (Karachi)',
        currency: 'PKR',
        data_provider: 'Official PSX Data Portal (dps.psx.com.pk)',
        available_stocks: 10,
        default_trading_days: 250,
      },
    ];
  }
}

export async function getAssetsByMarket(market: MarketType): Promise<AssetItem[]> {
  if (assetsCache.has(market)) {
    return assetsCache.get(market)!;
  }
  try {
    const data = await request<{ assets: AssetItem[] }>(`/assets/${market}`);
    if (data.assets && data.assets.length > 0) {
      assetsCache.set(market, data.assets);
      return data.assets;
    }
    throw new Error(`Empty assets returned for ${market}`);
  } catch (err) {
    console.warn(`Using fallback assets for ${market}:`, err);
    let fallback: AssetItem[];
    if (market === 'psx') {
      fallback = [
        { symbol: 'OGDC', name: 'Oil & Gas Development Company', sector: 'Energy', exchange: 'PSX', currency: 'PKR', market: 'psx' },
        { symbol: 'PPL', name: 'Pakistan Petroleum Limited', sector: 'Energy', exchange: 'PSX', currency: 'PKR', market: 'psx' },
        { symbol: 'MARI', name: 'Mari Petroleum Company', sector: 'Energy', exchange: 'PSX', currency: 'PKR', market: 'psx' },
        { symbol: 'HUBC', name: 'The Hub Power Company', sector: 'Utilities', exchange: 'PSX', currency: 'PKR', market: 'psx' },
        { symbol: 'FFC', name: 'Fauji Fertilizer Company', sector: 'Basic Materials', exchange: 'PSX', currency: 'PKR', market: 'psx' },
        { symbol: 'EFERT', name: 'Engro Fertilizers Limited', sector: 'Basic Materials', exchange: 'PSX', currency: 'PKR', market: 'psx' },
        { symbol: 'MCB', name: 'MCB Bank Limited', sector: 'Financials', exchange: 'PSX', currency: 'PKR', market: 'psx' },
        { symbol: 'UBL', name: 'United Bank Limited', sector: 'Financials', exchange: 'PSX', currency: 'PKR', market: 'psx' },
        { symbol: 'MEBL', name: 'Meezan Bank Limited', sector: 'Financials', exchange: 'PSX', currency: 'PKR', market: 'psx' },
        { symbol: 'SYS', name: 'Systems Limited', sector: 'Technology', exchange: 'PSX', currency: 'PKR', market: 'psx' },
      ];
    } else {
      fallback = [
        { symbol: 'AAPL', name: 'Apple Inc.', sector: 'Technology', exchange: 'NASDAQ', currency: 'USD', market: 'international' },
        { symbol: 'MSFT', name: 'Microsoft Corporation', sector: 'Technology', exchange: 'NASDAQ', currency: 'USD', market: 'international' },
        { symbol: 'GOOGL', name: 'Alphabet Inc.', sector: 'Communication Services', exchange: 'NASDAQ', currency: 'USD', market: 'international' },
        { symbol: 'AMZN', name: 'Amazon.com Inc.', sector: 'Consumer Discretionary', exchange: 'NASDAQ', currency: 'USD', market: 'international' },
        { symbol: 'NVDA', name: 'NVIDIA Corporation', sector: 'Technology', exchange: 'NASDAQ', currency: 'USD', market: 'international' },
        { symbol: 'JPM', name: 'JPMorgan Chase & Co.', sector: 'Financials', exchange: 'NYSE', currency: 'USD', market: 'international' },
        { symbol: 'JNJ', name: 'Johnson & Johnson', sector: 'Healthcare', exchange: 'NYSE', currency: 'USD', market: 'international' },
        { symbol: 'XOM', name: 'Exxon Mobil Corporation', sector: 'Energy', exchange: 'NYSE', currency: 'USD', market: 'international' },
        { symbol: 'TSLA', name: 'Tesla Inc.', sector: 'Consumer Discretionary', exchange: 'NASDAQ', currency: 'USD', market: 'international' },
        { symbol: 'V', name: 'Visa Inc.', sector: 'Financials', exchange: 'NYSE', currency: 'USD', market: 'international' },
      ];
    }
    assetsCache.set(market, fallback);
    return fallback;
  }
}

export async function getHistoricalMarketData(
  market: MarketType,
  symbols: string[]
): Promise<MarketDataResponse> {
  const query = symbols.map((s) => `symbols=${encodeURIComponent(s)}`).join('&');
  try {
    return await request<MarketDataResponse>(`/market-data/${market}?${query}`);
  } catch (err) {
    console.warn('Backend unavailable, using client-side market data:', err);
    return runClientMarketData(market, symbols);
  }
}

export async function getAssetAnalytics(
  market: MarketType,
  symbols: string[]
): Promise<AssetAnalyticsResponse> {
  try {
    return await request<AssetAnalyticsResponse>('/analytics/assets', {
      method: 'POST',
      body: JSON.stringify({ market, symbols }),
    });
  } catch (err) {
    console.warn('Backend unavailable, using client-side analytics:', err);
    return runClientAnalytics(market, symbols);
  }
}

export async function simulatePortfolio(
  req: PortfolioRiskRequest
): Promise<SimulationResponse> {
  try {
    return await request<SimulationResponse>('/risk/simulate', {
      method: 'POST',
      body: JSON.stringify(req),
    });
  } catch (err) {
    console.warn('Backend unavailable, executing resilient client-side Monte Carlo simulation:', err);
    return runClientSimulation(req);
  }
}

export async function compareScenarios(
  req: ScenarioComparisonRequest
): Promise<ScenarioComparisonResponse> {
  try {
    return await request<ScenarioComparisonResponse>('/risk/compare', {
      method: 'POST',
      body: JSON.stringify(req),
    });
  } catch (err) {
    console.warn('Backend unavailable, executing resilient client-side scenario comparison:', err);
    return runClientComparison(req);
  }
}
