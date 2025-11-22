import os
import time

from app.core.config import settings
from app.main import app
from fastapi.testclient import TestClient
from jose import jwt

# Ensure we use the test secret
os.environ["SUPABASE_JWT_SECRET"] = "test-secret"
settings.SUPABASE_JWT_SECRET = "test-secret"

client = TestClient(app)


def generate_test_token(tenant_id, secret="test-secret", alg="HS256", exp_delta=3600):
    payload = {
        "sub": f"user_{tenant_id}",
        "aud": "authenticated",
        "exp": int(time.time()) + exp_delta,
        "app_metadata": {"tenant_id": tenant_id},
        "user_metadata": {},
        "role": "authenticated",
    }
    return jwt.encode(payload, secret, algorithm=alg)


def test_auth_middleware_rejects_no_token():
    response = client.get(f"{settings.API_V1_STR}/")
    assert response.status_code == 401
    assert "Missing or invalid authentication credentials" in response.json()["detail"]


def test_auth_middleware_rejects_invalid_token():
    response = client.get(
        f"{settings.API_V1_STR}/", headers={"Authorization": "Bearer invalid_token"}
    )
    assert response.status_code == 401


def test_auth_middleware_rejects_expired_token():
    token = generate_test_token("tenant1", exp_delta=-3600)  # Expired 1 hour ago
    response = client.get(
        f"{settings.API_V1_STR}/", headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 401
    assert "Token has expired" in response.json()["detail"]


def test_auth_middleware_rejects_missing_tenant_id():
    # Token without tenant_id
    payload = {
        "sub": "user_no_tenant",
        "aud": "authenticated",
        "exp": int(time.time()) + 3600,
        "role": "authenticated",
    }
    token = jwt.encode(payload, "test-secret", algorithm="HS256")
    response = client.get(
        f"{settings.API_V1_STR}/", headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 401
    assert "Missing tenant_id" in response.json()["detail"]


def test_tenant_isolation_context():
    # This test verifies that the tenant_id is correctly set in the context
    # We can check this by mocking a service that reads the context
    from unittest.mock import patch

    token = generate_test_token("tenant_A")

    # We need to patch a dependency or endpoint to check the context
    # Let's patch the upload endpoint's internal logic or just check if it calls service with correct tenant_id

    with patch("app.api.v1.endpoints.upload.IngestionService") as MockService:
        mock_instance = MockService.return_value
        mock_instance.process_document.return_value = 10

        # We also need to mock StorageService in the endpoint if it's used directly?
        # No, endpoint uses IngestionService.
        # Wait, endpoint uses StorageService to upload first?
        # Let's check upload.py.
        pass

    # Actually, let's just trust the middleware test we already have?
    # But we want to verify "Isolation".
    # Isolation is enforced by RLS in DB, which we mock.
    # So we verify that the service is called with the correct tenant_id from the token.

    with patch("app.api.v1.endpoints.upload.StorageService") as MockStorage:
        with patch("app.api.v1.endpoints.upload.IngestionService") as MockIngestion:
            from unittest.mock import AsyncMock

            # upload_file is static
            MockStorage.upload_file = AsyncMock(return_value="doc_id")

            mock_ingestion = MockIngestion.return_value
            mock_ingestion.process_document = AsyncMock(return_value=10)

            files = {"file": ("test.pdf", b"content", "application/pdf")}
            response = client.post(
                f"{settings.API_V1_STR}/upload/",
                files=files,
                headers={"Authorization": f"Bearer {token}"},
            )

            assert response.status_code == 200

            # Verify StorageService called with tenant_A in path or context?
            # The endpoint constructs the path: f"{tenant_id}/docs/{doc_id}.pdf"
            # We can check the call args to upload_file

            args, _ = MockStorage.upload_file.call_args
            assert args[1] == "tenant_A"

            # Verify IngestionService called with tenant_A
            mock_ingestion.process_document.assert_called_once()
            args, _ = mock_ingestion.process_document.call_args
            assert args[0] == "tenant_A"
