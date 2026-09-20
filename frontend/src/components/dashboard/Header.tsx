'use client';

import React from 'react';
import { Coins, Activity, Menu, Compass } from 'lucide-react';
import { MarketType } from '@/lib/types';

interface HeaderProps {
  currentMarket: MarketType;
  onSelectMarket: (market: MarketType) => void;
  onReturnToHero: () => void;
  onToggleMobileSidebar: () => void;
  isBackendOnline: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentMarket,
  onSelectMarket,
  onReturnToHero,
  onToggleMobileSidebar,
  isBackendOnline,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-slate-200 bg-white/90 backdrop-blur-xl shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Left: Brand & Mobile Menu Button */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleMobileSidebar}
            className="lg:hidden p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition"
            aria-label="Toggle configuration sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div
            onClick={onReturnToHero}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-md shadow-amber-500/20 group-hover:scale-105 transition-transform">
              <Coins className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-base font-extrabold tracking-wider text-slate-900 leading-tight">
                MONTE CARLO
              </div>
              <div className="text-[10px] text-slate-500 font-mono tracking-wider uppercase font-semibold">
                Risk Workstation
              </div>
            </div>
          </div>
        </div>

        {/* Center: Market Switcher */}
        <div className="hidden sm:flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200">
          <button
            onClick={() => onSelectMarket('international')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              currentMarket === 'international'
                ? 'bg-white text-amber-800 border border-amber-300/80 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>🇺🇸 US Equities (USD)</span>
          </button>
          <button
            onClick={() => onSelectMarket('psx')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              currentMarket === 'psx'
                ? 'bg-white text-emerald-800 border border-emerald-300/80 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>🇵🇰 PSX Pakistan (PKR)</span>
          </button>
        </div>

        {/* Right: Backend Health Badge & Return to 3D Lounge */}
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-50 border border-slate-200 text-xs">
            <span
              className={`w-2 h-2 rounded-full ${
                isBackendOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
              }`}
            />
            <span className="text-slate-700 font-mono text-[11px] font-medium">
              {isBackendOnline ? 'FastAPI Online' : 'Local Fallback'}
            </span>
            <Activity className="w-3.5 h-3.5 text-slate-400" />
          </div>

          <button
            onClick={onReturnToHero}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 hover:text-slate-900 shadow-xs transition"
          >
            <Compass className="w-4 h-4 text-amber-600" />
            <span className="hidden sm:inline">3D Hero</span>
          </button>
        </div>
      </div>
    </header>
  );
};
