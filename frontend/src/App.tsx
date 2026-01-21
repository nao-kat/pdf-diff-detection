import { useState, useCallback } from 'react';
import axios from 'axios';
import { FileUpload } from './components/FileUpload';
import { PdfViewer } from './components/PdfViewer';
import { DiffList } from './components/DiffList';
import type { CompareResponse, DiffItem, PageDiff } from './types/api';
import './App.css';

function App() {
  const [oldFile, setOldFile] = useState<File | null>(null);
  const [newFile, setNewFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CompareResponse | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [oldPageCount, setOldPageCount] = useState(0);
  const [newPageCount, setNewPageCount] = useState(0);

  const handleCompare = useCallback(async () => {
    if (!oldFile || !newFile) {
      setError('両方のPDFファイルを選択してください');
      return;
    }

    setIsLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('old_pdf', oldFile);
    formData.append('new_pdf', newFile);

    try {
      const response = await axios.post<CompareResponse>('/api/compare', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      console.log('Compare response:', response.data);
      setResult(response.data);
      setCurrentPage(1);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response) {
        const detail = err.response.data?.detail || err.response.data?.error;
        setError(detail || 'PDFの比較中にエラーが発生しました');
      } else {
        setError('サーバーとの通信中にエラーが発生しました');
      }
    } finally {
      setIsLoading(false);
    }
  }, [oldFile, newFile]);

  const handleSelectDiff = useCallback((pageNumber: number, _diffIndex: number) => {
    setCurrentPage(pageNumber);
  }, []);

  const getCurrentPageDiffs = (): DiffItem[] => {
    if (!result) return [];
    const pageDiff = result.pages.find((p) => p.page_number === currentPage);
    return pageDiff?.diffs || [];
  };

  const getCurrentPageDiff = (): PageDiff | undefined => {
    if (!result) return undefined;
    return result.pages.find((p) => p.page_number === currentPage);
  };

  const maxPageCount = Math.max(oldPageCount, newPageCount, result?.old_page_count || 0, result?.new_page_count || 0);

  return (
    <div className="app">
      <header className="app-header">
        <h1>PDF Diff Detection</h1>
        <p>スキャンPDFの差分を検知・可視化</p>
      </header>

      <main className="app-main">
        <section className="upload-section">
          <div className="upload-grid">
            <FileUpload label="旧PDF（比較元）" file={oldFile} onFileSelect={setOldFile} />
            <FileUpload label="新PDF（比較先）" file={newFile} onFileSelect={setNewFile} />
          </div>

          <div className="compare-action">
            <button
              className="compare-button"
              onClick={handleCompare}
              disabled={!oldFile || !newFile || isLoading}
            >
              {isLoading ? '処理中...' : 'Compare'}
            </button>
          </div>

          {error && <div className="error-message">{error}</div>}
        </section>

        {(result || oldFile || newFile) && (
          <section className="result-section">
            {(oldFile || newFile) && !result && (
              <div className="preview-info">
                <p>📌 PDFプレビュー表示中</p>
                <p className="preview-hint">両方のPDFをアップロードして「Compare」ボタンをクリックすると、差分が検出されます</p>
              </div>
            )}

            {result && (
              <div className="result-summary">
                <p>✅ 差分検出完了</p>
                <p className="summary-details">
                  全{result.pages.length}ページ中 {result.pages.filter(p => p.diffs.length > 0).length}ページに差分を検出
                  （合計 {result.pages.reduce((acc, p) => acc + p.diffs.length, 0)} 件）
                </p>
              </div>
            )}
            
            <div className="page-navigation">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
              >
                ◀ 前ページ
              </button>
              <span>
                ページ {currentPage} / {maxPageCount || '?'}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(maxPageCount, p + 1))}
                disabled={currentPage >= maxPageCount}
              >
                次ページ ▶
              </button>
            </div>

            <div className="viewer-grid">
              <div className="viewer-panel">
                <h3>旧PDF</h3>
                <PdfViewer
                  file={oldFile}
                  pageNumber={currentPage}
                  diffs={getCurrentPageDiffs()}
                  viewType="old"
                  onPageCount={setOldPageCount}
                  pageDiff={getCurrentPageDiff()}
                />
              </div>
              <div className="viewer-panel">
                <h3>新PDF</h3>
                <PdfViewer
                  file={newFile}
                  pageNumber={currentPage}
                  diffs={getCurrentPageDiffs()}
                  viewType="new"
                  onPageCount={setNewPageCount}
                  pageDiff={getCurrentPageDiff()}
                />
              </div>
            </div>

            {result && (
              <DiffList
                pageDiffs={result.pages}
                onSelectDiff={handleSelectDiff}
                selectedPage={currentPage}
              />
            )}
          </section>
        )}
      </main>

      <footer className="app-footer">
        <p>Powered by Azure Document Intelligence</p>
      </footer>
    </div>
  );
}

export default App;
