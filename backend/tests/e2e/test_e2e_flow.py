import json
import os
import time

from fastapi.testclient import TestClient
from jose import jwt

from app.core.config import settings
from app.main import app

# Ensure we use the test secret
os.environ["SUPABASE_JWT_SECRET"] = "test-secret"
settings.SUPABASE_JWT_SECRET = "test-secret"

client = TestClient(app)


def generate_test_token(tenant_id="tenant_e2e"):
    payload = {
        "sub": "user_e2e",
        "aud": "authenticated",
        "exp": int(time.time()) + 3600,
        "app_metadata": {"tenant_id": tenant_id},
        "user_metadata": {},
        "role": "authenticated",
    }
    return jwt.encode(payload, "test-secret", algorithm="HS256")


def test_e2e_upload_and_chat_flow():
    token = generate_test_token()
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Upload PDF
    pdf_content = b"%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/Resources <<\n/Font <<\n/F1 <<\n/Type /Font\n/Subtype /Type1\n/BaseFont /Times-Roman\n>>\n>>\n>>\n/MediaBox [0 0 612 792]\n/Contents 4 0 R\n>>\nendobj\n4 0 obj\n<<\n/Length 44\n>>\nstream\nBT\n/F1 24 Tf\n100 100 Td\n(Hello World) Tj\nET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000010 00000 n \n0000000060 00000 n \n0000000117 00000 n \n0000000276 00000 n \ntrailer\n<<\n/Size 5\n/Root 1 0 R\n>>\nstartxref\n370\n%%EOF"

    files = {"file": ("e2e_test.pdf", pdf_content, "application/pdf")}

    # We need to mock StorageService and VectorStoreService because we don't have real Supabase/PGVector in this env
    # But this is an E2E test...
    # If we mock, it's an integration test.
    # Given the environment constraints, we MUST mock external services.
    # We can use `unittest.mock.patch` to mock them at the module level.

    from unittest.mock import AsyncMock, patch

    with (
        patch("app.api.v1.endpoints.upload.StorageService") as MockStorageUpload,
        patch("app.services.ingestion.StorageService") as MockStorageIngestion,
        patch("app.services.ingestion.PdfParser") as MockPdfParser,
        patch("app.services.ingestion.VectorStoreService") as MockVectorStore,
        patch("app.services.retriever.VectorStoreService") as MockRetrieverVector,
        patch("app.services.chat.RetrieverService") as MockRetriever,
        patch("app.services.chat.AsyncOpenAI") as MockOpenAI,
        patch("app.services.chat.HistoryService") as MockHistory,
    ):
        # Setup Mocks
        # Storage
        # upload_file is called in upload.py
        MockStorageUpload.upload_file = AsyncMock(return_value="doc_id")

        # download_file is called in ingestion.py
        mock_storage_ingestion_instance = MockStorageIngestion.return_value
        mock_storage_ingestion_instance.download_file = AsyncMock(
            return_value=pdf_content
        )

        # PdfParser
        mock_parser = MockPdfParser.return_value
        mock_parser.extract_text.return_value = "Hello World"
        mock_parser.split_text.return_value = ["Hello World"]

        # Vector Store
        mock_vector_store = MockVectorStore.return_value
        mock_vector_store.generate_embeddings.return_value = [[0.1, 0.2]]
        mock_vector_store.upsert_vectors = AsyncMock()

        # Retriever vector store
        mock_retriever_vector = MockRetrieverVector.return_value
        mock_retriever_vector.generate_embeddings.return_value = [[0.1, 0.2]]
        mock_retriever_vector.search = AsyncMock(
            return_value=[{"content": "Hello World", "metadata": {"page": 1}}]
        )

        # Retriever
        mock_retriever = MockRetriever.return_value
        mock_retriever.retrieve = AsyncMock(
            return_value=[{"content": "Hello World", "metadata": {"page": 1}}]
        )

        # OpenAI
        mock_openai = MockOpenAI.return_value

        async def mock_stream(*args, **kwargs):
            yield type(
                "obj",
                (object,),
                {
                    "choices": [
                        type(
                            "obj",
                            (object,),
                            {"delta": type("obj", (object,), {"content": "Hello "})},
                        )
                    ]
                },
            )
            yield type(
                "obj",
                (object,),
                {
                    "choices": [
                        type(
                            "obj",
                            (object,),
                            {"delta": type("obj", (object,), {"content": "Human"})},
                        )
                    ]
                },
            )

        mock_openai.chat.completions.create = AsyncMock(return_value=mock_stream())

        # History
        mock_history = MockHistory.return_value
        mock_history.add_message = AsyncMock()

        # 1. Upload
        response = client.post(
            f"{settings.API_V1_STR}/upload/", files=files, headers=headers
        )
        assert response.status_code == 200, response.text
        data = response.json()
        assert data["filename"] == "e2e_test.pdf"

        # 2. Chat
        session_id = "session_e2e"
        chat_payload = {"session_id": session_id, "query": "Hello"}
        response = client.post(
            f"{settings.API_V1_STR}/chat",
            json=chat_payload,
            headers=headers,
        )
        assert response.status_code == 200
        lines = [line for line in response.text.split("\n") if line.strip()]
        token_text = "".join(
            json.loads(line)["content"]
            for line in lines
            if json.loads(line).get("type") == "token"
        )
        assert token_text == "Hello Human"
        assert any(json.loads(line).get("type") == "metadata" for line in lines)
