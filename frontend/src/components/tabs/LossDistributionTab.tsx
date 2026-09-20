'use client';

import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { formatCurrency, formatPercent } from '@/lib/formatters';
import { MarketType, SimulationResponse } from '@/lib/types';
import { ShieldAlert, Flame, Info } from 'lucide-react';

interface LossDistributionTabProps {
  simulation: SimulationResponse | null;
  market: MarketType;
}

export const LossDistributionTab: React.FC<LossDistributionTabProps> = ({
  simulation,
  market,
}) => {
  if (!simulation) {
    return (
      <div className="p-8 text-center text-slate-500 font-mono">
        No simulation data. Click &ldquo;Simulate Risk&rdquo; to compute the loss distribution.
      </div>
    );
  }

  const { risk_metrics: rm, loss_distribution_sample } = simulation;

  // Build histogram / frequency distribution buckets from sample
  const numBuckets = 50;
  const sample = loss_distribution_sample || [];
  const minVal = sample[0] ?? 0;
  const maxVal = sample[sample.length - 1] ?? 1000;
  const bucketWidth = (maxVal - minVal) / numBuckets;

  const buckets: { loss: number; label: string; count: number; isTail: boolean }[] = [];
  for (let i = 0; i < numBuckets; i++) {
    const bucketStart = minVal + i * bucketWidth;
    const bucketEnd = bucketStart + bucketWidth;
    const center = (bucketStart + bucketEnd) / 2;
    const count = sample.filter((v) => v >= bucketStart && v < bucketEnd).length;
    const isTail = center >= rm.var_monetary;

    buckets.push({
      loss: Math.round(center),
      label: formatCurrency(center, market, 0),
      count,
      isTail,
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Chart Section */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-4 border-b border-slate-200">
          <div>
            <h3 className="text-sm font-bold tracking-wider text-slate-900 uppercase flex items-center gap-2">
              <span>Simulated Loss Distribution (Bell Curve)</span>
              <span className="text-[11px] font-medium text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
                {simulation.simulations_count.toLocaleString()} paths • {simulation.horizon_days}-day horizon
              </span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Spread of potential dollar outcomes. Green shows normal market movements; the dotted line marks your Value at Risk threshold.
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs font-mono">
            <div className="flex items-center gap-1.5 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span className="text-amber-900 font-semibold">VaR ({Math.round(rm.confidence_level * 100)}%): {formatCurrency(rm.var_monetary, market, 0)}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-red-50 px-2.5 py-1 rounded-lg border border-red-200">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
              <span className="text-red-900 font-semibold">CVaR: {formatCurrency(rm.cvar_monetary, market, 0)}</span>
            </div>
          </div>
        </div>

        {/* Recharts Area Chart */}
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={buckets} margin={{ top: 10, right: 15, left: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="bodyGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="tailGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.6} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="loss"
                stroke="#94a3b8"
                fontSize={11}
                tickFormatter={(val) => formatCurrency(val, market, 0)}
              />
              <YAxis stroke="#94a3b8" fontSize={11} />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="p-3 rounded-xl bg-white border border-slate-200 text-xs font-mono shadow-xl text-slate-800">
                        <div className="text-slate-500 mb-1">Loss Level: <span className="text-slate-900 font-bold">{data.label}</span></div>
                        <div className="text-slate-500">Frequency: <span className="text-amber-700 font-bold">{data.count} simulations</span></div>
                        {data.isTail && (
                          <div className="mt-1 text-red-600 font-bold flex items-center gap-1">
                            <Flame className="w-3.5 h-3.5" /> Severe Tail Risk (&ge; VaR)
                          </div>
                        )}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <ReferenceLine
                x={rm.var_monetary}
                stroke="#d97706"
                strokeWidth={2}
                strokeDasharray="4 4"
                label={{
                  value: `VaR ${formatCurrency(rm.var_monetary, market, 0)}`,
                  fill: '#b45309',
                  fontSize: 11,
                  position: 'top',
                  fontWeight: 'bold',
                }}
              />
              <Area
                type="monotone"
                dataKey="count"
                stroke="#059669"
                strokeWidth={2}
                fill="url(#bodyGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="flex items-center gap-2 mt-3 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
          <Info className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <span>
            <strong>How to read this:</strong> Positive amounts reflect potential loss or portfolio reduction. Negative amounts indicate profitable market trajectories.
          </span>
        </div>
      </div>

      {/* Tail Risk & Quantiles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Empirical Percentiles Table */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2 mb-3">
            <ShieldAlert className="w-4 h-4 text-amber-600" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Loss Percentiles (Expected Loss at Various Confidences)
            </h4>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
            {Object.entries(rm.percentiles).map(([key, val]) => {
              const label = key.toUpperCase().replace('_', '.');
              const isTail = key === 'p95' || key === 'p99' || key === 'p99_9';
              return (
                <div
                  key={key}
                  className={`p-2.5 rounded-xl border flex flex-col gap-0.5 ${
                    isTail
                      ? 'bg-red-50 border-red-200 text-red-900'
                      : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                >
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">{label}</span>
                  <span className="font-bold">{formatCurrency(val, market, 0)}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Higher Statistical Moments */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-3">
            <Flame className="w-4 h-4 text-red-600" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Shape of Risk & Tail Asymmetry
            </h4>
          </div>
          <div className="grid grid-cols-2 gap-2.5 text-xs font-mono">
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-[10px] text-slate-500 uppercase font-semibold">Skewness</div>
              <div className="text-sm font-bold text-slate-900">{rm.skewness.toFixed(3)}</div>
              <div className="text-[10px] text-slate-600 mt-0.5">
                {rm.skewness > 0 ? 'Heavy crash tail on right' : 'Symmetric dispersion'}
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-[10px] text-slate-500 uppercase font-semibold">Excess Kurtosis</div>
              <div className="text-sm font-bold text-slate-900">{rm.kurtosis.toFixed(3)}</div>
              <div className="text-[10px] text-slate-600 mt-0.5">
                {rm.kurtosis > 0 ? 'Fat tails (Black swan risk)' : 'Thin tails'}
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-[10px] text-slate-500 uppercase font-semibold">Average Simulated Loss</div>
              <div className="text-sm font-bold text-slate-900">
                {formatCurrency(rm.mean_simulated_loss_monetary, market, 0)}
              </div>
              <div className="text-[10px] text-slate-600 mt-0.5">
                {formatPercent(rm.mean_simulated_loss_percent)}
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-[10px] text-slate-500 uppercase font-semibold">Loss Volatility</div>
              <div className="text-sm font-bold text-slate-900">
                {formatCurrency(rm.loss_volatility_monetary, market, 0)}
              </div>
              <div className="text-[10px] text-slate-600 mt-0.5">
                {formatPercent(rm.loss_volatility_percent)} standard error
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
