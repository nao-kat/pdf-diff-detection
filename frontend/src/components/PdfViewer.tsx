import React, { useEffect, useRef, useState } from 'react';
import * as pdfjs from 'pdfjs-dist';
import type { BoundingBox, DiffItem } from '../types/api';

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

interface PdfViewerProps {
  file: File | null;
  pageNumber: number;
  diffs: DiffItem[];
  viewType: 'old' | 'new';
  onPageCount?: (count: number) => void;
}

export const PdfViewer: React.FC<PdfViewerProps> = ({
  file,
  pageNumber,
  diffs,
  viewType,
  onPageCount,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1.5);
  const [pageInfo, setPageInfo] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    if (!file || !canvasRef.current) return;

    const loadPdf = async () => {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;

      if (onPageCount) {
        onPageCount(pdf.numPages);
      }

      if (pageNumber > pdf.numPages) return;

      const page = await pdf.getPage(pageNumber);
      const viewport = page.getViewport({ scale });

      const canvas = canvasRef.current!;
      const context = canvas.getContext('2d')!;

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      setPageInfo({ width: viewport.width, height: viewport.height });

      await page.render({
        canvasContext: context,
        viewport: viewport,
        canvas: canvas,
      }).promise;
    };

    loadPdf().catch(console.error);
  }, [file, pageNumber, scale, onPageCount]);

  useEffect(() => {
    if (!overlayRef.current || !pageInfo) return;

    const canvas = overlayRef.current;
    const context = canvas.getContext('2d')!;

    canvas.width = pageInfo.width;
    canvas.height = pageInfo.height;

    // Clear previous drawings
    context.clearRect(0, 0, canvas.width, canvas.height);

    // Draw bounding boxes for diffs
    diffs.forEach((diff) => {
      const bboxes = viewType === 'old' ? diff.old_bboxes : diff.new_bboxes;

      bboxes.forEach((bbox) => {
        drawBoundingBox(context, bbox, diff.type, scale);
      });
    });
  }, [diffs, pageInfo, viewType, scale]);

  const drawBoundingBox = (
    ctx: CanvasRenderingContext2D,
    bbox: BoundingBox,
    diffType: string,
    scale: number
  ) => {
    const x = bbox.x1 * scale;
    const y = bbox.y1 * scale;
    const width = (bbox.x2 - bbox.x1) * scale;
    const height = (bbox.y2 - bbox.y1) * scale;

    ctx.strokeStyle = getColorForDiffType(diffType);
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, width, height);

    // Add semi-transparent fill
    ctx.fillStyle = getFillColorForDiffType(diffType);
    ctx.fillRect(x, y, width, height);
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
        return 'rgba(34, 197, 94, 0.1)';
      case 'removed':
        return 'rgba(239, 68, 68, 0.1)';
      case 'modified':
        return 'rgba(245, 158, 11, 0.1)';
      default:
        return 'rgba(107, 114, 128, 0.1)';
    }
  };

  if (!file) {
    return (
      <div className="pdf-viewer-placeholder">
        <span>PDFファイルを選択してください</span>
      </div>
    );
  }

  return (
    <div className="pdf-viewer" ref={containerRef}>
      <div className="pdf-controls">
        <button onClick={() => setScale((s) => Math.max(0.5, s - 0.25))}>−</button>
        <span>{Math.round(scale * 100)}%</span>
        <button onClick={() => setScale((s) => Math.min(3, s + 0.25))}>+</button>
      </div>
      <div className="pdf-canvas-container">
        <canvas ref={canvasRef} className="pdf-canvas" />
        <canvas ref={overlayRef} className="pdf-overlay" />
      </div>
    </div>
  );
};
