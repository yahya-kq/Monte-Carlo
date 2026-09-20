"""Health check endpoint."""

from datetime import datetime, timezone
from fastapi import APIRouter
from src.api.schemas import HealthResponse
from src.config import settings
from src.domain.models import MarketType

router = APIRouter(tags=["Health"])


@router.get("/health", response_model=HealthResponse)
def health_check() -> HealthResponse:
    """Check service status, active version, and supported market providers."""
    return HealthResponse(
        status="ok",
        app_name=settings.app_name,
        version=settings.app_version,
        timestamp=datetime.now(timezone.utc).isoformat(),
        supported_markets=[m.value for m in MarketType],
    )
