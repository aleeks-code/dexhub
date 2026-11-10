#!/bin/sh
set -e

echo "Starting DexHub API on port 3001..."
PORT=3001 node /app/api/dist/main &
API_PID=$!

echo "Starting DexHub Web on port 3000..."
PORT=3000 HOSTNAME="127.0.0.1" node /app/web/apps/web/server.js &
WEB_PID=$!

trap "kill -TERM $API_PID $WEB_PID" TERM INT

echo "Starting Caddy on port ${PORT:-10000}..."
caddy run --config /app/Caddyfile --adapter caddyfile &
CADDY_PID=$!

wait $CADDY_PID
