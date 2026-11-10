#!/bin/sh
set -e

echo "=== STARTING DEXHUB SERVICES ==="
echo "Configured environment keys:"
env | awk -F= '{print $1}' | grep -E "DATABASE|AUTH|URL|WEBAUTHN|SECRET|KEY|PORT" || echo "None found"

echo "Starting DexHub API on port 3001..."
(
  cd /app/api
  export PORT=3001
  node dist/main
) &
API_PID=$!

echo "Starting DexHub Web on port 3000..."
(
  cd /app/web
  export PORT=3000
  export HOSTNAME="127.0.0.1"
  node apps/web/server.js
) &
WEB_PID=$!

trap "kill -TERM $API_PID $WEB_PID" TERM INT

echo "Starting Caddy on port ${PORT:-10000}..."
caddy run --config /app/Caddyfile --adapter caddyfile &
CADDY_PID=$!

wait $CADDY_PID
