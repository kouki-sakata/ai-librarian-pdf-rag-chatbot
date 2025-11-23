.PHONY: help dev start lint lint-fix format typecheck test test-watch

help:
	@echo "Available commands:"
	@echo "  make dev        - Run FastAPI server with auto-reload (development mode)"
	@echo "  make start      - Run FastAPI server (production mode)"
	@echo "  make lint       - Run ruff linter"
	@echo "  make lint-fix   - Run ruff linter with auto-fix"
	@echo "  make format     - Run ruff formatter"
	@echo "  make typecheck  - Run mypy type checker"
	@echo "  make test       - Run pytest"
	@echo "  make test-watch - Run pytest in watch mode"

dev:
	poetry run uvicorn app.main:app --reload

start:
	poetry run uvicorn app.main:app --host 0.0.0.0 --port 8000

lint:
	poetry run ruff check .

lint-fix:
	poetry run ruff check . --fix

format:
	poetry run ruff format .

typecheck:
	poetry run mypy .

test:
	poetry run pytest

test-watch:
	poetry run ptw
