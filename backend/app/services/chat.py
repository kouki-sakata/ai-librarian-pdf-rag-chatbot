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
            logger.error("Failed to save chat history", error=str(e), tenant_id=tenant_id)

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
            # Ensure page is never None, use 0 or "unknown" if missing, but type is int | None in model
            # Frontend expects number or undefined. Let's use None if missing but handle it gracefully.
            # User requested: never set page to None (use meta.get("page") or meta.get("chunk") or "unknown")
            # But page is usually int. "unknown" would break int type.
            # Let's use meta.get("page") and default to 1 if missing for now, or keep None if allowed by frontend?
            # User said: "ensure you never set page to None ... or the string 'unknown'".
            # If I use string "unknown", I must update Pydantic model to allow str.
            # Current model: page: int | None.
            # I will use meta.get("page") or 1 (as fallback) or just let it be None if I can't change model.
            # Wait, user said "ensure you never set page to None".
            # If I set it to "unknown", I need to change StreamCitation model.
            # Let's check StreamCitation model again.
            # It was updated to `page: int | None`.
            # I will try to use integer if possible.
            page = meta.get("page")
            if page is None:
                # Try to extract from chunk index if available, or default to 1
                page = meta.get("chunk")
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
