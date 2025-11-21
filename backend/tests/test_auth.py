from unittest.mock import patch

import pytest
from app.main import app
from fastapi.testclient import TestClient

client = TestClient(app)


@pytest.fixture
def mock_jwks():
    return {
        "keys": [
            {
                "kty": "RSA",
                "kid": "test-key-id",
                "use": "sig",
                "n": "test-n",
                "e": "test-e",
            }
        ]
    }


@pytest.fixture
def mock_verify_jwt():
    with patch("app.core.middleware.verify_jwt") as mock:
        yield mock


def test_health_check():
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_auth_middleware_missing_token():
    response = client.get("/")
    assert response.status_code == 401
    assert response.json() == {
        "detail": "Missing or invalid authentication credentials"
    }


def test_auth_middleware_invalid_token(mock_verify_jwt):
    from fastapi import HTTPException

    mock_verify_jwt.side_effect = HTTPException(status_code=401, detail="Invalid token")

    response = client.get("/", headers={"Authorization": "Bearer invalid-token"})
    assert response.status_code == 401
    assert response.json() == {"detail": "Invalid token"}


def test_auth_middleware_valid_token_missing_tenant(mock_verify_jwt):
    mock_verify_jwt.return_value = {"sub": "user123"}  # No tenant_id

    response = client.get("/", headers={"Authorization": "Bearer valid-token"})
    assert response.status_code == 401
    assert response.json() == {"detail": "Missing tenant_id in token claims"}


def test_auth_middleware_valid_token_with_tenant(mock_verify_jwt):
    mock_verify_jwt.return_value = {"sub": "user123", "tenant_id": "tenant123"}

    response = client.get("/", headers={"Authorization": "Bearer valid-token"})
    assert response.status_code == 200
    assert response.json() == {"message": "Welcome to AI Librarian RAG API"}


def test_auth_middleware_valid_token_with_tenant_in_app_metadata(mock_verify_jwt):
    mock_verify_jwt.return_value = {
        "sub": "user123",
        "app_metadata": {"tenant_id": "tenant123"},
    }

    response = client.get("/", headers={"Authorization": "Bearer valid-token"})
    assert response.status_code == 200
    assert response.json() == {"message": "Welcome to AI Librarian RAG API"}
