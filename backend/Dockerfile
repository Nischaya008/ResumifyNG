FROM python:3.10-slim

# Install system dependencies for OCR and PDF processing
# tesseract-ocr: for image text extraction
# poppler-utils: for pdf2image
# pandoc: for .tex conversion
RUN apt-get update && apt-get install -y \
    tesseract-ocr \
    poppler-utils \
    pandoc \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Expose API port
EXPOSE 8000

# Run the application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
