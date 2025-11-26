import json
from unittest.mock import AsyncMock, patch

import pytest

from app.services.chat import ChatService


@pytest.mark.asyncio
async def test_chat_service_empty_result():
    """
    Test that ChatService returns a specific message and metadata when no chunks are found.
    """
    with (
        patch("app.services.chat.RetrieverService") as MockRetriever,
        patch("app.services.chat.AsyncOpenAI") as MockOpenAI,
        patch("app.services.chat.HistoryService") as MockHistory,
    ):
        # Setup Mocks
        mock_retriever = MockRetriever.return_value
        mock_retriever.retrieve = AsyncMock(return_value=[])  # Empty results

        mock_history = MockHistory.return_value
        mock_history.add_message = AsyncMock()

        service = ChatService()

        # Execute
        responses = []
        async for chunk in service.generate_response("tenant1", "session1", "query"):
            responses.append(chunk)

        # Verify
        # Should yield token message and metadata message
        assert len(responses) >= 2

        # Check token message
        token_msg = json.loads(responses[0])
        assert token_msg["type"] == "token"
        assert "関連する文書が見つかりませんでした" in token_msg["content"]

        # Check metadata message
        meta_msg = json.loads(responses[1])
        assert meta_msg["type"] == "metadata"
        assert meta_msg["citations"] == []
        assert meta_msg.get("empty_result") is True

        # History is saved in background task, so we can't easily verify it in this test
        # In a real scenario, we'd need to await asyncio tasks or use a different approach


@pytest.mark.asyncio
async def test_chat_service_with_citations():
    """
    Test that ChatService returns citations in metadata when chunks are found.
    """
    with (
        patch("app.services.chat.RetrieverService") as MockRetriever,
        patch("app.services.chat.AsyncOpenAI") as MockOpenAI,
        patch("app.services.chat.HistoryService") as MockHistory,
    ):
        # Setup Mocks
        mock_retriever = MockRetriever.return_value
        mock_retriever.retrieve = AsyncMock(
            return_value=[
                {
                    "content": "Chunk 1",
                    "doc_id": "doc1",
                    "metadata": {"source": "file1.pdf", "page": 1, "doc_id": "doc1"},
                    "similarity": 0.9,
                },
                {
                    "content": "Chunk 2",
                    "doc_id": "doc2",
                    "metadata": {"source": "file2.pdf", "page": 2, "doc_id": "doc2"},
                    "similarity": 0.8,
                },
            ]
        )

        mock_history = MockHistory.return_value
        mock_history.add_message = AsyncMock()

        # Mock OpenAI Stream
        mock_openai = MockOpenAI.return_value

        async def mock_stream_generator():
            class MockChoice:
                def __init__(self, content):
                    self.delta = type("obj", (object,), {"content": content})

            yield type("obj", (object,), {"choices": [MockChoice("Answer")]})

        # create needs to be an awaitable that returns the generator
        mock_openai.chat.completions.create = AsyncMock(return_value=mock_stream_generator())

        service = ChatService()

        # Execute
        responses = []
        async for chunk in service.generate_response("tenant1", "session1", "query"):
            responses.append(chunk)

        # Verify
        # Should yield token message and metadata message
        # Note: The implementation yields tokens directly as strings (or JSON tokens?)
        # Let's check the implementation. It yields JSON strings.

        # Filter for metadata
        meta_msgs = [json.loads(r) for r in responses if "metadata" in r]
        assert len(meta_msgs) == 1
        meta = meta_msgs[0]

        assert meta["type"] == "metadata"
        assert len(meta["citations"]) == 2
        assert meta["citations"][0]["source"] == "file1.pdf"
        assert meta["citations"][0]["page"] == 1
        assert meta["citations"][0]["doc_id"] == "doc1"
