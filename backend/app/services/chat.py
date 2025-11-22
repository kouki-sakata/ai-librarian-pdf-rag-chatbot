import os
from typing import AsyncGenerator

from app.services.history import HistoryService
from app.services.retriever import RetrieverService
from openai import AsyncOpenAI


class ChatService:
    def __init__(self):
        self.retriever = RetrieverService()
        self.history = HistoryService()
        # Initialize AsyncOpenAI
        api_key = os.getenv("OPENAI_API_KEY")
        self.client = AsyncOpenAI(api_key=api_key or "mock-key")

    async def generate_response(
        self, tenant_id: str, session_id: str, query: str
    ) -> AsyncGenerator[str, None]:
        from app.core.telemetry import chat_latency_histogram, measure_latency

        # Measure latency for the whole process (retrieval + generation)
        # Note: Since this is a generator, we can't easily use the context manager around the yield.
        # We will measure up to the start of streaming, or we'd need a wrapper.
        # For simplicity, let's measure the retrieval + initial LLM call setup time,
        # or we can wrap the whole thing if we consume it.
        # But for streaming, latency usually means "time to first token" or "total time".
        # Let's measure total time by manual start/stop around the generator loop?
        # Actually, the context manager works if we wrap the whole function body, but yield pauses execution.
        # So the context manager would stay open until the generator finishes? Yes.

        with measure_latency(
            chat_latency_histogram, {"tenant_id": tenant_id}, threshold_seconds=5.0
        ):
            # 1. Retrieve relevant chunks
            chunks = await self.retriever.retrieve(tenant_id, query)

            # 2. Construct prompt
            context_text = "\n\n".join([chunk["content"] for chunk in chunks])
            system_prompt = f"""You are a helpful AI librarian. Use the following context to answer the user's question.
            If the answer is not in the context, say you don't know.
            
            Context:
            {context_text}
            """

            # 3. Call LLM
            stream = await self.client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": query},
                ],
                stream=True,
            )

            # 4. Yield chunks
            full_response = ""
            async for chunk in stream:
                content = chunk.choices[0].delta.content
                if content:
                    full_response += content
                    yield content

            # 5. Save history
            # Save user message
            await self.history.add_message(tenant_id, session_id, "user", query)
            # Save assistant message
            await self.history.add_message(
                tenant_id, session_id, "assistant", full_response
            )
