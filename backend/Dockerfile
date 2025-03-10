FROM python:3.11-slim

# Install system dependencies including Fortran and Python distutils
RUN apt-get update && \
    apt-get install -y \
    build-essential \
    python3-dev \
    python3-distutils \
    python3.11-dev \
    python3.11-distutils \
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

# Install Python dependencies in stages
COPY requirements.txt .

# Upgrade pip and install basic build requirements
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir wheel setuptools Cython

# Install numpy first as it's required by many scientific packages
RUN pip install --no-cache-dir numpy==1.24.3

# Install the rest of the requirements
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create cache directory
RUN mkdir -p backend/temp/tts_cache

# Expose port
EXPOSE 8000

# Run the application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
