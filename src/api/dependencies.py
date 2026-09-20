"""Dependency injection for FastAPI endpoints."""

from functools import lru_cache
from src.data.cache_manager import CacheManager
from src.data.data_service import DataService
from src.simulation.engine import MonteCarloEngine


@lru_cache()
def get_data_service() -> DataService:
    """Provide singleton DataService instance."""
    return DataService()


@lru_cache()
def get_simulation_engine() -> MonteCarloEngine:
    """Provide singleton MonteCarloEngine instance."""
    return MonteCarloEngine()
