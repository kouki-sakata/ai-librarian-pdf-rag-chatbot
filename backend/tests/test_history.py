from unittest.mock import patch

import pytest

from app.services.history import HistoryService


@pytest.fixture
def mock_supabase():
    with patch("app.services.history.supabase") as mock:
        yield mock


@pytest.mark.asyncio
async def test_create_session(mock_supabase):
    service = HistoryService()
    tenant_id = "tenant1"

    # Mock response
    mock_supabase.table.return_value.insert.return_value.execute.return_value.data = [
        {"id": "session1"}
    ]

    session_id = await service.create_session(tenant_id)

    assert session_id == "session1"
    mock_supabase.table.assert_called_with("chat_sessions")
    mock_supabase.table.return_value.insert.assert_called_with({"tenant_id": tenant_id})


@pytest.mark.asyncio
async def test_add_message(mock_supabase):
    service = HistoryService()
    tenant_id = "tenant1"
    session_id = "session1"
    role = "user"
    content = "Hello"

    await service.add_message(tenant_id, session_id, role, content)

    mock_supabase.table.assert_called_with("chat_messages")
    mock_supabase.table.return_value.insert.assert_called_with(
        {
            "tenant_id": tenant_id,
            "session_id": session_id,
            "role": role,
            "content": content,
        }
    )


@pytest.mark.asyncio
async def test_get_history(mock_supabase):
    service = HistoryService()
    tenant_id = "tenant1"
    session_id = "session1"

    mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.order.return_value.execute.return_value.data = [
        {"role": "user", "content": "Hello"},
        {"role": "assistant", "content": "Hi"},
    ]

    history = await service.get_history(tenant_id, session_id)

    assert len(history) == 2
    assert history[0]["role"] == "user"
