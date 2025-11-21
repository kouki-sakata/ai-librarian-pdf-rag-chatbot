from typing import Any, Dict, List

from app.services.vector_store import VectorStoreService


class RetrieverService:
    def __init__(self):
        self.vector_store = VectorStoreService()

    async def retrieve(
        self, tenant_id: str, query: str, top_k: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Retrieves relevant chunks for a query.
        """
        # 1. Generate embedding for query
        # Note: generate_embeddings expects a list
        embeddings = self.vector_store.generate_embeddings([query])
        query_embedding = embeddings[0]

        # 2. Search vector store
        results = self.vector_store.search(tenant_id, query_embedding, top_k)

        return results
