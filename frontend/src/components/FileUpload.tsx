import React, { useState, useCallback } from 'react';

interface FileUploadProps {
  label: string;
  file: File | null;
  onFileSelect: (file: File | null) => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({ label, file, onFileSelect }) => {
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile.type === 'application/pdf') {
          onFileSelect(droppedFile);
        } else {
          alert('PDFファイルのみアップロード可能です');
        }
      }
    },
    [onFileSelect]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
        onFileSelect(e.target.files[0]);
      }
    },
    [onFileSelect]
  );

  const handleClear = useCallback(() => {
    onFileSelect(null);
  }, [onFileSelect]);

  return (
    <div className="file-upload">
      <label className="file-upload-label">{label}</label>
      <div
        className={`file-upload-area ${dragActive ? 'drag-active' : ''} ${file ? 'has-file' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        {file ? (
          <div className="file-info">
            <span className="file-name">{file.name}</span>
            <span className="file-size">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
            <button type="button" className="clear-button" onClick={handleClear}>
              ✕
            </button>
          </div>
        ) : (
          <>
            <input
              type="file"
              accept=".pdf,application/pdf"
              onChange={handleChange}
              className="file-input"
            />
            <div className="upload-prompt">
              <span className="upload-icon">📄</span>
              <span>クリックまたはドラッグ＆ドロップでPDFを選択</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
