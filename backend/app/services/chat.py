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
        """
        Generates a streaming response for a query using RAG.
        """
        # 1. Retrieve relevant chunks
        chunks = await self.retriever.retrieve(tenant_id, query)

        # 2. Construct Prompt
        context = "\n\n".join([c["content"] for c in chunks])
        system_prompt = f"""You are a helpful AI Librarian. Use the following context to answer the user's question.
If the answer is not in the context, say you don't know.

Context:
{context}
"""

        # 3. Call LLM with Streaming
        stream = await self.client.chat.completions.create(
            model="gpt-4o-mini",  # or gpt-3.5-turbo
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
