#!/bin/bash
# Startup script for Railway deployment
# Railway sets PORT environment variable automatically

# Default to 8080 if PORT is not set
PORT=${PORT:-8080}

echo "Starting Lexeme backend on port $PORT"

# Activate virtual environment if it exists
if [ -d "/opt/venv" ]; then
    source /opt/venv/bin/activate
fi

# Initialize database tables
echo "Initializing database tables..."
python3 init_db.py || echo "Warning: Database initialization failed, continuing anyway..."

# Start uvicorn with the port
exec uvicorn app.main:app --host 0.0.0.0 --port "$PORT"

