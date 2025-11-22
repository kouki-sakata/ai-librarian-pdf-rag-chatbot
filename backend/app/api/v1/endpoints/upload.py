from typing import Any

from app.core.context import tenant_id_context
from app.core.validators import validate_file
from app.services.ingestion import IngestionService
from app.services.storage import StorageService
from fastapi import APIRouter, File, HTTPException, UploadFile, status

router = APIRouter()


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

    # Validate File
    validate_file(file)

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
