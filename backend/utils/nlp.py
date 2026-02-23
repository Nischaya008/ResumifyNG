import re
from typing import List, Set

def normalize_skills(skills: List[str]) -> List[str]:
    """
    Normalizes and deduplicates skills from the parser output.
    Preserves skills for downstream ATS matching (case-insensitive dedup).
    """
    if not skills:
        return []
    seen: Set[str] = set()
    result: List[str] = []
    for s in (str(s).strip() for s in skills if s):
        lower = s.lower()
        if lower and lower not in seen:
            seen.add(lower)
            result.append(s.strip())
    return result

def extract_jd_skills(jd_text: str) -> List[str]:
    """
    Deprecated: Skill extraction is now handled dynamically by the LLM 
    to properly understand context and 'OR' requirements.
    """
    return []

def extract_jd_responsibilities(jd_text: str) -> str:
    """
    Extracts the core text representing responsibilities/experience requirements
    from the JD.
    """
    # For now, return the whole text but strip out metadata at the top/bottom if possible.
    # A more advanced version would use regex to find the "Responsibilities" section.
    return jd_text

def extract_role_intent(jd_text: str) -> str:
    """
    Attempts to extract the job title or role intent from the JD text.
    It looks at the first few lines of the text.
    """
    lines = [L.strip() for L in jd_text.split('\n') if L.strip()]
    if not lines:
        return ""
        
    # Heuristic: The title is often in the first 3 lines, short, and doesn't end with a period.
    for line in lines[:3]:
        if len(line.split()) <= 6 and not line.endswith('.'):
            return line
            
    return lines[0] if lines else ""
