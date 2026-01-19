"""Azure Document Intelligence client for OCR extraction."""

import os
from dataclasses import dataclass
from typing import Dict, List, Optional

from azure.ai.documentintelligence import DocumentIntelligenceClient
from azure.ai.documentintelligence.models import AnalyzeResult, DocumentPage
from azure.core.credentials import AzureKeyCredential


@dataclass
class TextLine:
    """Represents a line of text with its bounding box."""

    text: str
    x1: float
    y1: float
    x2: float
    y2: float
    page_number: int
    confidence: Optional[float] = None


@dataclass
class PageContent:
    """Contains all text lines for a page."""

    page_number: int
    lines: List[TextLine]
    width: float
    height: float


class DocumentIntelligenceService:
    """Service for extracting text and coordinates from PDFs using Azure Document Intelligence."""

    def __init__(self):
        """Initialize the Document Intelligence client."""
        endpoint = os.getenv("AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT")
        key = os.getenv("AZURE_DOCUMENT_INTELLIGENCE_KEY")

        if not endpoint or not key:
            raise ValueError(
                "AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT and AZURE_DOCUMENT_INTELLIGENCE_KEY "
                "must be set in environment variables"
            )

        self.client = DocumentIntelligenceClient(
            endpoint=endpoint,
            credential=AzureKeyCredential(key),
        )

    def extract_text_with_coordinates(
        self, pdf_content: bytes
    ) -> Dict[int, PageContent]:
        """
        Extract text and bounding boxes from a PDF.

        Args:
            pdf_content: The PDF file content as bytes.

        Returns:
            A dictionary mapping page numbers to PageContent objects.
        """
        poller = self.client.begin_analyze_document(
            "prebuilt-read",
            analyze_request=pdf_content,
            content_type="application/pdf",
        )
        result: AnalyzeResult = poller.result()

        pages: Dict[int, PageContent] = {}

        if result.pages:
            for page in result.pages:
                page_number = page.page_number
                lines = self._extract_lines_from_page(page)
                pages[page_number] = PageContent(
                    page_number=page_number,
                    lines=lines,
                    width=page.width or 0,
                    height=page.height or 0,
                )

        return pages

    def _extract_lines_from_page(self, page: DocumentPage) -> List[TextLine]:
        """Extract text lines with bounding boxes from a page."""
        lines = []

        if page.lines:
            for line in page.lines:
                if line.polygon and len(line.polygon) >= 4:
                    # Polygon is a list of coordinates [x1, y1, x2, y2, x3, y3, x4, y4]
                    # We take min/max to get a bounding box
                    x_coords = [line.polygon[i] for i in range(0, len(line.polygon), 2)]
                    y_coords = [line.polygon[i] for i in range(1, len(line.polygon), 2)]

                    text_line = TextLine(
                        text=line.content,
                        x1=min(x_coords),
                        y1=min(y_coords),
                        x2=max(x_coords),
                        y2=max(y_coords),
                        page_number=page.page_number,
                    )
                    lines.append(text_line)

        return lines
