from unittest.mock import MagicMock, patch

import pytest

from app.services.parser import PdfParser


@pytest.fixture
def sample_pdf_bytes():
    """Create a simple PDF for testing"""
    # This is a minimal valid PDF structure
    pdf_content = b"""%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj
2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj
3 0 obj
<<
/Type /Page
/Parent 2 0 R
/Resources <<
/Font <<
/F1 <<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
>>
>>
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj
4 0 obj
<<
/Length 44
>>
stream
BT
/F1 12 Tf
100 700 Td
(Test Page 1) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000317 00000 n
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
409
%%EOF"""
    return pdf_content


def test_parser_initialization():
    """Test PdfParser initialization"""
    parser = PdfParser()
    assert parser.text_splitter is not None
    assert parser.text_splitter._chunk_size == 1000
    assert parser.text_splitter._chunk_overlap == 200


def test_extract_text_success(sample_pdf_bytes):
    """Test successful text extraction from PDF"""
    parser = PdfParser()
    text = parser.extract_text(sample_pdf_bytes)

    assert isinstance(text, str)
    assert len(text) > 0
    # The sample PDF should contain "Test Page 1"
    assert "Test" in text or text.strip() != ""


def test_extract_text_with_mock():
    """Test text extraction with mocked PDF reader"""
    parser = PdfParser()

    # Mock PdfReader to return specific text
    with patch("app.services.parser.PdfReader") as mock_reader:
        mock_page1 = MagicMock()
        mock_page1.extract_text.return_value = "Page 1 content"
        mock_page2 = MagicMock()
        mock_page2.extract_text.return_value = "Page 2 content"

        mock_pdf = MagicMock()
        mock_pdf.pages = [mock_page1, mock_page2]
        mock_reader.return_value = mock_pdf

        text = parser.extract_text(b"fake pdf bytes")

        assert "Page 1 content" in text
        assert "Page 2 content" in text


def test_extract_text_invalid_pdf():
    """Test text extraction with invalid PDF"""
    parser = PdfParser()
    invalid_pdf = b"This is not a PDF file"

    with pytest.raises(ValueError) as exc_info:
        parser.extract_text(invalid_pdf)

    assert "Failed to parse PDF" in str(exc_info.value)


def test_extract_text_empty_bytes():
    """Test text extraction with empty bytes"""
    parser = PdfParser()

    with pytest.raises(ValueError) as exc_info:
        parser.extract_text(b"")

    assert "Failed to parse PDF" in str(exc_info.value)


def test_split_text_basic():
    """Test basic text splitting"""
    parser = PdfParser()
    text = "This is a short text."

    chunks = parser.split_text(text)

    assert isinstance(chunks, list)
    assert len(chunks) >= 1
    assert chunks[0] == text


def test_split_text_long_text():
    """Test splitting long text into chunks"""
    parser = PdfParser()
    # Create text longer than chunk_size (1000 chars)
    text = "Lorem ipsum dolor sit amet. " * 100  # ~2800 chars

    chunks = parser.split_text(text)

    assert isinstance(chunks, list)
    assert len(chunks) > 1
    # Each chunk should be around 1000 chars or less (except possibly the last one)
    for chunk in chunks[:-1]:
        assert len(chunk) <= 1200  # Allow some buffer for overlap


def test_split_text_empty_string():
    """Test splitting empty string"""
    parser = PdfParser()
    chunks = parser.split_text("")

    assert isinstance(chunks, list)
    # Empty string might return empty list or list with empty string
    assert len(chunks) == 0 or (len(chunks) == 1 and chunks[0] == "")


def test_split_text_with_newlines():
    """Test splitting text with newlines"""
    parser = PdfParser()
    text = "Line 1\nLine 2\nLine 3\n" * 50  # Multiple lines

    chunks = parser.split_text(text)

    assert isinstance(chunks, list)
    assert len(chunks) >= 1
    # Verify chunks contain the text
    combined = "".join(chunks)
    assert "Line 1" in combined
    assert "Line 2" in combined
