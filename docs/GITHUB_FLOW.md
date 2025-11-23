# GitHub Flow

## Setup

```bash
# Install pre-commit hooks (Required)
cd backend && poetry run pre-commit install
```

## Workflow

1. **Branch**: `git checkout -b feature/name` from `main`.
2. **Commit**: `git commit -m "feat: description"`.
   - Hooks run auto-format/lint. Fix errors if any.
3. **Push**: `git push origin feature/name`.
4. **PR**: Create Pull Request → Review → Merge (Squash).

## Commands

### Frontend

```bash
cd frontend
npm run dev      # Server
npm run test     # Test
npm run lint:fix # Lint & Fix
npm run typecheck
```

### Backend

```bash
cd backend
poetry run uvicorn app.main:app --reload
poetry run pytest
poetry run ruff check --fix
poetry run mypy .
```
