from unittest.mock import AsyncMock, patch

import pytest
from app.services.ingestion import IngestionService
from app.services.parser import PdfParser
from app.services.vector_store import VectorStoreService

# Mock data
MOCK_PDF_CONTENT = b"%PDF-1.4 content..."
MOCK_TEXT = "Page 1 content. Page 2 content."
MOCK_CHUNKS = ["Page 1 content.", "Page 2 content."]
MOCK_EMBEDDINGS = [[0.1, 0.2], [0.3, 0.4]]


@pytest.fixture
def mock_pdf_parser():
    with patch("app.services.ingestion.PdfParser") as mock:
        instance = mock.return_value
        instance.extract_text.return_value = MOCK_TEXT
        instance.split_text.return_value = MOCK_CHUNKS
        yield instance


@pytest.fixture
def mock_vector_store():
    with patch("app.services.ingestion.VectorStoreService") as mock:
        instance = mock.return_value
        instance.generate_embeddings.return_value = MOCK_EMBEDDINGS
        instance.upsert_vectors.return_value = None
        yield instance


@pytest.mark.asyncio
async def test_ingestion_flow(mock_pdf_parser, mock_vector_store):
    # Setup
    tenant_id = "tenant123"
    doc_id = "doc123"
    file_path = "tenant123/docs/doc123.pdf"

    # Mock Storage download (we need to patch where IngestionService calls it)
    with patch(
        "app.services.ingestion.StorageService.download_file", new_callable=AsyncMock
    ) as mock_download:
        mock_download.return_value = MOCK_PDF_CONTENT

        # Execute
        service = IngestionService()
        await service.ingest_document(tenant_id, doc_id, file_path)

        # Verify
        mock_download.assert_called_once_with(file_path)
        mock_pdf_parser.extract_text.assert_called_once()  # Should pass content
        mock_pdf_parser.split_text.assert_called_once_with(MOCK_TEXT)
        mock_vector_store.generate_embeddings.assert_called_once_with(MOCK_CHUNKS)
        mock_vector_store.upsert_vectors.assert_called_once_with(
            tenant_id, doc_id, MOCK_CHUNKS, MOCK_EMBEDDINGS
        )


def test_parser_logic():
    # This test would ideally test the actual logic if we weren't mocking the class itself in the flow test.
    # But since we haven't implemented the class yet, we can't test the real logic easily without the file.
    # So we will define the interface expectation here.
    parser = PdfParser()
    # We expect these methods to exist
    assert hasattr(parser, "extract_text")
    assert hasattr(parser, "split_text")


def test_vector_store_interface():
    store = VectorStoreService()
    assert hasattr(store, "generate_embeddings")
    assert hasattr(store, "upsert_vectors")
    assert hasattr(store, "delete_vectors")
