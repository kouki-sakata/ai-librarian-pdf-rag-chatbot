# AI Librarian Backend

## Setup

### Prerequisites

- Python 3.12+
- Poetry (recommended) or pip

### Installation

1. Install dependencies:

```bash
# Using poetry (recommended)
poetry install

# Or using pip
pip install -e .
```

2. Set up environment variables:

```bash
cp .env.example .env
# Edit .env with your actual values
```

### Running Tests

```bash
# Run all tests
poetry run pytest -v

# Run with coverage
poetry run pytest --cov=app --cov-report=term-missing

# Run specific test file
poetry run pytest tests/test_ingestion.py -v
```

### Running the Server

```bash
# Development mode
poetry run uvicorn app.main:app --reload

# Production mode
poetry run uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### Code Quality

```bash
# Lint with ruff
poetry run ruff check .

# Format with ruff
poetry run ruff format .

# Type check with mypy
poetry run mypy app
```

## Configuration

Key environment variables (see `.env.example` for full list):

- `OPENAI_API_KEY`: Your OpenAI API key
- `OPENAI_MODEL`: LLM model (default: gpt-4o-mini)
- `OPENAI_EMBEDDING_MODEL`: Embedding model (default: text-embedding-3-small)
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_PROJECT_REF`: Your Supabase project reference
- `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key

## Architecture

- `app/api/`: API endpoints
- `app/core/`: Core configuration and utilities
- `app/services/`: Business logic services
- `tests/`: Test files
