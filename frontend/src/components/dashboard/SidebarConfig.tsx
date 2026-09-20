'use client';

import React from 'react';
import {
  Play,
  Sliders,
  Sparkles,
} from 'lucide-react';
import { AssetItem, MarketType } from '@/lib/types';

interface SidebarConfigProps {
  currentMarket: MarketType;
  availableAssets: AssetItem[];
  selectedSymbols: string[];
  weights: Record<string, number>;
  initialCapital: number;
  simulations: number;
  horizonDays: number;
  confidenceLevel: number;
  randomSeed?: number | null;
  isLoading: boolean;
  onMarketChange: (market: MarketType) => void;
  onToggleSymbol: (symbol: string) => void;
  onWeightChange: (symbol: string, value: number) => void;
  onEqualizeWeights: () => void;
  onNormalizeWeights: () => void;
  onCapitalChange: (capital: number) => void;
  onSimulationsChange: (sims: number) => void;
  onHorizonChange: (days: number) => void;
  onConfidenceChange: (level: number) => void;
  onRandomSeedChange?: (seed: number | null) => void;
  onExecuteSimulation: () => void;
}

export const SidebarConfig: React.FC<SidebarConfigProps> = ({
  currentMarket,
  availableAssets,
  selectedSymbols,
  weights,
  initialCapital,
  simulations,
  horizonDays,
  confidenceLevel,
  randomSeed = null,
  isLoading,
  onMarketChange,
  onToggleSymbol,
  onWeightChange,
  onEqualizeWeights,
  onNormalizeWeights,
  onCapitalChange,
  onSimulationsChange,
  onHorizonChange,
  onConfidenceChange,
  onRandomSeedChange,
  onExecuteSimulation,
}) => {
  const totalWeight = selectedSymbols.reduce((sum, sym) => sum + (weights[sym] || 0), 0);
  const isWeightValid = Math.abs(totalWeight - 1.0) < 0.005;

  return (
    <aside className="w-full lg:w-96 flex-shrink-0 flex flex-col gap-6 p-4 sm:p-5 rounded-2xl glass-panel border border-slate-200 bg-white/95 shadow-sm text-slate-800">
      {/* Panel Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <Sliders className="w-5 h-5 text-amber-600" />
          <h2 className="text-sm font-bold tracking-wide text-slate-900 uppercase">
            Portfolio Setup
          </h2>
        </div>
        <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-mono font-medium border border-slate-200">
          {selectedSymbols.length} Assets
        </span>
      </div>

      {/* Market Selector */}
      <div>
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
          Financial Market
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onMarketChange('international')}
            className={`p-2.5 rounded-xl text-left border transition-all ${
              currentMarket === 'international'
                ? 'bg-amber-50 border-amber-400 text-amber-950 shadow-xs'
                : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-100'
            }`}
          >
            <div className="text-xs font-bold">🇺🇸 US Equities</div>
            <div className="text-[10px] text-slate-500 font-mono">USD • 252 Days</div>
          </button>
          <button
            type="button"
            onClick={() => onMarketChange('psx')}
            className={`p-2.5 rounded-xl text-left border transition-all ${
              currentMarket === 'psx'
                ? 'bg-emerald-50 border-emerald-400 text-emerald-950 shadow-xs'
                : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-100'
            }`}
          >
            <div className="text-xs font-bold">🇵🇰 PSX Pakistan</div>
            <div className="text-[10px] text-slate-500 font-mono">PKR • 250 Days</div>
          </button>
        </div>
      </div>

      {/* Asset Picker Chips */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Select Stocks
          </label>
          <button
            onClick={onEqualizeWeights}
            className="text-[11px] text-amber-700 hover:text-amber-800 flex items-center gap-1 font-semibold transition"
          >
            <Sparkles className="w-3 h-3" />
            Equal 1/N
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
          {availableAssets.map((asset) => {
            const isSelected = selectedSymbols.includes(asset.symbol);
            return (
              <button
                key={asset.symbol}
                type="button"
                onClick={() => onToggleSymbol(asset.symbol)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all border ${
                  isSelected
                    ? 'bg-amber-100 border-amber-400 text-amber-900 shadow-xs'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300'
                }`}
                title={`${asset.name} (${asset.sector})`}
              >
                {asset.symbol}
              </button>
            );
          })}
        </div>
      </div>

      {/* Weight Distribution Sliders */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Weight Allocation
          </label>
          <div className="flex items-center gap-1.5">
            <span
              className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                isWeightValid
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-amber-100 text-amber-800 border border-amber-300'
              }`}
            >
              {(totalWeight * 100).toFixed(1)}%
            </span>
            {!isWeightValid && (
              <button
                onClick={onNormalizeWeights}
                className="text-[11px] text-amber-700 hover:text-amber-900 underline font-semibold"
                title="Normalize weights to sum to 100%"
              >
                Fix
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
          {selectedSymbols.map((sym) => {
            const w = weights[sym] || 0;
            const pct = Math.round(w * 100);
            return (
              <div key={sym} className="flex flex-col gap-1 p-2 rounded-lg bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800">{sym}</span>
                  <span className="font-mono font-semibold text-amber-700">{pct}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={pct}
                  onChange={(e) => onWeightChange(sym, parseFloat(e.target.value) / 100)}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-600"
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Initial Capital */}
      <div>
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
          Initial Capital
        </label>
        <div className="relative rounded-xl shadow-xs">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 font-semibold">
            {currentMarket === 'psx' ? 'PKR' : '$'}
          </div>
          <input
            type="number"
            min="1000"
            step="10000"
            value={initialCapital}
            onChange={(e) => onCapitalChange(Math.max(100, parseFloat(e.target.value) || 0))}
            className="block w-full pl-14 pr-3 py-2 text-sm bg-white border border-slate-200 rounded-xl text-slate-900 font-mono font-semibold focus:border-amber-500 focus:outline-none shadow-xs"
          />
        </div>
        <div className="flex gap-1.5 mt-2">
          {[50_000, 100_000, 500_000, 1_000_000].map((amt) => (
            <button
              key={amt}
              type="button"
              onClick={() => onCapitalChange(amt)}
              className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 font-mono font-medium"
            >
              {amt >= 1_000_000 ? `${amt / 1_000_000}M` : `${amt / 1_000}k`}
            </button>
          ))}
        </div>
      </div>

      {/* Horizon & Confidence Controls */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
            Horizon (Days)
          </label>
          <div className="grid grid-cols-3 gap-1">
            {[1, 5, 10, 21, 63, 252].map((days) => (
              <button
                key={days}
                type="button"
                onClick={() => onHorizonChange(days)}
                className={`py-1 rounded-lg text-xs font-mono font-semibold transition ${
                  horizonDays === days
                    ? 'bg-amber-100 text-amber-900 border border-amber-400 shadow-xs'
                    : 'bg-slate-50 text-slate-600 border border-slate-200 hover:border-slate-300'
                }`}
              >
                {days}d
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
            Confidence
          </label>
          <div className="grid grid-cols-3 gap-1">
            {[0.90, 0.95, 0.99].map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => onConfidenceChange(c)}
                className={`py-1 rounded-lg text-xs font-mono font-semibold transition ${
                  confidenceLevel === c
                    ? 'bg-emerald-100 text-emerald-900 border border-emerald-400 shadow-xs'
                    : 'bg-slate-50 text-slate-600 border border-slate-200 hover:border-slate-300'
                }`}
              >
                {Math.round(c * 100)}%
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Iteration Count & Seed */}
      <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
        <span className="font-semibold uppercase tracking-wider text-[11px]">Simulations</span>
        <div className="flex gap-1.5 font-mono">
          {[1_000, 10_000, 50_000].map((simCount) => (
            <button
              key={simCount}
              type="button"
              onClick={() => onSimulationsChange(simCount)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                simulations === simCount
                  ? 'bg-amber-100 text-amber-900 border border-amber-400 shadow-xs'
                  : 'bg-slate-50 text-slate-600 border border-slate-200 hover:border-slate-300'
              }`}
            >
              {simCount >= 1_000 ? `${simCount / 1_000}k` : simCount}
            </button>
          ))}
        </div>
      </div>

      {/* Reproducibility Seed */}
      <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
        <span className="font-semibold uppercase tracking-wider text-[11px]">Random Seed</span>
        <button
          type="button"
          onClick={() => onRandomSeedChange?.(randomSeed === 42 ? null : 42)}
          className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-semibold transition ${
            randomSeed !== null
              ? 'bg-purple-100 text-purple-900 border border-purple-400 shadow-xs'
              : 'bg-slate-50 text-slate-600 border border-slate-200 hover:border-slate-300'
          }`}
        >
          {randomSeed !== null ? `Fixed (#${randomSeed})` : 'Randomized'}
        </button>
      </div>

      {/* Primary Execute Button */}
      <button
        type="button"
        disabled={isLoading || selectedSymbols.length === 0}
        onClick={onExecuteSimulation}
        className="w-full mt-2 py-3.5 px-4 rounded-xl font-extrabold text-slate-950 flex items-center justify-center gap-2 shadow-md transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
        style={{
          background: 'linear-gradient(135deg, #fef08a 0%, #f59e0b 50%, #d97706 100%)',
        }}
      >
        {isLoading ? (
          <>
            <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
            <span>Calculating Risk Moments...</span>
          </>
        ) : (
          <>
            <Play className="w-4 h-4 fill-slate-950" />
            <span>Simulate Risk ({simulations.toLocaleString()})</span>
          </>
        )}
      </button>
    </aside>
  );
};
