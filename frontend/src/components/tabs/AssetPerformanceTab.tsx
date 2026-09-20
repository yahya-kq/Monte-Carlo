'use client';

import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { formatPercent } from '@/lib/formatters';
import { AssetAnalyticsResponse, MarketDataResponse, MarketType } from '@/lib/types';
import { Activity, Grid, Layers } from 'lucide-react';

interface AssetPerformanceTabProps {
  analytics: AssetAnalyticsResponse | null;
  marketData: MarketDataResponse | null;
  market: MarketType;
}

const LINE_COLORS = [
  '#10b981', // emerald
  '#f59e0b', // amber
  '#06b6d4', // cyan
  '#ec4899', // pink
  '#8b5cf6', // purple
  '#3b82f6', // blue
  '#f97316', // orange
  '#14b8a6', // teal
  '#eab308', // yellow
  '#ef4444', // red
];

export const AssetPerformanceTab: React.FC<AssetPerformanceTabProps> = ({
  analytics,
  marketData,
}) => {
  if (!analytics) {
    return (
      <div className="p-8 text-center text-slate-500 font-mono">
        Loading multi-asset statistical analytics...
      </div>
    );
  }

  const { symbols, correlation_matrix: corrMatrix, asset_statistics: stats } = analytics;

  // Build normalized price trajectory series from marketData if available
  let chartData: Record<string, number | string>[] = [];
  if (marketData && marketData.dates && marketData.close_prices) {
    const dates = marketData.dates;
    const priceCols = marketData.close_prices;

    chartData = dates.map((date, idx) => {
      const row: Record<string, number | string> = { date };
      symbols.forEach((sym) => {
        const series = priceCols[sym];
        if (series && series.length > idx) {
          const basePrice = series[0] || 1;
          const currentPrice = series[idx];
          // Normalized return percentage: ((P_t - P_0) / P_0) * 100
          row[sym] = Number((((currentPrice - basePrice) / basePrice) * 100).toFixed(2));
        }
      });
      return row;
    });
  }

  // Helper for correlation cell color
  const getCorrColor = (val: number) => {
    if (val >= 0.8) return 'bg-emerald-100 text-emerald-900 border-emerald-300';
    if (val >= 0.5) return 'bg-amber-100 text-amber-900 border-amber-300';
    if (val >= 0.2) return 'bg-slate-100 text-slate-800 border-slate-200';
    if (val >= 0.0) return 'bg-slate-50 text-slate-600 border-slate-200';
    return 'bg-sky-100 text-sky-900 border-sky-300';
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Historical Performance Line Chart */}
      {chartData.length > 0 && (
        <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200">
            <div>
              <h3 className="text-sm font-bold tracking-wider text-slate-900 uppercase flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-600" />
                <span>Historical Stock Performance (% Growth Indexed)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Shows relative percentage gains of each selected company starting from 0% at the beginning of the period.
              </p>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 15, left: 0, bottom: 0 }}>
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} minTickGap={40} />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={11}
                  tickFormatter={(val) => `${val}%`}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="p-3 rounded-xl bg-white border border-slate-200 text-xs font-mono shadow-xl text-slate-800">
                          <div className="text-slate-500 mb-1 border-b border-slate-100 pb-1 font-semibold">{label}</div>
                          {payload.map((item, idx) => (
                            <div key={idx} className="flex justify-between gap-3 text-slate-700 py-0.5">
                              <span style={{ color: item.color }} className="font-bold">{item.name}:</span>
                              <span className="font-mono font-semibold">{item.value}%</span>
                            </div>
                          ))}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                {symbols.map((sym, index) => (
                  <Line
                    key={sym}
                    type="monotone"
                    dataKey={sym}
                    stroke={LINE_COLORS[index % LINE_COLORS.length]}
                    strokeWidth={2}
                    dot={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Correlation Matrix & Asset Moments Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Correlation Heatmap */}
        <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <Grid className="w-4 h-4 text-amber-600" />
              <h3 className="text-sm font-bold tracking-wider text-slate-900 uppercase">
                Correlation Heatmap
              </h3>
            </div>
            <span className="text-[11px] text-slate-500 font-mono font-medium">Scale: -1.0 to +1.0</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono border-collapse">
              <thead>
                <tr>
                  <th className="p-1.5 text-left text-slate-400"></th>
                  {symbols.map((s) => (
                    <th key={s} className="p-1.5 text-center text-slate-800 font-bold">
                      {s}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {corrMatrix.map((row, i) => (
                  <tr key={symbols[i]}>
                    <td className="p-1.5 font-bold text-slate-800">{symbols[i]}</td>
                    {row.map((val, j) => (
                      <td key={j} className="p-1 text-center">
                        <div
                          className={`p-1.5 rounded-lg border text-[11px] font-bold ${getCorrColor(
                            val
                          )}`}
                          title={`Correlation (${symbols[i]}, ${symbols[j]}): ${val.toFixed(4)}`}
                        >
                          {val.toFixed(2)}
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-[11px] text-slate-500 mt-3.5 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
            <strong>Diversification tip:</strong> Lower correlation numbers mean these stocks don&apos;t move in sync, which naturally cushions your portfolio against sharp drops.
          </p>
        </div>

        {/* Asset Statistical Moments Table */}
        <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-200">
            <Layers className="w-4 h-4 text-cyan-600" />
            <h3 className="text-sm font-bold tracking-wider text-slate-900 uppercase">
              Individual Stock Statistics
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="text-slate-500 border-b border-slate-200 text-[11px]">
                  <th className="p-2 text-left font-semibold">Stock</th>
                  <th className="p-2 text-right font-semibold">Ann. Return</th>
                  <th className="p-2 text-right font-semibold">Volatility</th>
                  <th className="p-2 text-right font-semibold">Worst Day</th>
                  <th className="p-2 text-right font-semibold">Best Day</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {Object.values(stats).map((st) => (
                  <tr key={st.symbol} className="hover:bg-slate-50 transition">
                    <td className="p-2 font-bold text-slate-900">{st.symbol}</td>
                    <td
                      className={`p-2 text-right font-bold ${
                        st.annualized_return_arithmetic >= 0 ? 'text-emerald-700' : 'text-red-700'
                      }`}
                    >
                      {formatPercent(st.annualized_return_arithmetic, 2, true)}
                    </td>
                    <td className="p-2 text-right font-semibold text-slate-800">
                      {formatPercent(st.annualized_volatility)}
                    </td>
                    <td className="p-2 text-right text-red-600 font-medium">
                      {formatPercent(st.min_return)}
                    </td>
                    <td className="p-2 text-right text-emerald-600 font-medium">
                      {formatPercent(st.max_return)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
