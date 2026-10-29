from pathlib import Path

from pydantic import Field, SecretStr
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


settings = Settings()
