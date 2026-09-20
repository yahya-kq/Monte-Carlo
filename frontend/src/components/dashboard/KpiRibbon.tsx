'use client';

import React from 'react';
import {
  ShieldAlert,
  Flame,
  TrendingUp,
  Activity,
  AlertTriangle,
  Percent,
  HelpCircle,
} from 'lucide-react';
import { formatCurrency, formatPercent } from '@/lib/formatters';
import { MarketType, SimulationResponse } from '@/lib/types';

interface KpiRibbonProps {
  simulation: SimulationResponse | null;
  market: MarketType;
}

export const KpiRibbon: React.FC<KpiRibbonProps> = ({ simulation, market }) => {
  if (!simulation) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[...Array(6)].map((_, idx) => (
          <div
            key={idx}
            className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs animate-pulse flex flex-col gap-2 min-h-[110px]"
          >
            <div className="w-20 h-3 bg-slate-200 rounded" />
            <div className="w-28 h-6 bg-slate-200 rounded" />
            <div className="w-24 h-2.5 bg-slate-100 rounded" />
          </div>
        ))}
      </div>
    );
  }

  const { risk_metrics: rm, portfolio_annualized_expected_return: annRet, portfolio_annualized_volatility: annVol } = simulation;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {/* 1. Value at Risk (VaR) */}
      <div className="p-4 rounded-2xl bg-white border border-amber-200/90 hover:border-amber-300 shadow-xs hover:shadow-sm transition-all group flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-bold uppercase tracking-wider text-[11px] text-amber-900 flex items-center gap-1">
              Max Normal Loss
              <span
                className="cursor-help text-slate-400 hover:text-amber-700"
                title="Value at Risk (VaR): The maximum monetary loss expected under normal market conditions at this confidence level."
              >
                <HelpCircle className="w-3.5 h-3.5" />
              </span>
            </span>
            <ShieldAlert className="w-4 h-4 text-amber-500 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-slate-900">
            {formatCurrency(rm.var_monetary, market, 0)}
          </div>
        </div>
        <div className="mt-2 pt-2 border-t border-slate-100 flex flex-col gap-0.5">
          <div className="text-[11px] font-bold text-amber-800">
            {formatPercent(rm.var_percent)} of capital
          </div>
          <div className="text-[10px] text-slate-500">
            95% sure loss won&apos;t exceed this
          </div>
        </div>
      </div>

      {/* 2. Conditional VaR (CVaR / Expected Shortfall) */}
      <div className="p-4 rounded-2xl bg-white border border-red-200/90 hover:border-red-300 shadow-xs hover:shadow-sm transition-all group flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-bold uppercase tracking-wider text-[11px] text-red-700 flex items-center gap-1">
              Crash Loss (CVaR)
              <span
                className="cursor-help text-slate-400 hover:text-red-600"
                title="Conditional VaR (CVaR / Expected Shortfall): If a severe market crash occurs beyond the VaR threshold, this is the average loss you would face."
              >
                <HelpCircle className="w-3.5 h-3.5" />
              </span>
            </span>
            <Flame className="w-4 h-4 text-red-500 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-red-600">
            {formatCurrency(rm.cvar_monetary, market, 0)}
          </div>
        </div>
        <div className="mt-2 pt-2 border-t border-slate-100 flex flex-col gap-0.5">
          <div className="text-[11px] font-bold text-red-700">
            {formatPercent(rm.cvar_percent)} tail loss
          </div>
          <div className="text-[10px] text-slate-500">
            Avg loss in worst 5% crash scenarios
          </div>
        </div>
      </div>

      {/* 3. Expected Annual Return */}
      <div className="p-4 rounded-2xl bg-white border border-emerald-200/90 hover:border-emerald-300 shadow-xs hover:shadow-sm transition-all group flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-bold uppercase tracking-wider text-[11px] text-emerald-800 flex items-center gap-1">
              Expected Return
              <span
                className="cursor-help text-slate-400 hover:text-emerald-700"
                title="Expected Annual Return: The weighted average annualized growth rate calculated from historical asset price returns."
              >
                <HelpCircle className="w-3.5 h-3.5" />
              </span>
            </span>
            <TrendingUp className="w-4 h-4 text-emerald-500 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-emerald-600">
            {formatPercent(annRet, 2, true)}
          </div>
        </div>
        <div className="mt-2 pt-2 border-t border-slate-100 flex flex-col gap-0.5">
          <div className="text-[11px] font-bold text-emerald-700">
            Annualized gain
          </div>
          <div className="text-[10px] text-slate-500">
            Based on historical drift &mu;
          </div>
        </div>
      </div>

      {/* 4. Portfolio Volatility */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-slate-300 shadow-xs hover:shadow-sm transition-all group flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-bold uppercase tracking-wider text-[11px] text-slate-700 flex items-center gap-1">
              Volatility (&sigma;)
              <span
                className="cursor-help text-slate-400 hover:text-slate-700"
                title="Volatility: Annualized standard deviation measuring the severity of price swings in the portfolio."
              >
                <HelpCircle className="w-3.5 h-3.5" />
              </span>
            </span>
            <Activity className="w-4 h-4 text-cyan-600 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-slate-900">
            {formatPercent(annVol)}
          </div>
        </div>
        <div className="mt-2 pt-2 border-t border-slate-100 flex flex-col gap-0.5">
          <div className="text-[11px] font-bold text-slate-700">
            Price swing range
          </div>
          <div className="text-[10px] text-slate-500">
            Annual standard deviation
          </div>
        </div>
      </div>

      {/* 5. Worst-Case Drawdown */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-slate-300 shadow-xs hover:shadow-sm transition-all group flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-bold uppercase tracking-wider text-[11px] text-slate-700 flex items-center gap-1">
              Worst Scenario
              <span
                className="cursor-help text-slate-400 hover:text-slate-700"
                title="Worst Simulated Loss: The single most severe deficit out of all simulated random paths."
              >
                <HelpCircle className="w-3.5 h-3.5" />
              </span>
            </span>
            <AlertTriangle className="w-4 h-4 text-amber-600 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-slate-900">
            {formatCurrency(rm.max_simulated_loss_monetary, market, 0)}
          </div>
        </div>
        <div className="mt-2 pt-2 border-t border-slate-100 flex flex-col gap-0.5">
          <div className="text-[11px] font-bold text-amber-800">
            {formatPercent(rm.max_simulated_loss_percent)} max deficit
          </div>
          <div className="text-[10px] text-slate-500">
            Absolute lowest simulated point
          </div>
        </div>
      </div>

      {/* 6. Probability of Loss */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-slate-300 shadow-xs hover:shadow-sm transition-all group flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-bold uppercase tracking-wider text-[11px] text-slate-700 flex items-center gap-1">
              Chance of Loss
              <span
                className="cursor-help text-slate-400 hover:text-slate-700"
                title="Probability of Loss: The percentage of simulation trajectories that finish with a negative return."
              >
                <HelpCircle className="w-3.5 h-3.5" />
              </span>
            </span>
            <Percent className="w-4 h-4 text-purple-600 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-purple-700">
            {formatPercent(rm.probability_of_loss)}
          </div>
        </div>
        <div className="mt-2 pt-2 border-t border-slate-100 flex flex-col gap-0.5">
          <div className="text-[11px] font-bold text-purple-900">
            Loss probability
          </div>
          <div className="text-[10px] text-slate-500">
            Odds of ending with negative return
          </div>
        </div>
      </div>
    </div>
  );
};
