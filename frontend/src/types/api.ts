/** Type definitions for the PDF diff detection API */

export interface BoundingBox {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export type DiffType = 'added' | 'removed' | 'modified';

export interface DiffItem {
  type: DiffType;
  old_text: string | null;
  new_text: string | null;
  old_bboxes: BoundingBox[];
  new_bboxes: BoundingBox[];
}

export interface PageDiff {
  page_number: number;
  diffs: DiffItem[];
}

export interface CompareResponse {
  pages: PageDiff[];
  old_page_count: number;
  new_page_count: number;
}

export interface ErrorResponse {
  error: string;
  detail?: string;
}
