from app.services.parser import PdfParser
from app.services.storage import StorageService
from app.services.vector_store import VectorStoreService


class IngestionService:
    def __init__(self) -> None:
        self.parser = PdfParser()
        self.storage = StorageService()
        self.vector_store = VectorStoreService()

    async def process_document(
        self, tenant_id: str, doc_id: str, file_path: str, filename: str | None = None
    ) -> int:
        """
        Orchestrates the ingestion process.
        """
        from app.core.config import settings
        from app.core.telemetry import (
            embedding_token_counter,
            ingestion_duration_histogram,
            measure_latency,
        )

        with measure_latency(
            ingestion_duration_histogram,
            {"tenant_id": tenant_id, "doc_id": doc_id},
            threshold_seconds=settings.INGESTION_DURATION_THRESHOLD_SECONDS,
        ):
            # 1. Download file from Storage with tenant scoping
            file_content = await self.storage.download_file(tenant_id, file_path)

            # 2. Parse PDF
            text = self.parser.extract_text(file_content)

            # 3. Split text
            chunks = self.parser.split_text(text)

            # ファイル名が指定されていない場合はdoc_idを使用
            source_name = filename or f"{doc_id}.pdf"
            metadata = [
                {
                    "doc_id": doc_id,
                    "tenant_id": tenant_id,
                    "source": source_name,
                    "page": idx + 1,
                    "chunk": idx + 1,
                }
                for idx, _ in enumerate(chunks)
            ]

            # 4. Generate embeddings & Index
            # We can count tokens roughly by chars / 4 or use tiktoken if available.
            # For now, let's just count chunks as a proxy or use len(text) / 4.
            total_tokens = len(text) // 4
            embedding_token_counter.add(total_tokens, {"tenant_id": tenant_id, "doc_id": doc_id})

            embeddings = self.vector_store.generate_embeddings(chunks)
            await self.vector_store.upsert_vectors(tenant_id, doc_id, chunks, embeddings, metadata)

            return len(chunks)
