"""Integration tests for all FastAPI endpoints and error handlers."""

def test_health_endpoint(client):
    resp = client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert "international" in data["supported_markets"]
    assert "psx" in data["supported_markets"]


def test_markets_endpoint(client):
    resp = client.get("/markets")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["markets"]) >= 2
    ids = [m["id"] for m in data["markets"]]
    assert "international" in ids
    assert "psx" in ids


def test_assets_international(client):
    resp = client.get("/assets/international")
    assert resp.status_code == 200
    data = resp.json()
    assert data["market"] == "international"
    assert data["count"] == 10
    symbols = [a["symbol"] for a in data["assets"]]
    assert "AAPL" in symbols
    assert "MSFT" in symbols
    assert "NVDA" in symbols


def test_assets_psx(client):
    resp = client.get("/assets/psx")
    assert resp.status_code == 200
    data = resp.json()
    assert data["market"] == "psx"
    assert data["count"] == 10
    symbols = [a["symbol"] for a in data["assets"]]
    assert "OGDC" in symbols
    assert "PPL" in symbols
    assert "MCB" in symbols


def test_assets_unsupported_market(client):
    resp = client.get("/assets/tokyo")
    assert resp.status_code == 422
    data = resp.json()
    assert "error" in data


def test_market_data_endpoint(client):
    resp = client.get("/market-data/international?symbol=AAPL")
    assert resp.status_code == 200
    data = resp.json()
    assert data["symbol"] == "AAPL"
    assert data["records_count"] > 0
    record = data["data"][0]
    for key in ["date", "open", "high", "low", "close", "adj_close", "volume"]:
        assert key in record


def test_analytics_assets_endpoint(client):
    payload = {
        "market": "international",
        "symbols": ["AAPL", "MSFT", "NVDA"],
    }
    resp = client.post("/analytics/assets", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["market"] == "international"
    assert set(data["symbols"]) == {"AAPL", "MSFT", "NVDA"}
    assert "AAPL" in data["asset_statistics"]
    assert len(data["covariance_matrix"]) == 3
    assert len(data["correlation_matrix"]) == 3
    assert data["quality_report"]["aligned_trading_days"] > 0


def test_risk_simulate_endpoint_success(client):
    payload = {
        "portfolio_name": "Growth Tech Portfolio",
        "market": "international",
        "assets": ["AAPL", "MSFT"],
        "weights": [0.6, 0.4],
        "initial_capital": 100_000.0,
        "simulations": 2000,
        "horizon_days": 5,
        "confidence_level": 0.95,
        "random_seed": 42,
    }
    resp = client.post("/risk/simulate", json=payload)
    assert resp.status_code == 200
    data = resp.json()

    assert data["portfolio_name"] == "Growth Tech Portfolio"
    assert data["simulations_count"] == 2000
    assert data["horizon_days"] == 5

    rm = data["risk_metrics"]
    assert rm["confidence_level"] == 0.95
    assert rm["var_monetary"] > 0
    assert rm["cvar_monetary"] >= rm["var_monetary"]
    assert len(data["loss_distribution_sample"]) > 0
    assert "sign_convention" in data


def test_risk_simulate_invalid_weights_sum(client):
    payload = {
        "portfolio_name": "Bad Weights",
        "market": "international",
        "assets": ["AAPL", "MSFT"],
        "weights": [0.3, 0.3],  # Sum = 0.6 != 1.0
        "initial_capital": 100_000.0,
    }
    resp = client.post("/risk/simulate", json=payload)
    assert resp.status_code == 400
    data = resp.json()
    assert data["error"] == "InvalidWeightsError"


def test_risk_simulate_negative_weights(client):
    payload = {
        "portfolio_name": "Short Weights",
        "market": "international",
        "assets": ["AAPL", "MSFT"],
        "weights": [1.2, -0.2],
        "initial_capital": 100_000.0,
    }
    resp = client.post("/risk/simulate", json=payload)
    assert resp.status_code == 400
    data = resp.json()
    assert data["error"] == "InvalidWeightsError"


def test_risk_simulate_schema_validation_error(client):
    payload = {
        "portfolio_name": "Invalid Capital",
        "market": "international",
        "assets": ["AAPL"],
        "weights": [1.0],
        "initial_capital": -500.0,  # gt=0 constraint violation
    }
    resp = client.post("/risk/simulate", json=payload)
    assert resp.status_code == 422
    data = resp.json()
    assert data["error"] == "RequestValidationError"


def test_risk_compare_endpoint(client):
    payload = {
        "comparison_name": "Conservative vs Aggressive",
        "scenarios": [
            {
                "portfolio_name": "Portfolio Conservative",
                "market": "international",
                "assets": ["AAPL", "MSFT"],
                "weights": [0.5, 0.5],
                "initial_capital": 100_000.0,
                "simulations": 1000,
                "random_seed": 10,
            },
            {
                "portfolio_name": "Portfolio Aggressive",
                "market": "international",
                "assets": ["AAPL", "NVDA"],
                "weights": [0.2, 0.8],
                "initial_capital": 100_000.0,
                "simulations": 1000,
                "random_seed": 20,
            },
        ],
    }
    resp = client.post("/risk/compare", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert "comparison_id" in data
    assert len(data["results"]) == 2
    assert len(data["summary_table"]) == 2
    assert "safest_portfolio" in data
    assert "highest_return_portfolio" in data
    assert len(data["observations"]) >= 2
