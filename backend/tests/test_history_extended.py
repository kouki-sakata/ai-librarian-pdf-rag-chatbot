"""Tests for HistoryService list and delete operations."""

from unittest.mock import MagicMock, patch

import pytest

from app.services.history import HistoryService


@pytest.mark.asyncio
async def test_list_sessions():
    """Test list_sessions returns paginated sessions with titles."""
    mock_client = MagicMock()
    mock_response = MagicMock()
    mock_response.data = [
        {
            "id": "session-1",
            "tenant_id": "tenant-1",
            "created_at": "2023-01-01T00:00:00Z",
            "updated_at": "2023-01-01T01:00:00Z",
        },
        {
            "id": "session-2",
            "tenant_id": "tenant-1",
            "created_at": "2023-01-02T00:00:00Z",
            "updated_at": "2023-01-02T01:00:00Z",
        },
    ]

    # Mock messages for generating titles
    mock_messages = MagicMock()
    mock_messages.data = [
        {"role": "user", "content": "This is the first user message for session 1"},
    ]

    # Mock count response
    mock_count = MagicMock()
    mock_count.count = 2

    mock_client.table.return_value.select.return_value.eq.return_value.order.return_value.limit.return_value.range.return_value.execute.return_value = mock_response
    mock_client.table.return_value.select.return_value.eq.return_value.execute.return_value = (
        mock_count
    )
    mock_client.table.return_value.select.return_value.eq.return_value.eq.return_value.eq.return_value.order.return_value.limit.return_value.execute.return_value = mock_messages

    with patch("app.services.history._get_client", return_value=mock_client):
        service = HistoryService()
        result = await service.list_sessions(tenant_id="tenant-1", limit=20, offset=0)

        assert result["total"] == 2
        assert len(result["items"]) == 2
        assert result["items"][0]["id"] == "session-1"
        assert "title" in result["items"][0]
        # Title should be truncated to 30 chars
        assert len(result["items"][0]["title"]) <= 30


@pytest.mark.asyncio
async def test_delete_session():
    """Test delete_session removes session and messages."""
    mock_client = MagicMock()
    mock_response = MagicMock()
    mock_response.data = [{"id": "session-1"}]

    # Check ownership
    mock_client.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value = mock_response
    # Delete messages
    mock_client.table.return_value.delete.return_value.eq.return_value.eq.return_value.execute.return_value = MagicMock()
    # Delete session
    mock_client.table.return_value.delete.return_value.eq.return_value.execute.return_value = (
        MagicMock()
    )

    with patch("app.services.history._get_client", return_value=mock_client):
        service = HistoryService()
        await service.delete_session(tenant_id="tenant-1", session_id="session-1")

        # Verify delete was called
        assert mock_client.table.call_count >= 3


@pytest.mark.asyncio
async def test_delete_session_not_found():
    """Test delete_session raises error if session not found."""
    mock_client = MagicMock()
    mock_response = MagicMock()
    mock_response.data = []

    mock_client.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value = mock_response

    with patch("app.services.history._get_client", return_value=mock_client):
        service = HistoryService()
        with pytest.raises(ValueError, match="Session not found"):
            await service.delete_session(tenant_id="tenant-1", session_id="session-1")
