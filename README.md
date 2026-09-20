# Monte Carlo Risk Simulator

A quantitative portfolio risk simulator designed to evaluate market risk, Value at Risk, and Conditional Value at Risk for multi asset equity portfolios across International and Pakistan markets.

## Overview

Monte Carlo simulation is a mathematical technique used in quantitative finance to model the probability of different outcomes when random variables are present.

In this simulator, the model generates thousands of potential future price paths for a portfolio of stocks using historical return statistics and asset correlation structures.

### Important Note on Purpose

This platform is strictly a risk simulator. It is designed to model downside risk, tail loss, and capital loss exposure under volatile market conditions.

Stock market Monte Carlo simulations do not predict future profits and do not guarantee investment gains. The primary objective is to help investors and portfolio managers measure the magnitude of potential loss at specified confidence levels, preventing unrealistic expectations about guaranteed financial returns.

## Financial Markets and Equity Universes

The simulator models portfolios across two distinct equity markets:

### 1. International Equity Market (United States)
* Benchmark annual trading calendar: 252 trading days
* Currency: USD
* Equities covered: Apple (AAPL), Microsoft (MSFT), Alphabet (GOOGL), Amazon (AMZN), NVIDIA (NVDA), JPMorgan Chase (JPM), Johnson & Johnson (JNJ), Exxon Mobil (XOM), Tesla (TSLA), Visa (V).

### 2. Pakistan Stock Exchange (PSX)
* Benchmark annual trading calendar: 250 trading days
* Currency: PKR
* Equities covered: Oil and Gas Development Company (OGDC), Pakistan Petroleum Limited (PPL), Mari Petroleum (MARI), The Hub Power Company (HUBC), Fauji Fertilizer Company (FFC), Engro Fertilizers (EFERT), MCB Bank (MCB), United Bank Limited (UBL), Meezan Bank (MEBL), Systems Limited (SYS).

## Data Sources and Market APIs

The simulator uses real market data collected directly through live and historical market endpoints:

* **United States Equities**: Daily historical adjusted closing prices and trading volume are pulled through the Yahoo Finance API. Data includes price adjustments for stock splits and dividend distributions to maintain continuous returns.
* **Pakistan Stock Exchange Equities**: Historical and end of day trade records are retrieved from the official Pakistan Stock Exchange Data Portal (DPS) with automated secondary resolution to Yahoo Finance for high availability.
* **Authenticity**: All simulations use genuine historical price series. The system computes true historical daily log returns, sample covariance matrices, and correlation structures across assets before running Monte Carlo paths.

## Key Risk Metrics

The simulation engine calculates standard institutional risk metrics:

* **Value at Risk (VaR)**: The maximum loss expected over a designated horizon at 90 percent, 95 percent, or 99 percent confidence.
* **Conditional Value at Risk (CVaR / Expected Shortfall)**: The expected average loss given that the loss has exceeded the Value at Risk threshold. CVaR captures extreme tail risk that single point percentiles miss.
* **Loss Distribution**: The full empirical spread of simulated portfolio outcomes, including maximum loss, probability of loss, skewness, and kurtosis.
* **Multi Portfolio Comparison**: Side by side evaluation of multiple asset allocations to compare relative tail risk.

## Technologies Used

* **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS, Recharts, and Three.js.
* **Backend**: FastAPI, Python 3.12, NumPy, pandas, and SciPy.
* **Deployment**: Optimized for Vercel deployment with client side simulation fallback and fast in memory caching.
