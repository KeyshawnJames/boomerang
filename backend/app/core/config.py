from datetime import date
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
    # A window is offered only if a counter within this distance is still open this long after
    # it ends (ADR 0017).
    dropoff_travel_minutes: int = Field(default=45, ge=0)
    dropoff_radius_m: int = Field(default=10_000, gt=0)
    # No pickups on these days: Quebec statutory holidays plus Boxing Day. Update each year.
    holidays: list[date] = [
        date(2026, 12, 25),
        date(2026, 12, 26),
        date(2027, 1, 1),
        date(2027, 3, 26),  # Good Friday
        date(2027, 3, 29),  # Easter Monday
        date(2027, 5, 24),  # National Patriots' Day
        date(2027, 6, 24),
        date(2027, 7, 1),
        date(2027, 9, 6),  # Labour Day
        date(2027, 10, 11),  # Thanksgiving
        date(2027, 12, 25),
        date(2027, 12, 26),
    ]
    # Places API (New) key, server only. Empty until #43; Google then refuses the calls.
    google_maps_api_key: SecretStr = SecretStr("")
    # Photo uploads (#45). Dev keeps them in a gitignored folder; Supabase Storage at M10.
    upload_dir: Path = Path(__file__).resolve().parents[2] / "uploads"
    upload_max_bytes: int = Field(default=10_000_000, gt=0)
    # Payments (ADR 0018). Test keys only in dev; empty and Stripe refuses the calls.
    stripe_secret_key: SecretStr = SecretStr("")
    # Signs Stripe's webhook messages (whsec_…). Empty and every message is refused.
    stripe_webhook_secret: SecretStr = SecretStr("")
    # A return can be paid this long after it's created; then the client books again.
    payment_window_minutes: int = Field(default=30, gt=0)
    # The driver's share of the pickup fee, in percent. The tip always goes to the driver.
    driver_fee_share_percent: int = Field(default=75, ge=0, le=100)

    @model_validator(mode="after")
    def open_before_close(self) -> Self:
        if self.service_open_hour >= self.service_close_hour:
            raise ValueError("service_open_hour must be before service_close_hour")
        return self


settings = Settings()
