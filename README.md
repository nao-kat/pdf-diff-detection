# PDF Diff Detection

スキャンPDF 2ファイルの差分検知・可視化アプリケーション

## 概要

スキャンされた2つのPDF（旧版・新版）をアップロードし、**Azure Document Intelligence**で文字起こし（レイアウト情報含む）→文章差分を検知→**変更箇所をPDF上で赤枠表示**し、**変更された文字（差分テキスト）を表示**します。

## 機能

- ✅ Web UIでPDFを2つアップロード
- ✅ Azure Document IntelligenceでスキャンPDFから文字を抽出
- ✅ ページごとに差分（追加/削除/変更）を一覧表示
- ✅ **差分箇所をPDFプレビュー上で色付き四角で表示**
  - 🟢 緑色: 追加された内容
  - 🔴 赤色: 削除された内容
  - 🟠 オレンジ色: 変更された内容
- ✅ 「変更」の場合、旧テキスト/新テキストを表示
- ✅ PDFビューアーのズーム機能
- ✅ ページナビゲーション機能

## アーキテクチャ

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (React)                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │ FileUpload  │  │  PdfViewer  │  │       DiffList          │ │
│  │ (Upload)    │  │  (Preview)  │  │  (Diff Results)         │ │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ POST /api/compare
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Backend (FastAPI)                          │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    Compare Endpoint                        │  │
│  │  1. Validate PDF files                                     │  │
│  │  2. Extract text with Document Intelligence               │  │
│  │  3. Detect differences                                     │  │
│  │  4. Return JSON with diffs and bounding boxes             │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ OCR API
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                 Azure Document Intelligence                      │
│  - Text extraction with bounding boxes                          │
│  - Japanese/English support                                      │
└─────────────────────────────────────────────────────────────────┘
```

## セットアップ

### 前提条件

- Python 3.10+
- Node.js 18+
- Azure Document Intelligence リソース

### 1. Azure Document Intelligence の準備

1. [Azure Portal](https://portal.azure.com/) で Document Intelligence リソースを作成
2. エンドポイントとAPIキーを取得

#### 認証方法

以下のいずれかの方法で認証を設定します：

**方法1: APIキー認証（開発環境推奨）**

1. Azure Portalから Document Intelligence リソースのAPIキーを取得
2. `.env`ファイルに設定：
   ```bash
   AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT=https://your-resource-name.cognitiveservices.azure.com
   AZURE_DOCUMENT_INTELLIGENCE_KEY=your-api-key-here
   ```

**方法2: Entra ID認証（本番環境推奨）**

`.env`の`AZURE_DOCUMENT_INTELLIGENCE_KEY`を空にし、以下のいずれかを使用：

- **Azure CLI認証:**
  ```bash
  az login
  ```
  
- **サービスプリンシパル認証:**
  1. サービスプリンシパルを作成：
     ```bash
     az ad sp create-for-rbac --name pdf-diff-app --role "Cognitive Services User"
     ```
  2. 出力された情報を環境変数に設定：
     ```bash
     export AZURE_CLIENT_ID=<appId>
     export AZURE_TENANT_ID=<tenant>
     export AZURE_CLIENT_SECRET=<password>
     ```
     または`.env`ファイルに追記

### 2. バックエンドのセットアップ

```bash
cd backend

# 仮想環境の作成
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 依存パッケージのインストール
pip install -r requirements.txt

# 環境変数の設定
cp .env.example .env
# .env ファイルを編集して Azure の認証情報を設定

# サーバー起動
uvicorn app.main:app --reload --port 8000
```

### 3. フロントエンドのセットアップ

```bash
cd frontend

# 依存パッケージのインストール
npm install

# 開発サーバー起動
npm run dev
```

### 4. アプリケーションにアクセス

ブラウザで http://localhost:3000 を開く

## API 仕様

### POST /api/compare

PDFファイル2つを比較し、差分結果を返します。

**Request:**
- Content-Type: `multipart/form-data`
- `old_pdf`: 旧PDFファイル
- `new_pdf`: 新PDFファイル

**Response:**
```json
{
  "pages": [
    {
      "page_number": 1,
      "diffs": [
        {
          "type": "added" | "removed" | "modified",
          "old_text": "旧テキスト",
          "new_text": "新テキスト",
          "old_bboxes": [{"x1": 0, "y1": 0, "x2": 100, "y2": 20}],
          "new_bboxes": [{"x1": 0, "y1": 0, "x2": 100, "y2": 20}]
        }
      ]
    }
  ],
  "old_page_count": 5,
  "new_page_count": 5
}
```

## 制限事項

- 最大ファイルサイズ: 20MB
- 最大ページ数: 50ページ
- 対応言語: 日本語/英語

## 開発

### バックエンドテストの実行

```bash
cd backend
pytest
```

### フロントエンドのビルド

```bash
cd frontend
npm run build
```


## ライセンス

MIT License
