import shutil
import os
import uuid
from fastapi import UploadFile, HTTPException
from config import settings
import logging

logger = logging.getLogger("backend")

class IngestService:
    @staticmethod
    async def validate_file(file: UploadFile):
        # Check file extension
        ext = os.path.splitext(file.filename)[1].lower()
        if ext not in settings.ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=400, 
                detail=f"Invalid file type. Allowed types: {settings.ALLOWED_EXTENSIONS}"
            )
        
        # Check file size (approximate, as we stream)
        # Real validation happens during read if we want to be strict, 
        # but for now we'll check content-length header if available
        if file.size and file.size > settings.MAX_UPLOAD_SIZE:
             raise HTTPException(
                status_code=400, 
                detail=f"File too large. Max size: {settings.MAX_UPLOAD_SIZE / (1024*1024)}MB"
            )
        return True

    @staticmethod
    async def save_temp(file: UploadFile) -> str:
        # Generate unique filename
        ext = os.path.splitext(file.filename)[1].lower()
        filename = f"{uuid.uuid4()}{ext}"
        filepath = os.path.join(settings.UPLOAD_DIR, filename)
        
        try:
            with open(filepath, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            logger.info(f"File saved to {filepath}")
            return filepath
        except Exception as e:
            logger.error(f"Error saving file: {e}")
            raise HTTPException(status_code=500, detail="Failed to save file")
