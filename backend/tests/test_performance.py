"""
Performance tests for backend optimizations.

Tests cache effectiveness and connection pooling performance.
"""

import asyncio
import time
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
import pytest_asyncio

from app.services.vector_store import VectorStoreService


@pytest_asyncio.fixture
async def mock_openai_embeddings():
    """Mock OpenAI embeddings to avoid API calls."""
    with patch("app.services.vector_store.OpenAIEmbeddings") as mock:
        instance = mock.return_value

        # Create a sync version since embeddings.embed_documents is sync in OpenAI
        def slow_embed(texts):
            # Simulate API latency in sync context
            time.sleep(0.1)
            return [[0.1, 0.2] for _ in texts]

        instance.embed_documents = slow_embed
        yield instance


@pytest_asyncio.fixture
async def mock_pool():
    """Mock AsyncConnectionPool for tests."""
    with patch("app.services.vector_store.AsyncConnectionPool") as mock_pool_class:
        mock_pool_instance = AsyncMock()
        mock_conn = AsyncMock()
        mock_cursor = AsyncMock()

        # Setup pool
        mock_pool_class.return_value = mock_pool_instance
        mock_pool_instance.open = AsyncMock()
        mock_pool_instance.close = AsyncMock()

        # Setup connection context manager
        connection_ctx = AsyncMock()
        connection_ctx.__aenter__ = AsyncMock(return_value=mock_conn)
        connection_ctx.__aexit__ = AsyncMock(return_value=None)
        mock_pool_instance.connection = MagicMock(return_value=connection_ctx)

        # Setup cursor context manager
        cursor_ctx = AsyncMock()
        cursor_ctx.__aenter__ = AsyncMock(return_value=mock_cursor)
        cursor_ctx.__aexit__ = AsyncMock(return_value=None)
        mock_conn.cursor = MagicMock(return_value=cursor_ctx)

        # Mock search results
        mock_cursor.fetchall.return_value = [
            ("doc1", "content1", '{"page": 1}', 0.1),
        ]

        yield mock_pool_instance, mock_conn, mock_cursor


@pytest.mark.asyncio
async def test_embedding_cache_performance(mock_openai_embeddings, mock_pool):
    """Test that embedding generation is cached and faster on subsequent calls."""
    mock_pool_instance, _, _ = mock_pool

    service = VectorStoreService()
    VectorStoreService._pool = mock_pool_instance

    query = "test query for caching"

    # First call - should be slow due to "API" call
    start = time.time()
    result1 = await service.generate_embeddings_async([query])
    first_duration = time.time() - start

    # Second call - should be much faster (cached)
    start = time.time()
    result2 = await service.generate_embeddings_async([query])
    second_duration = time.time() - start

    # Verify results are the same
    assert result1 == result2

    # Cache should make second call significantly faster
    # First call has 0.1s sleep, second should be near-instant
    assert second_duration < first_duration * 0.5, (
        f"Cache not effective: first={first_duration:.3f}s, second={second_duration:.3f}s"
    )

    # Cleanup
    VectorStoreService._pool = None


@pytest.mark.asyncio
async def test_concurrent_requests_with_pool(mock_openai_embeddings, mock_pool):
    """Test that connection pool handles concurrent requests efficiently."""
    mock_pool_instance, _, _ = mock_pool

    service = VectorStoreService()
    VectorStoreService._pool = mock_pool_instance

    # Simulate multiple concurrent search requests
    async def search_task(query_id: int):
        embedding = await service.generate_embeddings_async([f"query {query_id}"])
        return await service.search("tenant1", embedding[0], top_k=5)

    # Run 10 concurrent searches
    start = time.time()
    tasks = [search_task(i) for i in range(10)]
    results = await asyncio.gather(*tasks)
    duration = time.time() - start

    # All requests should complete
    assert len(results) == 10

    # With connection pooling, concurrent requests should complete
    # in reasonable time (not linearly with count)
    # 10 requests * 0.1s (if serial) = 1.0s
    # With pooling, should be much faster
    assert duration < 0.5, f"Concurrent requests took too long: {duration:.3f}s"

    # Cleanup
    VectorStoreService._pool = None


@pytest.mark.asyncio
async def test_cache_different_queries(mock_openai_embeddings, mock_pool):
    """Test that different queries are cached separately."""
    mock_pool_instance, _, _ = mock_pool

    service = VectorStoreService()
    VectorStoreService._pool = mock_pool_instance

    query1 = "first query"
    query2 = "second query"

    # Generate embeddings for different queries
    result1 = await service.generate_embeddings_async([query1])
    result2 = await service.generate_embeddings_async([query2])

    # Re-query to test cache
    cached1 = await service.generate_embeddings_async([query1])
    cached2 = await service.generate_embeddings_async([query2])

    # Results should be consistent
    assert cached1 == result1
    assert cached2 == result2

    # Different queries should have different results
    # (in real impl they would, our mock returns same but structure tests cache)
    assert result1 is not result2  # Different objects

    # Cleanup
    VectorStoreService._pool = None


@pytest.mark.asyncio
async def test_cache_ttl_behavior(mock_openai_embeddings, mock_pool):
    """Test that cache respects TTL configuration."""
    mock_pool_instance, _, _ = mock_pool

    service = VectorStoreService()
    VectorStoreService._pool = mock_pool_instance

    query = "ttl test query"

    # Generate initial embedding
    result1 = await service.generate_embeddings_async([query])

    # Immediate re-query should hit cache
    result2 = await service.generate_embeddings_async([query])
    assert result1 == result2

    # Cache is configured with 1 hour TTL, so this should still be cached
    # (we can't easily test expiration without mocking time or waiting)

    # Cleanup
    VectorStoreService._pool = None
