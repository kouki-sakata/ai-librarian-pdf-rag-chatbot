import os

from pydantic import Field, ValidationInfo, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "AI Librarian RAG"
    ENVIRONMENT: str = Field(
        default="development", description="Environment: development, staging, production"
    )

    # Supabase Settings
    SUPABASE_URL: str
    SUPABASE_PROJECT_REF: str  # Used for JWKS URL construction
    SUPABASE_JWT_SECRET: str | None = Field(
        default=None,
        description="HS256 shared secret (development/testing only). MUST be unset in production.",
    )
    SUPABASE_SERVICE_ROLE_KEY: str = Field(
        ...,
        description="Needed for backend operations bypassing RLS or for admin tasks",
    )
    SUPABASE_DB_URL: str | None = None  # Postgres connection string (for pgvector)
    SUPABASE_STORAGE_BUCKET: str = "documents"

    # Security
    FORCE_HTTPS: bool = Field(
        default=False,
        description="Enforce HTTPS when behind a proxy (checks X-Forwarded-Proto)",
    )
    DISABLE_AUTH: bool = Field(
        default=False,
        description="Disable authentication (for development only, NEVER in production)",
    )

    # CORS Settings
    BACKEND_CORS_ORIGINS: list[str] | str = Field(
        default=["http://localhost:3000", "http://localhost:5173"],
        description="Comma-separated list or array of allowed CORS origins",
    )

    # OpenAI Settings
    OPENAI_API_KEY: str = Field(..., description="Required for OpenAI API")
    OPENAI_MODEL: str = "gpt-4o-mini"  # LLM model for chat responses
    OPENAI_EMBEDDING_MODEL: str = "text-embedding-3-small"  # Embedding model
    OPENAI_TEMPERATURE: float = 0.7  # Temperature for LLM responses

    # Observability Thresholds
    INGESTION_DURATION_THRESHOLD_SECONDS: float = 60.0
    CHAT_LATENCY_THRESHOLD_SECONDS: float = 10.0
    METRICS_SERVER_ENABLED: bool = True

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True)

    @field_validator("DISABLE_AUTH")
    @classmethod
    def validate_disable_auth(cls, v: bool, info: ValidationInfo) -> bool:
        """Prevent DISABLE_AUTH=True in production environment."""
        env_value = info.data.get("ENVIRONMENT") if info.data else None
        env = str(env_value or os.getenv("ENVIRONMENT", "development")).lower()
        if env == "production" and v:
            raise ValueError(
                "CRITICAL SECURITY ERROR: DISABLE_AUTH must be False in production environment. "
                f"Current ENVIRONMENT={env}, DISABLE_AUTH={v}"
            )
        return v

    @field_validator("FORCE_HTTPS")
    @classmethod
    def validate_force_https(cls, v: bool, info: ValidationInfo) -> bool:
        """Require HTTPS enforcement in production."""
        env_value = info.data.get("ENVIRONMENT") if info.data else None
        env = str(env_value or os.getenv("ENVIRONMENT", "development")).lower()
        if env == "production" and not v:
            raise ValueError("FORCE_HTTPS must be enabled in production environments")
        return v

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, v: str | list[str]) -> list[str]:
        """Parse CORS origins from comma-separated string or list."""
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v

    @field_validator("SUPABASE_SERVICE_ROLE_KEY", "OPENAI_API_KEY")
    @classmethod
    def validate_required_keys(cls, v: str, info: ValidationInfo) -> str:
        """Ensure required API keys are set and not mock values."""
        field_name = info.field_name
        if not v or v == "mock-key":
            raise ValueError(
                f"{field_name} must be set in environment variables. "
                f"Please set the {field_name} environment variable with a valid value."
            )
        return v

    @field_validator("SUPABASE_JWT_SECRET")
    @classmethod
    def validate_supabase_jwt_secret(cls, v: str | None, info: ValidationInfo) -> str | None:
        """Disallow HS256 shared secret in production and keep optional elsewhere."""
        env_value = info.data.get("ENVIRONMENT") if info.data else None
        env = str(env_value or os.getenv("ENVIRONMENT", "development")).lower()
        if env == "production" and v:
            raise ValueError(
                "SUPABASE_JWT_SECRET must not be set in production (use RS256 via JWKS)"
            )
        return v


settings = Settings()
