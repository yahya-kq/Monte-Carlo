import os
import sys
from pathlib import Path

# Ensure project root is in sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from fastapi.testclient import TestClient
from main import app

def run_live_verification():
    client = TestClient(app)

    print("1. Testing GET /health...")
    r = client.get("/health")
    assert r.status_code == 200, r.text
    print(f"   -> Health: {r.json()}")

    print("\n2. Testing GET /markets...")
    r = client.get("/markets")
    assert r.status_code == 200, r.text
    print(f"   -> Markets: {r.json()}")

    print("\n3. Testing GET /assets/psx...")
    r = client.get("/assets/psx")
    assert r.status_code == 200, r.text
    psx_assets = r.json()
    symbols = [a["symbol"] for a in psx_assets["assets"]]
    print(f"   -> Found {len(symbols)} PSX assets: {symbols}")

    print("\n4. Testing POST /analytics/assets (live PSX)...")
    r = client.post("/analytics/assets", json={
        "market": "psx",
        "symbols": ["OGDC", "PPL", "FFC"],
    })
    assert r.status_code == 200, r.text
    res = r.json()
    trading_days = res["quality_report"]["aligned_trading_days"]
    ogdc_vol = res["asset_statistics"]["OGDC"]["annualized_volatility"]
    print(f"   -> Aligned trading days: {trading_days}")
    print(f"   -> OGDC annualized vol: {ogdc_vol * 100:.2f}%")
    print(f"   -> Covariance matrix shape: {len(res['covariance_matrix'])}x{len(res['covariance_matrix'][0])}")

    print("\n5. Testing POST /risk/simulate (live International portfolio)...")
    r = client.post("/risk/simulate", json={
        "portfolio_name": "Tech Growth",
        "market": "international",
        "assets": ["AAPL", "MSFT", "NVDA"],
        "weights": [0.4, 0.3, 0.3],
        "initial_capital": 50000.0,
        "simulations": 5000,
        "horizon_days": 10,
        "confidence_level": 0.95,
        "random_seed": 42,
    })
    assert r.status_code == 200, r.text
    sim = r.json()
    var_pct = sim["risk_metrics"]["var_percent"] * 100
    var_mon = sim["risk_metrics"]["var_monetary"]
    cvar_pct = sim["risk_metrics"]["cvar_percent"] * 100
    cvar_mon = sim["risk_metrics"]["cvar_monetary"]
    print(f"   -> Portfolio: {sim['portfolio_name']}")
    print(f"   -> Initial Capital: ${sim['initial_capital']:,.2f}")
    print(f"   -> 10-day VaR (95%): {var_pct:.2f}% (${var_mon:,.2f})")
    print(f"   -> 10-day CVaR (95%): {cvar_pct:.2f}% (${cvar_mon:,.2f})")
    print(f"   -> Regularization applied: {sim['regularization_applied']}")

    print("\n6. Testing POST /risk/compare (live PSX multi-portfolio)...")
    r = client.post("/risk/compare", json={
        "scenarios": [
            {
                "portfolio_name": "PSX Dividend Conservative",
                "market": "psx",
                "assets": ["FFC", "EFERT", "MCB"],
                "weights": [0.4, 0.3, 0.3],
                "initial_capital": 1000000.0,
                "simulations": 5000,
                "horizon_days": 20,
                "confidence_level": 0.95,
                "random_seed": 42,
            },
            {
                "portfolio_name": "PSX Oil & Gas Aggressive",
                "market": "psx",
                "assets": ["OGDC", "PPL", "MARI"],
                "weights": [0.4, 0.3, 0.3],
                "initial_capital": 1000000.0,
                "simulations": 5000,
                "horizon_days": 20,
                "confidence_level": 0.95,
                "random_seed": 42,
            },
        ]
    })
    assert r.status_code == 200, r.text
    comp = r.json()
    print(f"   -> Comparison ID: {comp['comparison_id']}")
    print(f"   -> Safest Portfolio: {comp['safest_portfolio']}")
    print(f"   -> Highest Return Portfolio: {comp['highest_return_portfolio']}")
    print(f"   -> Ranked by Risk (lowest to highest VaR): {comp['risk_rankings_by_var']}")
    for item in comp["summary_table"]:
        p_name = item["portfolio_name"]
        v_mon = item["var_monetary"]
        v_pct = item["var_percent"] * 100
        ann_vol = item["portfolio_annualized_volatility"] * 100
        print(f"      * {p_name}: VaR 95% = PKR {v_mon:,.2f} ({v_pct:.2f}%), Ann Vol = {ann_vol:.2f}%")

    print("\n========================================================")
    print("ALL LIVE ENDPOINTS AND DATA PROVIDERS VERIFIED AND WORKING!")
    print("========================================================")

if __name__ == "__main__":
    run_live_verification()
