from typing import Any

from app.core.context import tenant_id_context
from app.services.ingestion import IngestionService
from app.services.storage import StorageService
from fastapi import APIRouter, File, HTTPException, UploadFile, status

router = APIRouter()

MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB


@router.post("/", status_code=status.HTTP_200_OK)
async def upload_document(file: UploadFile = File(...)) -> Any:
    # Check if tenant_id is set (AuthMiddleware should have set it)
    tenant_id = tenant_id_context.get()
    if not tenant_id:
        # This should ideally be caught by middleware, but as a safeguard
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Tenant ID not found in context",
        )

    # Validate MIME type
    if file.content_type != "application/pdf":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Only PDF files are allowed"
        )

    # Validate File Size
    # Note: file.file is a SpooledTemporaryFile. We can check size by seeking to end.
    file.file.seek(0, 2)
    size = file.file.tell()
    file.file.seek(0)

    if size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File size exceeds 50MB limit",
        )

    try:
        doc_id = await StorageService.upload_file(file, tenant_id)

        # Trigger Ingestion
        # Reconstruct path (assuming PDF as validated)
        file_path = f"{tenant_id}/docs/{doc_id}.pdf"

        ingestion_service = IngestionService()
        await ingestion_service.process_document(tenant_id, doc_id, file_path)

        return {"status": "ingested", "doc_id": doc_id, "filename": file.filename}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process file: {str(e)}",
        )
