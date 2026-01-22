# Azure App Service デプロイ手順

## エラーの原因
`ModuleNotFoundError: No module named 'app'` エラーは、App Serviceが正しいディレクトリからアプリケーションを起動できていないことが原因です。

## 解決方法

### 1. Azure Portal での設定

#### A. スタートアップコマンドの設定
Azure Portalで以下の手順を実行してください:

1. **Azure Portal** → **App Service** → あなたのアプリ → **構成** → **全般設定**
2. **スタートアップコマンド**に以下を入力:

```bash
cd /home/site/wwwroot/backend && gunicorn app.main:app --workers 4 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000 --timeout 600
```

または、シェルスクリプトを使用する場合:

```bash
bash /home/site/wwwroot/backend/startup.sh
```

#### B. アプリケーション設定の追加
**構成** → **アプリケーション設定** で以下の環境変数を追加:

```
PYTHONPATH=/home/site/wwwroot/backend
PROJECT_DIR=/home/site/wwwroot/backend
```

### 2. Azure CLI でのデプロイ

```bash
# リソースグループとApp Service名を設定
RESOURCE_GROUP="your-resource-group"
APP_NAME="your-app-name"

# 環境変数の設定
az webapp config appsettings set \
  --resource-group $RESOURCE_GROUP \
  --name $APP_NAME \
  --settings PYTHONPATH=/home/site/wwwroot/backend

# スタートアップコマンドの設定
az webapp config set \
  --resource-group $RESOURCE_GROUP \
  --name $APP_NAME \
  --startup-file "cd /home/site/wwwroot/backend && gunicorn app.main:app --workers 4 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000 --timeout 600"

# backendディレクトリからデプロイ
cd backend
zip -r deploy.zip .
az webapp deployment source config-zip \
  --resource-group $RESOURCE_GROUP \
  --name $APP_NAME \
  --src deploy.zip

# または、gitデプロイの場合
git push azure main
```

### 3. VS Code Azure App Service 拡張機能を使用する場合

1. `backend`フォルダを右クリック
2. **Deploy to Web App** を選択
3. デプロイ後、Portal で上記のスタートアップコマンドを設定

### 4. GitHub Actions でのデプロイ

`.github/workflows/main_your-app-name.yml` に以下を追加:

```yaml
- name: Deploy to Azure Web App
  uses: azure/webapps-deploy@v2
  with:
    app-name: 'your-app-name'
    slot-name: 'Production'
    publish-profile: ${{ secrets.AZURE_WEBAPP_PUBLISH_PROFILE }}
    package: ./backend
    startup-command: 'cd /home/site/wwwroot/backend && gunicorn app.main:app --workers 4 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000 --timeout 600'
```

### 5. 必要な環境変数

App Serviceの**構成**で以下の環境変数を設定してください:

```
AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT=https://your-resource.cognitiveservices.azure.com/
AZURE_DOCUMENT_INTELLIGENCE_KEY=your-key-here
```

マネージドIDを使用する場合:
```
AZURE_CLIENT_ID=your-managed-identity-client-id
```

### 6. デプロイ確認

```bash
# ログの確認
az webapp log tail --resource-group $RESOURCE_GROUP --name $APP_NAME

# またはPortalで: App Service → ログストリーム
```

### トラブルシューティング

#### ログの確認方法
```bash
# SSHでアプリに接続
az webapp ssh --resource-group $RESOURCE_GROUP --name $APP_NAME

# ディレクトリ構造を確認
cd /home/site/wwwroot
ls -la
ls -la backend/

# Pythonパスを確認
python -c "import sys; print('\n'.join(sys.path))"
```

#### よくある問題

1. **モジュールが見つからない**
   - `PYTHONPATH`が正しく設定されているか確認
   - `backend`ディレクトリが正しくデプロイされているか確認

2. **タイムアウトエラー**
   - `--timeout 600`を追加して、Azure Document Intelligence APIの応答待ちに対応

3. **ポートエラー**
   - App Serviceは自動的にポート8000をリッスンするように設定されています
   - 環境変数`PORT`が設定されている場合は、それを使用してください

### 参考リンク

- [Azure App Service での Python アプリの構成](https://docs.microsoft.com/ja-jp/azure/app-service/configure-language-python)
- [Azure App Service での Gunicorn の使用](https://docs.microsoft.com/ja-jp/azure/app-service/configure-language-python#customize-startup-command)
