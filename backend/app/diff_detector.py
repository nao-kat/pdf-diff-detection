"""Diff detection logic for comparing two PDFs."""

from dataclasses import dataclass
from difflib import SequenceMatcher
from typing import Dict, List, Literal, Optional, Tuple

from .document_intelligence import PageContent, TextLine
from .models import BoundingBox, DiffItem, PageDiff


@dataclass
class LineMatch:
    """Represents a potential match between old and new lines."""

    old_line: Optional[TextLine]
    new_line: Optional[TextLine]
    similarity: float


class DiffDetector:
    """Detects differences between two PDF documents."""

    def __init__(self, similarity_threshold: float = 0.6):
        """
        Initialize the diff detector.

        Args:
            similarity_threshold: Minimum similarity ratio to consider two lines as a match.
        """
        self.similarity_threshold = similarity_threshold

    def detect_diffs(
        self,
        old_pages: Dict[int, PageContent],
        new_pages: Dict[int, PageContent],
    ) -> List[PageDiff]:
        """
        Detect differences between old and new PDF documents.

        Args:
            old_pages: Extracted content from the old PDF.
            new_pages: Extracted content from the new PDF.

        Returns:
            List of PageDiff objects containing the differences.
        """
        all_page_numbers = sorted(
            set(old_pages.keys()) | set(new_pages.keys())
        )

        page_diffs = []
        for page_num in all_page_numbers:
            old_page = old_pages.get(page_num)
            new_page = new_pages.get(page_num)

            diffs = self._compare_pages(old_page, new_page)
            # Use the new page dimensions if available, otherwise old page
            page = new_page or old_page
            if diffs and page:
                page_diffs.append(
                    PageDiff(
                        page_number=page_num,
                        diffs=diffs,
                        width=page.width,
                        height=page.height,
                    )
                )

        return page_diffs

    def _compare_pages(
        self,
        old_page: Optional[PageContent],
        new_page: Optional[PageContent],
    ) -> List[DiffItem]:
        """Compare two pages and return the differences."""
        if old_page is None and new_page is None:
            return []

        if old_page is None:
            # All lines in new_page are added
            return [
                self._create_diff_item("added", None, line)
                for line in new_page.lines
            ]

        if new_page is None:
            # All lines in old_page are removed
            return [
                self._create_diff_item("removed", line, None)
                for line in old_page.lines
            ]

        # Match lines between old and new pages
        return self._match_and_diff_lines(old_page.lines, new_page.lines)

    def _match_and_diff_lines(
        self,
        old_lines: List[TextLine],
        new_lines: List[TextLine],
    ) -> List[DiffItem]:
        """Match lines between old and new and generate diffs."""
        # Use sequence matcher to find the best alignment
        old_texts = [line.text for line in old_lines]
        new_texts = [line.text for line in new_lines]

        matcher = SequenceMatcher(None, old_texts, new_texts)
        opcodes = matcher.get_opcodes()

        diffs = []
        for tag, i1, i2, j1, j2 in opcodes:
            if tag == "equal":
                # Lines are identical, no diff
                continue
            elif tag == "delete":
                # Lines removed from old
                for i in range(i1, i2):
                    diffs.append(
                        self._create_diff_item("removed", old_lines[i], None)
                    )
            elif tag == "insert":
                # Lines added in new
                for j in range(j1, j2):
                    diffs.append(
                        self._create_diff_item("added", None, new_lines[j])
                    )
            elif tag == "replace":
                # Lines modified - try to pair them up
                old_subset = old_lines[i1:i2]
                new_subset = new_lines[j1:j2]
                diffs.extend(self._match_modified_lines(old_subset, new_subset))

        return diffs

    def _match_modified_lines(
        self,
        old_lines: List[TextLine],
        new_lines: List[TextLine],
    ) -> List[DiffItem]:
        """Match modified lines between old and new using similarity."""
        diffs = []
        used_new_indices = set()

        for old_line in old_lines:
            best_match_idx = None
            best_similarity = 0

            for j, new_line in enumerate(new_lines):
                if j in used_new_indices:
                    continue
                similarity = self._calculate_similarity(
                    old_line.text, new_line.text
                )
                if similarity > best_similarity:
                    best_similarity = similarity
                    best_match_idx = j

            if (
                best_match_idx is not None
                and best_similarity >= self.similarity_threshold
            ):
                # Mark as modified
                used_new_indices.add(best_match_idx)
                diffs.append(
                    self._create_diff_item(
                        "modified", old_line, new_lines[best_match_idx]
                    )
                )
            else:
                # No match found, mark as removed
                diffs.append(self._create_diff_item("removed", old_line, None))

        # Any remaining new lines are additions
        for j, new_line in enumerate(new_lines):
            if j not in used_new_indices:
                diffs.append(self._create_diff_item("added", None, new_line))

        return diffs

    def _calculate_similarity(self, text1: str, text2: str) -> float:
        """Calculate similarity ratio between two texts."""
        return SequenceMatcher(None, text1, text2).ratio()

    def _create_diff_item(
        self,
        diff_type: Literal["added", "removed", "modified"],
        old_line: Optional[TextLine],
        new_line: Optional[TextLine],
    ) -> DiffItem:
        """Create a DiffItem from old and new lines."""
        old_bboxes = []
        new_bboxes = []

        if old_line:
            old_bboxes.append(
                BoundingBox(
                    x1=old_line.x1,
                    y1=old_line.y1,
                    x2=old_line.x2,
                    y2=old_line.y2,
                )
            )

        if new_line:
            new_bboxes.append(
                BoundingBox(
                    x1=new_line.x1,
                    y1=new_line.y1,
                    x2=new_line.x2,
                    y2=new_line.y2,
                )
            )

        return DiffItem(
            type=diff_type,
            old_text=old_line.text if old_line else None,
            new_text=new_line.text if new_line else None,
            old_bboxes=old_bboxes,
            new_bboxes=new_bboxes,
        )
