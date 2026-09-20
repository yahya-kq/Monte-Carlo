"""Covariance, correlation, and positive-definite eigenvalue repair routines."""

import logging
import numpy as np
import pandas as pd

from src.domain.exceptions import NonPositiveDefiniteMatrixError

logger = logging.getLogger(__name__)


def calculate_covariance_matrix(returns: pd.DataFrame, ddof: int = 1) -> tuple[np.ndarray, list[str]]:
    """Compute sample covariance matrix from returns DataFrame.

    Returns:
        (cov_matrix as 2D numpy array, list of column symbols)
    """
    clean_returns = returns.dropna(how="any")
    if len(clean_returns) < 2:
        raise ValueError(f"At least 2 complete observations required for covariance, got {len(clean_returns)}")

    symbols = list(clean_returns.columns)
    cov_matrix = clean_returns.cov(ddof=ddof).to_numpy()
    return cov_matrix, symbols


def calculate_correlation_matrix(covariance_matrix: np.ndarray) -> np.ndarray:
    """Derive correlation matrix from covariance matrix with guaranteed bounds [-1, 1] and unit diagonal."""
    d = np.sqrt(np.diag(covariance_matrix))
    # Avoid zero division if an asset has zero variance
    d_inv = np.where(d > 0, 1.0 / d, 0.0)
    corr = covariance_matrix * np.outer(d_inv, d_inv)
    # Numerical hygiene: enforce diagonal = 1.0 and clip to [-1, 1]
    np.fill_diagonal(corr, 1.0)
    corr = np.clip(corr, -1.0, 1.0)
    return corr


def is_positive_definite(matrix: np.ndarray) -> bool:
    """Test if a symmetric matrix is strictly positive definite using Cholesky decomposition."""
    if matrix.shape[0] != matrix.shape[1]:
        return False
    try:
        # Check symmetry
        if not np.allclose(matrix, matrix.T, atol=1e-8):
            return False
        np.linalg.cholesky(matrix)
        return True
    except np.linalg.LinAlgError:
        return False


def repair_positive_definite(
    cov_matrix: np.ndarray,
    min_eigenvalue: float = 1e-7,
    preserve_diagonals: bool = True,
) -> tuple[np.ndarray, bool, str | None]:
    """Inspect and regularize a covariance matrix to ensure strict positive-definiteness

    for Cholesky factorization.

    Steps:
    1. Symmetrize the input matrix: 0.5 * (A + A.T)
    2. Compute eigenvalues and eigenvectors.
    3. If any eigenvalue < min_eigenvalue, floor at min_eigenvalue.
    4. Reconstruct covariance matrix.
    5. Optionally re-scale to preserve original asset variances (diagonals).
    6. Verify Cholesky decomposition succeeds.

    Returns:
        (repaired_matrix, regularization_applied, details_message)
    """
    n = cov_matrix.shape[0]
    # Symmetrize first
    sym_cov = 0.5 * (cov_matrix + cov_matrix.T)
    orig_diags = np.diag(sym_cov).copy()

    # Fast path: check Cholesky directly
    try:
        np.linalg.cholesky(sym_cov)
        return sym_cov, False, None
    except np.linalg.LinAlgError:
        pass

    logger.warning("Covariance matrix is not positive definite; applying spectral eigenvalue repair.")

    # Spectral decomposition
    eigenvalues, eigenvectors = np.linalg.eigh(sym_cov)
    min_found = float(np.min(eigenvalues))

    # Floor eigenvalues
    regularized_eigenvalues = np.maximum(eigenvalues, min_eigenvalue)
    reconstructed = eigenvectors @ np.diag(regularized_eigenvalues) @ eigenvectors.T
    reconstructed = 0.5 * (reconstructed + reconstructed.T)

    # Preserve original diagonals (variances) if requested
    if preserve_diagonals and np.all(orig_diags > 0):
        new_diags = np.diag(reconstructed)
        # Avoid division by zero
        scaling = np.sqrt(orig_diags / np.maximum(new_diags, 1e-12))
        reconstructed = reconstructed * np.outer(scaling, scaling)
        reconstructed = 0.5 * (reconstructed + reconstructed.T)

    # Final verification with small jitter if needed
    jitter = 1e-8
    attempts = 0
    while attempts < 5:
        try:
            np.linalg.cholesky(reconstructed)
            details = (
                f"Eigenvalue floor repair applied. Min eigenvalue raised from {min_found:.2e} "
                f"to {min_eigenvalue:.2e}. Diagonals preserved: {preserve_diagonals}."
            )
            return reconstructed, True, details
        except np.linalg.LinAlgError:
            reconstructed += jitter * np.eye(n)
            jitter *= 10
            attempts += 1

    raise NonPositiveDefiniteMatrixError(
        "Failed to regularize covariance matrix to positive-definiteness after 5 repair iterations.",
        details={"min_eigenvalue_found": min_found, "matrix_shape": list(cov_matrix.shape)},
    )
