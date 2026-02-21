import logging
from typing import Dict, Any
from utils.nlp import normalize_skills

logger = logging.getLogger("backend")

class StructurerService:
    @staticmethod
    def structure_resume(llm_parsed_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Takes the raw JSON output from the LLM parser and applies normalization.
        """
        sections = llm_parsed_data.copy()
        
        # Ensure we have the basic schema keys
        for key in ["personal_info", "skills", "education", "experience", "projects"]:
            if key not in sections:
                if key == "personal_info":
                    sections[key] = {"email": None, "phone": None}
                else:
                    sections[key] = []
        
        if sections.get("skills"):
            sections["skills"] = normalize_skills(sections["skills"])
            
        return sections

structurer_service = StructurerService()
