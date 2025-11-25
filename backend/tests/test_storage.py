from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import HTTPException, UploadFile

from app.services.storage import StorageService


@pytest.fixture
def mock_supabase_client():
    """Mock Supabase client for storage operations"""
    with patch("app.services.storage.get_supabase_client") as mock:
        client = MagicMock()
        mock.return_value = client
        yield client


@pytest.fixture
def mock_settings():
    with patch("app.services.storage.settings") as mock:
        mock.SUPABASE_STORAGE_BUCKET = "test-bucket"
        yield mock


@pytest.fixture
def sample_upload_file():
    """Create a sample UploadFile for testing"""
    file = MagicMock(spec=UploadFile)
    file.filename = "test.pdf"
    file.content_type = "application/pdf"
    file.read = AsyncMock(return_value=b"PDF content here")
    return file


@pytest.mark.asyncio
async def test_upload_file_success(mock_supabase_client, mock_settings, sample_upload_file):
    """Test successful file upload"""
    tenant_id = "tenant123"

    # Mock storage upload response
    mock_upload_response = MagicMock()
    mock_upload_response.error = None
    mock_supabase_client.storage.from_.return_value.upload.return_value = mock_upload_response

    # Mock database insert
    mock_insert_response = MagicMock()
    mock_supabase_client.table.return_value.insert.return_value.execute.return_value = (
        mock_insert_response
    )

    doc_id = await StorageService.upload_file(sample_upload_file, tenant_id)

    # Verify doc_id is a valid UUID
    assert isinstance(doc_id, str)
    assert len(doc_id) == 36  # UUID format

    # Verify storage upload was called
    mock_supabase_client.storage.from_.assert_called_with("test-bucket")
    mock_supabase_client.storage.from_.return_value.upload.assert_called_once()

    # Verify database insert was called
    mock_supabase_client.table.assert_called_with("documents")


@pytest.mark.asyncio
async def test_upload_file_storage_error(mock_supabase_client, mock_settings, sample_upload_file):
    """Test file upload when storage fails"""
    tenant_id = "tenant123"

    # Mock storage upload error
    mock_error = MagicMock()
    mock_error.message = "Storage full"
    mock_upload_response = MagicMock()
    mock_upload_response.error = mock_error
    mock_supabase_client.storage.from_.return_value.upload.return_value = mock_upload_response

    with pytest.raises(HTTPException) as exc_info:
        await StorageService.upload_file(sample_upload_file, tenant_id)

    assert exc_info.value.status_code == 502
    assert "Storage upload failed" in exc_info.value.detail


@pytest.mark.asyncio
async def test_upload_file_db_insert_error_with_cleanup(
    mock_supabase_client, mock_settings, sample_upload_file
):
    """Test file upload when database insert fails (should cleanup uploaded file)"""
    tenant_id = "tenant123"

    # Mock successful storage upload
    mock_upload_response = MagicMock()
    mock_upload_response.error = None
    mock_supabase_client.storage.from_.return_value.upload.return_value = mock_upload_response

    # Mock database insert failure
    mock_supabase_client.table.return_value.insert.return_value.execute.side_effect = Exception(
        "DB error"
    )

    with pytest.raises(HTTPException) as exc_info:
        await StorageService.upload_file(sample_upload_file, tenant_id)

    assert exc_info.value.status_code == 500
    assert "Failed to create document record" in exc_info.value.detail

    # Verify cleanup (file removal) was called
    mock_supabase_client.storage.from_.return_value.remove.assert_called_once()


@pytest.mark.asyncio
async def test_upload_file_without_filename(mock_supabase_client, mock_settings):
    """Test file upload when filename is missing"""
    tenant_id = "tenant123"
    file = MagicMock(spec=UploadFile)
    file.filename = None  # No filename
    file.content_type = "application/pdf"
    file.read = AsyncMock(return_value=b"PDF content")

    # Mock successful upload
    mock_upload_response = MagicMock()
    mock_upload_response.error = None
    mock_supabase_client.storage.from_.return_value.upload.return_value = mock_upload_response
    mock_supabase_client.table.return_value.insert.return_value.execute.return_value = MagicMock()

    doc_id = await StorageService.upload_file(file, tenant_id)
    assert isinstance(doc_id, str)


@pytest.mark.asyncio
async def test_download_file_success(mock_supabase_client, mock_settings):
    """Test successful file download"""
    tenant_id = "tenant123"
    path = f"{tenant_id}/docs/test.pdf"

    # Mock storage download response
    mock_download_response = b"PDF file content"
    mock_supabase_client.storage.from_.return_value.download.return_value = mock_download_response

    result = await StorageService.download_file(tenant_id, path)

    assert result == mock_download_response
    mock_supabase_client.storage.from_.assert_called_with("test-bucket")
    mock_supabase_client.storage.from_.return_value.download.assert_called_with(path)


@pytest.mark.asyncio
async def test_download_file_tenant_boundary_violation(mock_supabase_client, mock_settings):
    """Test file download with tenant boundary check"""
    tenant_id = "tenant123"
    path = "different_tenant/docs/test.pdf"  # Different tenant

    with pytest.raises(HTTPException) as exc_info:
        await StorageService.download_file(tenant_id, path)

    assert exc_info.value.status_code == 403
    assert "Tenant scope mismatch" in exc_info.value.detail


@pytest.mark.asyncio
async def test_download_file_not_found(mock_supabase_client, mock_settings):
    """Test file download when file doesn't exist"""
    tenant_id = "tenant123"
    path = f"{tenant_id}/docs/nonexistent.pdf"

    # Mock storage download error
    mock_error = MagicMock()
    mock_download_response = MagicMock()
    mock_download_response.error = mock_error
    mock_supabase_client.storage.from_.return_value.download.return_value = mock_download_response

    with pytest.raises(HTTPException) as exc_info:
        await StorageService.download_file(tenant_id, path)

    assert exc_info.value.status_code == 404
    assert "File not found" in exc_info.value.detail
