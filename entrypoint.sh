#!/bin/sh
set -e

# Wait for database to be ready (if DATABASE_URL is set)
if [ -n "$DATABASE_URL" ]; then
    echo "Waiting for database to be ready..."
    RETRIES=30
    RETRY_INTERVAL=2
    for i in $(seq 1 $RETRIES); do
        if bun -e "
            const postgres = require('postgres');
            const sql = postgres(process.env.DATABASE_URL);
            sql\`SELECT 1\`.then(() => { sql.end(); process.exit(0); }).catch(() => process.exit(1));
        " 2>/dev/null; then
            echo "Database is ready!"
            break
        fi
        if [ "$i" = "$RETRIES" ]; then
            echo "Database not ready after $RETRIES attempts, starting anyway..."
        else
            echo "  Attempt $i/$RETRIES - retrying in ${RETRY_INTERVAL}s..."
            sleep $RETRY_INTERVAL
        fi
    done
fi

# Optional: Run database schema push (opt-in via INIT_DB=true)
if [ "$INIT_DB" = "true" ]; then
    echo "Running database schema push..."
    bun run --cwd /app/packages/db db:push
    echo "Database schema push completed!"
fi

# Optional: Run database seed (opt-in via SEED_DB=true)
if [ "$SEED_DB" = "true" ]; then
    echo "Running database seed..."
    bun run --cwd /app/packages/db db:seed
    echo "Database seed completed!"
fi

# Start Hono API server in background
echo "Starting API server on port 3001..."
bun run /app/apps/server/dist/index.js &
SERVER_PID=$!

# Start TanStack Start SSR server in background
echo "Starting Web server on port 3000..."
bun run /app/apps/web/dist/server/server.js &
WEB_PID=$!

# Function to handle shutdown
shutdown() {
    echo "Shutting down..."
    kill $SERVER_PID $WEB_PID 2>/dev/null || true
    exit 0
}

# Trap signals for graceful shutdown
trap shutdown TERM INT

echo "All services started. Waiting..."

# Wait for any process to exit
wait $SERVER_PID $WEB_PID

# If we get here, one process exited
echo "One of the processes exited unexpectedly"
exit 1
