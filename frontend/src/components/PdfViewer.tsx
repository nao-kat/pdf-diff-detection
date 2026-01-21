import React, { useEffect, useRef, useState } from 'react';
import * as pdfjs from 'pdfjs-dist';
import type { BoundingBox, DiffItem, PageDiff } from '../types/api';

// Set up PDF.js worker
// Use the worker file from public folder
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.mjs';

interface PdfViewerProps {
  file: File | null;
  pageNumber: number;
  diffs: DiffItem[];
  viewType: 'old' | 'new';
  onPageCount?: (count: number) => void;
  pageDiff?: PageDiff; // Page diff info including page dimensions
}

export const PdfViewer: React.FC<PdfViewerProps> = ({
  file,
  pageNumber,
  diffs,
  viewType,
  onPageCount,
  pageDiff,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasWrapperRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1.5);
  const [pageInfo, setPageInfo] = useState<{ width: number; height: number } | null>(null);
  const [pdfDocument, setPdfDocument] = useState<pdfjs.PDFDocumentProxy | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [scrollPos, setScrollPos] = useState({ x: 0, y: 0 });

  // Load PDF document when file changes
  useEffect(() => {
    if (!file) {
      setPdfDocument(null);
      setPageInfo(null);
      setError(null);
      return;
    }

    const loadPdfDocument = async () => {
      try {
        setIsLoading(true);
        setError(null);
        console.log('Loading PDF document:', file.name);
        
        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        
        setPdfDocument(pdf);
        
        if (onPageCount) {
          onPageCount(pdf.numPages);
        }
        
        console.log('PDF loaded successfully:', pdf.numPages, 'pages');
      } catch (err) {
        console.error('Error loading PDF:', err);
        const errorMessage = err instanceof Error ? err.message : String(err);
        setError(`PDFの読み込みに失敗しました: ${errorMessage}`);
      } finally {
        setIsLoading(false);
      }
    };

    loadPdfDocument();
  }, [file, onPageCount]);

  // Render PDF page when document, page number, or scale changes
  useEffect(() => {
    if (!pdfDocument || !canvasRef.current) return;

    const renderPage = async () => {
      try {
        setIsLoading(true);
        setError(null); // Clear any previous errors
        console.log('Rendering page:', pageNumber, 'of', pdfDocument.numPages);

        if (pageNumber > pdfDocument.numPages || pageNumber < 1) {
          console.warn('Page number', pageNumber, 'out of range');
          return;
        }

        const page = await pdfDocument.getPage(pageNumber);
        const viewport = page.getViewport({ scale });

        // Check if canvas is still available after async operation
        const canvas = canvasRef.current;
        if (!canvas) {
          console.warn('Canvas ref became null during async operation');
          return;
        }

        const context = canvas.getContext('2d');
        if (!context) {
          console.error('Failed to get 2D context from canvas');
          setError('キャンバスコンテキストの取得に失敗しました');
          return;
        }

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        setPageInfo({ width: viewport.width, height: viewport.height });

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };

        await page.render(renderContext).promise;
        
        console.log('Page rendered successfully:', { width: viewport.width, height: viewport.height });
      } catch (err) {
        console.error('Error rendering page:', err);
        const errorMessage = err instanceof Error ? err.message : String(err);
        setError(`ページの描画に失敗しました: ${errorMessage}`);
      } finally {
        setIsLoading(false);
      }
    };

    renderPage();
  }, [pdfDocument, pageNumber, scale]);

  // Draw diff overlays when diffs or pageInfo changes
  useEffect(() => {
    if (!overlayRef.current || !pageInfo) {
      console.log('Skipping overlay: canvas or pageInfo not ready');
      return;
    }

    const canvas = overlayRef.current;
    const context = canvas.getContext('2d');
    
    if (!context) {
      console.error('Failed to get 2D context for overlay canvas');
      return;
    }

    // Set canvas size to match PDF canvas
    canvas.width = pageInfo.width;
    canvas.height = pageInfo.height;

    // Clear previous drawings
    context.clearRect(0, 0, canvas.width, canvas.height);

    // Only draw if we have pageDiff information and diffs to display
    if (!pageDiff) {
      console.log('No pageDiff available for page', pageNumber, ', skipping overlay rendering');
      return;
    }

    if (diffs.length === 0) {
      console.log('No diffs to render for page', pageNumber);
      return;
    }

    console.log('Drawing', diffs.length, 'diffs on overlay for page', pageNumber);
    console.log('Page dimensions (inches):', { width: pageDiff.width, height: pageDiff.height });
    console.log('Canvas dimensions (pixels):', { width: pageInfo.width, height: pageInfo.height });

    // Draw bounding boxes for diffs
    let drawnCount = 0;
    diffs.forEach((diff, index) => {
      const bboxes = viewType === 'old' ? diff.old_bboxes : diff.new_bboxes;

      if (!bboxes || bboxes.length === 0) {
        console.log(`Diff ${index} has no bboxes for ${viewType} view`);
        return;
      }

      bboxes.forEach((bbox, bboxIndex) => {
        try {
          drawBoundingBox(
            context,
            bbox,
            diff.type,
            pageDiff.width,
            pageDiff.height,
            pageInfo.width,
            pageInfo.height
          );
          drawnCount++;
        } catch (error) {
          console.error(`Error drawing bounding box ${bboxIndex} for diff ${index}:`, error, bbox);
        }
      });
    });
    
    console.log(`Successfully drew ${drawnCount} bounding boxes`);
  }, [diffs, pageInfo, viewType, pageDiff, pageNumber]);

  // Handle mouse wheel zoom
  useEffect(() => {
    const wrapper = canvasWrapperRef.current;
    if (!wrapper) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        setScale((s) => Math.max(0.5, Math.min(5, s + delta)));
      }
    };

    wrapper.addEventListener('wheel', handleWheel, { passive: false });
    return () => wrapper.removeEventListener('wheel', handleWheel);
  }, []);

  // Handle panning with mouse drag
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) { // Left click
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
      if (canvasWrapperRef.current) {
        setScrollPos({
          x: canvasWrapperRef.current.scrollLeft,
          y: canvasWrapperRef.current.scrollTop,
        });
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning || !canvasWrapperRef.current) return;

    const dx = e.clientX - panStart.x;
    const dy = e.clientY - panStart.y;

    canvasWrapperRef.current.scrollLeft = scrollPos.x - dx;
    canvasWrapperRef.current.scrollTop = scrollPos.y - dy;
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const handleMouseLeave = () => {
    setIsPanning(false);
  };

  const drawBoundingBox = (
    ctx: CanvasRenderingContext2D,
    bbox: BoundingBox,
    diffType: string,
    pageWidthInches: number,
    pageHeightInches: number,
    canvasWidth: number,
    canvasHeight: number
  ) => {
    // Azure Document Intelligence returns coordinates in inches
    // We need to convert them to canvas pixels
    const POINTS_PER_INCH = 72; // PDF standard
    
    // Convert inches to points (PDF coordinate system)
    const x1Points = bbox.x1 * POINTS_PER_INCH;
    const y1Points = bbox.y1 * POINTS_PER_INCH;
    const x2Points = bbox.x2 * POINTS_PER_INCH;
    const y2Points = bbox.y2 * POINTS_PER_INCH;
    
    // Page size in points
    const pageWidthPoints = pageWidthInches * POINTS_PER_INCH;
    const pageHeightPoints = pageHeightInches * POINTS_PER_INCH;
    
    // Calculate scale from PDF points to canvas pixels
    const scaleX = canvasWidth / pageWidthPoints;
    const scaleY = canvasHeight / pageHeightPoints;
    
    // Convert to canvas coordinates
    const x = x1Points * scaleX;
    const y = y1Points * scaleY;
    const width = (x2Points - x1Points) * scaleX;
    const height = (y2Points - y1Points) * scaleY;

    // Draw semi-transparent fill first
    ctx.fillStyle = getFillColorForDiffType(diffType);
    ctx.fillRect(x, y, width, height);

    // Draw border on top
    ctx.strokeStyle = getColorForDiffType(diffType);
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, width, height);

    console.log(`Drew bbox for ${diffType}:`, { x, y, width, height, bbox });
  };

  const getColorForDiffType = (diffType: string): string => {
    switch (diffType) {
      case 'added':
        return '#22c55e'; // green
      case 'removed':
        return '#ef4444'; // red
      case 'modified':
        return '#f59e0b'; // amber
      default:
        return '#6b7280'; // gray
    }
  };

  const getFillColorForDiffType = (diffType: string): string => {
    switch (diffType) {
      case 'added':
        return 'rgba(34, 197, 94, 0.2)';
      case 'removed':
        return 'rgba(239, 68, 68, 0.2)';
      case 'modified':
        return 'rgba(245, 158, 11, 0.2)';
      default:
        return 'rgba(107, 114, 128, 0.2)';
    }
  };

  if (!file) {
    return (
      <div className="pdf-viewer-placeholder">
        <div className="placeholder-content">
          <div className="placeholder-icon">📄</div>
          <span>PDFファイルを選択してください</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="pdf-viewer-placeholder">
        <div className="placeholder-content error">
          <div className="placeholder-icon">⚠️</div>
          <span>{error}</span>
        </div>
      </div>
    );
  }

  if (isLoading && !pageInfo) {
    return (
      <div className="pdf-viewer-placeholder">
        <div className="placeholder-content">
          <div className="placeholder-icon">⏳</div>
          <span>PDFを読み込んでいます...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="pdf-viewer" ref={containerRef}>
      <div className="pdf-controls">
        <button onClick={() => setScale((s) => Math.max(0.5, s - 0.25))} disabled={scale <= 0.5}>−</button>
        <span>{Math.round(scale * 100)}%</span>
        <button onClick={() => setScale((s) => Math.min(5, s + 0.25))} disabled={scale >= 5}>+</button>
        <button onClick={() => setScale(1)} className="reset-button">リセット</button>
        <span className="zoom-hint">💡 Ctrl+ホイールでズーム、ドラッグで移動</span>
      </div>
      <div 
        className="pdf-canvas-wrapper" 
        ref={canvasWrapperRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        style={{ cursor: isPanning ? 'grabbing' : 'grab' }}
      >
        <div className="pdf-canvas-container">
          <canvas ref={canvasRef} className="pdf-canvas" />
          <canvas ref={overlayRef} className="pdf-overlay" />
        </div>
      </div>
    </div>
  );
};
