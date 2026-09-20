from pathlib import Path
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # API Settings
    app_name: str = "Multi-Portfolio Risk Simulator"
    app_version: str = "1.0.0"
    debug: bool = False
    api_prefix: str = ""
    cors_origins: list[str] = ["*"]

    # Market & Calendar Settings
    trading_days_international: int = Field(default=252, description="Annual trading days for international markets")
    trading_days_psx: int = Field(default=250, description="Annual trading days for PSX")

    # Simulation Defaults
    default_simulations: int = Field(default=10_000, ge=100, le=500_000)
    max_simulations: int = Field(default=100_000, description="Upper guardrail for single request simulations")
    default_confidence_level: float = Field(default=0.95, gt=0.0, lt=1.0)
    default_horizon_days: int = Field(default=1, ge=1, le=252)

    # Cache Settings
    cache_dir: Path = Path(".cache/market_data")
    cache_ttl_seconds: int = Field(default=3600 * 12, description="Cache TTL in seconds (12 hours default)")
    enable_cache: bool = True

    # Data Provider Settings
    http_timeout_seconds: float = 15.0
    max_retries: int = 3
    retry_backoff_factor: float = 0.5


settings = Settings()
