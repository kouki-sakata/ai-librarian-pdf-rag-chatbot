"""Document management API endpoints."""

from typing import Any

from fastapi import APIRouter, HTTPException

from app.core.config import settings
from app.core.context import tenant_id_context
from app.core.supabase_client import get_supabase_client

router = APIRouter()


@router.get("/")
async def list_documents(sort: str = "created_at", order: str = "desc") -> list[dict[str, Any]]:
    """List documents for the authenticated tenant."""
    tenant_id = tenant_id_context.get()
    if not tenant_id:
        raise HTTPException(status_code=401, detail="Tenant ID missing")

    client = get_supabase_client()

    # Determine sort direction
    desc = order.lower() == "desc"

    response = (
        client.table("documents")
        .select("*")
        .eq("tenant_id", tenant_id)
        .order(sort, desc=desc)
        .execute()
    )

    data = response.data
    if not isinstance(data, list):
        raise HTTPException(status_code=500, detail="Unexpected response format")

    documents: list[dict[str, Any]] = []
    for item in data:
        if not isinstance(item, dict):
            raise HTTPException(status_code=500, detail="Unexpected response item")
        documents.append(item)

    return documents


@router.delete("/{document_id}")
async def delete_document(document_id: str) -> dict[str, str]:
    """Delete a document and its associated vectors."""
    tenant_id = tenant_id_context.get()
    if not tenant_id:
        raise HTTPException(status_code=401, detail="Tenant ID missing")

    client = get_supabase_client()

    # Verify document exists and belongs to tenant
    doc_response = (
        client.table("documents")
        .select("*")
        .eq("id", document_id)
        .eq("tenant_id", tenant_id)
        .execute()
    )

    data = doc_response.data
    if not data or not isinstance(data, list):
        raise HTTPException(status_code=404, detail="Document not found")

    document = data[0]
    if not isinstance(document, dict):
        raise HTTPException(status_code=500, detail="Unexpected response item")

    storage_path_value = document.get("storage_path")
    storage_path = storage_path_value if isinstance(storage_path_value, str) else None

    try:
        # Delete vectors first (foreign key constraint)
        client.table("vectors").delete().eq("doc_id", document_id).eq(
            "tenant_id", tenant_id
        ).execute()

        # Delete document record
        client.table("documents").delete().eq("id", document_id).execute()

        # Delete from storage
        if storage_path:
            bucket = settings.SUPABASE_STORAGE_BUCKET
            client.storage.from_(bucket).remove([storage_path])

        return {"status": "deleted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete document: {str(e)}")


@router.get("/{document_id}/url")
async def get_document_url(document_id: str, page: int | None = None) -> dict[str, str]:
    """Get a signed URL for a document."""
    tenant_id = tenant_id_context.get()
    if not tenant_id:
        raise HTTPException(status_code=401, detail="Tenant ID missing")

    client = get_supabase_client()

    # Verify document exists and belongs to tenant
    doc_response = (
        client.table("documents")
        .select("*")
        .eq("id", document_id)
        .eq("tenant_id", tenant_id)
        .execute()
    )

    data = doc_response.data
    if not data or not isinstance(data, list):
        raise HTTPException(status_code=404, detail="Document not found")

    document = data[0]
    if not isinstance(document, dict):
        raise HTTPException(status_code=500, detail="Unexpected response item")

    storage_path_value = document.get("storage_path")
    if not isinstance(storage_path_value, str):
        raise HTTPException(status_code=500, detail="Storage path not found")

    storage_path = storage_path_value

    bucket = settings.SUPABASE_STORAGE_BUCKET

    # Create signed URL (valid for 1 hour = 3600 seconds)
    signed_response = client.storage.from_(bucket).create_signed_url(storage_path, 3600)

    if not isinstance(signed_response, dict) or "signedURL" not in signed_response:
        raise HTTPException(status_code=500, detail="Failed to generate signed URL")

    url_value = signed_response.get("signedURL")
    if not isinstance(url_value, str):
        raise HTTPException(status_code=500, detail="Failed to generate signed URL")

    url = url_value

    # Add page fragment if specified
    if page is not None:
        url += f"#page={page}"

    return {"url": url}
