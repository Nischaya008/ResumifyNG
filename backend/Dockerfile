# Use Python 3.11 slim image as base
FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && \
    apt-get install -y \
    build-essential \
    python3-dev \
    ffmpeg \
    pkg-config \
    gcc \
    g++ \
    git \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements files
COPY requirements.txt .

# Install Python dependencies in stages with verbose output
RUN python -m pip install --upgrade pip && \
    pip install --no-cache-dir wheel setuptools Cython && \
    # Install numpy first as it's often a base requirement
    pip install --no-cache-dir numpy==1.26.4 && \
    # Install scipy and pandas next
    pip install --no-cache-dir scipy==1.15.2 pandas==2.2.3 && \
    # Install spacy and its models
    pip install --no-cache-dir spacy==3.5.4 && \
    pip install --no-cache-dir https://github.com/explosion/spacy-models/releases/download/en_core_web_sm-3.5.0/en_core_web_sm-3.5.0.tar.gz && \
    pip install --no-cache-dir https://github.com/explosion/spacy-models/releases/download/en_core_web_md-3.5.0/en_core_web_md-3.5.0.tar.gz && \
    # Install the rest of the requirements
    pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY . .

# Create cache directory
RUN mkdir -p backend/temp/tts_cache

# Expose port
EXPOSE 8000

# Command to run the application
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}
