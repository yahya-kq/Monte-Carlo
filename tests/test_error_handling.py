"""Tests for API error handling and HTTP status codes."""

from fastapi import status


def test_error_invalid_weights_sum(client):
    """Weights that sum to 0.7 instead of 1.0 must return HTTP 422 or 400."""
    payload = {
        "portfolio_name": "Bad Weights",
        "market": "international",
        "assets": ["AAPL", "MSFT"],
        "weights": [0.4, 0.3],  # Sum = 0.7
        "initial_capital": 100_000.0,
    }
    response = client.post("/risk/simulate", json=payload)
    assert response.status_code in (status.HTTP_400_BAD_REQUEST, status.HTTP_422_UNPROCESSABLE_ENTITY)
    data = response.json()
    assert "weights" in str(data).lower()


def test_error_negative_weights(client):
    """Negative weights for long portfolio must be rejected."""
    payload = {
        "portfolio_name": "Negative Weights",
        "market": "international",
        "assets": ["AAPL", "MSFT"],
        "weights": [1.2, -0.2],
        "initial_capital": 100_000.0,
    }
    response = client.post("/risk/simulate", json=payload)
    assert response.status_code in (status.HTTP_400_BAD_REQUEST, status.HTTP_422_UNPROCESSABLE_ENTITY)


def test_error_unknown_symbol(client):
    """Unknown symbol must return HTTP 404."""
    payload = {
        "portfolio_name": "Unknown Stock",
        "market": "international",
        "assets": ["AAPL", "NONEXISTENT"],
        "weights": [0.5, 0.5],
        "initial_capital": 100_000.0,
    }
    response = client.post("/risk/simulate", json=payload)
    assert response.status_code == status.HTTP_404_NOT_FOUND
    data = response.json()
    assert data["error"] == "SymbolNotFoundError"
    assert "NONEXISTENT" in data["message"]


def test_error_unsupported_market(client):
    """Unsupported market parameter must return HTTP 422 (Pydantic validation error)."""
    response = client.get("/assets/tokyo")
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


def test_error_invalid_simulation_counts(client):
    """Simulations count under 100 must be rejected with HTTP 422."""
    payload = {
        "portfolio_name": "Tiny Simulations",
        "market": "international",
        "assets": ["AAPL", "MSFT"],
        "weights": [0.5, 0.5],
        "simulations": 50,  # Below minimum 100
    }
    response = client.post("/risk/simulate", json=payload)
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


def test_error_invalid_confidence_level(client):
    """Confidence level >= 1.0 or <= 0.0 must be rejected with HTTP 422."""
    payload = {
        "portfolio_name": "Bad Confidence",
        "market": "international",
        "assets": ["AAPL", "MSFT"],
        "weights": [0.5, 0.5],
        "confidence_level": 1.5,
    }
    response = client.post("/risk/simulate", json=payload)
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


def test_error_insufficient_scenarios_for_comparison(client):
    """Comparison request with fewer than 2 scenarios must be rejected with HTTP 422."""
    payload = {
        "scenarios": [
            {
                "portfolio_name": "Solo",
                "market": "international",
                "assets": ["AAPL", "MSFT"],
                "weights": [0.5, 0.5],
            }
        ]
    }
    response = client.post("/risk/compare", json=payload)
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
