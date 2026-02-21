from fastapi import APIRouter, UploadFile, File, HTTPException, Form
from fastapi.responses import StreamingResponse
from services.ingest import IngestService
from services.ocr import OCRService
from services.parser import parser_service
from services.structurer import structurer_service
from services.ats import ats_service
from services.interview import interview_service
from models.domain import JobDescription, ResumeParsingResult
from models.interview import InterviewRequest
from api.payment import router as payment_router
import os
import json

router = APIRouter()
router.include_router(payment_router, prefix="/payment", tags=["Payment"])


@router.get("/health")
async def health_check():
    return {"status": "ok"}

@router.post("/upload-resume")
async def upload_resume(file: UploadFile = File(...)):
    await IngestService.validate_file(file)
    filepath = await IngestService.save_temp(file)
    return {"filename": file.filename, "filepath": filepath, "message": "File uploaded successfully"}

@router.post("/parse-resume")
async def parse_resume(file: UploadFile = File(...)):
    # 1. Ingest
    await IngestService.validate_file(file)
    filepath = await IngestService.save_temp(file)
    
    try:
        # 2. OCR & Normalization
        doc_data = await OCRService.parse_document(filepath)
        
        # 3. AI Parsing (LLM)
        full_text = "\n".join([page.get('text', '') for page in doc_data['pages']])
        parsed_data = await parser_service.parse_resume(full_text)
            
        # 4. Structuring
        structured_data = structurer_service.structure_resume(parsed_data)
        
        return structured_data
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        # Cleanup temp file
        if os.path.exists(filepath):
            os.remove(filepath)

@router.post("/ats-score")
async def ats_score(data: dict):
    # Expects { "resume_data": {...}, "jd_text": "..." }
    resume_data = data.get("resume_data")
    jd_text = data.get("jd_text")
    
    if not resume_data or not jd_text:
        raise HTTPException(status_code=400, detail="Missing resume_data or jd_text")
        
    jd_data = ats_service.process_jd(jd_text)
    result = await ats_service.calculate_score(resume_data, jd_data)
    
    return result

@router.post("/full-analysis")
async def full_analysis(file: UploadFile = File(...), jd: str = Form(...)):
    # 1. Parse Resume
    await IngestService.validate_file(file)
    filepath = await IngestService.save_temp(file)
    
    try:
        doc_data = await OCRService.parse_document(filepath)
        
        full_text = "\n".join([page.get('text', '') for page in doc_data['pages']])
        parsed_data = await parser_service.parse_resume(full_text)
        resume_data = structurer_service.structure_resume(parsed_data)
        
        # 2. Process JD
        jd_data = ats_service.process_jd(jd)
        
        # 3. ATS Score
        ats_result = await ats_service.calculate_score(resume_data, jd_data)
        
        return {
            "parsed_resume": resume_data,
            "ats_analysis": ats_result
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
         if os.path.exists(filepath):
            os.remove(filepath)

@router.post("/interview")
async def conduct_interview(request: InterviewRequest):
    try:
        # Instead of returning a JSON dict, we return a StreamingResponse
        # the generator will yield the content chunks
        return StreamingResponse(
            interview_service.generate_response_stream(request), 
            media_type="text/event-stream"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
