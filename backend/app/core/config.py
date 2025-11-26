import os

from pydantic import Field, ValidationInfo, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "AI Librarian RAG"
    ENVIRONMENT: str = Field(
        default="development", description="Environment: development, staging, production"
    )

    # Supabase Settings
    # 本番環境用（ENVIRONMENT=production の時に使用）
    SUPABASE_URL: str | None = Field(
        default=None,
        description="Production Supabase URL (required when ENVIRONMENT=production)",
    )
    SUPABASE_PROJECT_REF: str | None = Field(
        default=None,
        description="Production Supabase project ref (required when ENVIRONMENT=production)",
    )
    SUPABASE_SERVICE_ROLE_KEY: str | None = Field(
        default=None,
        description="Supabase service role key (required when ENVIRONMENT=production)",
    )
    SUPABASE_DB_URL: str | None = None  # Postgres connection string (for pgvector)
    SUPABASE_STORAGE_BUCKET: str = "documents"

    # 開発環境用のローカルSupabase設定（ENVIRONMENT=development の時に使用）
    SUPABASE_DEV_URL: str | None = Field(
        default=None,
        description="Development Supabase URL (required when ENVIRONMENT=development). Usually http://127.0.0.1:54321 for local Supabase",
    )
    SUPABASE_DEV_PROJECT_REF: str | None = Field(
        default=None,
        description="Development Supabase project ref (required when ENVIRONMENT=development)",
    )
    SUPABASE_DEV_SERVICE_ROLE_KEY: str | None = Field(
        default=None,
        description="Development Supabase service role key (required when ENVIRONMENT=development)",
    )
    SUPABASE_DEV_DB_URL: str | None = Field(
        default=None,
        description="Development Supabase DB URL (optional when ENVIRONMENT=development)",
    )

    SUPABASE_JWT_SECRET: str | None = Field(
        default=None,
        description="HS256 shared secret (development/testing only). MUST be unset in production.",
    )

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

    @field_validator("OPENAI_API_KEY")
    @classmethod
    def validate_openai_key(cls, v: str, info: ValidationInfo) -> str:
        """Ensure OpenAI API key is set and not mock values."""
        if not v or v == "mock-key":
            raise ValueError(
                "OPENAI_API_KEY must be set in environment variables. "
                "Please set the OPENAI_API_KEY environment variable with a valid value."
            )
        return v

    @model_validator(mode="after")
    def validate_environment_supabase_settings(self) -> "Settings":
        """Validate environment-specific Supabase settings after all fields are loaded."""
        env = self.ENVIRONMENT.lower()
        if env == "production":
            # 本番環境では本番用の環境変数が必須
            if not self.SUPABASE_URL:
                raise ValueError(
                    "SUPABASE_URL must be set when ENVIRONMENT=production. "
                    "Please set SUPABASE_URL for production Supabase instance."
                )
            if not self.SUPABASE_PROJECT_REF:
                raise ValueError(
                    "SUPABASE_PROJECT_REF must be set when ENVIRONMENT=production. "
                    "Please set SUPABASE_PROJECT_REF for production Supabase instance."
                )
            if not self.SUPABASE_SERVICE_ROLE_KEY:
                raise ValueError(
                    "SUPABASE_SERVICE_ROLE_KEY must be set when ENVIRONMENT=production. "
                    "Please set SUPABASE_SERVICE_ROLE_KEY for production Supabase instance."
                )
        elif env == "development":
            # 開発環境では開発用の環境変数が必須
            if not self.SUPABASE_DEV_URL:
                raise ValueError(
                    "SUPABASE_DEV_URL must be set when ENVIRONMENT=development. "
                    "Please set SUPABASE_DEV_URL (usually http://127.0.0.1:54321 for local Supabase)."
                )
            if not self.SUPABASE_DEV_SERVICE_ROLE_KEY:
                raise ValueError(
                    "SUPABASE_DEV_SERVICE_ROLE_KEY must be set when ENVIRONMENT=development. "
                    "Please set SUPABASE_DEV_SERVICE_ROLE_KEY for development Supabase instance."
                )
        return self

    @field_validator("SUPABASE_JWT_SECRET")
    @classmethod
    def validate_supabase_jwt_secret(cls, v: str | None, info: ValidationInfo) -> str | None:
        """
        Allow HS256 shared secret in all environments.

        Supabase がデフォルトで発行する HS256 トークンを本番でも検証できるように、
        production でも SUPABASE_JWT_SECRET を許容する。RS256/JWKS 運用に移行する場合は
        環境変数を未設定にし、クライアント側の alg を RS256 に切り替える。
        """
        if v == "":
            raise ValueError("SUPABASE_JWT_SECRET must be a non-empty string or omitted")
        return v

    @property
    def effective_supabase_url(self) -> str:
        """環境に応じてSupabase URLを返す"""
        env = self.ENVIRONMENT.lower()
        if env == "development":
            if not self.SUPABASE_DEV_URL:
                raise ValueError(
                    "SUPABASE_DEV_URL must be set when ENVIRONMENT=development. "
                    "Please set SUPABASE_DEV_URL for development Supabase instance."
                )
            return self.SUPABASE_DEV_URL
        elif env == "production":
            if not self.SUPABASE_URL:
                raise ValueError(
                    "SUPABASE_URL must be set when ENVIRONMENT=production. "
                    "Please set SUPABASE_URL for production Supabase instance."
                )
            return self.SUPABASE_URL
        else:
            # staging などの他の環境
            if self.SUPABASE_URL:
                return self.SUPABASE_URL
            raise ValueError(
                f"Supabase URL must be set for ENVIRONMENT={env}. "
                "Please set SUPABASE_URL or SUPABASE_DEV_URL."
            )

    @property
    def effective_supabase_service_role_key(self) -> str:
        """環境に応じてSupabase Service Role Keyを返す"""
        env = self.ENVIRONMENT.lower()
        if env == "development":
            if not self.SUPABASE_DEV_SERVICE_ROLE_KEY:
                raise ValueError(
                    "SUPABASE_DEV_SERVICE_ROLE_KEY must be set when ENVIRONMENT=development."
                )
            return self.SUPABASE_DEV_SERVICE_ROLE_KEY
        elif env == "production":
            if not self.SUPABASE_SERVICE_ROLE_KEY:
                raise ValueError(
                    "SUPABASE_SERVICE_ROLE_KEY must be set when ENVIRONMENT=production."
                )
            return self.SUPABASE_SERVICE_ROLE_KEY
        else:
            # staging などの他の環境
            if self.SUPABASE_SERVICE_ROLE_KEY:
                return self.SUPABASE_SERVICE_ROLE_KEY
            raise ValueError(f"Supabase Service Role Key must be set for ENVIRONMENT={env}.")

    @property
    def effective_supabase_db_url(self) -> str | None:
        """環境に応じてSupabase DB URLを返す"""
        env = self.ENVIRONMENT.lower()
        if env == "development":
            return self.SUPABASE_DEV_DB_URL
        return self.SUPABASE_DB_URL


settings = Settings()
