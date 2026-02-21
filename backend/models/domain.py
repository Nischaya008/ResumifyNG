from pydantic import BaseModel, Field
from typing import List, Dict, Optional

class ResumeParsingResult(BaseModel):
    files: List[str]
    # Add more fields later

class JobDescription(BaseModel):
    text: str
    role_intent: Optional[str] = None

class AnalysisResult(BaseModel):
    ats_score: float
    matched_skills: List[str]
    missing_skills: List[str]
    strong_matches: List[str]
    weak_areas: List[str]
    breakdown: Dict[str, float]
