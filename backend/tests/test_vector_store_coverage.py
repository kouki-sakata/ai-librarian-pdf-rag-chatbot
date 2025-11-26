from unittest.mock import AsyncMock, MagicMock, patch

import pytest
import pytest_asyncio

from app.services.vector_store import VectorStoreService


@pytest_asyncio.fixture
async def mock_pool():
    """Mock AsyncConnectionPool for tests."""
    with patch("app.services.vector_store.AsyncConnectionPool") as mock_pool_class:
        mock_pool_instance = AsyncMock()
        mock_conn = AsyncMock()
        mock_cursor = AsyncMock()

        # Setup pool context manager
        mock_pool_class.return_value = mock_pool_instance
        mock_pool_instance.open = AsyncMock()
        mock_pool_instance.close = AsyncMock()

        # Setup connection as async context manager properly
        connection_ctx = AsyncMock()
        connection_ctx.__aenter__ = AsyncMock(return_value=mock_conn)
        connection_ctx.__aexit__ = AsyncMock(return_value=None)
        mock_pool_instance.connection = MagicMock(return_value=connection_ctx)

        # Setup cursor context manager
        cursor_ctx = AsyncMock()
        cursor_ctx.__aenter__ = AsyncMock(return_value=mock_cursor)
        cursor_ctx.__aexit__ = AsyncMock(return_value=None)
        mock_conn.cursor = MagicMock(return_value=cursor_ctx)

        yield mock_pool_instance, mock_conn, mock_cursor


@pytest.mark.asyncio
async def test_vector_store_upsert_vectors(mock_pool):
    mock_pool_instance, mock_conn, mock_cursor = mock_pool

    service = VectorStoreService()
    # Override pool
    VectorStoreService._pool = mock_pool_instance

    tenant_id = "tenant1"
    doc_id = "doc1"
    chunks = ["chunk1", "chunk2"]
    embeddings = [[0.1, 0.2], [0.3, 0.4]]
    metadata = [{"page": 1}, {"page": 2}]

    await service.upsert_vectors(tenant_id, doc_id, chunks, embeddings, metadata)

    # Verify executemany was called for insert
    assert mock_cursor.executemany.called
    args = mock_cursor.executemany.call_args
    assert "INSERT INTO vectors" in args[0][0]
    assert len(args[0][1]) == 2  # 2 chunks

    # Cleanup
    VectorStoreService._pool = None


@pytest.mark.asyncio
async def test_vector_store_delete_vectors(mock_pool):
    mock_pool_instance, mock_conn, mock_cursor = mock_pool

    service = VectorStoreService()
    VectorStoreService._pool = mock_pool_instance

    tenant_id = "tenant1"
    doc_id = "doc1"

    await service.delete_vectors(tenant_id, doc_id)

    # Verify delete execution
    mock_cursor.execute.assert_any_call(
        "DELETE FROM vectors WHERE tenant_id = %s AND doc_id = %s",
        (tenant_id, doc_id),
    )

    # Cleanup
    VectorStoreService._pool = None


@pytest.mark.asyncio
async def test_vector_store_search(mock_pool):
    mock_pool_instance, mock_conn, mock_cursor = mock_pool

    # Mock fetchall return
    mock_cursor.fetchall.return_value = [
        (
            "doc1",
            "content1",
            '{"page": 1}',
            0.1,
        ),  # similarity is distance, so 0.1 means 0.9 similarity
        ("doc2", "content2", None, 0.2),
    ]

    service = VectorStoreService()
    VectorStoreService._pool = mock_pool_instance

    tenant_id = "tenant1"

    results = await service.search(tenant_id, [0.1, 0.2], top_k=2)

    # Verify results
    assert len(results) == 2
    assert results[0]["doc_id"] == "doc1"
    assert results[0]["metadata"] == {"page": 1}
    assert (
        results[0]["similarity"] == 0.1
    )  # The mock returns raw distance/similarity as is from SQL

    # Test with string metadata
    assert results[1]["doc_id"] == "doc2"
    assert results[1]["metadata"] == {}

    # Cleanup
    VectorStoreService._pool = None
