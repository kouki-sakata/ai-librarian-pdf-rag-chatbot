import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.chat import ChatService
from app.services.retriever import RetrieverService

# Mock Data
MOCK_QUERY = "What is the summary?"
MOCK_CHUNKS = [
    {"content": "This is a summary.", "metadata": {"source": "doc1", "page": 1}},
    {"content": "Another detail.", "metadata": {"source": "doc1", "page": 2}},
]
MOCK_ANSWER = "The summary is..."


@pytest.fixture
def mock_vector_store():
    with patch("app.services.retriever.VectorStoreService") as mock:
        instance = mock.return_value
        instance.search = AsyncMock(return_value=MOCK_CHUNKS)
        instance.generate_embeddings_async = AsyncMock(return_value=[[0.1, 0.2]])
        yield instance


@pytest.fixture
def mock_history_service():
    with patch("app.services.chat.HistoryService") as mock:
        instance = mock.return_value
        instance.add_message = AsyncMock()
        yield instance


@pytest.fixture
def mock_openai():
    with patch("app.services.chat.AsyncOpenAI") as mock:
        instance = mock.return_value

        # Mock streaming response
        async def mock_stream(*args, **kwargs):
            yield MagicMock(choices=[MagicMock(delta=MagicMock(content="The "))])
            yield MagicMock(choices=[MagicMock(delta=MagicMock(content="summary "))])
            yield MagicMock(choices=[MagicMock(delta=MagicMock(content="is..."))])

        # The create method itself is awaited and returns the stream
        # We need to make sure instance.chat.completions.create is an AsyncMock
        # that returns the async generator when awaited.
        instance.chat.completions.create = AsyncMock(return_value=mock_stream())
        yield instance


@pytest.mark.asyncio
async def test_retrieve_relevant_chunks(mock_vector_store):
    retriever = RetrieverService()
    chunks = await retriever.retrieve("tenant1", "query")

    assert len(chunks) == 2
    assert chunks[0]["content"] == "This is a summary."
    mock_vector_store.generate_embeddings_async.assert_called_once()
    mock_vector_store.search.assert_called_once()


@pytest.mark.asyncio
async def test_generate_answer_flow(mock_vector_store, mock_openai, mock_history_service):
    # Setup
    service = ChatService()

    # Execute
    response_generator = service.generate_response("tenant1", "session1", MOCK_QUERY)

    # Verify stream
    chunks = []
    async for chunk in response_generator:
        chunks.append(chunk)

    # Extract streamed token contents and ensure they combine to expected text
    token_text = "".join(
        json.loads(item)["content"] for item in chunks if json.loads(item).get("type") == "token"
    )
    assert token_text == "The summary is..."

    # Verify interactions
    mock_vector_store.search.assert_called()  # Retrieval happened
    mock_openai.chat.completions.create.assert_called()  # LLM called

    # History saving is done in background task and can't be easily verified here
