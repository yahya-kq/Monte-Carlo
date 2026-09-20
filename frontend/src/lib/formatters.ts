/**
 * Formatting utilities for financial currencies, percentages, and moments.
 */

import { MarketType } from './types';

export function formatCurrency(
  value: number | undefined | null,
  market: MarketType = 'international',
  decimals = 2
): string {
  if (value === undefined || value === null || isNaN(value)) {
    return '—';
  }

  const symbol = market === 'psx' ? 'PKR ' : '$';
  const formattedNumber = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(Math.abs(value));

  const sign = value < 0 ? '-' : '';
  return `${sign}${symbol}${formattedNumber}`;
}

export function formatPercent(
  value: number | undefined | null,
  decimals = 2,
  includePlus = false
): string {
  if (value === undefined || value === null || isNaN(value)) {
    return '—';
  }

  const pct = value * 100;
  const sign = includePlus && pct > 0 ? '+' : '';
  return `${sign}${pct.toFixed(decimals)}%`;
}

export function formatCompactNumber(value: number): string {
  if (Math.abs(value) >= 1_000_000) {
    return (value / 1_000_000).toFixed(1) + 'M';
  }
  if (Math.abs(value) >= 1_000) {
    return (value / 1_000).toFixed(0) + 'k';
  }
  return value.toFixed(0);
}

export function formatDate(dateString: string): string {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateString;
  }
}
