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
    SUPABASE_DB_URL: str | None = None  # Postgres connection string (for pgvector)
    SUPABASE_STORAGE_BUCKET: str = "documents"

    # Security
    FORCE_HTTPS: bool = False  # Enforce HTTPS when behind a proxy (checks X-Forwarded-Proto)
    DISABLE_AUTH: bool = False  # Disable authentication (for development only, NEVER in production)

    # CORS Settings
    BACKEND_CORS_ORIGINS: list[str] = ["http://localhost:3000", "http://localhost:5173"]

    # OpenAI Settings
    OPENAI_API_KEY: str = "mock-key"  # Required for OpenAI API
    OPENAI_MODEL: str = "gpt-4o-mini"  # LLM model for chat responses
    OPENAI_EMBEDDING_MODEL: str = "text-embedding-3-small"  # Embedding model
    OPENAI_TEMPERATURE: float = 0.7  # Temperature for LLM responses

    # Observability Thresholds
    INGESTION_DURATION_THRESHOLD_SECONDS: float = 60.0
    CHAT_LATENCY_THRESHOLD_SECONDS: float = 10.0
    METRICS_SERVER_ENABLED: bool = True

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True)


settings = Settings()
