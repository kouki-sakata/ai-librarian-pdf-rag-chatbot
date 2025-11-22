import os
import time

import pytest
from fastapi.testclient import TestClient
from jose import jwt

from app.core.config import settings
from app.main import app

# Ensure test secret is set
os.environ["SUPABASE_JWT_SECRET"] = "test-secret"
settings.SUPABASE_JWT_SECRET = "test-secret"

# Disable Prometheus HTTP server during tests to avoid bind failures in sandboxed CI
os.environ.setdefault("METRICS_SERVER_ENABLED", "false")
settings.METRICS_SERVER_ENABLED = False


@pytest.fixture
def client():
    """Test client for FastAPI app."""
    return TestClient(app)


@pytest.fixture
def auth_headers():
    """Generate auth headers with a valid test token."""
    payload = {
        "sub": "test_user",
        "aud": "authenticated",
        "exp": int(time.time()) + 3600,
        "app_metadata": {"tenant_id": "test_tenant"},
        "user_metadata": {},
        "role": "authenticated",
    }
    token = jwt.encode(payload, "test-secret", algorithm="HS256")
    return {"Authorization": f"Bearer {token}"}
