# PDF Diff Detection - 使い方

## アプリケーションの起動

### 1. バックエンドの起動

```bash
cd backend
source venv/bin/activate  # 仮想環境がまだの場合は python -m venv venv で作成
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### 2. フロントエンドの起動

```bash
cd frontend
npm install  # 初回のみ
npm run dev
```

### 3. ブラウザでアクセス

http://localhost:3000 を開きます。

## 使い方

1. **旧PDF（比較元）** - 比較の基準となるPDFファイルを選択
2. **新PDF（比較先）** - 変更後のPDFファイルを選択
3. **Compareボタン** をクリック
4. 処理が完了すると、以下が表示されます：
   - 左側：旧PDFの表示と変更箇所の可視化
   - 右側：新PDFの表示と変更箇所の可視化
   - 下部：差分一覧（変更内容のリスト）

## 変更箇所の表示

変更箇所は色分けされた四角で囲まれて表示されます：

- 🟢 **緑色**: 追加された内容
- 🔴 **赤色**: 削除された内容
- 🟠 **オレンジ色**: 変更された内容

## 操作方法

- **ページナビゲーション**: 「前ページ」「次ページ」ボタンでページを移動
- **ズーム**: 各PDFビューアーの「+」「-」ボタンでズームレベルを調整
- **差分リストから選択**: 下部の差分リストをクリックすると、該当ページにジャンプ

## トラブルシューティング

### PDFが表示されない場合

1. **ブラウザのコンソールを確認**:
   - F12キーを押して開発者ツールを開く
   - Consoleタブでエラーメッセージを確認

2. **ファイルサイズの確認**:
   - 最大ファイルサイズ: 20MB
   - 最大ページ数: 50ページ

3. **環境変数の確認**:
   ```bash
   # backend/.env ファイルが存在し、以下が設定されているか確認
   AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT=https://your-endpoint.cognitiveservices.azure.com/
   AZURE_DOCUMENT_INTELLIGENCE_KEY=your-api-key
   ```

4. **バックエンドのログを確認**:
   - バックエンドのターミナルでエラーメッセージを確認

### 変更箇所が表示されない場合

1. PDFファイルが正常に比較されているか確認（処理中にエラーがないか）
2. ブラウザのコンソールログを確認
3. 差分一覧に項目が表示されているか確認

## テスト用PDFの作成

簡単なテスト用PDFを作成するには：

```bash
# Python環境で
pip install reportlab

# テストPDFを生成
python create_test_pdfs.py
```

これにより、`test_old.pdf` と `test_new.pdf` が作成されます。
