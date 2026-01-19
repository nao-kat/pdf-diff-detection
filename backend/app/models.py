"""Pydantic models for API request/response schemas."""

from typing import List, Literal, Optional

from pydantic import BaseModel


class BoundingBox(BaseModel):
    """Bounding box coordinates for a text region."""

    x1: float
    y1: float
    x2: float
    y2: float


class DiffItem(BaseModel):
    """A single diff item representing a change."""

    type: Literal["added", "removed", "modified"]
    old_text: Optional[str] = None
    new_text: Optional[str] = None
    old_bboxes: List[BoundingBox] = []
    new_bboxes: List[BoundingBox] = []


class PageDiff(BaseModel):
    """Diff results for a single page."""

    page_number: int
    diffs: List[DiffItem]


class CompareResponse(BaseModel):
    """Response model for the compare API."""

    pages: List[PageDiff]
    old_page_count: int
    new_page_count: int


class ErrorResponse(BaseModel):
    """Error response model."""

    error: str
    detail: Optional[str] = None
