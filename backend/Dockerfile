FROM python:3.11-slim

# Install system dependencies including distutils
RUN apt-get update && \
    apt-get install -y \
        build-essential \
        python3-dev \
        python3-distutils \
        python3.11-dev \
        ffmpeg \
        pkg-config \
        gcc \
        g++ \
        gfortran \
        git \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements for caching
COPY requirements.txt .

# Upgrade pip and install dependencies directly (no virtualenv)
RUN pip install --no-cache-dir --upgrade pip setuptools wheel && \
    pip install --no-cache-dir numpy==1.24.3 && \
    pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create any necessary cache directories
RUN mkdir -p backend/temp/tts_cache

# Expose the port
EXPOSE 8000

# Start the application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
