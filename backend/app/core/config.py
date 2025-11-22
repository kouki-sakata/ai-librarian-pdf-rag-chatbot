from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "AI Librarian RAG"

    # Supabase Settings
    SUPABASE_URL: str
    SUPABASE_PROJECT_REF: str  # Used for JWKS URL construction
    SUPABASE_JWT_SECRET: str | None = None  # Optional if using HS256, but we use RS256
    SUPABASE_SERVICE_ROLE_KEY: str = (
        "mock-key"  # Needed for backend operations bypassing RLS or for admin tasks
    )

    # CORS Settings
    BACKEND_CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:5173"]

    # Observability Thresholds
    INGESTION_DURATION_THRESHOLD_SECONDS: float = 60.0
    CHAT_LATENCY_THRESHOLD_SECONDS: float = 10.0

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True)


settings = Settings()
