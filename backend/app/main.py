"""FastAPI main application for PDF diff detection."""

import os
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from .diff_detector import DiffDetector
from .document_intelligence import DocumentIntelligenceService
from .models import CompareResponse, ErrorResponse

# Load environment variables
load_dotenv()

app = FastAPI(
    title="PDF Diff Detection API",
    description="API for comparing scanned PDFs and detecting differences using Azure Document Intelligence",
    version="1.0.0",
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify allowed origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files if available
static_paths = [
    Path("/home/site/wwwroot/static"),  # Azure App Service
    Path("../frontend/dist"),  # Local development
    Path("./static"),  # Alternative location
]

for static_path in static_paths:
    if static_path.exists() and static_path.is_dir():
        app.mount("/static", StaticFiles(directory=str(static_path)), name="static")
        break

# Configuration
MAX_FILE_SIZE = 20 * 1024 * 1024  # 20MB
MAX_PAGES = 50
ALLOWED_CONTENT_TYPES = ["application/pdf"]


def validate_pdf_file(file: UploadFile, name: str) -> None:
    """Validate uploaded PDF file."""
    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail=f"{name} must have a filename",
        )

    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=400,
            detail=f"{name} must be a PDF file",
        )

    if file.content_type and file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"{name} must be a PDF file (content-type: application/pdf)",
        )


@app.get("/")
async def root():
    """Serve the frontend application."""
    # Check for static files in various possible locations
    static_paths = [
        Path("/home/site/wwwroot/static"),  # Azure App Service
        Path("../frontend/dist"),  # Local development
        Path("./static"),  # Alternative location
    ]
    
    for static_path in static_paths:
        index_path = static_path / "index.html"
        if index_path.exists():
            return FileResponse(index_path)
    
    # If no static files found, return API info
    return {
        "app": "PDF Diff Detection API",
        "version": "1.0.0",
        "endpoints": {
            "health": "/health",
            "compare": "/api/compare"
        }
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}


@app.post(
    "/api/compare",
    response_model=CompareResponse,
    responses={
        400: {"model": ErrorResponse},
        500: {"model": ErrorResponse},
    },
)
async def compare_pdfs(
    old_pdf: UploadFile = File(..., description="The old (original) PDF file"),
    new_pdf: UploadFile = File(..., description="The new (modified) PDF file"),
):
    """
    Compare two PDF files and return the differences.

    This endpoint accepts two PDF files (old and new versions), processes them
    using Azure Document Intelligence for OCR, and returns a list of differences
    with bounding box coordinates for visualization.
    """
    # Validate files
    validate_pdf_file(old_pdf, "old_pdf")
    validate_pdf_file(new_pdf, "new_pdf")

    try:
        # Read file contents
        old_content = await old_pdf.read()
        new_content = await new_pdf.read()

        # Check file sizes
        if len(old_content) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=400,
                detail=f"old_pdf exceeds maximum file size of {MAX_FILE_SIZE // (1024*1024)}MB",
            )
        if len(new_content) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=400,
                detail=f"new_pdf exceeds maximum file size of {MAX_FILE_SIZE // (1024*1024)}MB",
            )

        # Initialize services
        try:
            di_service = DocumentIntelligenceService()
        except ValueError as e:
            raise HTTPException(
                status_code=500,
                detail=str(e),
            )

        # Extract text and coordinates from both PDFs
        try:
            old_pages = di_service.extract_text_with_coordinates(old_content)
            new_pages = di_service.extract_text_with_coordinates(new_content)
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to process PDF with Document Intelligence: {str(e)}",
            )

        # Check page counts
        old_page_count = len(old_pages)
        new_page_count = len(new_pages)

        if old_page_count > MAX_PAGES:
            raise HTTPException(
                status_code=400,
                detail=f"old_pdf exceeds maximum page count of {MAX_PAGES}",
            )
        if new_page_count > MAX_PAGES:
            raise HTTPException(
                status_code=400,
                detail=f"new_pdf exceeds maximum page count of {MAX_PAGES}",
            )

        # Detect differences
        diff_detector = DiffDetector()
        page_diffs = diff_detector.detect_diffs(old_pages, new_pages)

        return CompareResponse(
            pages=page_diffs,
            old_page_count=old_page_count,
            new_page_count=new_page_count,
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"An unexpected error occurred: {str(e)}",
        )


@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Global exception handler for unexpected errors."""
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error", "detail": str(exc)},
    )
