'use client';

import React from 'react';
import {
  Play,
  ArrowRight,
  TrendingUp,
  ShieldAlert,
  Cpu,
} from 'lucide-react';

interface HeroOverlayProps {
  onEnterSimulator: () => void;
}

export const HeroOverlay: React.FC<HeroOverlayProps> = ({ onEnterSimulator }) => {
  return (
    <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 sm:px-6 lg:px-8 py-12 text-center pointer-events-auto">
      {/* 1. Eyebrow Badge */}
      <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-white/95 border border-amber-300/80 shadow-xs backdrop-blur-md mb-5 hover:border-amber-400 hover:shadow-sm transition-all duration-300">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
        </span>
        <span className="text-[11px] sm:text-xs font-bold tracking-[0.18em] text-amber-950 uppercase font-mono">
          QUANTITATIVE FINANCE & STOCHASTIC RISK LAB
        </span>
        <span className="hidden md:inline-block text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300/60">
          FASTAPI • PYTHON • NEXT.JS
        </span>
      </div>

      {/* 2. Pre-Title Label */}
      <div className="text-[11px] sm:text-xs font-extrabold tracking-[0.3em] text-amber-700 uppercase mb-2">
        ✦ Institutional Multi-Portfolio Workstation ✦
      </div>

      {/* 3. Main Title: MONTE CARLO */}
      <h1 className="text-6xl sm:text-8xl lg:text-9xl font-black tracking-tight mb-6 select-none leading-none">
        <span className="bg-gradient-to-r from-amber-900 via-amber-600 to-amber-500 bg-clip-text text-transparent drop-shadow-sm font-sans">
          MONTE CARLO
        </span>
      </h1>

      {/* 4. Feature Highlight Pills */}
      <div className="flex items-center justify-center gap-2 sm:gap-3 max-w-4xl mx-auto mb-9 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white/95 border border-slate-200/90 shadow-xs text-xs text-slate-800 font-medium backdrop-blur-sm whitespace-nowrap">
          <TrendingUp className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
          <span>Correlated Geometric Brownian Motion</span>
        </div>

        <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white/95 border border-slate-200/90 shadow-xs text-xs text-slate-800 font-medium backdrop-blur-sm whitespace-nowrap">
          <ShieldAlert className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
          <span>VaR &amp; Expected Shortfall (CVaR)</span>
        </div>

        <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white/95 border border-slate-200/90 shadow-xs text-xs text-slate-800 font-medium backdrop-blur-sm whitespace-nowrap">
          <Cpu className="w-3.5 h-3.5 text-cyan-600 flex-shrink-0" />
          <span>Cholesky Factorization &amp; Spectral Repair</span>
        </div>
      </div>

      {/* 5. Primary Action CTA Button (Only Run Monte Carlo Simulation) */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <button
          onClick={onEnterSimulator}
          className="group relative inline-flex items-center justify-center px-9 py-4 text-base sm:text-lg font-extrabold text-slate-950 rounded-2xl overflow-hidden shadow-xl transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer glow-gold"
          style={{
            background: 'linear-gradient(135deg, #fef08a 0%, #f59e0b 50%, #d97706 100%)',
          }}
        >
          <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <Play className="w-5 h-5 mr-2.5 fill-slate-950 text-slate-950 group-hover:scale-110 transition-transform" />
          <span>Run Monte Carlo Simulation</span>
          <ArrowRight className="w-5 h-5 ml-2.5 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>

      {/* 6. Bottom Footnote / Dual-Market Badge */}
      <div className="mt-8 flex items-center justify-center gap-4 text-xs font-mono text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
          🇺🇸 US Equities (USD)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
          🇵🇰 PSX Pakistan (PKR)
        </span>
        <span className="hidden sm:flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          FastAPI High-Performance Engine
        </span>
      </div>
    </div>
  );
};
