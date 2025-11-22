from __future__ import annotations

import asyncio
import json
import hashlib
from typing import Any

import psycopg
from langchain_openai import OpenAIEmbeddings
from pgvector.psycopg import register_vector

from app.core.config import settings


class VectorStoreService:
    def __init__(self):
        self.embeddings = OpenAIEmbeddings(
            model=settings.OPENAI_EMBEDDING_MODEL,
            api_key=settings.OPENAI_API_KEY,
        )
        self.conninfo = settings.SUPABASE_DB_URL

    def _get_conn(self) -> psycopg.Connection:
        if not self.conninfo:
            raise RuntimeError("SUPABASE_DB_URL is not configured")
        conn = psycopg.connect(self.conninfo, autocommit=True)
        register_vector(conn)
        return conn

    @staticmethod
    def _set_tenant(cur: psycopg.Cursor, tenant_id: str) -> None:
        """
        Set app.tenant_id for the current transaction so RLS policies evaluate correctly.
        """
        cur.execute("select set_config('app.tenant_id', %s, true);", (tenant_id,))

    def generate_embeddings(self, chunks: list[str]) -> list[list[float]]:
        """Generate embeddings for a list of text chunks."""
        return self.embeddings.embed_documents(chunks)

    async def upsert_vectors(
        self,
        tenant_id: str,
        doc_id: str,
        chunks: list[str],
        embeddings: list[list[float]],
        metadata: list[dict[str, Any]] | None = None,
    ) -> None:
        """Persist chunk embeddings into pgvector with idempotent upsert."""

        def _upsert() -> None:
            with self._get_conn() as conn, conn.cursor() as cur:
                self._set_tenant(cur, tenant_id)

                records = []
                metadata = metadata_param or []
                for idx, (chunk, emb) in enumerate(zip(chunks, embeddings)):
                    chunk_hash = hashlib.sha1(chunk.encode("utf-8")).hexdigest()
                    meta = metadata[idx] if idx < len(metadata) else {}
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

                cur.executemany(
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

        metadata_param = metadata
        await asyncio.to_thread(_upsert)

    async def delete_vectors(self, tenant_id: str, doc_id: str) -> None:
        """Delete all vectors for a document in a tenant scope."""

        def _delete() -> None:
            with self._get_conn() as conn, conn.cursor() as cur:
                self._set_tenant(cur, tenant_id)
                cur.execute(
                    "DELETE FROM vectors WHERE tenant_id = %s AND doc_id = %s",
                    (tenant_id, doc_id),
                )

        await asyncio.to_thread(_delete)

    async def search(
        self, tenant_id: str, query_embedding: list[float], top_k: int = 5
    ) -> list[dict[str, Any]]:
        """Semantic search constrained by tenant_id."""

        def _search() -> list[dict[str, Any]]:
            with self._get_conn() as conn, conn.cursor() as cur:
                self._set_tenant(cur, tenant_id)
                cur.execute(
                    """
                    SELECT doc_id,
                           content,
                           metadata::jsonb,
                           1 - (embedding <=> %s) AS similarity
                    FROM vectors
                    WHERE tenant_id = %s
                    ORDER BY similarity DESC
                    LIMIT %s;
                    """,
                    (query_embedding, tenant_id, top_k),
                )
                rows = cur.fetchall()
                return [
                    {
                        "doc_id": str(row[0]),
                        "content": row[1],
                        "metadata": (
                            json.loads(row[2])
                            if isinstance(row[2], str)
                            else (row[2] or {})
                        ),
                        "similarity": float(row[3]) if row[3] is not None else 0.0,
                    }
                    for row in rows
                ]

        return await asyncio.to_thread(_search)
