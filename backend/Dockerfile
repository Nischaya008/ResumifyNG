# Use a non-slim image to avoid missing dependencies
FROM python:3.11-bullseye  

# Set working directory
WORKDIR /app  

# Install system dependencies including distutils
RUN apt-get update && apt-get install -y \
    python3-distutils \
    python3-venv \
    python3-dev \
    build-essential \
    ffmpeg \
    libasound2 \
    libasound2-dev \
    espeak-ng \
    && apt-get clean && rm -rf /var/lib/apt/lists/*  

# Ensure pip is upgraded and has setuptools
RUN python -m pip install --upgrade pip setuptools wheel  

# Copy requirements first to cache dependencies
COPY requirements.txt .  

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt  

# Copy application files
COPY . .  

# Ensure correct permissions for execution
RUN chmod +x ./start.sh  

# Expose application port
EXPOSE 8000  

# Start command
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]  
