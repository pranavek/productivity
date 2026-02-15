#!/bin/sh
set -e

echo "Building minified assets..."
cd /app/server && npm run build

echo "Starting productivity suite server..."
exec node /app/server/server.js
