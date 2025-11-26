from __future__ import annotations

import asyncio
import hashlib
import json
from typing import Any

import psycopg
from async_lru import alru_cache
from langchain_openai import OpenAIEmbeddings
from pgvector.psycopg import register_vector_async
from psycopg_pool import AsyncConnectionPool
from pydantic import SecretStr

from app.core.config import settings


class VectorStoreService:
    _pool: AsyncConnectionPool | None = None
    _pool_lock: asyncio.Lock = asyncio.Lock()

    def __init__(self) -> None:
        self.embeddings = OpenAIEmbeddings(
            model=settings.OPENAI_EMBEDDING_MODEL,
            openai_api_key=SecretStr(settings.OPENAI_API_KEY),
        )

    @classmethod
    async def get_pool(cls) -> AsyncConnectionPool:
        """Get or create connection pool singleton."""
        async with cls._pool_lock:
            if cls._pool is None:
                db_url = settings.effective_supabase_db_url
                if not db_url:
                    raise RuntimeError(
                        "SUPABASE_DB_URL (production) or SUPABASE_DEV_DB_URL (development) is not configured"
                    )

                async def configure_connection(conn: psycopg.AsyncConnection) -> None:
                    await register_vector_async(conn)

                cls._pool = AsyncConnectionPool(
                    conninfo=db_url,
                    min_size=2,
                    max_size=10,
                    open=False,
                    configure=configure_connection,
                )
                await cls._pool.open()
            return cls._pool

    @classmethod
    async def close_pool(cls) -> None:
        """Close the connection pool."""
        async with cls._pool_lock:
            if cls._pool is not None:
                await cls._pool.close()
                cls._pool = None

    @staticmethod
    async def _set_tenant(cur: psycopg.AsyncCursor, tenant_id: str) -> None:
        """Set app.tenant_id for the current transaction so RLS policies evaluate correctly."""
        await cur.execute("select set_config('app.tenant_id', %s, true);", (tenant_id,))

    @alru_cache(maxsize=128, ttl=3600)
    async def _generate_embeddings_cached(self, text_tuple: tuple[str, ...]) -> list[list[float]]:
        """
        Generate embeddings with caching (instance-scoped alru_cache; reset per service instance).
        maxsize=128 and ttl=3600 balance memory footprint and OpenAI API cost by caching recent prompts for 1 hour.
        Consider making maxsize/ttl configurable (env or service config) for production tuning.
        """

        def _sync_embed() -> list[list[float]]:
            return self.embeddings.embed_documents(list(text_tuple))

        return await asyncio.to_thread(_sync_embed)

    def generate_embeddings(self, chunks: list[str]) -> list[list[float]]:
        """Generate embeddings for a list of text chunks (sync wrapper for compatibility)."""
        return self.embeddings.embed_documents(chunks)

    async def generate_embeddings_async(self, chunks: list[str]) -> list[list[float]]:
        """Generate embeddings asynchronously with caching."""
        return await self._generate_embeddings_cached(tuple(chunks))

    async def upsert_vectors(
        self,
        tenant_id: str,
        doc_id: str,
        chunks: list[str],
        embeddings: list[list[float]],
        metadata: list[dict[str, Any]] | None = None,
    ) -> None:
        """Persist chunk embeddings into pgvector with idempotent upsert."""
        pool = await self.get_pool()
        metadata_param = metadata or []

        async with pool.connection() as conn:
            async with conn.cursor() as cur:
                await self._set_tenant(cur, tenant_id)

                records = []
                for idx, (chunk, emb) in enumerate(zip(chunks, embeddings)):
                    chunk_hash = hashlib.sha1(chunk.encode("utf-8")).hexdigest()
                    meta = metadata_param[idx] if idx < len(metadata_param) else {}
                    meta.setdefault("doc_id", doc_id)
                    meta.setdefault("tenant_id", tenant_id)
                    meta.setdefault("chunk_index", idx + 1)

                    records.append(
                        (
                            tenant_id,
                            doc_id,
                            chunk_hash,
                            chunk,
                            json.dumps(meta),
                            emb,
                        )
                    )

                await cur.executemany(
                    """
                    INSERT INTO vectors (tenant_id, doc_id, chunk_hash, content, metadata, embedding)
                    VALUES (%s, %s, %s, %s, %s::jsonb, %s)
                    ON CONFLICT (tenant_id, doc_id, chunk_hash) DO UPDATE
                    SET content = EXCLUDED.content,
                        metadata = EXCLUDED.metadata,
                        embedding = EXCLUDED.embedding;
                    """,
                    records,
                )

    async def delete_vectors(self, tenant_id: str, doc_id: str) -> None:
        """Delete all vectors for a document in a tenant scope."""
        pool = await self.get_pool()

        async with pool.connection() as conn:
            async with conn.cursor() as cur:
                await self._set_tenant(cur, tenant_id)
                await cur.execute(
                    "DELETE FROM vectors WHERE tenant_id = %s AND doc_id = %s",
                    (tenant_id, doc_id),
                )

    async def search(
        self, tenant_id: str, query_embedding: list[float], top_k: int = 5
    ) -> list[dict[str, Any]]:
        """Semantic search constrained by tenant_id."""
        pool = await self.get_pool()

        async with pool.connection() as conn:
            async with conn.cursor() as cur:
                await self._set_tenant(cur, tenant_id)
                await cur.execute(
                    """
                    SELECT doc_id,
                           content,
                           metadata::jsonb,
                           1 - (embedding <=> %s::vector) AS similarity
                    FROM vectors
                    WHERE tenant_id = %s
                    ORDER BY similarity DESC
                    LIMIT %s;
                    """,
                    (query_embedding, tenant_id, top_k),
                )
                rows = await cur.fetchall()
                return [
                    {
                        "doc_id": str(row[0]),
                        "content": row[1],
                        "metadata": (
                            json.loads(row[2]) if isinstance(row[2], str) else (row[2] or {})
                        ),
                        "similarity": float(row[3]) if row[3] is not None else 0.0,
                    }
                    for row in rows
                ]
