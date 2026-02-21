from pydantic import BaseModel
from typing import List, Dict, Optional, Any

class PersonalInfoModel(BaseModel):
    email: Optional[str] = None
    phone: Optional[str] = None

class MessageModel(BaseModel):
    role: str
    content: str

class InterviewRequest(BaseModel):
    personal_info: Optional[PersonalInfoModel] = None
    skills: Optional[List[str]] = []
    education: Optional[List[str]] = []
    experience: Optional[List[str]] = []
    projects: Optional[List[str]] = []
    jd: str
    history: Optional[List[MessageModel]] = []
