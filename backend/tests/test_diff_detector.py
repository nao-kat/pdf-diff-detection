"""Tests for the diff detector module."""

import pytest

from app.diff_detector import DiffDetector
from app.document_intelligence import PageContent, TextLine


class TestDiffDetector:
    """Test cases for DiffDetector class."""

    def setup_method(self):
        """Set up test fixtures."""
        self.detector = DiffDetector()

    def test_detect_identical_pages(self):
        """Test that identical pages produce no diffs."""
        old_pages = {
            1: PageContent(
                page_number=1,
                width=100,
                height=100,
                lines=[
                    TextLine(
                        text="Hello World",
                        x1=10,
                        y1=10,
                        x2=90,
                        y2=20,
                        page_number=1,
                    )
                ],
            )
        }
        new_pages = {
            1: PageContent(
                page_number=1,
                width=100,
                height=100,
                lines=[
                    TextLine(
                        text="Hello World",
                        x1=10,
                        y1=10,
                        x2=90,
                        y2=20,
                        page_number=1,
                    )
                ],
            )
        }

        result = self.detector.detect_diffs(old_pages, new_pages)
        assert len(result) == 0

    def test_detect_added_line(self):
        """Test detection of added lines."""
        old_pages = {
            1: PageContent(
                page_number=1,
                width=100,
                height=100,
                lines=[
                    TextLine(
                        text="Line 1",
                        x1=10,
                        y1=10,
                        x2=90,
                        y2=20,
                        page_number=1,
                    )
                ],
            )
        }
        new_pages = {
            1: PageContent(
                page_number=1,
                width=100,
                height=100,
                lines=[
                    TextLine(
                        text="Line 1",
                        x1=10,
                        y1=10,
                        x2=90,
                        y2=20,
                        page_number=1,
                    ),
                    TextLine(
                        text="Line 2 (new)",
                        x1=10,
                        y1=30,
                        x2=90,
                        y2=40,
                        page_number=1,
                    ),
                ],
            )
        }

        result = self.detector.detect_diffs(old_pages, new_pages)
        assert len(result) == 1
        assert len(result[0].diffs) == 1
        assert result[0].diffs[0].type == "added"
        assert result[0].diffs[0].new_text == "Line 2 (new)"

    def test_detect_removed_line(self):
        """Test detection of removed lines."""
        old_pages = {
            1: PageContent(
                page_number=1,
                width=100,
                height=100,
                lines=[
                    TextLine(
                        text="Line 1",
                        x1=10,
                        y1=10,
                        x2=90,
                        y2=20,
                        page_number=1,
                    ),
                    TextLine(
                        text="Line 2 (old)",
                        x1=10,
                        y1=30,
                        x2=90,
                        y2=40,
                        page_number=1,
                    ),
                ],
            )
        }
        new_pages = {
            1: PageContent(
                page_number=1,
                width=100,
                height=100,
                lines=[
                    TextLine(
                        text="Line 1",
                        x1=10,
                        y1=10,
                        x2=90,
                        y2=20,
                        page_number=1,
                    )
                ],
            )
        }

        result = self.detector.detect_diffs(old_pages, new_pages)
        assert len(result) == 1
        assert len(result[0].diffs) == 1
        assert result[0].diffs[0].type == "removed"
        assert result[0].diffs[0].old_text == "Line 2 (old)"

    def test_detect_modified_line(self):
        """Test detection of modified lines."""
        old_pages = {
            1: PageContent(
                page_number=1,
                width=100,
                height=100,
                lines=[
                    TextLine(
                        text="Hello World version 1",
                        x1=10,
                        y1=10,
                        x2=90,
                        y2=20,
                        page_number=1,
                    )
                ],
            )
        }
        new_pages = {
            1: PageContent(
                page_number=1,
                width=100,
                height=100,
                lines=[
                    TextLine(
                        text="Hello World version 2",
                        x1=10,
                        y1=10,
                        x2=90,
                        y2=20,
                        page_number=1,
                    )
                ],
            )
        }

        result = self.detector.detect_diffs(old_pages, new_pages)
        assert len(result) == 1
        assert len(result[0].diffs) == 1
        assert result[0].diffs[0].type == "modified"
        assert result[0].diffs[0].old_text == "Hello World version 1"
        assert result[0].diffs[0].new_text == "Hello World version 2"

    def test_detect_new_page(self):
        """Test detection when a new page is added."""
        old_pages = {
            1: PageContent(
                page_number=1,
                width=100,
                height=100,
                lines=[
                    TextLine(
                        text="Page 1 content",
                        x1=10,
                        y1=10,
                        x2=90,
                        y2=20,
                        page_number=1,
                    )
                ],
            )
        }
        new_pages = {
            1: PageContent(
                page_number=1,
                width=100,
                height=100,
                lines=[
                    TextLine(
                        text="Page 1 content",
                        x1=10,
                        y1=10,
                        x2=90,
                        y2=20,
                        page_number=1,
                    )
                ],
            ),
            2: PageContent(
                page_number=2,
                width=100,
                height=100,
                lines=[
                    TextLine(
                        text="Page 2 content",
                        x1=10,
                        y1=10,
                        x2=90,
                        y2=20,
                        page_number=2,
                    )
                ],
            ),
        }

        result = self.detector.detect_diffs(old_pages, new_pages)
        # Should have one PageDiff for page 2 with all lines as added
        assert len(result) == 1
        assert result[0].page_number == 2
        assert result[0].diffs[0].type == "added"

    def test_empty_pages(self):
        """Test handling of empty pages."""
        old_pages = {}
        new_pages = {}

        result = self.detector.detect_diffs(old_pages, new_pages)
        assert len(result) == 0

    def test_bounding_box_in_diff_item(self):
        """Test that bounding boxes are correctly included in diff items."""
        old_pages = {
            1: PageContent(
                page_number=1,
                width=100,
                height=100,
                lines=[
                    TextLine(
                        text="Old text",
                        x1=10,
                        y1=20,
                        x2=80,
                        y2=35,
                        page_number=1,
                    )
                ],
            )
        }
        new_pages = {
            1: PageContent(
                page_number=1,
                width=100,
                height=100,
                lines=[],
            )
        }

        result = self.detector.detect_diffs(old_pages, new_pages)
        assert len(result) == 1
        diff = result[0].diffs[0]
        assert len(diff.old_bboxes) == 1
        assert diff.old_bboxes[0].x1 == 10
        assert diff.old_bboxes[0].y1 == 20
        assert diff.old_bboxes[0].x2 == 80
        assert diff.old_bboxes[0].y2 == 35
