'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { CasinoScene } from '@/components/3d/CasinoScene';
import { HeroOverlay } from '@/components/3d/HeroOverlay';
import { Header } from '@/components/dashboard/Header';
import { SidebarConfig } from '@/components/dashboard/SidebarConfig';
import { KpiRibbon } from '@/components/dashboard/KpiRibbon';
import { LossDistributionTab } from '@/components/tabs/LossDistributionTab';
import { AssetPerformanceTab } from '@/components/tabs/AssetPerformanceTab';
import { ScenarioCompareTab } from '@/components/tabs/ScenarioCompareTab';
import { ModelAuditTab } from '@/components/tabs/ModelAuditTab';
import {
  checkBackendHealth,
  getAssetsByMarket,
  getAssetAnalytics,
  getHistoricalMarketData,
  simulatePortfolio,
  compareScenarios,
} from '@/lib/api';
import {
  AssetAnalyticsResponse,
  AssetItem,
  MarketDataResponse,
  MarketType,
  ScenarioComparisonResponse,
  SimulationResponse,
} from '@/lib/types';
import {
  BarChart3,
  TrendingUp,
  Layers,
  ShieldCheck,
  X,
} from 'lucide-react';

export default function Home() {
  // Navigation: 'hero' (3D casino experience) vs 'dashboard' (analytics workstation)
  const [currentView, setCurrentView] = useState<'hero' | 'dashboard'>('hero');
  const [activeTab, setActiveTab] = useState<'loss' | 'performance' | 'scenarios' | 'audit'>('loss');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Backend Connectivity
  const [isBackendOnline, setIsBackendOnline] = useState(false);

  // Market & Asset State
  const [market, setMarket] = useState<MarketType>('international');
  const [availableAssets, setAvailableAssets] = useState<AssetItem[]>([]);
  const [selectedSymbols, setSelectedSymbols] = useState<string[]>(['AAPL', 'MSFT', 'NVDA']);
  const [weights, setWeights] = useState<Record<string, number>>({
    AAPL: 0.4,
    MSFT: 0.3,
    NVDA: 0.3,
  });

  // Simulation Parameters
  const [initialCapital, setInitialCapital] = useState<number>(100_000);
  const [simulations, setSimulations] = useState<number>(10_000);
  const [horizonDays, setHorizonDays] = useState<number>(5);
  const [confidenceLevel, setConfidenceLevel] = useState<number>(0.95);
  const [randomSeed, setRandomSeed] = useState<number | null>(42);

  // Results State
  const [simulationResult, setSimulationResult] = useState<SimulationResponse | null>(null);
  const [analyticsResult, setAnalyticsResult] = useState<AssetAnalyticsResponse | null>(null);
  const [marketDataResult, setMarketDataResult] = useState<MarketDataResponse | null>(null);
  const [comparisonResult, setComparisonResult] = useState<ScenarioComparisonResponse | null>(null);

  // Loading States
  const [isSimulating, setIsSimulating] = useState(false);
  const [isComparing, setIsComparing] = useState(false);

  // 1. Initial Health Check & Asset Universe Preload (Mount Only)
  useEffect(() => {
    let isMounted = true;
    const init = async () => {
      // Check health
      const health = await checkBackendHealth();
      if (isMounted) setIsBackendOnline(health.uptime);

      // Pre-warm both markets in parallel for instantaneous switching
      const [intlAssets] = await Promise.all([
        getAssetsByMarket('international'),
        getAssetsByMarket('psx'),
      ]);

      if (isMounted) {
        setAvailableAssets(intlAssets);
      }
    };
    init();
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Instantaneous Market Switch Handler
  const handleMarketChange = useCallback(async (newMarket: MarketType) => {
    setMarket(newMarket);

    // Optimistic instant state update
    if (newMarket === 'psx') {
      const psxDefaults = ['OGDC', 'PPL', 'MCB'];
      setSelectedSymbols(psxDefaults);
      setWeights({ OGDC: 0.4, PPL: 0.3, MCB: 0.3 });
      setInitialCapital(1_000_000);
    } else {
      const usDefaults = ['AAPL', 'MSFT', 'NVDA'];
      setSelectedSymbols(usDefaults);
      setWeights({ AAPL: 0.4, MSFT: 0.3, NVDA: 0.3 });
      setInitialCapital(100_000);
    }
    setSimulationResult(null);
    setComparisonResult(null);

    // Fetch from in-memory cache (0 ms)
    const assets = await getAssetsByMarket(newMarket);
    setAvailableAssets(assets);
  }, []);

  // 3. Asset Selection Toggle
  const handleToggleSymbol = useCallback((symbol: string) => {
    setSelectedSymbols((prev) => {
      let updated: string[];
      if (prev.includes(symbol)) {
        if (prev.length === 1) return prev; // Keep at least 1 asset
        updated = prev.filter((s) => s !== symbol);
      } else {
        if (prev.length >= 10) return prev; // Max 10 assets
        updated = [...prev, symbol];
      }

      // Re-balance weights equally upon selection change
      const eq = Number((1.0 / updated.length).toFixed(4));
      const newWeights: Record<string, number> = {};
      updated.forEach((s, idx) => {
        newWeights[s] = idx === updated.length - 1 ? 1.0 - eq * (updated.length - 1) : eq;
      });
      setWeights(newWeights);

      return updated;
    });
  }, []);

  // 4. Weight Adjustment
  const handleWeightChange = useCallback((symbol: string, val: number) => {
    setWeights((prev) => ({
      ...prev,
      [symbol]: val,
    }));
  }, []);

  // 5. Equalize Weights (1/N)
  const handleEqualizeWeights = useCallback(() => {
    const n = selectedSymbols.length;
    if (n === 0) return;
    const eq = Number((1.0 / n).toFixed(4));
    const newWeights: Record<string, number> = {};
    selectedSymbols.forEach((s, idx) => {
      newWeights[s] = idx === n - 1 ? Number((1.0 - eq * (n - 1)).toFixed(4)) : eq;
    });
    setWeights(newWeights);
  }, [selectedSymbols]);

  // 6. Normalize Weights (scales to 100%)
  const handleNormalizeWeights = useCallback(() => {
    const total = selectedSymbols.reduce((sum, s) => sum + (weights[s] || 0), 0);
    if (total <= 0) {
      handleEqualizeWeights();
      return;
    }
    const newWeights: Record<string, number> = {};
    selectedSymbols.forEach((s) => {
      newWeights[s] = Number(((weights[s] || 0) / total).toFixed(4));
    });
    setWeights(newWeights);
  }, [selectedSymbols, weights, handleEqualizeWeights]);

  // 7. Run Monte Carlo Simulation
  const handleExecuteSimulation = useCallback(async () => {
    if (selectedSymbols.length === 0) return;

    setIsSimulating(true);
    try {
      // Normalize weights array aligned with selectedSymbols
      const totalWeight = selectedSymbols.reduce((sum, s) => sum + (weights[s] || 0), 0);
      const alignedWeights = selectedSymbols.map((s) =>
        totalWeight > 0 ? (weights[s] || 0) / totalWeight : 1 / selectedSymbols.length
      );

      // Execute simulation and analytics in parallel
      const [simRes, analyticsRes, marketDataRes] = await Promise.all([
        simulatePortfolio({
          portfolio_name: market === 'psx' ? 'PSX Blue-Chip Portfolio' : 'US Growth Portfolio',
          market,
          assets: selectedSymbols,
          weights: alignedWeights,
          initial_capital: initialCapital,
          simulations,
          horizon_days: horizonDays,
          confidence_level: confidenceLevel,
          random_seed: randomSeed,
        }),
        getAssetAnalytics(market, selectedSymbols).catch((err) => {
          console.warn('Analytics endpoint fallback:', err);
          return null;
        }),
        getHistoricalMarketData(market, selectedSymbols).catch((err) => {
          console.warn('Historical data fallback:', err);
          return null;
        }),
      ]);

      setSimulationResult(simRes);
      if (analyticsRes) setAnalyticsResult(analyticsRes);
      if (marketDataRes) setMarketDataResult(marketDataRes);
    } catch (err: unknown) {
      console.error('Simulation execution failed:', err);
      alert(`Simulation Error: ${err instanceof Error ? err.message : 'Failed to connect to backend'}`);
    } finally {
      setIsSimulating(false);
      setMobileSidebarOpen(false);
    }
  }, [selectedSymbols, weights, market, initialCapital, simulations, horizonDays, confidenceLevel, randomSeed]);

  // 8. Run Scenario Comparison
  const handleRunComparison = useCallback(async () => {
    setIsComparing(true);
    try {
      const scenarios =
        market === 'psx'
          ? [
              {
                portfolio_name: 'PSX Energy Titans',
                market: 'psx' as MarketType,
                assets: ['OGDC', 'PPL', 'MARI'],
                weights: [0.4, 0.3, 0.3],
                initial_capital: initialCapital,
                simulations: 5000,
                horizon_days: horizonDays,
                confidence_level: confidenceLevel,
                random_seed: 42,
              },
              {
                portfolio_name: 'PSX Dividend Value',
                market: 'psx' as MarketType,
                assets: ['FFC', 'EFERT', 'MCB'],
                weights: [0.4, 0.3, 0.3],
                initial_capital: initialCapital,
                simulations: 5000,
                horizon_days: horizonDays,
                confidence_level: confidenceLevel,
                random_seed: 42,
              },
              {
                portfolio_name: 'PSX Diversified',
                market: 'psx' as MarketType,
                assets: ['OGDC', 'FFC', 'MCB', 'SYS'],
                weights: [0.25, 0.25, 0.25, 0.25],
                initial_capital: initialCapital,
                simulations: 5000,
                horizon_days: horizonDays,
                confidence_level: confidenceLevel,
                random_seed: 42,
              },
            ]
          : [
              {
                portfolio_name: 'Tech Aggressive',
                market: 'international' as MarketType,
                assets: ['NVDA', 'AAPL', 'MSFT'],
                weights: [0.5, 0.25, 0.25],
                initial_capital: initialCapital,
                simulations: 5000,
                horizon_days: horizonDays,
                confidence_level: confidenceLevel,
                random_seed: 42,
              },
              {
                portfolio_name: 'Defensive Value',
                market: 'international' as MarketType,
                assets: ['JNJ', 'JPM', 'XOM'],
                weights: [0.4, 0.3, 0.3],
                initial_capital: initialCapital,
                simulations: 5000,
                horizon_days: horizonDays,
                confidence_level: confidenceLevel,
                random_seed: 42,
              },
              {
                portfolio_name: 'Balanced 4-Asset',
                market: 'international' as MarketType,
                assets: ['AAPL', 'MSFT', 'JNJ', 'JPM'],
                weights: [0.25, 0.25, 0.25, 0.25],
                initial_capital: initialCapital,
                simulations: 5000,
                horizon_days: horizonDays,
                confidence_level: confidenceLevel,
                random_seed: 42,
              },
            ];

      const res = await compareScenarios({
        comparison_name: `${market.toUpperCase()} Allocation Scenarios`,
        scenarios,
      });
      setComparisonResult(res);
    } catch (err: unknown) {
      console.error('Comparison execution failed:', err);
    } finally {
      setIsComparing(false);
    }
  }, [market, initialCapital, horizonDays, confidenceLevel]);

  // Run first simulation automatically when entering dashboard if not already run
  const handleEnterDashboard = () => {
    setCurrentView('dashboard');
    if (!simulationResult) {
      handleExecuteSimulation();
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 flex flex-col relative selection:bg-amber-500/20 selection:text-amber-900">
      {/* 3D Casino Hero View */}
      {currentView === 'hero' && (
        <div className="relative w-full min-h-screen overflow-hidden flex items-center justify-center">
          <CasinoScene />
          <HeroOverlay onEnterSimulator={handleEnterDashboard} />
        </div>
      )}

      {/* Main Quantitative Risk Dashboard */}
      {currentView === 'dashboard' && (
        <div className="flex-1 flex flex-col">
          <Header
            currentMarket={market}
            onSelectMarket={handleMarketChange}
            onReturnToHero={() => setCurrentView('hero')}
            onToggleMobileSidebar={() => setMobileSidebarOpen((prev) => !prev)}
            isBackendOnline={isBackendOnline}
          />

          <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 flex-1 flex flex-col gap-6">
            {/* Top KPI Ribbon */}
            <KpiRibbon simulation={simulationResult} market={market} />

            {/* Layout: Sidebar + Main Tabs */}
            <div className="flex-1 flex flex-col lg:flex-row gap-6 items-start">
              {/* Desktop Configuration Sidebar */}
              <div className="hidden lg:block sticky top-22">
                <SidebarConfig
                  currentMarket={market}
                  availableAssets={availableAssets}
                  selectedSymbols={selectedSymbols}
                  weights={weights}
                  initialCapital={initialCapital}
                  simulations={simulations}
                  horizonDays={horizonDays}
                  confidenceLevel={confidenceLevel}
                  randomSeed={randomSeed}
                  isLoading={isSimulating}
                  onMarketChange={handleMarketChange}
                  onToggleSymbol={handleToggleSymbol}
                  onWeightChange={handleWeightChange}
                  onEqualizeWeights={handleEqualizeWeights}
                  onNormalizeWeights={handleNormalizeWeights}
                  onCapitalChange={setInitialCapital}
                  onSimulationsChange={setSimulations}
                  onHorizonChange={setHorizonDays}
                  onConfidenceChange={setConfidenceLevel}
                  onRandomSeedChange={setRandomSeed}
                  onExecuteSimulation={handleExecuteSimulation}
                />
              </div>

              {/* Mobile Drawer Overlay */}
              {mobileSidebarOpen && (
                <div className="lg:hidden fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex justify-end">
                  <div className="w-full max-w-sm h-full overflow-y-auto p-4 bg-white border-l border-slate-200 shadow-2xl flex flex-col">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
                      <span className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                        Configuration
                      </span>
                      <button
                        onClick={() => setMobileSidebarOpen(false)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <SidebarConfig
                      currentMarket={market}
                      availableAssets={availableAssets}
                      selectedSymbols={selectedSymbols}
                      weights={weights}
                      initialCapital={initialCapital}
                      simulations={simulations}
                      horizonDays={horizonDays}
                      confidenceLevel={confidenceLevel}
                      randomSeed={randomSeed}
                      isLoading={isSimulating}
                      onMarketChange={handleMarketChange}
                      onToggleSymbol={handleToggleSymbol}
                      onWeightChange={handleWeightChange}
                      onEqualizeWeights={handleEqualizeWeights}
                      onNormalizeWeights={handleNormalizeWeights}
                      onCapitalChange={setInitialCapital}
                      onSimulationsChange={setSimulations}
                      onHorizonChange={setHorizonDays}
                      onConfidenceChange={setConfidenceLevel}
                      onRandomSeedChange={setRandomSeed}
                      onExecuteSimulation={handleExecuteSimulation}
                    />
                  </div>
                </div>
              )}

              {/* Main Analytical Workstation Area */}
              <div className="flex-1 w-full flex flex-col gap-4">
                {/* Navigation Tabs Bar */}
                <div className="flex items-center justify-between p-1.5 rounded-2xl bg-white border border-slate-200 shadow-xs overflow-x-auto">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setActiveTab('loss')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                        activeTab === 'loss'
                          ? 'bg-amber-50 text-amber-950 border border-amber-300 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                      }`}
                    >
                      <BarChart3 className="w-4 h-4 text-amber-600" />
                      <span>Loss Distribution & Tail Risk</span>
                    </button>

                    <button
                      onClick={() => setActiveTab('performance')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                        activeTab === 'performance'
                          ? 'bg-emerald-50 text-emerald-950 border border-emerald-300 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                      }`}
                    >
                      <TrendingUp className="w-4 h-4 text-emerald-600" />
                      <span>Historical Performance & Correlation</span>
                    </button>

                    <button
                      onClick={() => {
                        setActiveTab('scenarios');
                        if (!comparisonResult) handleRunComparison();
                      }}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                        activeTab === 'scenarios'
                          ? 'bg-cyan-50 text-cyan-950 border border-cyan-300 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                      }`}
                    >
                      <Layers className="w-4 h-4 text-cyan-600" />
                      <span>Scenario Comparison</span>
                    </button>

                    <button
                      onClick={() => setActiveTab('audit')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                        activeTab === 'audit'
                          ? 'bg-purple-50 text-purple-950 border border-purple-300 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                      }`}
                    >
                      <ShieldCheck className="w-4 h-4 text-purple-600" />
                      <span>Model Audit & Methodology</span>
                    </button>
                  </div>
                </div>

                {/* Tab Views */}
                {activeTab === 'loss' && (
                  <LossDistributionTab simulation={simulationResult} market={market} />
                )}

                {activeTab === 'performance' && (
                  <AssetPerformanceTab
                    analytics={analyticsResult}
                    marketData={marketDataResult}
                    market={market}
                  />
                )}

                {activeTab === 'scenarios' && (
                  <ScenarioCompareTab
                    comparison={comparisonResult}
                    market={market}
                    isLoading={isComparing}
                    onRunComparison={handleRunComparison}
                  />
                )}

                {activeTab === 'audit' && (
                  <ModelAuditTab simulation={simulationResult} />
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
