from app.services.parser import PdfParser
from app.services.storage import (
    StorageService,  # We need to add download_file to StorageService
)
from app.services.vector_store import VectorStoreService


class IngestionService:
    def __init__(self):
        self.parser = PdfParser()
        self.vector_store = VectorStoreService()

    async def ingest_document(self, tenant_id: str, doc_id: str, file_path: str):
        """
        Orchestrates the ingestion process.
        """
        # 1. Download file
        # We need to implement download_file in StorageService
        content = await StorageService.download_file(file_path)

        # 2. Extract Text
        text = self.parser.extract_text(content)

        # 3. Chunk Text
        chunks = self.parser.split_text(text)

        if not chunks:
            return  # Nothing to ingest

        # 4. Generate Embeddings
        embeddings = self.vector_store.generate_embeddings(chunks)

        # 5. Upsert Vectors
        self.vector_store.upsert_vectors(tenant_id, doc_id, chunks, embeddings)

        # 6. Update Status
        print(f"Ingestion completed for doc {doc_id} in tenant {tenant_id}")
