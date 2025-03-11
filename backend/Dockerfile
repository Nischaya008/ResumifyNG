FROM python:3.11-slim

# Install system dependencies including audio libraries
RUN apt-get update && apt-get install -y \
    ffmpeg \
    libglib2.0-0 \
    libglib2.0-dev \
    pkg-config \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements first to leverage Docker cache
COPY requirements.txt .

# Upgrade pip and install dependencies
RUN python -m pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt && \
    python -m spacy download en_core_web_sm && \
    python -m spacy download en_core_web_md

# Create cache directory with proper permissions
RUN mkdir -p /tmp/tts_cache && chmod 777 /tmp/tts_cache

# Copy the rest of the application
COPY . .

# Expose port
EXPOSE 8080

# Set environment variables
ENV SDL_AUDIODRIVER=dummy
ENV AUDIODEV=null
ENV PYTHONPATH=/usr/local/lib/python3.11/site-packages:$PYTHONPATH
ENV PATH="/usr/local/bin:$PATH"

# Command to run the application
CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
