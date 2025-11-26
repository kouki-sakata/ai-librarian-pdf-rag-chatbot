import asyncio
import json
from collections.abc import AsyncGenerator
from typing import Any

from openai import AsyncOpenAI

from app.core.config import settings
from app.core.logger import setup_logger
from app.services.history import HistoryService
from app.services.retriever import RetrieverService

logger = setup_logger(__name__)


class ChatService:
    def __init__(self) -> None:
        self.retriever = RetrieverService()
        self.history = HistoryService()
        # Initialize AsyncOpenAI with settings
        self.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

    async def _save_history_background(
        self, tenant_id: str, session_id: str, query: str, response: str
    ) -> None:
        """Save chat history in background without blocking response."""
        try:
            await self.history.add_message(tenant_id, session_id, "user", query)
            await self.history.add_message(tenant_id, session_id, "assistant", response)
        except Exception as e:
            # Log with structured extras to avoid mypy invalid keywords
            logger.error(
                "Failed to save chat history (tenant_id=%s): %s",
                tenant_id,
                str(e),
                exc_info=e,
                extra={"tenant_id": tenant_id},
            )

    async def generate_response(
        self, tenant_id: str, session_id: str, query: str
    ) -> AsyncGenerator[str, None]:
        """
        Generate a streaming response for a user query using RAG.
        Yields NDJSON chunks with types: 'token', 'metadata'.
        """
        # 0. Retrieve relevant chunks
        chunks = await self.retriever.retrieve(tenant_id, query)

        # 1. If no chunks, return early response
        if not chunks:
            empty_response = "申し訳ございません。関連する文書が見つかりませんでした。質問を言い換えていただくか、別のキーワードでお試しください。"
            yield (
                json.dumps(
                    {"type": "token", "content": empty_response},
                    ensure_ascii=False,
                )
                + "\n"
            )
            yield (
                json.dumps(
                    {
                        "type": "metadata",
                        "citations": [],
                        "results": 0,
                        "empty_result": True,
                    },
                    ensure_ascii=False,
                )
                + "\n"
            )
            # Save history in background
            asyncio.create_task(
                self._save_history_background(tenant_id, session_id, query, empty_response)
            )
            return

        # 2. Build context and citations
        context_parts = []
        citations: list[dict[str, Any]] = []
        for item in chunks:
            meta = item.get("metadata", {}) or {}
            source = meta.get("source") or meta.get("doc_id") or "unknown"
            page = meta.get("page")
            doc_id = meta.get("doc_id")
            similarity = item.get("similarity")

            context_parts.append(item["content"])
            citations.append(
                {
                    "source": source,
                    "page": page,
                    "doc_id": doc_id,
                    "similarity": similarity,
                }
            )

        context = "\n\n".join(context_parts)

        # 3. Stream response
        prompt = f"""以下の文脈を踏まえて、質問に回答してください。回答は日本語で行ってください。

文脈:
{context}

質問: {query}

回答:"""

        stream = await self.client.chat.completions.create(
            model=settings.OPENAI_MODEL,
            messages=[{"role": "user", "content": prompt}],
            stream=True,
        )

        # 4. Yield chunks as NDJSON tokens
        full_response = ""
        async for chunk in stream:
            content = chunk.choices[0].delta.content
            if content:
                full_response += content
                yield (
                    json.dumps(
                        {"type": "token", "content": content},
                        ensure_ascii=False,
                    )
                    + "\n"
                )

        # 4.1 Emit citation metadata once streaming finished
        yield (
            json.dumps(
                {
                    "type": "metadata",
                    "citations": citations,
                    "results": len(citations),
                },
                ensure_ascii=False,
            )
            + "\n"
        )

        # 5. Save history in background (non-blocking)
        asyncio.create_task(
            self._save_history_background(tenant_id, session_id, query, full_response)
        )
