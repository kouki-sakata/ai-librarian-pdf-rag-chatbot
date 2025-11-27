import os
import time

import pytest
from fastapi.testclient import TestClient
from jose import jwt

# Set environment variables BEFORE importing app.core.config to pass Settings validation
os.environ["SUPABASE_JWT_SECRET"] = "test-secret"
os.environ["SUPABASE_DEV_SERVICE_ROLE_KEY"] = "mock-service-role-key"
os.environ["SUPABASE_DEV_PROJECT_REF"] = "mock-project-ref"
os.environ["OPENAI_API_KEY"] = "sk-test-key"  # Must not be "mock-key"
os.environ.setdefault("METRICS_SERVER_ENABLED", "false")

from app.core.config import settings
from app.main import app

# Ensure settings are updated if they were already loaded (though import should trigger first load with above env vars)
settings.SUPABASE_JWT_SECRET = "test-secret"
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
