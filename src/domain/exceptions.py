"""Domain and validation exceptions for the Multi-Portfolio Risk Simulator."""


class RiskSimulatorError(Exception):
    """Base exception for all domain errors."""
    def __init__(self, message: str, details: dict | None = None):
        super().__init__(message)
        self.message = message
        self.details = details or {}


class ValidationError(RiskSimulatorError):
    """Raised when request parameters, weights, or dimensions fail validation."""
    pass


class InvalidWeightsError(ValidationError):
    """Raised when portfolio weights do not sum to 1 or violate constraints."""
    pass


class UnsupportedMarketError(ValidationError):
    """Raised when an unrecognized market identifier is requested."""
    pass


class MarketDataError(RiskSimulatorError):
    """Base exception for external data provider failures."""
    pass


class SymbolNotFoundError(MarketDataError):
    """Raised when one or more requested symbols cannot be found or resolved."""
    pass


class InsufficientDataError(MarketDataError):
    """Raised when historical observations are too few for statistical estimation."""
    pass


class DataProviderUnavailableError(MarketDataError):
    """Raised when external data provider is unreachable or returns a fatal error."""
    pass


class NumericalCalculationError(RiskSimulatorError):
    """Raised when numerical routines (e.g. Cholesky, inversion) fail irrecoverably."""
    pass


class NonPositiveDefiniteMatrixError(NumericalCalculationError):
    """Raised when covariance matrix cannot be repaired to positive-definiteness."""
    pass
