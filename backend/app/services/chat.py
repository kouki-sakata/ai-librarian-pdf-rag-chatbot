import json
from collections.abc import AsyncGenerator
from typing import Any

from openai import AsyncOpenAI

from app.core.config import settings
from app.services.history import HistoryService
from app.services.retriever import RetrieverService


class ChatService:
    def __init__(self) -> None:
        self.retriever = RetrieverService()
        self.history = HistoryService()
        # Initialize AsyncOpenAI with settings
        self.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

    async def generate_response(
        self, tenant_id: str, session_id: str, query: str
    ) -> AsyncGenerator[str, None]:
        from app.core.telemetry import chat_latency_histogram, measure_latency

        with measure_latency(
            chat_latency_histogram,
            {"tenant_id": tenant_id},
            threshold_seconds=settings.CHAT_LATENCY_THRESHOLD_SECONDS,
        ):
            # 1. Retrieve relevant chunks
            chunks = await self.retriever.retrieve(tenant_id, query)

            # 2. Check if chunks are empty
            # 2. Check if chunks are empty
            if not chunks:
                empty_message = "申し訳ございませんが、アップロードされた資料の中に関連する情報が見つかりませんでした。別の質問をお試しください。"
                yield (
                    json.dumps(
                        {
                            "type": "token",
                            "content": empty_message,
                        },
                        ensure_ascii=False,
                    )
                    + "\n"
                )
                # Emit empty metadata
                yield (
                    json.dumps(
                        {"type": "metadata", "citations": [], "empty": True},
                        ensure_ascii=False,
                    )
                    + "\n"
                )
                # Save history even for empty results
                await self.history.add_message(tenant_id, session_id, "user", query)
                await self.history.add_message(tenant_id, session_id, "assistant", empty_message)
                return

            # 3. Construct prompt with citations instruction
            context_blocks = []
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
                    page = meta.get("chunk", 1)

                citations.append(
                    {
                        "source": source,
                        "doc_id": meta.get("doc_id") or item.get("doc_id"),
                        "page": page,
                        "similarity": item.get("similarity"),
                    }
                )
                context_blocks.append(f"[source: {source} page: {page}]\n{item['content']}")

            context_text = "\n\n".join(context_blocks)
            system_prompt = (
                "あなたは司書アシスタントです。与えられたコンテキストだけに基づき日本語で回答し、"
                "各根拠には '［source: ◯, page: ◯］' の形で引用を添えてください。"
                "コンテキストに無い場合は知らないと答えてください。\n\n"
                f"コンテキスト:\n{context_text}"
            )

            # 4. Call LLM with configured model
            stream = await self.client.chat.completions.create(
                model=settings.OPENAI_MODEL,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": query},
                ],
                temperature=settings.OPENAI_TEMPERATURE,
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

            # 5. Save history
            # Save user message
            await self.history.add_message(tenant_id, session_id, "user", query)
            # Save assistant message
            await self.history.add_message(tenant_id, session_id, "assistant", full_response)
