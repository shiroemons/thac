#!/bin/bash
set -e

# Start Hono API server in background
echo "Starting API server on port 3000..."
bun run /app/apps/server/dist/index.js &
SERVER_PID=$!

# Start TanStack Start SSR server in background
echo "Starting Web server on port 3001..."
bun run /app/apps/web/dist/server/server.js &
WEB_PID=$!

# Function to handle shutdown
shutdown() {
    echo "Shutting down..."
    kill $SERVER_PID $WEB_PID 2>/dev/null
    exit 0
}

# Trap signals for graceful shutdown
trap shutdown SIGTERM SIGINT

# Wait for any process to exit
wait -n

# If we get here, one process exited
echo "One of the processes exited unexpectedly"
exit 1
