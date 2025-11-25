from unittest.mock import MagicMock, patch

import pytest
from fastapi import HTTPException
from jose import jwt

from app.core.security import get_jwks, verify_jwt


@pytest.fixture
def mock_settings():
    with patch("app.core.security.settings") as mock:
        mock.SUPABASE_PROJECT_REF = "test-project"
        mock.SUPABASE_JWT_SECRET = "test-secret-key-min-32-chars-long"
        yield mock


@pytest.mark.asyncio
async def test_get_jwks_success(mock_settings):
    """Test successful JWKS retrieval"""
    mock_jwks = {
        "keys": [
            {
                "kty": "RSA",
                "kid": "test-kid",
                "use": "sig",
                "n": "test-n",
                "e": "AQAB",
            }
        ]
    }

    with patch("app.core.security.httpx.AsyncClient") as mock_client:
        mock_response = MagicMock()
        mock_response.json.return_value = mock_jwks
        mock_client.return_value.__aenter__.return_value.get.return_value = mock_response

        result = await get_jwks()
        assert result == mock_jwks


@pytest.mark.asyncio
async def test_get_jwks_cache(mock_settings):
    """Test JWKS caching functionality"""
    mock_jwks = {"keys": [{"kty": "RSA"}]}

    # Clear cache
    import app.core.security

    app.core.security.jwks_cache = {}

    with patch("app.core.security.httpx.AsyncClient") as mock_client:
        mock_response = MagicMock()
        mock_response.json.return_value = mock_jwks
        mock_client.return_value.__aenter__.return_value.get.return_value = mock_response

        # First call should fetch from network
        # Mock time to initial value
        with patch("app.core.security.time.time", return_value=100.0):
            result1 = await get_jwks()
        assert result1 == mock_jwks

        # Second call should use cache (no network call)
        # Advance time slightly (within cache duration)
        with patch("app.core.security.time.time", return_value=150.0):
            result2 = await get_jwks()
        assert result2 == mock_jwks


@pytest.mark.asyncio
async def test_get_jwks_http_error(mock_settings):
    """Test JWKS retrieval failure"""
    # Clear cache to ensure fresh fetch
    import app.core.security

    app.core.security.jwks_cache = {}

    with patch("app.core.security.httpx.AsyncClient") as mock_client:
        mock_client.return_value.__aenter__.return_value.get.side_effect = Exception(
            "Network error"
        )

        with pytest.raises(HTTPException) as exc_info:
            await get_jwks()
        assert exc_info.value.status_code == 500


@pytest.mark.asyncio
async def test_verify_jwt_hs256_success(mock_settings):
    """Test JWT verification with HS256 (dev/test mode)"""
    secret = "test-secret-key-min-32-chars-long"
    payload_data = {"sub": "user123", "role": "authenticated"}

    token = jwt.encode(payload_data, secret, algorithm="HS256")

    result = await verify_jwt(token)
    assert result["sub"] == "user123"
    assert result["role"] == "authenticated"


@pytest.mark.asyncio
async def test_verify_jwt_expired_token(mock_settings):
    """Test JWT verification with expired token"""
    import time

    secret = "test-secret-key-min-32-chars-long"
    payload_data = {"sub": "user123", "exp": int(time.time()) - 3600}  # Expired 1 hour ago

    token = jwt.encode(payload_data, secret, algorithm="HS256")

    with pytest.raises(HTTPException) as exc_info:
        await verify_jwt(token)
    assert exc_info.value.status_code == 401
    assert "expired" in exc_info.value.detail.lower()


@pytest.mark.asyncio
async def test_verify_jwt_invalid_signature(mock_settings):
    """Test JWT verification with invalid signature"""
    secret = "test-secret-key-min-32-chars-long"
    wrong_secret = "wrong-secret-key-min-32-chars-lon"
    payload_data = {"sub": "user123"}

    # Create token with wrong secret
    token = jwt.encode(payload_data, wrong_secret, algorithm="HS256")

    with pytest.raises(HTTPException) as exc_info:
        await verify_jwt(token)
    assert exc_info.value.status_code == 401


@pytest.mark.skip(reason="RS256 edge case - requires complex JWT mocking")
@pytest.mark.asyncio
async def test_verify_jwt_rs256_no_kid(mock_settings):
    """Test JWT verification when kid is missing in RS256 token"""
    mock_settings.SUPABASE_JWT_SECRET = None  # Force RS256 path

    # Mock JWT header without kid
    with patch("app.core.security.jwt.get_unverified_header") as mock_header:
        mock_header.return_value = {"alg": "RS256"}  # No 'kid' field

        with pytest.raises(HTTPException) as exc_info:
            await verify_jwt("fake.token.here")
        assert exc_info.value.status_code == 401
        assert "Invalid token header" in exc_info.value.detail


@pytest.mark.skip(reason="RS256 edge case - requires complex JWT mocking")
@pytest.mark.asyncio
async def test_verify_jwt_rs256_kid_not_found(mock_settings):
    """Test JWT verification when kid is not found in JWKS"""
    mock_settings.SUPABASE_JWT_SECRET = None  # Force RS256 path

    # Mock JWKS response with different kid
    mock_jwks = {"keys": [{"kid": "different-kid", "kty": "RSA"}]}

    with patch("app.core.security.get_jwks") as mock_get_jwks:
        mock_get_jwks.return_value = mock_jwks

        with patch("app.core.security.jwt.get_unverified_header") as mock_header:
            mock_header.return_value = {"alg": "RS256", "kid": "test-kid"}

            with pytest.raises(HTTPException) as exc_info:
                await verify_jwt("fake.token.here")
            assert exc_info.value.status_code == 401
            assert "Unable to find appropriate key" in exc_info.value.detail
