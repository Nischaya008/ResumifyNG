import logging
import json
from config import settings
from typing import Dict, Any
from huggingface_hub import AsyncInferenceClient

logger = logging.getLogger("backend")

class ResumeParserService:
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(ResumeParserService, cls).__new__(cls)
            cls._instance.client = None
            if settings.HF_API_TOKEN:
                cls._instance.client = AsyncInferenceClient(model=settings.LLM_MODEL, token=settings.HF_API_TOKEN)
            else:
                logger.warning("HF_API_TOKEN not found. LLM Parsing disabled.")
        return cls._instance

    async def parse_resume(self, text: str) -> Dict[str, Any]:
        """
        Takes raw text extracted from a resume and returns a strictly formatted JSON dict.
        """
        if not self.client:
            logger.error("LLM Client not initialized. Returning empty dict.")
            return {}

        prompt = f"""You are an expert resume parser. Extract the following information from the resume text into a strict JSON object. Do not output anything other than the JSON object.

CRITICAL INSTRUCTIONS:
1. "skills": Extract EVERY technical skill mentioned anywhere in the resume (languages, frameworks, databases, tools, cloud platforms, concepts like REST APIs, etc.). Pay special attention to the "Technical Skills" section and extract all items perfectly.
2. "experience": Extract ONLY the candidate's actual work history or job roles. DO NOT include the "Professional Summary" or "Objective" in the experience section.

Required JSON Schema:
{{
  "personal_info": {{
    "email": "string or null",
    "phone": "string or null"
  }},
  "skills": ["string", "string"],
  "education": ["string", "string"],
  "experience": ["string", "string"],
  "projects": ["string", "string"]
}}

Resume Text:
{text}
"""
        try:
            response = await self.client.chat_completion(
                messages=[{"role": "user", "content": prompt}],
                max_tokens=2048,
                temperature=0.1
            )
            
            content = response.choices[0].message.content.strip()
            
            # Clean up potential markdown formatting like ```json ... ```
            if content.startswith("```json"):
                content = content[7:]
            elif content.startswith("```"):
                content = content[3:]
                
            if content.endswith("```"):
                content = content[:-3]
            
            parsed_data = json.loads(content.strip())
            return parsed_data
            
        except json.JSONDecodeError as decode_err:
            logger.error(f"Failed to decode JSON from LLM: {decode_err}\nContent received: {content}")
            return {}
        except Exception as e:
            logger.error(f"LLM Parsing error: {e}")
            return {}

parser_service = ResumeParserService()
