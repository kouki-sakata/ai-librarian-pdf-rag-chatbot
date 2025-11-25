# Backend container for FastAPI service
FROM python:3.12-slim AS base

ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    UV_PROJECT_ENV=/.venv

RUN apt-get update \
 && apt-get install -y --no-install-recommends curl \
 && curl -LsSf https://astral.sh/uv/install.sh | sh \
 && apt-get purge -y curl \
 && apt-get autoremove -y \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy dependency manifests first for efficient layer caching
COPY backend/pyproject.toml backend/uv.lock ./

# Install dependencies into project-local venv managed by uv
RUN uv sync --frozen --no-dev

# Copy application code
COPY backend ./backend

ENV PATH="/app/.venv/bin:${PATH}"

EXPOSE 8000

CMD ["uv", "run", "uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8000"]
