from io import BytesIO

from langchain_text_splitters import RecursiveCharacterTextSplitter
from pypdf import PdfReader


class PdfParser:
    def __init__(self) -> None:
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
            length_function=len,
            is_separator_regex=False,
        )

    def extract_text(self, file_content: bytes) -> str:
        """
        Extracts text from PDF bytes.
        """
        try:
            pdf_file = BytesIO(file_content)
            reader = PdfReader(pdf_file)
            text = ""
            for page in reader.pages:
                text += page.extract_text() + "\n"
            return text
        except Exception as e:
            raise ValueError(f"Failed to parse PDF: {str(e)}")

    def split_text(self, text: str) -> list[str]:
        """
        Splits text into chunks.
        """
        return self.text_splitter.split_text(text)
