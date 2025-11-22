from app.api.v1.endpoints import chat, health, upload
from app.core.config import settings
from app.core.middleware import AuthMiddleware
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Set all CORS enabled origins
if settings.BACKEND_CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[str(origin) for origin in settings.BACKEND_CORS_ORIGINS],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# Add Auth Middleware
# app.add_middleware(AuthMiddleware)

# Include routers
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor

app.include_router(health.router, prefix="/api/v1/health", tags=["health"])
app.include_router(upload.router, prefix="/api/v1/upload", tags=["upload"])
app.include_router(chat.router, prefix="/api/v1/chat", tags=["chat"])

# Instrument FastAPI
FastAPIInstrumentor.instrument_app(app)


@app.get("/")
async def root():
    return {"message": "Welcome to AI Librarian RAG API"}
