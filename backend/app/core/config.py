from pathlib import Path
from typing import Self

from pydantic import Field, SecretStr, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# The single .env lives at the repo root (shared with docker-compose).
ROOT_ENV_FILE = Path(__file__).resolve().parents[3] / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=ROOT_ENV_FILE, extra="ignore")

    database_url: str = "postgresql+psycopg://boomerang:boomerang@localhost:5433/boomerang"
    # Browser origins allowed to call the API. Native apps don't send Origin; this is for Expo web.
    cors_origins: list[str] = ["http://localhost:8081"]
    # Required, no default: the repo is public. HS256 wants at least 256 bits (RFC 7518 §3.2).
    jwt_secret: SecretStr = Field(min_length=32)
    access_token_expire_minutes: int = 1440
    # Booking rules (ADR 0012). The fee is in cents, all fees in, before GST/QST.
    # The business still has to set the real fee.
    pickup_fee: int = 499
    # Hours in America/Montreal; every pickup window falls inside them.
    service_open_hour: int = Field(default=9, ge=0, le=23)
    service_close_hour: int = Field(default=21, ge=0, le=23)
    # Pickups must be this close to downtown Montreal (ADR 0013).
    # Also Google's search bias radius, which it caps at 50 km.
    service_area_radius_m: int = Field(default=15_000, gt=0, le=50_000)
    # Places API (New) key, server only. Empty until #43; Google then refuses the calls.
    google_maps_api_key: SecretStr = SecretStr("")
    # Photo uploads (#45). Dev keeps them in a gitignored folder; Supabase Storage at M10.
    upload_dir: Path = Path(__file__).resolve().parents[2] / "uploads"
    upload_max_bytes: int = Field(default=10_000_000, gt=0)

    @model_validator(mode="after")
    def open_before_close(self) -> Self:
        if self.service_open_hour >= self.service_close_hour:
            raise ValueError("service_open_hour must be before service_close_hour")
        return self


settings = Settings()
