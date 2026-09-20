"""Local disk and in-memory cache manager for market data."""

import json
import logging
import time
from pathlib import Path
import pandas as pd

from src.config import settings

logger = logging.getLogger(__name__)


class CacheManager:
    """Manages cached historical market data on disk and in memory."""

    def __init__(self, cache_dir: Path | None = None, ttl_seconds: int | None = None):
        self.cache_dir = cache_dir or settings.cache_dir
        self.ttl_seconds = ttl_seconds if ttl_seconds is not None else settings.cache_ttl_seconds
        self.enabled = settings.enable_cache
        self._memory_cache: dict[str, tuple[float, pd.DataFrame]] = {}

        if self.enabled:
            self.cache_dir.mkdir(parents=True, exist_ok=True)

    def _get_file_path(self, key: str) -> Path:
        safe_key = "".join(c if c.isalnum() or c in ("-", "_") else "_" for c in key)
        return self.cache_dir / f"{safe_key}.parquet"

    def get(self, key: str) -> pd.DataFrame | None:
        """Retrieve cached DataFrame by key if still fresh."""
        if not self.enabled:
            return None

        current_time = time.time()

        # 1. Check in-memory cache
        if key in self._memory_cache:
            timestamp, df = self._memory_cache[key]
            if current_time - timestamp < self.ttl_seconds:
                return df.copy()
            else:
                del self._memory_cache[key]

        # 2. Check disk cache
        file_path = self._get_file_path(key)
        if file_path.exists():
            try:
                mtime = file_path.stat().st_mtime
                if current_time - mtime < self.ttl_seconds:
                    df = pd.read_parquet(file_path)
                    self._memory_cache[key] = (mtime, df)
                    return df.copy()
                else:
                    logger.debug("Cache expired for %s", key)
            except Exception as e:
                logger.warning("Failed to read cache for %s: %s", key, e)

        return None

    def set(self, key: str, df: pd.DataFrame) -> None:
        """Store DataFrame in in-memory and disk cache."""
        if not self.enabled or df.empty:
            return

        current_time = time.time()
        self._memory_cache[key] = (current_time, df.copy())

        file_path = self._get_file_path(key)
        try:
            df.to_parquet(file_path, index=True)
            logger.debug("Successfully cached data for %s to %s", key, file_path)
        except Exception as e:
            logger.warning("Failed to write parquet cache for %s: %s", key, e)

    def clear(self) -> None:
        """Clear all memory and disk caches."""
        self._memory_cache.clear()
        if self.cache_dir.exists():
            for f in self.cache_dir.glob("*.parquet"):
                try:
                    f.unlink()
                except Exception as e:
                    logger.warning("Failed to remove cache file %s: %s", f, e)
