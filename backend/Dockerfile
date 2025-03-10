# Force Python 3.11 (not slim to avoid missing dependencies)
FROM python:3.11-bullseye  

# Set working directory
WORKDIR /app  

# Install missing dependencies (including distutils)
RUN apt-get update && apt-get install -y \
    python3.11 \
    python3.11-venv \
    python3.11-distutils \
    python3.11-dev \
    build-essential \
    ffmpeg \
    libasound2 \
    libasound2-dev \
    espeak-ng \
    && apt-get clean && rm -rf /var/lib/apt/lists/*  

# Ensure correct Python version is used
RUN update-alternatives --install /usr/bin/python3 python3 /usr/bin/python3.11 1

# Ensure pip is upgraded and has setuptools
RUN python3 -m pip install --upgrade pip setuptools wheel  

# Copy requirements
COPY requirements.txt .  

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt  

# Copy application files
COPY . .  

# Expose port
EXPOSE 8000  

# Start command
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]  
