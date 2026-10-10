#!/bin/sh
set -eu
cd "$(dirname "$0")/../.."
exec uv run --frozen gunicorn --chdir artifacts/api-server/backend \
  --bind "0.0.0.0:${PORT:?PORT is required}" \
  --workers 2 --threads 2 --timeout 15 --access-logfile - \
  config.wsgi:application
