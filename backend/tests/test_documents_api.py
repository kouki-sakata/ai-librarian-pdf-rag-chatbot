"""Tests for Documents API endpoints."""

from unittest.mock import MagicMock, patch

import pytest
from fastapi import HTTPException


@pytest.mark.asyncio
async def test_list_documents():
    """Test list_documents returns documents for tenant."""
    from app.api.v1.endpoints.documents import list_documents
    from app.core.context import tenant_id_context

    mock_client = MagicMock()
    mock_response = MagicMock()
    mock_response.data = [
        {
            "id": "doc-1",
            "filename": "test.pdf",
            "file_size": 1024,
            "created_at": "2023-01-01T00:00:00Z",
        },
        {
            "id": "doc-2",
            "filename": "test2.pdf",
            "file_size": 2048,
            "created_at": "2023-01-02T00:00:00Z",
        },
    ]

    mock_client.table.return_value.select.return_value.eq.return_value.order.return_value.execute.return_value = mock_response

    with patch("app.api.v1.endpoints.documents.get_supabase_client", return_value=mock_client):
        tenant_id_context.set("tenant-1")
        result = await list_documents(sort="created_at", order="desc")

        assert len(result) == 2
        assert result[0]["id"] == "doc-1"
        assert result[0]["filename"] == "test.pdf"


@pytest.mark.asyncio
async def test_delete_document():
    """Test delete_document removes document and vectors."""
    from app.api.v1.endpoints.documents import delete_document
    from app.core.context import tenant_id_context

    mock_client = MagicMock()
    mock_doc_response = MagicMock()
    mock_doc_response.data = [
        {
            "id": "doc-1",
            "tenant_id": "tenant-1",
            "storage_path": "tenant-1/docs/doc-1.pdf",
        }
    ]

    # Document lookup
    mock_client.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value = mock_doc_response
    # Delete vectors
    mock_client.table.return_value.delete.return_value.eq.return_value.eq.return_value.execute.return_value = MagicMock()
    # Delete document
    mock_client.table.return_value.delete.return_value.eq.return_value.execute.return_value = (
        MagicMock()
    )
    # Delete from storage
    mock_client.storage.from_.return_value.remove.return_value = MagicMock()

    with patch("app.api.v1.endpoints.documents.get_supabase_client", return_value=mock_client):
        with patch("app.api.v1.endpoints.documents.settings") as mock_settings:
            mock_settings.SUPABASE_STORAGE_BUCKET = "test-bucket"
            tenant_id_context.set("tenant-1")
            result = await delete_document(document_id="doc-1")

            assert result["status"] == "deleted"


@pytest.mark.asyncio
async def test_delete_document_not_found():
    """Test delete_document raises 404 if document not found."""
    from app.api.v1.endpoints.documents import delete_document
    from app.core.context import tenant_id_context

    mock_client = MagicMock()
    mock_response = MagicMock()
    mock_response.data = []

    mock_client.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value = mock_response

    with patch("app.api.v1.endpoints.documents.get_supabase_client", return_value=mock_client):
        tenant_id_context.set("tenant-1")
        with pytest.raises(HTTPException) as exc_info:
            await delete_document(document_id="doc-1")

        assert exc_info.value.status_code == 404


@pytest.mark.asyncio
async def test_get_document_url():
    """Test get_document_url returns signed URL."""
    from app.api.v1.endpoints.documents import get_document_url
    from app.core.context import tenant_id_context

    mock_client = MagicMock()
    mock_doc_response = MagicMock()
    mock_doc_response.data = [
        {
            "id": "doc-1",
            "tenant_id": "tenant-1",
            "storage_path": "tenant-1/docs/doc-1.pdf",
        }
    ]

    mock_client.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value = mock_doc_response
    mock_client.storage.from_.return_value.create_signed_url.return_value = {
        "signedURL": "https://example.com/signed-url"
    }

    with patch("app.api.v1.endpoints.documents.get_supabase_client", return_value=mock_client):
        with patch("app.api.v1.endpoints.documents.settings") as mock_settings:
            mock_settings.SUPABASE_STORAGE_BUCKET = "test-bucket"
            tenant_id_context.set("tenant-1")
            result = await get_document_url(document_id="doc-1", page=5)

            assert "url" in result
            assert "#page=5" in result["url"]
