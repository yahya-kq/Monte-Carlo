"""Unit tests for covariance, correlation, and positive-definite matrix repair."""

import numpy as np
import pytest

from src.analytics.covariance import (
    calculate_correlation_matrix,
    calculate_covariance_matrix,
    is_positive_definite,
    repair_positive_definite,
)
from src.analytics.returns import calculate_log_returns


def test_covariance_and_correlation_calculation(synthetic_prices):
    log_rets = calculate_log_returns(synthetic_prices)
    cov, symbols = calculate_covariance_matrix(log_rets)

    assert symbols == ["AAPL", "JPM", "XOM"]
    assert cov.shape == (3, 3)

    # Symmetry
    assert np.allclose(cov, cov.T, atol=1e-8)

    # Positive variances on diagonal
    assert np.all(np.diag(cov) > 0)

    # Correlation matrix
    corr = calculate_correlation_matrix(cov)
    assert corr.shape == (3, 3)
    assert np.allclose(np.diag(corr), 1.0, atol=1e-7)
    assert np.all(corr >= -1.0) and np.all(corr <= 1.0)
    assert np.allclose(corr, corr.T, atol=1e-8)


def test_is_positive_definite():
    # Identity matrix is strictly PD
    identity = np.eye(3)
    assert is_positive_definite(identity) is True

    # Singular matrix (rank 1)
    singular = np.ones((3, 3))
    assert is_positive_definite(singular) is False

    # Matrix with negative eigenvalue
    indefinite = np.array([
        [1.0, 1.5, 0.2],
        [1.5, 1.0, 0.1],
        [0.2, 0.1, 1.0],
    ])
    assert is_positive_definite(indefinite) is False


def test_repair_positive_definite_on_already_pd():
    pd_matrix = np.array([
        [2.0, 0.5],
        [0.5, 1.5],
    ])
    repaired, was_repaired, details = repair_positive_definite(pd_matrix)
    assert was_repaired is False
    assert details is None
    assert np.allclose(repaired, pd_matrix)


def test_repair_positive_definite_on_non_pd():
    # Construct symmetric matrix with a known negative eigenvalue
    # e.g., eigenvalues = [-0.1, 1.0, 2.0]
    Q, _ = np.linalg.qr(np.random.default_rng(99).standard_normal((3, 3)))
    diag_eigs = np.diag([-0.05, 1.2, 2.5])
    non_pd = Q @ diag_eigs @ Q.T
    non_pd = 0.5 * (non_pd + non_pd.T)

    assert is_positive_definite(non_pd) is False

    # Repair
    repaired, was_repaired, details = repair_positive_definite(non_pd, min_eigenvalue=1e-6)
    assert was_repaired is True
    assert details is not None
    assert is_positive_definite(repaired) is True

    # Cholesky factorization must succeed
    L = np.linalg.cholesky(repaired)
    assert L.shape == (3, 3)
