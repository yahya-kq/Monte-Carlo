# Monte Carlo Risk Simulator

A quantitative portfolio risk simulator designed to evaluate market risk, Value at Risk, and Conditional Value at Risk for multi asset equity portfolios across International and Pakistan markets.

## Overview

Monte Carlo simulation is a mathematical technique used in quantitative finance to model the probability of different outcomes when random variables are present.

In this simulator, the model generates thousands of potential future price paths for a portfolio of stocks using historical return statistics and asset correlation structures.

### Important Note on Purpose

This platform is strictly a risk simulator. It is designed to model downside risk, tail loss, and capital loss exposure under volatile market conditions.

Stock market Monte Carlo simulations do not predict future profits and do not guarantee investment gains. The primary objective is to help investors and portfolio managers measure the magnitude of potential loss at specified confidence levels, preventing unrealistic expectations about guaranteed financial returns.

## How the Dashboard Works

The web application provides an institutional grade risk workstation structured around an interactive control panel and four analytical tabs.

### 1. Control Panel and Portfolio Builder

Located in the left configuration sidebar, the control panel allows users to define the complete investment universe and mathematical parameters:

* **Market Selection**: Toggle between International Equity Market (United States, denominated in USD) and Pakistan Stock Exchange (denominated in PKR). Switching markets instantly updates the ticker registry and historical trading parameters.
* **Asset Universe Selection**: Choose any combination of supported blue chip equities. Search by symbol or company name.
* **Capital Weight Allocation**: Assign custom portfolio weights to individual assets. The interface provides an automated normalize feature that proportionally adjusts weightings to guarantee an exact sum of one hundred percent.
* **Initial Capital**: Define portfolio starting value (for example, 100,000 USD or 10,000,000 PKR).
* **Number of Simulation Paths**: Configure the sample size from 1,000 up to 50,000 simulated paths. Higher path volumes yield higher precision for extreme tail percentiles.
* **Forecast Horizon**: Select projection duration between 1 trading day and 252 trading days (one full trading year).
* **Confidence Level**: Choose institutional risk thresholds at 90 percent, 95 percent, or 99 percent confidence intervals.
* **Random Seed Control**: Toggle random seed fixation for deterministic reproducibility during audits and backtesting.

### 2. Top Level KPI Metric Ribbon

Immediately above the analysis workspace, the KPI ribbon surfaces high level summary metrics derived from the latest simulation run:

* **Total Portfolio Capital**: Current starting asset base and currency unit.
* **Value at Risk (VaR)**: Maximum expected monetary loss at the chosen confidence level over the designated horizon.
* **Conditional Value at Risk (CVaR)**: Expected average loss if losses cross beyond the Value at Risk cutoff boundary.
* **Expected Return**: Mean annualized percentage gain or loss across all simulated geometric Brownian paths.
* **Annualized Volatility**: Portfolio standard deviation factoring in historical asset covariance.
* **Worst Case Drawdown**: Empirical maximum loss observed across all simulated iteration trajectories.

### 3. Dedicated Analytical Tabs

The workspace separates quantitative evaluations into four dedicated views:

#### Tab 1: Loss Distribution and Tail Risk Analysis
* **Empirical Probability Density**: Interactive histogram comparing simulated portfolio returns against a parametric normal distribution.
* **Tail Loss Visualizer**: Color coded critical regions highlighting the 5th percentile, 1st percentile, Value at Risk cutoff, and Conditional Value at Risk average loss zone.
* **Cumulative Distribution Function**: Sigmoid curve displaying cumulative probabilities of sustaining specific dollar loss thresholds.
* **Distribution Higher Moments**: Quantitative tables detailing empirical skewness, excess kurtosis, and Jarque Bera normality tests.

#### Tab 2: Asset Performance and Trajectory Paths
* **Simulation Trajectory Fan Chart**: Multi line time series chart mapping portfolio wealth trajectories over the forecast horizon. Displays the 5th percentile, 25th percentile, median 50th percentile, 75th percentile, and 95th percentile confidence bands.
* **Interactive Three Dimensional Surface Visualization**: Three.js hardware accelerated canvas rendering thousands of simulated paths in a dynamic spatial manifold.
* **Asset Correlation Heatmap**: Matrix displaying pairwise Pearson correlation coefficients across selected equities to evaluate diversification efficiency.
* **Historical Asset Profiler**: Comparative statistics for individual assets, including annualized return, daily volatility, and Sharpe ratio.

#### Tab 3: Multi Portfolio Scenario Comparison
* **Side by Side Allocation Benchmarking**: Evaluates the active user portfolio alongside established institutional benchmarks:
  * Aggressive Growth (heavily weighted towards higher beta technology equities).
  * Balanced Core (diversified exposure across defensive and cyclicals).
  * Capital Preservation (conservative allocation prioritizing cash flows and lower volatility).
