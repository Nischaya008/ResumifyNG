import pdfplumber
from pdf2image import convert_from_path
import pytesseract
from PIL import Image
import docx
import pypandoc
import os
from typing import List, Dict, Any, Union
import logging
from config import settings

logger = logging.getLogger("backend")

class OCRService:
    @staticmethod
    def normalize_bbox(bbox, width, height):
        # Normalize bbox to 0-1000 scale
        x0, y0, x1, y1 = bbox
        return [
            int(x0 / width * 1000),
            int(y0 / height * 1000),
            int(x1 / width * 1000),
            int(y1 / height * 1000)
        ]

    @staticmethod
    async def process_pdf(filepath: str) -> Dict[str, Any]:
        pages_data = []
        try:
            # 1. Extract text + layout with pdfplumber
            with pdfplumber.open(filepath) as pdf:
                for i, page in enumerate(pdf.pages):
                    width, height = page.width, page.height
                    text = page.extract_text()
                    
                    # Get words with bboxes
                    words = page.extract_words()
                    
                    # Convert page to image for AI models later
                    # We might need to save this or return base64, 
                    # for now let's keep the path or in-memory object logic in mind
                    # For LayoutLMv3, we need the image.
                    
                    # Render page to image
                    # Note: pdf2image requires poppler installed
                    images = convert_from_path(filepath, first_page=i+1, last_page=i+1)
                    page_image = images[0]
                    
                    # Normalize text blocks
                    normalized_words = []
                    for w in words:
                        bbox = (w['x0'], w['top'], w['x1'], w['bottom'])
                        norm_bbox = OCRService.normalize_bbox(bbox, width, height)
                        normalized_words.append({
                            "text": w['text'],
                            "bbox": norm_bbox
                        })
                    
                    pages_data.append({
                        "page_num": i + 1,
                        "width": width,
                        "height": height,
                        "text": text,
                        "words": normalized_words,
                        "image": page_image # Keep PIL image in memory for next step
                    })
                    
            return {"pages": pages_data, "type": "pdf"}
            
        except Exception as e:
            logger.error(f"Error processing PDF: {e}")
            raise e

    @staticmethod
    async def process_docx(filepath: str) -> Dict[str, Any]:
        try:
            doc = docx.Document(filepath)
            full_text = []
            for para in doc.paragraphs:
                full_text.append(para.text)
            
            return {
                "pages": [{
                    "text": "\n".join(full_text),
                    "words": [], # DOCX doesn't have layout info easily
                    "image": None 
                }],
                "type": "docx"
            }
        except Exception as e:
             logger.error(f"Error processing DOCX: {e}")
             raise e

    @staticmethod
    async def process_tex(filepath: str) -> Dict[str, Any]:
        try:
            # Requires pandoc installed on system
            text = pypandoc.convert_file(filepath, 'plain')
            return {
                "pages": [{
                    "text": text,
                    "words": [],
                    "image": None
                }],
                "type": "tex"
            }
        except Exception as e:
             logger.error(f"Error processing TeX: {e}")
             raise e

    @staticmethod
    async def parse_document(filepath: str) -> Dict[str, Any]:
        ext = os.path.splitext(filepath)[1].lower()
        if ext == '.pdf':
            return await OCRService.process_pdf(filepath)
        elif ext == '.docx':
            return await OCRService.process_docx(filepath)
        elif ext == '.tex':
            return await OCRService.process_tex(filepath)
        else:
            raise ValueError(f"Unsupported format: {ext}")
