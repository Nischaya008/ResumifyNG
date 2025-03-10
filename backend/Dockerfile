# Use Python 3.11
FROM python:3.11-bullseye

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    ffmpeg \
    libasound2 \
    libasound2-dev \
    espeak-ng \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Copy everything at once
COPY . .

# Upgrade pip and install build tools
RUN pip install --no-cache-dir --upgrade pip setuptools wheel

# Verify requirements.txt exists and install dependencies
RUN ls -la && \
    pip install --no-cache-dir -r requirements.txt

# Expose port
EXPOSE 8000

# Start command
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
