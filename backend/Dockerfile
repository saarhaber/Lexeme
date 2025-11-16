FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .

# Create virtual environment and install dependencies
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Upgrade pip and install dependencies
RUN pip install --upgrade pip && \
    pip install -r requirements.txt

# Copy application code
COPY . .

# Run setup script
RUN python3 setup_deploy.sh || true

# Expose port
EXPOSE 8080

# Start command - Railway sets PORT env var
# Use shell form to properly expand environment variable
CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8080}

