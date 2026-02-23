import re
from typing import List, Set

def normalize_skills(skills: List[str]) -> List[str]:
    """
    Normalizes a list of skills by:
    1. Lowercasing
    2. Removing category prefixes (e.g., "Languages:", "Frameworks:")
    3. Splitting composite tokens (e.g., "PostgreSQL, MongoDB")
    4. Deduplicating and removing empty strings
    """
    normalized: Set[str] = set()
    
    for skill in skills:
        if not isinstance(skill, str):
            continue
            
        # 1. Lowercase and remove parenthetical text
        s = skill.lower()
        s = re.sub(r'\(.*?\)', '', s)
        
        # 2. Remove category prefixes (anything before and including ':')
        if ':' in s:
            s = s.split(':', 1)[1]
            
        # 3. Split by commas, pipes, or bullet points
        tokens = re.split(r'[,;*|•]| (?:and|or) ', s)
        
        # 4. Clean and add to set
        for token in tokens:
            cleaned = token.strip()
            # Strip trailing/leading punctuation
            cleaned = re.sub(r'^[^a-z0-9+#]+|[^a-z0-9+#]+$', '', cleaned)
            if len(cleaned) > 1 or cleaned in ['c', 'r', 'go']:
                normalized.add(cleaned)
                    
    return list(normalized)

def extract_jd_skills(jd_text: str) -> List[str]:
    """
    Extracts skill-like terms from Job Description text, 
    filtering out section headers and prose.
    """
    text = jd_text.lower()
    
    # Pre-process: remove parentheses contents entirely BEFORE splitting to avoid broken phrases
    text = re.sub(r'\(.*?\)', '', text)
    
    # 1. Remove common section headers
    headers_to_remove = [
        r"job description", r"what you'll do", r"what you will do", 
        r"what you will gain", r"who you are", r"responsibilities", 
        r"requirements", r"qualifications", r"preferred qualifications",
        r"about the role", r"job type", r"benefits", r"about us",
        r"required skills", r"basic qualifications", r"education", r"soft skills",
        r"location", r"duration"
    ]
    for header in headers_to_remove:
        text = re.sub(rf"\b{header}\b[:\n]?", " ", text)
        
    # 2. Split by newlines, bullets, and commas
    lines = re.split(r'[\n,•;*:]', text)
    
    skills = set()
    
    stop_words = {
        'experience', 'knowledge', 'familiarity', 'understanding', 'ability', 'working', 
        'using', 'strong', 'good', 'excellent', 'years', 'degree', 'time', 'role', 
        'exposure', 'environment', 'team', 'development', 'project', 'opportunity',
        'convert', 'performance', 'mentorship', 'engineers', 'build', 'integrate',
        'work', 'design', 'query', 'manage', 'collaborate', 'debug', 'test', 'optimize',
        'participate', 'pursuing', 'attention', 'detail', 'skills', 'hands-on', 'industry-standard',
        'workflows', 'life cycle', 'bachelor', 'master', 'computer', 'science', 'field',
        'communication', 'oriented', 'willingness', 'learn', 'technologies', 'quickly', 'management',
        'task', 'prioritization', 'applications', 'practices'
    }
    
    for line in lines:
        line = line.strip()
        
        if not line or len(line) > 50:
            continue
            
        words = line.split()
        if len(words) > 3:
            continue
            
        has_stop = any(w in stop_words for w in words)
        
        # Skip if it has a stop word, or starts with a common non-skill article/preposition
        if has_stop or words[0] in ('a', 'an', 'the', 'this', 'we', 'you', 'or', 'and', 'with', 'in', 'on', 'to', 'for'):
            continue
            
        if line and len(line) >= 2:
            skills.add(line)
            
    return normalize_skills(list(skills))

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
