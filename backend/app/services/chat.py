import json
from collections.abc import AsyncGenerator
from typing import Any

from openai import AsyncOpenAI

from app.core.config import settings
from app.services.history import HistoryService
from app.services.retriever import RetrieverService


class ChatService:
    def __init__(self):
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
            if not chunks:
                yield json.dumps(
                    {
                        "type": "token",
                        "content": "申し訳ございませんが、アップロードされた資料の中に関連する情報が見つかりませんでした。別の質問をお試しください。",
                    },
                    ensure_ascii=False,
                ) + "\n"
                return

            # 3. Construct prompt with citations instruction
            context_blocks = []
            citations: list[dict[str, Any]] = []
            for item in chunks:
                meta = item.get("metadata", {}) or {}
                source = meta.get("source") or meta.get("doc_id") or "unknown"
                page = meta.get("page") or meta.get("chunk")
                citations.append(
                    {
                        "source": source,
                        "page": page,
                        "similarity": item.get("similarity"),
                    }
                )
                context_blocks.append(
                    f"[source: {source} page: {page}]\n{item['content']}"
                )

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
                    yield json.dumps(
                        {"type": "token", "content": content},
                        ensure_ascii=False,
                    ) + "\n"

            # 4.1 Emit citation metadata once streaming finished
            yield json.dumps(
                {"type": "metadata", "citations": citations}, ensure_ascii=False
            ) + "\n"

            # 5. Save history
            # Save user message
            await self.history.add_message(tenant_id, session_id, "user", query)
            # Save assistant message
            await self.history.add_message(
                tenant_id, session_id, "assistant", full_response
            )
