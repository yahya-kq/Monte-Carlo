'use client';

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { formatCurrency, formatPercent } from '@/lib/formatters';
import { MarketType, ScenarioComparisonResponse } from '@/lib/types';
import { Trophy, ShieldCheck, TrendingUp, Play, Layers } from 'lucide-react';

interface ScenarioCompareTabProps {
  comparison: ScenarioComparisonResponse | null;
  market: MarketType;
  isLoading: boolean;
  onRunComparison: () => void;
}

export const ScenarioCompareTab: React.FC<ScenarioCompareTabProps> = ({
  comparison,
  market,
  isLoading,
  onRunComparison,
}) => {
  if (!comparison) {
    return (
      <div className="p-10 text-center rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col items-center justify-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center">
          <Layers className="w-7 h-7 text-amber-600 animate-pulse" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-900">
            Multi-Scenario Risk & Return Comparison
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
            Compare distinct portfolio allocation strategies (e.g. Defensive Value vs Aggressive Growth) side-by-side to find the ideal balance.
          </p>
        </div>
        <button
          type="button"
          onClick={onRunComparison}
          disabled={isLoading}
          className="px-6 py-2.5 rounded-xl font-bold text-slate-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:scale-105 active:scale-95 transition-all text-xs flex items-center gap-2 shadow-md cursor-pointer"
        >
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
          ) : (
            <Play className="w-4 h-4 fill-slate-950" />
          )}
          <span>Execute Multi-Portfolio Comparison</span>
        </button>
      </div>
    );
  }

  const {
    summary_table: table,
    safest_portfolio: safest,
    highest_return_portfolio: highestRet,
    observations,
  } = comparison;

  // Bar chart comparison data
  const chartData = table.map((item) => ({
    name: item.portfolio_name,
    'Return (%)': Number((item.portfolio_annualized_return * 100).toFixed(2)),
    'Volatility (%)': Number((item.portfolio_annualized_volatility * 100).toFixed(2)),
    'VaR (%)': Number((item.var_percent * 100).toFixed(2)),
    'CVaR (%)': Number((item.cvar_percent * 100).toFixed(2)),
  }));

  return (
    <div className="flex flex-col gap-6">
      {/* Top Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-5 rounded-2xl bg-emerald-50/70 border border-emerald-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-white border border-emerald-200 flex items-center justify-center flex-shrink-0 shadow-xs">
            <ShieldCheck className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <div className="text-[11px] text-emerald-800 uppercase tracking-wider font-mono font-bold">
              Safest Allocation (Lowest Crash Risk)
            </div>
            <div className="text-base font-extrabold text-slate-900 mt-0.5">
              {safest}
            </div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-amber-50/70 border border-amber-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-white border border-amber-200 flex items-center justify-center flex-shrink-0 shadow-xs">
            <TrendingUp className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <div className="text-[11px] text-amber-800 uppercase tracking-wider font-mono font-bold">
              Highest Return Potential
            </div>
            <div className="text-base font-extrabold text-slate-900 mt-0.5">
              {highestRet}
            </div>
          </div>
        </div>
      </div>

      {/* Side-by-Side Comparative Metrics Table */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200">
          <h3 className="text-sm font-bold tracking-wider text-slate-900 uppercase flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-600" />
            <span>Scenario Comparison Matrix</span>
          </h3>
          <button
            onClick={onRunComparison}
            disabled={isLoading}
            className="text-xs text-amber-700 hover:text-amber-900 font-semibold transition"
          >
            {isLoading ? 'Recalculating...' : 'Refresh Comparison'}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="text-slate-500 border-b border-slate-200 text-[11px]">
                <th className="p-2.5 text-left font-semibold">Scenario</th>
                <th className="p-2.5 text-right font-semibold">Ann. Return</th>
                <th className="p-2.5 text-right font-semibold">Volatility</th>
                <th className="p-2.5 text-right font-semibold">VaR (95%)</th>
                <th className="p-2.5 text-right text-red-700 font-semibold">CVaR (Crash Loss)</th>
                <th className="p-2.5 text-right font-semibold">Worst Drawdown</th>
                <th className="p-2.5 text-right font-semibold">Prob of Loss</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {table.map((row) => {
                const isSafest = row.portfolio_name === safest;
                const isHighest = row.portfolio_name === highestRet;

                return (
                  <tr
                    key={row.portfolio_name}
                    className={`hover:bg-slate-50 transition ${
                      isSafest ? 'bg-emerald-50/40' : isHighest ? 'bg-amber-50/40' : ''
                    }`}
                  >
                    <td className="p-2.5 font-bold text-slate-900 flex items-center gap-2">
                      <span>{row.portfolio_name}</span>
                      {isSafest && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 font-semibold">
                          Safest
                        </span>
                      )}
                      {isHighest && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 font-semibold">
                          Top Gain
                        </span>
                      )}
                    </td>
                    <td className="p-2.5 text-right font-bold text-emerald-700">
                      {formatPercent(row.portfolio_annualized_return, 2, true)}
                    </td>
                    <td className="p-2.5 text-right text-slate-800 font-semibold">
                      {formatPercent(row.portfolio_annualized_volatility)}
                    </td>
                    <td className="p-2.5 text-right text-amber-800 font-semibold">
                      {formatCurrency(row.var_monetary, market, 0)} ({formatPercent(row.var_percent)})
                    </td>
                    <td className="p-2.5 text-right font-bold text-red-600">
                      {formatCurrency(row.cvar_monetary, market, 0)} ({formatPercent(row.cvar_percent)})
                    </td>
                    <td className="p-2.5 text-right text-slate-700">
                      {formatPercent(row.worst_loss_percent)}
                    </td>
                    <td className="p-2.5 text-right text-purple-700 font-semibold">
                      {formatPercent(row.probability_of_loss)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Observations List */}
        {observations && observations.length > 0 && (
          <div className="mt-4 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 flex flex-col gap-1.5">
            <div className="font-semibold text-slate-900">Key Takeaways:</div>
            {observations.map((obs, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <span className="text-amber-600 font-bold">•</span>
                <span>{obs}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Visual Bar Comparison Chart */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-xs">
        <h3 className="text-sm font-bold tracking-wider text-slate-900 uppercase mb-4 pb-3 border-b border-slate-200">
          Risk vs Return Profile Comparison (%)
        </h3>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 15, left: 0, bottom: 0 }}>
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
              <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(val) => `${val}%`} />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="p-3 rounded-xl bg-white border border-slate-200 text-xs font-mono shadow-xl text-slate-800">
                        <div className="text-slate-500 mb-1 border-b border-slate-100 pb-1 font-semibold">{label}</div>
                        {payload.map((item, idx) => (
                          <div key={idx} className="flex justify-between gap-3 text-slate-700 py-0.5">
                            <span style={{ color: item.color }} className="font-semibold">{item.name}:</span>
                            <span className="font-bold">{item.value}%</span>
                          </div>
                        ))}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
              <Bar dataKey="Return (%)" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Volatility (%)" fill="#06b6d4" radius={[4, 4, 0, 0]} />
              <Bar dataKey="VaR (%)" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              <Bar dataKey="CVaR (%)" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
