from typing import List
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Database
    database_url: str

    # Google OAuth 2.0
    google_client_id: str = ""
    google_client_secret: str = ""
    google_callback_url: str = ""
    allowed_email_domains: str = "srmap.edu.in"

    # JWT
    jwt_secret: str = "change-me"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60

    # App
    app_env: str = "development"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    @property
    def allowed_domains_list(self) -> List[str]:
        return [d.strip() for d in self.allowed_email_domains.split(",")]

    @property
    def is_development(self) -> bool:
        return self.app_env == "development"


settings = Settings()