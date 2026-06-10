FROM python:3.12-slim

# ffmpeg needed by yt-dlp for audio format conversion
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies first (layer cache — only re-runs when requirements.txt changes)
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy source after deps so code changes don't bust the pip cache
COPY . .

# Cloud Run injects PORT; config.py reads it.
# Default to 8080 (Cloud Run's expected default).
ENV PORT=8080
EXPOSE 8080

# Use shell form so ${PORT} is expanded at runtime
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT} --workers 2
