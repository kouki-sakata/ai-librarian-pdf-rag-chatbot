import json
from unittest.mock import MagicMock, patch

import pytest

from app.services.vector_store import VectorStoreService


@pytest.fixture
def mock_db_connection():
    with patch("psycopg.connect") as mock_connect, \
         patch("app.services.vector_store.register_vector") as mock_register:  # Mock register_vector
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_connect.return_value = mock_conn
        # Connection context manager
        mock_conn.__enter__.return_value = mock_conn
        # Cursor context manager
        mock_conn.cursor.return_value.__enter__.return_value = mock_cursor
        yield mock_connect, mock_conn, mock_cursor


@pytest.mark.asyncio
async def test_vector_store_upsert_vectors(mock_db_connection):
    mock_connect, mock_conn, mock_cursor = mock_db_connection
    
    service = VectorStoreService()
    service.conninfo = "postgresql://user:pass@localhost:5432/db"  # Dummy conninfo
    # Mock embeddings to avoid API call
    service.embeddings = MagicMock()
    
    tenant_id = "tenant1"
    doc_id = "doc1"
    chunks = ["chunk1", "chunk2"]
    embeddings = [[0.1, 0.2], [0.3, 0.4]]
    metadata = [{"page": 1}, {"page": 2}]
    
    await service.upsert_vectors(tenant_id, doc_id, chunks, embeddings, metadata)
    
    # Verify set_config was called
    mock_cursor.execute.assert_any_call("select set_config('app.tenant_id', %s, true);", (tenant_id,))
    
    # Verify executemany was called for insert
    assert mock_cursor.executemany.called
    args = mock_cursor.executemany.call_args
    assert "INSERT INTO vectors" in args[0][0]
    assert len(args[0][1]) == 2  # 2 chunks


@pytest.mark.asyncio
async def test_vector_store_delete_vectors(mock_db_connection):
    mock_connect, mock_conn, mock_cursor = mock_db_connection
    
    service = VectorStoreService()
    service.conninfo = "postgresql://user:pass@localhost:5432/db"  # Dummy conninfo
    
    tenant_id = "tenant1"
    doc_id = "doc1"
    
    await service.delete_vectors(tenant_id, doc_id)
    
    # Verify set_config was called
    mock_cursor.execute.assert_any_call("select set_config('app.tenant_id', %s, true);", (tenant_id,))
    
    # Verify delete execution
    mock_cursor.execute.assert_any_call(
        "DELETE FROM vectors WHERE tenant_id = %s AND doc_id = %s",
        (tenant_id, doc_id),
    )


@pytest.mark.asyncio
async def test_vector_store_search(mock_db_connection):
    mock_connect, mock_conn, mock_cursor = mock_db_connection
    
    # Mock fetchall return
    mock_cursor.fetchall.return_value = [
        ("doc1", "content1", '{"page": 1}', 0.1),  # similarity is distance, so 0.1 means 0.9 similarity
        ("doc2", "content2", None, 0.2),
    ]
    
    service = VectorStoreService()
    service.conninfo = "postgresql://user:pass@localhost:5432/db"  # Dummy conninfo
    # Mock embeddings
    service.embeddings = MagicMock()
    service.embeddings.embed_documents.return_value = [[0.1, 0.2]]
    
    tenant_id = "tenant1"
    query = "test query"
    
    results = await service.search(tenant_id, [0.1, 0.2], top_k=2)
    
    # Verify set_config
    mock_cursor.execute.assert_any_call("select set_config('app.tenant_id', %s, true);", (tenant_id,))
    
    # Verify results
    assert len(results) == 2
    assert results[0]["doc_id"] == "doc1"
    assert results[0]["metadata"] == {"page": 1}
    assert results[0]["similarity"] == 0.1  # The mock returns raw distance/similarity as is from SQL
    
    # Test with string metadata
    assert results[1]["doc_id"] == "doc2"
    assert results[1]["metadata"] == {}
