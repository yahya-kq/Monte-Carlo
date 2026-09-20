import asyncio
from contextlib import asynccontextmanager
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.api.dependencies import get_data_service
from src.api.error_handlers import register_error_handlers
from src.api.routes import analytics, health, markets, risk
from src.config import settings
from src.domain.models import MarketType

# Configure logging
logging.basicConfig(
    level=logging.INFO if not settings.debug else logging.DEBUG,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("monte_carlo_risk_simulator")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Warm up market data cache in memory on startup for sub-millisecond responses."""
    async def warm_cache():
        try:
            ds = get_data_service()
            intl_symbols = list(ds.get_available_assets(MarketType.INTERNATIONAL).keys())
            psx_symbols = list(ds.get_available_assets(MarketType.PSX).keys())
            
            logger.info("Pre-warming market data in-memory cache...")
            tasks = [
                ds.get_single_asset_data(sym, MarketType.INTERNATIONAL)
                for sym in intl_symbols
            ] + [
                ds.get_single_asset_data(sym, MarketType.PSX)
                for sym in psx_symbols
            ]
            await asyncio.gather(*tasks, return_exceptions=True)
            logger.info("Market data cache pre-warmed successfully for %d assets.", len(tasks))
        except Exception as e:
            logger.warning("Cache pre-warming encountered an issue: %s", e)

    asyncio.create_task(warm_cache())
    yield


# Create FastAPI app
app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    lifespan=lifespan,
    description=(
        "Production-grade, mathematically rigorous Multi-Portfolio Stock-Market Risk Simulator backend "
        "supporting both International (US) and Pakistan Stock Exchange (PSX) equities."
    ),
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

# Configure CORS for Next.js and frontend consumers
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register custom standardized domain and schema error handlers
register_error_handlers(app)

# Register API routes
app.include_router(health.router)
app.include_router(markets.router)
app.include_router(analytics.router)
app.include_router(risk.router)

logger.info(
    "Initialized %s v%s. Registered routers: health, markets, analytics, risk.",
    settings.app_name,
    settings.app_version,
)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
