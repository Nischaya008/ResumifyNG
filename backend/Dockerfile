# Use Python 3.11 slim image
FROM python:3.11-slim

# Install ffmpeg and other dependencies
RUN apt-get update && \
    apt-get install -y ffmpeg && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements files
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY . .

# Create cache directory
RUN mkdir -p backend/temp/tts_cache

# Expose port
EXPOSE 8000

# Command to run the application
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}