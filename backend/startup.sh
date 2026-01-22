#!/bin/bash

# Azure App Service startup script for Python
# Handle both deployment scenarios: root or backend subfolder
if [ -d "/home/site/wwwroot/backend" ]; then
    cd /home/site/wwwroot/backend
else
    cd /home/site/wwwroot
fi

# Run gunicorn with uvicorn worker
gunicorn app.main:app \
  --workers 4 \
  --worker-class uvicorn.workers.UvicornWorker \
  --bind 0.0.0.0:8000 \
  --timeout 600 \
  --access-logfile - \
  --error-logfile -
