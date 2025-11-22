.PHONY: help lint lint-fix format typecheck test test-watch

help:
	@echo "Available commands:"
	@echo "  make lint       - Run ruff linter"
	@echo "  make lint-fix   - Run ruff linter with auto-fix"
	@echo "  make format     - Run ruff formatter"
	@echo "  make typecheck  - Run mypy type checker"
	@echo "  make test       - Run pytest"
	@echo "  make test-watch - Run pytest in watch mode"

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
	poetry run pytest --watch
