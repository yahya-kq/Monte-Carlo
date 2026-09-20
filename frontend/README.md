# Multi-Portfolio Risk Simulator - Next.js Frontend (Phase 2)

A modern, high-performance financial risk dashboard and Monte Carlo simulation visualizer built with **Next.js 16 (Turbopack)**, **React 19**, **Three.js**, **Tailwind CSS**, and **Recharts**.

---

## Key Features

- **Interactive Monte Carlo Dashboard**:
  - Real-time simulation of multi-asset portfolios across **US Equities (NASDAQ/NYSE)** and **Pakistan Stock Exchange (PSX)**.
  - Value at Risk (VaR) and Conditional Value at Risk (CVaR / Expected Shortfall) analysis at 90%, 95%, and 99% confidence levels.
  - Full empirical loss distribution histogram and tail quantile visualization.
- **Dynamic Asset & Portfolio Configuration**:
  - Weight normalization, equal-weight (1/N) rebalancing, and interactive asset selection.
  - Multi-scenario comparison tab: compare energy, banking, tech, and diversified baskets side-by-side.
- **3D Casino & Risk Theme Visualizer**:
  - Immersive Three.js 3D hero experience with interactive dice and probability shaders.
- **Sub-Millisecond Fast Architecture**:
  - In-memory metadata caching and optimized `127.0.0.1` client connectivity.

---

## Quickstart

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```
Ensure the backend API URL is configured:
```ini
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Build for Production
```bash
npm run build
npm run start
```

### 5. Linting
```bash
npm run lint
```
