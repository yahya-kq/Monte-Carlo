'use client';

import React from 'react';
import { SimulationResponse } from '@/lib/types';
import { AlertCircle, Database, Cpu, BookOpen, ShieldCheck } from 'lucide-react';

interface ModelAuditTabProps {
  simulation: SimulationResponse | null;
}

export const ModelAuditTab: React.FC<ModelAuditTabProps> = ({ simulation }) => {
  if (!simulation) {
    return (
      <div className="p-8 text-center text-slate-500 font-mono">
        No simulation results available for audit inspection.
      </div>
    );
  }

  const { quality_report: qr, regularization_applied, regularization_details, warnings } = simulation;

  return (
    <div className="flex flex-col gap-6">
      {/* Data Quality & Provenance Card */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-200">
          <Database className="w-4 h-4 text-emerald-600" />
          <h3 className="text-sm font-bold tracking-wider text-slate-900 uppercase">
            Market Data Quality & Calendar Alignment Audit
          </h3>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono mb-4">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <div className="text-[10px] text-slate-500 uppercase font-semibold">Data Provider</div>
            <div className="text-sm font-bold text-slate-900 mt-0.5">{qr.data_source}</div>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <div className="text-[10px] text-slate-500 uppercase font-semibold">Aligned Trading Days</div>
            <div className="text-sm font-bold text-emerald-700 mt-0.5">{qr.aligned_trading_days} days</div>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <div className="text-[10px] text-slate-500 uppercase font-semibold">Historical Window</div>
            <div className="text-xs font-bold text-slate-800 mt-1">{qr.start_date} &rarr; {qr.end_date}</div>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <div className="text-[10px] text-slate-500 uppercase font-semibold">Dropped Dates</div>
            <div className="text-sm font-bold text-slate-800 mt-0.5">{qr.dropped_dates_count} dates</div>
          </div>
        </div>

        {/* Warnings list if any */}
        {warnings && warnings.length > 0 && (
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex flex-col gap-1">
            <div className="font-bold flex items-center gap-1.5 text-amber-800">
              <AlertCircle className="w-4 h-4" />
              <span>Data Alignment Notes:</span>
            </div>
            {warnings.map((w, idx) => (
              <div key={idx} className="ml-5 list-disc text-amber-900/90 font-mono text-[11px]">
                • {w}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Covariance Matrix Regularization Card */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-200">
          <Cpu className="w-4 h-4 text-cyan-600" />
          <h3 className="text-sm font-bold tracking-wider text-slate-900 uppercase">
            Covariance Spectral Regularization & Linear Algebra Audit
          </h3>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
          <div>
            <div className="text-xs font-bold text-slate-900">
              Cholesky Decomposition Status (L L^T = &Sigma;)
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              Strict positive-definiteness is mathematically required to guarantee valid correlated multi-asset simulation paths.
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {regularization_applied ? (
              <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-amber-100 text-amber-800 border border-amber-300">
                Eigenvalue Clipping Applied
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                Naturally Positive-Definite
              </span>
            )}
          </div>
        </div>

        {regularization_applied && regularization_details && (
          <div className="mt-3 p-3 rounded-xl bg-slate-100 border border-slate-200 text-xs font-mono text-slate-700">
            {regularization_details}
          </div>
        )}
      </div>

      {/* Mathematical Framework Reference */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-200">
          <BookOpen className="w-4 h-4 text-amber-600" />
          <h3 className="text-sm font-bold tracking-wider text-slate-900 uppercase">
            Quantitative Model Formulation & Methodology
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-700">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col gap-2">
            <div className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
              1. Correlated Geometric Brownian Motion (GBM)
            </div>
            <p className="text-slate-600 leading-relaxed">
              Asset returns follow a multivariate log-normal distribution over horizon H:
              <br />
              <code className="block my-1.5 p-2 rounded-lg bg-white border border-slate-200 text-slate-900 font-mono text-[11px]">
                r_H = H &times; (&mu; - 0.5 &times; diag(&Sigma;)) + &radic;H &times; L &times; Z
              </code>
              where L is the lower-triangular Cholesky factor (L L^T = &Sigma;) and Z is a vector of standard independent normal random numbers.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col gap-2">
            <div className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
              2. Value at Risk & Conditional VaR (Expected Shortfall)
            </div>
            <p className="text-slate-600 leading-relaxed">
              Monetary loss is defined as Initial Capital &minus; Terminal Value. At confidence level c:
              <br />
              <code className="block my-1.5 p-2 rounded-lg bg-white border border-slate-200 text-amber-800 font-mono text-[11px]">
                VaR_c = Percentile(Losses, 100 &times; c)
              </code>
              <code className="block my-1.5 p-2 rounded-lg bg-white border border-slate-200 text-red-700 font-mono text-[11px]">
                CVaR_c = E[Loss | Loss &ge; VaR_c]
              </code>
              CVaR calculates the average shortfall in the worst (1 &minus; c) tail, mathematically guaranteeing CVaR &ge; VaR.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
