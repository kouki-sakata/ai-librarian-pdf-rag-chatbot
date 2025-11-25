from unittest.mock import MagicMock, patch

import pytest

from app.core.supabase_client import get_supabase_client


@pytest.fixture
def mock_settings():
    """Mock settings for Supabase configuration"""
    with patch("app.core.supabase_client.settings") as mock:
        mock.SUPABASE_URL = "https://test-project.supabase.co"
        mock.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key"
        yield mock


@pytest.fixture(autouse=True)
def clear_cache():
    """Clear LRU cache before each test"""
    get_supabase_client.cache_clear()
    yield
    get_supabase_client.cache_clear()


def test_get_supabase_client_success(mock_settings):
    """Test successful Supabase client creation"""
    # Import here to avoid import-time issues
    from supabase import Client

    with patch("supabase.create_client") as mock_create:
        mock_client = MagicMock(spec=Client)
        mock_create.return_value = mock_client

        client = get_supabase_client()

        assert client == mock_client
        mock_create.assert_called_once_with(
            "https://test-project.supabase.co", "test-service-role-key"
        )


def test_get_supabase_client_caching(mock_settings):
    """Test that Supabase client is cached (LRU cache)"""
    from supabase import Client

    with patch("supabase.create_client") as mock_create:
        mock_client = MagicMock(spec=Client)
        mock_create.return_value = mock_client

        # First call
        client1 = get_supabase_client()
        # Second call
        client2 = get_supabase_client()

        # Should return the same instance
        assert client1 == client2
        # create_client should only be called once due to caching
        assert mock_create.call_count == 1


def test_get_supabase_client_missing_url(mock_settings):
    """Test error when SUPABASE_URL is not configured"""
    mock_settings.SUPABASE_URL = None

    with pytest.raises(RuntimeError) as exc_info:
        get_supabase_client()

    assert "Supabase credentials are not configured" in str(exc_info.value)


def test_get_supabase_client_missing_key(mock_settings):
    """Test error when SUPABASE_SERVICE_ROLE_KEY is not configured"""
    mock_settings.SUPABASE_SERVICE_ROLE_KEY = None

    with pytest.raises(RuntimeError) as exc_info:
        get_supabase_client()

    assert "Supabase credentials are not configured" in str(exc_info.value)


def test_get_supabase_client_empty_url(mock_settings):
    """Test error when SUPABASE_URL is empty string"""
    mock_settings.SUPABASE_URL = ""

    with pytest.raises(RuntimeError) as exc_info:
        get_supabase_client()

    assert "Supabase credentials are not configured" in str(exc_info.value)


def test_get_supabase_client_empty_key(mock_settings):
    """Test error when SUPABASE_SERVICE_ROLE_KEY is empty string"""
    mock_settings.SUPABASE_SERVICE_ROLE_KEY = ""

    with pytest.raises(RuntimeError) as exc_info:
        get_supabase_client()

    assert "Supabase credentials are not configured" in str(exc_info.value)


def test_get_supabase_client_cache_independence():
    """Test that cache is cleared between tests"""
    # This test verifies the autouse fixture is working
    from supabase import Client

    with patch("app.core.supabase_client.settings") as mock_settings:
        mock_settings.SUPABASE_URL = "https://new-project.supabase.co"
        mock_settings.SUPABASE_SERVICE_ROLE_KEY = "new-key"

        with patch("supabase.create_client") as mock_create:
            mock_client = MagicMock(spec=Client)
            mock_create.return_value = mock_client

            client = get_supabase_client()

            assert client == mock_client
            # Should be called because cache was cleared
            assert mock_create.call_count == 1
