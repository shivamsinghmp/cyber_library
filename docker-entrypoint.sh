#!/bin/sh
set -e

# Run pending migrations before starting the app.
# Safe to run on every container start — skips already-applied migrations.
echo "Running database migrations..."
node ./node_modules/prisma/build/index.js migrate deploy

echo "Starting Next.js..."
exec node server.js
