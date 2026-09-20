"""Exception handlers registering standardized error responses without leaking internal stack traces."""

from datetime import UTC, datetime
import logging
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from src.domain.exceptions import (
    DataProviderUnavailableError,
    InsufficientDataError,
    InvalidWeightsError,
    MarketDataError,
    NonPositiveDefiniteMatrixError,
    NumericalCalculationError,
    RiskSimulatorError,
    SymbolNotFoundError,
    UnsupportedMarketError,
    ValidationError,
)

logger = logging.getLogger(__name__)


def format_error_response(code: str, message: str, details: dict | None = None) -> dict:
    return {
        "error": code,
        "message": message,
        "details": details or {},
        "timestamp": datetime.now(UTC).isoformat(),
    }


def register_error_handlers(app: FastAPI) -> None:
    """Register all custom domain and validation exception handlers on the FastAPI application."""

    @app.exception_handler(RequestValidationError)
    async def request_validation_error_handler(request: Request, exc: RequestValidationError):
        logger.info("Request schema validation failed for %s: %s", request.url.path, exc.errors())
        clean_errors = []
        for err in exc.errors():
            clean_errors.append({
                "loc": err.get("loc", []),
                "msg": err.get("msg", ""),
                "type": err.get("type", ""),
            })
        return JSONResponse(
            status_code=422,
            content=format_error_response(
                code="RequestValidationError",
                message="One or more request parameters failed validation schema checks.",
                details={"errors": clean_errors},
            ),
        )

    @app.exception_handler(InvalidWeightsError)
    async def invalid_weights_handler(request: Request, exc: InvalidWeightsError):
        logger.warning("Invalid weights: %s", exc.message)
        return JSONResponse(
            status_code=400,
            content=format_error_response(
                code="InvalidWeightsError",
                message=exc.message,
                details=exc.details,
            ),
        )

    @app.exception_handler(UnsupportedMarketError)
    async def unsupported_market_handler(request: Request, exc: UnsupportedMarketError):
        logger.warning("Unsupported market: %s", exc.message)
        return JSONResponse(
            status_code=422,
            content=format_error_response(
                code="UnsupportedMarketError",
                message=exc.message,
                details=exc.details,
            ),
        )

    @app.exception_handler(SymbolNotFoundError)
    async def symbol_not_found_handler(request: Request, exc: SymbolNotFoundError):
        logger.warning("Symbol not found: %s", exc.message)
        return JSONResponse(
            status_code=404,
            content=format_error_response(
                code="SymbolNotFoundError",
                message=exc.message,
                details=exc.details,
            ),
        )

    @app.exception_handler(InsufficientDataError)
    async def insufficient_data_handler(request: Request, exc: InsufficientDataError):
        logger.warning("Insufficient data: %s", exc.message)
        return JSONResponse(
            status_code=422,
            content=format_error_response(
                code="InsufficientDataError",
                message=exc.message,
                details=exc.details,
            ),
        )

    @app.exception_handler(DataProviderUnavailableError)
    async def provider_unavailable_handler(request: Request, exc: DataProviderUnavailableError):
        logger.error("External provider unavailable: %s", exc.message)
        return JSONResponse(
            status_code=502,
            content=format_error_response(
                code="DataProviderUnavailableError",
                message=exc.message,
                details=exc.details,
            ),
        )

    @app.exception_handler(NonPositiveDefiniteMatrixError)
    async def non_pd_matrix_handler(request: Request, exc: NonPositiveDefiniteMatrixError):
        logger.error("Covariance repair failure: %s", exc.message)
        return JSONResponse(
            status_code=500,
            content=format_error_response(
                code="NonPositiveDefiniteMatrixError",
                message=exc.message,
                details=exc.details,
            ),
        )

    @app.exception_handler(NumericalCalculationError)
    async def numerical_calculation_handler(request: Request, exc: NumericalCalculationError):
        logger.error("Numerical error: %s", exc.message)
        return JSONResponse(
            status_code=500,
            content=format_error_response(
                code="NumericalCalculationError",
                message=exc.message,
                details=exc.details,
            ),
        )

    @app.exception_handler(ValidationError)
    async def generic_validation_handler(request: Request, exc: ValidationError):
        logger.warning("Domain validation error: %s", exc.message)
        return JSONResponse(
            status_code=400,
            content=format_error_response(
                code="ValidationError",
                message=exc.message,
                details=exc.details,
            ),
        )

    @app.exception_handler(RiskSimulatorError)
    async def generic_risk_simulator_handler(request: Request, exc: RiskSimulatorError):
        logger.error("Risk simulator domain error: %s", exc.message)
        return JSONResponse(
            status_code=500,
            content=format_error_response(
                code="RiskSimulatorError",
                message=exc.message,
                details=exc.details,
            ),
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception):
        logger.exception("Unhandled server exception processing %s: %s", request.url.path, exc)
        return JSONResponse(
            status_code=500,
            content=format_error_response(
                code="InternalServerError",
                message="An unexpected internal server error occurred while processing your request.",
                details={"error_class": exc.__class__.__name__},
            ),
        )
