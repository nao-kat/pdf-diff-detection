#!/bin/bash

# Azure App Service の設定を行うスクリプト
# 使用方法: bash configure-azure-app-service.sh

# App Service名とリソースグループを設定してください
APP_NAME="pdf-diff-naok"
RESOURCE_GROUP="your-resource-group-name"

echo "Configuring Azure App Service: $APP_NAME"
echo "================================================"

# 1. スタートアップコマンドの設定
echo "Setting startup command..."
az webapp config set \
  --resource-group "$RESOURCE_GROUP" \
  --name "$APP_NAME" \
  --startup-file "cd /home/site/wwwroot/backend && gunicorn app.main:app --workers 4 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000 --timeout 600"

# 2. アプリケーション設定の追加
echo "Setting application settings..."
az webapp config appsettings set \
  --resource-group "$RESOURCE_GROUP" \
  --name "$APP_NAME" \
  --settings \
    PYTHONPATH="/home/site/wwwroot/backend" \
    SCM_DO_BUILD_DURING_DEPLOYMENT="true"

# 3. App Serviceの再起動
echo "Restarting App Service..."
az webapp restart \
  --resource-group "$RESOURCE_GROUP" \
  --name "$APP_NAME"

echo "================================================"
echo "Configuration completed!"
echo ""
echo "Check logs with:"
echo "az webapp log tail --resource-group $RESOURCE_GROUP --name $APP_NAME"
