import uuid
from typing import Any

from fastapi import HTTPException, UploadFile, status

from app.core.config import settings
from app.core.supabase_client import get_supabase_client


class StorageService:
    @staticmethod
    async def upload_file(file: UploadFile, tenant_id: str) -> str:
        """Upload a PDF to Supabase Storage under the tenant namespace."""
        doc_id = str(uuid.uuid4())
        filename = file.filename or "unknown.pdf"
        file_extension = filename.split(".")[-1] if "." in filename else "pdf"
        path = f"{tenant_id}/docs/{doc_id}.{file_extension}"

        content = await file.read()

        client = get_supabase_client()
        bucket = settings.SUPABASE_STORAGE_BUCKET

        response: Any = client.storage.from_(bucket).upload(
            path,
            content,
            file_options={"content-type": file.content_type or "application/pdf"},
        )

        if getattr(response, "error", None):
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Storage upload failed: {response.error.message}",
            )

        # Insert document record into the database
        try:
            client.table("documents").insert(
                {
                    "id": doc_id,
                    "tenant_id": tenant_id,
                    "filename": filename,
                    "storage_path": path,
                    "file_size": len(content),
                    "content_type": file.content_type or "application/pdf",
                }
            ).execute()
        except Exception as e:
            # If document insertion fails, clean up the uploaded file
            client.storage.from_(bucket).remove([path])
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to create document record: {str(e)}",
            )

        return doc_id

    @staticmethod
    async def download_file(tenant_id: str, path: str) -> bytes:
        """Download a file with tenant boundary enforcement."""
        if not path.startswith(f"{tenant_id}/"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Tenant scope mismatch for requested file",
            )

        client = get_supabase_client()
        bucket = settings.SUPABASE_STORAGE_BUCKET

        response: Any = client.storage.from_(bucket).download(path)

        if getattr(response, "error", None):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="File not found or access denied",
            )

        return bytes(response)
