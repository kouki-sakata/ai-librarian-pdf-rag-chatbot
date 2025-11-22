from typing import Any

from app.services.vector_store import VectorStoreService


class RetrieverService:
    def __init__(self) -> None:
        self.vector_store = VectorStoreService()

    async def retrieve(self, tenant_id: str, query: str, top_k: int = 5) -> list[dict[str, Any]]:
        """
        Retrieves relevant chunks for a query.
        """
        # 1. Generate embedding for query
        # Note: generate_embeddings expects a list
        embeddings = self.vector_store.generate_embeddings([query])
        query_embedding = embeddings[0]

        # 2. Search vector store
        results = await self.vector_store.search(tenant_id, query_embedding, top_k)

        for item in results:
            meta = item.get("metadata") or {}
            if item.get("doc_id") and "doc_id" not in meta:
                meta["doc_id"] = item["doc_id"]
            item["metadata"] = meta

        return results
