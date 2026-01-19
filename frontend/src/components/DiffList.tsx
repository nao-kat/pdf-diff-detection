import React from 'react';
import type { PageDiff, DiffItem, DiffType } from '../types/api';

interface DiffListProps {
  pageDiffs: PageDiff[];
  onSelectDiff: (pageNumber: number, diffIndex: number) => void;
  selectedPage: number;
}

export const DiffList: React.FC<DiffListProps> = ({ pageDiffs, onSelectDiff, selectedPage }) => {
  const getDiffTypeLabel = (type: DiffType): string => {
    switch (type) {
      case 'added':
        return '追加';
      case 'removed':
        return '削除';
      case 'modified':
        return '変更';
      default:
        return type;
    }
  };

  const getDiffTypeClass = (type: DiffType): string => {
    return `diff-type-${type}`;
  };

  const totalDiffCount = pageDiffs.reduce((sum, page) => sum + page.diffs.length, 0);

  if (totalDiffCount === 0) {
    return (
      <div className="diff-list">
        <div className="diff-list-header">
          <h3>差分一覧</h3>
          <span className="diff-count">差分なし</span>
        </div>
        <div className="diff-list-empty">
          <span>2つのPDFに差分はありません</span>
        </div>
      </div>
    );
  }

  return (
    <div className="diff-list">
      <div className="diff-list-header">
        <h3>差分一覧</h3>
        <span className="diff-count">{totalDiffCount}件の差分</span>
      </div>
      <div className="diff-list-content">
        {pageDiffs.map((page) => (
          <div key={page.page_number} className="page-diff-group">
            <div className={`page-header ${selectedPage === page.page_number ? 'selected' : ''}`}>
              ページ {page.page_number} ({page.diffs.length}件)
            </div>
            {page.diffs.map((diff, index) => (
              <DiffItemRow
                key={index}
                diff={diff}
                index={index}
                pageNumber={page.page_number}
                onSelect={() => onSelectDiff(page.page_number, index)}
                getDiffTypeLabel={getDiffTypeLabel}
                getDiffTypeClass={getDiffTypeClass}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

interface DiffItemRowProps {
  diff: DiffItem;
  index: number;
  pageNumber: number;
  onSelect: () => void;
  getDiffTypeLabel: (type: DiffType) => string;
  getDiffTypeClass: (type: DiffType) => string;
}

const DiffItemRow: React.FC<DiffItemRowProps> = ({
  diff,
  onSelect,
  getDiffTypeLabel,
  getDiffTypeClass,
}) => {
  return (
    <div className="diff-item" onClick={onSelect}>
      <div className="diff-item-header">
        <span className={`diff-type-badge ${getDiffTypeClass(diff.type)}`}>
          {getDiffTypeLabel(diff.type)}
        </span>
      </div>
      <div className="diff-item-content">
        {diff.old_text && (
          <div className="diff-text old-text">
            <span className="label">旧:</span>
            <span className="text">{diff.old_text}</span>
          </div>
        )}
        {diff.new_text && (
          <div className="diff-text new-text">
            <span className="label">新:</span>
            <span className="text">{diff.new_text}</span>
          </div>
        )}
      </div>
    </div>
  );
};