* **Comparative Risk Scorecard**: Direct tabular comparison of expected return, Value at Risk, Conditional Value at Risk, and Sharpe ratio across all scenarios.
* **Tail Risk Trade Off Scatter**: Graphical plot visualizing risk versus return frontiers for each allocation structure.

#### Tab 4: Model Audit and Quantitative Lineage
* **Mathematical Specification**: Full documentation of stochastic differential equations and discrete time approximations applied by the engine.
* **Data Lineage**: Exact source timestamps, record counts, and API origin endpoints for all price feeds utilized in covariance matrix construction.
* **Model Assumptions**: Explicit disclosure of Geometric Brownian Motion assumptions, constant drift parameters, and covariance stationarity limitations.

## Mathematical Framework and Simulation Mechanics

The platform executes a multi asset Geometric Brownian Motion simulation model incorporating correlated stochastic shocks.

### 1. Daily Log Returns and Historical Moments

For each asset, the system extracts adjusted close price series and computes continuous logarithmic returns:

```text
r_i,t = ln(P_i,t / P_i,t-1)
```

From historical return vectors, sample mean return vectors (mu) and the sample covariance matrix (Sigma) are calculated.

### 2. Covariance and Correlation Decomposition

Because asset returns exhibit mutual dependence, uncorrelated standard normal random variates cannot be applied directly. The engine applies Cholesky decomposition to factor the covariance matrix:

```text
Sigma = L * L^T
```

Where L is a lower triangular matrix. When a vector of independent standard normal random variables Z is multiplied by L, the resulting vector epsilon = L * Z possesses the exact covariance and correlation structure of the historical market data:

```text
Cov(epsilon) = E[epsilon * epsilon^T] = L * E[Z * Z^T] * L^T = L * I * L^T = Sigma
```

### 3. Geometric Brownian Motion Trajectories

Asset prices follow stochastic differential equations governed by Geometric Brownian Motion. Using Ito's lemma, the discrete time recursive formulation for daily time steps (dt) is:

```text
S_i(t + dt) = S_i(t) * exp((mu_i - 0.5 * sigma_i^2) * dt + sigma_i * sqrt(dt) * epsilon_i)
```

Where:
* mu_i is the annualized drift rate of asset i.
* sigma_i is the annualized historical volatility of asset i.
* 0.5 * sigma_i^2 is the Ito drift adjustment preventing upward valuation bias in geometric compounding.
* epsilon_i is the correlated standard normal random shock for asset i.

### 4. Portfolio Valuation and Aggregation

At each time step across every simulation path, portfolio total wealth is aggregated according to the asset allocation vector w:

```text
V(t) = Sum_{i=1}^N (w_i * S_i(t) / S_i(0)) * V(0)
```

At the target horizon T, portfolio returns are sorted to construct the empirical cumulative distribution.

### 5. Tail Risk Formulations

From the empirical simulated distribution of dollar profit and loss outcomes:

* **Value at Risk (VaR)** at confidence level alpha (such as 0.95):
  ```text
  VaR_alpha = - Infimum { x in RealNumbers : P(Loss <= x) >= alpha }
  ```
* **Conditional Value at Risk (CVaR / Expected Shortfall)**:
  ```text
  CVaR_alpha = E[ Loss | Loss >= VaR_alpha ]
  ```

CVaR averages all simulated outcomes within the worst (1 - alpha) percentile tail, providing a coherent risk measure that penalizes severe black swan losses.

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

## Data Pipeline and Architecture

The simulator uses real market data collected directly through live and historical market endpoints:

* **United States Equities**: Daily historical adjusted closing prices and trading volume are pulled through the Yahoo Finance API. Data includes price adjustments for stock splits and dividend distributions to maintain continuous returns.
* **Pakistan Stock Exchange Equities**: Historical and end of day trade records are retrieved from the official Pakistan Stock Exchange Data Portal (DPS) with automated secondary resolution to Yahoo Finance for high availability.
* **Authenticity and Verification**: All simulations use genuine historical price series. The system computes true historical daily log returns, sample covariance matrices, and correlation structures across assets before running Monte Carlo paths.
* **High Performance Caching**: Historical asset series are cached on disk using Apache Parquet columnar storage. On application boot, an asynchronous cache warming routine loads asset matrices into memory, reducing simulation latency to sub 30 milliseconds.
* **Client Side Resilience**: The frontend incorporates a complete client side mathematical fallback engine. If the user accesses the interface while the Python backend is connecting, the application automatically computes correlated Cholesky Monte Carlo simulations directly inside the browser using WebAssembly and TypeScript vector routines.

## Technologies Used

* **Frontend**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS, Recharts for financial charting, and Three.js for interactive spatial surface visualization.
* **Backend**: FastAPI, Python 3.12, NumPy for vector algebra, pandas for time series manipulation, and SciPy for statistical distribution modeling.
* **Deployment**: Optimized for Vercel deployment with native subfolder resolution and zero configuration builds.
