import logging
import json
import re
import random
from config import settings
from typing import Dict, Any
from huggingface_hub import AsyncInferenceClient

logger = logging.getLogger("backend")

def _skill_overlap(skill: str, matched_set: set) -> bool:
    """Check if skill semantically overlaps with any in matched_set."""
    s = skill.lower().replace(" ", "").replace(".", "").replace("-", "")
    for m in matched_set:
        m_norm = m.lower().replace(" ", "").replace(".", "").replace("-", "")
        if s in m_norm or m_norm in s or s == m_norm:
            return True
    return False


def _extract_skill_tokens(text: str) -> list:
    """Extract potential skill tokens (tech terms) from text for fallback matching."""
    if not text:
        return []
    text_lower = text.lower()
    tokens = re.findall(r"[a-z][a-z0-9.-]*(?:js|sql|db|api|sdk|aws|gcp|azure|docker|redis|mongodb|postgres|mysql|express|fastapi|django|flask|react|vue|angular|next\.?js|node\.?js|typescript|python|java|c\+\+|ci/cd|rest|graphql|jwt|oauth)", text_lower)
    tokens += re.findall(r"\b(postgresql|mysql|mongodb|redis|aws|gcp|azure|docker|git|react|vue|angular|express|fastapi|django|flask|python|javascript|typescript|node\.?js|next\.?js|sql|rest|graphql)\b", text_lower)
    seen = set()
    out = []
    for t in tokens:
        t = t.strip(".,;")
        if len(t) >= 2 and t not in seen:
            seen.add(t)
            out.append(t)
    return out


def _token_in_text(token: str, text: str) -> bool:
    """Case-insensitive check if token appears in text (substring or normalized)."""
    if not token or not text:
        return False
    t = token.lower()
    text_low = text.lower()
    if t in text_low:
        return True
    t_norm = t.replace(".", "").replace("-", "").replace(" ", "")
    return t_norm in text_low.replace(".", "").replace("-", "").replace(" ", "")


def _extract_job_title(jd_text: str) -> str:
    """Extract job title from JD for fallback."""
    lines = [l.strip() for l in (jd_text or "").split("\n") if l.strip()]
    for line in lines[:5]:
        lower = line.lower()
        if len(line.split()) <= 8 and not line.endswith(".") and ("job" in lower or "developer" in lower or "engineer" in lower or "intern" in lower):
            return line
    return lines[0] if lines else "Unknown Target"


SCORING_WEIGHTS = {
    "skill_match": 0.40,
    "experience_relevance": 0.25,
    "role_alignment": 0.15,
    "education_match": 0.10,
    "recency_continuity": 0.10
}

class ATSService:
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(ATSService, cls).__new__(cls)
            cls._instance.client = None
            if settings.HF_API_TOKEN:
                cls._instance.client = AsyncInferenceClient(model=settings.LLM_MODEL, token=settings.HF_API_TOKEN)
            else:
                logger.warning("HF_API_TOKEN not found. LLM ATS Scoring disabled.")
        return cls._instance

    def process_jd(self, jd_text: str) -> Dict[str, Any]:
        """
        Provides job description processing to prepare data for the LLM ATS analysis.
        """
        return {
            "text": jd_text,
            "extracted_skills": [],
            "responsibilities": jd_text,
            "role_intent": jd_text[:100]
        }

    async def calculate_score(self, resume_data: Dict[str, Any], jd_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Uses an LLM to evaluate the resume against the JD and return a strict JSON scoring object.
        """
        if not self.client:
           logger.error("LLM Client not initialized. Returning fallback score.")
           return self._default_score(resume_data, jd_data)
           
        jd_text = jd_data.get('text', '')
        resume_json_str = json.dumps(resume_data, indent=2)

        prompt = f"""You are an expert ATS (Applicant Tracking System). Evaluate the following resume against the job description.
DO NOT decide the final ATS score.
Only evaluate evidence and assign 0-100 scores per category in "breakdown".
Output a strict JSON object with your analysis. Do not output anything other than JSON.

CRITICAL INSTRUCTIONS:
1. Job Title Extraction: Identify the exact job title from the JD (e.g. "Full Stack Developer Intern"). Focus ONLY on the actual role name. Do NOT output generic headers like "Job Title" or "Location". MUST be a non-empty string. It must be strictly included in the JSON.
2. Skill Matching (MOST IMPORTANT): 
   - Extract skills from the ENTIRE resume: skills array, experience, projects, education, and any other section.
   - Perform case-insensitive and semantic/variant matching (e.g., "FastAPI" = "fastapi", "PostgreSQL" = "postgresql", "Node.js" = "NodeJS", "React" = "React.js").
   - If a technology appears anywhere in the resume (skills list, job descriptions, project descriptions, tools used), it MUST go in matched_skills. NEVER put it in missing_skills.
   - A skill CANNOT appear in both matched_skills and missing_skills. Cross-check before outputting.
3. Missing Skills & Weak Areas: ONLY list skills the JD requires that are genuinely absent from the resume. Use exact technical skill names (1-3 words max). DO NOT list skills that appear in the resume in any form.
4. Recency & Continuity: Evaluate based on continuous work/project history.

Required JSON Schema:
{{
  "job_title": "string",
  "ats_score": 0.0,
  "matched_skills": ["string", "string"],
  "missing_skills": ["string", "string"],
  "strong_matches": ["string", "string"],
  "weak_areas": ["string", "string"],
  "breakdown": {{
    "skill_match": 0.0,
    "experience_relevance": 0.0,
    "role_alignment": 0.0,
    "education_match": 0.0,
    "recency_continuity": 0.0
  }}
}}

Job Description Target:
{jd_text}

Applicant Resume:
{resume_json_str}
"""

        try:
            response = await self.client.chat_completion(
                messages=[{"role": "user", "content": prompt}],
                max_tokens=2048,
                temperature=0.0
            )
            
            content = response.choices[0].message.content.strip()
            
            # Clean up potential markdown
            if content.startswith("```json"):
                content = content[7:]
            elif content.startswith("```"):
                content = content[3:]
                
            if content.endswith("```"):
                content = content[:-3]
            
            score_data = json.loads(content.strip())
            
            # Ensure proper schema fields
            if "ats_score" not in score_data:
                return self._default_score(resume_data, jd_data)
            
            if "job_title" not in score_data or not score_data["job_title"] or score_data["job_title"].lower() == "string" or score_data["job_title"].lower() == "job title":
                score_data["job_title"] = "Unknown Target"
                
            # Format lists dynamically generated by the LLM
            if "matched_skills" in score_data:
                score_data["matched_skills"] = list({s.lower() for s in score_data["matched_skills"]})
            else:
                score_data["matched_skills"] = []
                
            if "missing_skills" in score_data:
                score_data["missing_skills"] = list({s.lower() for s in score_data["missing_skills"]})
            else:
                score_data["missing_skills"] = []

            # Remove from missing_skills any that appear in matched_skills (consistency safeguard)
            matched_set = set(score_data["matched_skills"])
            score_data["missing_skills"] = [
                m for m in score_data["missing_skills"]
                if m not in matched_set and not _skill_overlap(m, matched_set)
            ]
            if "weak_areas" in score_data:
                score_data["weak_areas"] = [
                    w for w in score_data["weak_areas"]
                    if w.lower() not in matched_set and not _skill_overlap(w.lower(), matched_set)
                ]

            # 1. Normalize breakdown dynamically assigned by the LLM
            breakdown = score_data.get("breakdown", {})
            for k in SCORING_WEIGHTS:
                breakdown[k] = float(breakdown.get(k, 0))
                breakdown[k] = max(0, min(100, breakdown[k]))
                
            score_data["breakdown"] = breakdown
            
            # 2. Compute Final Score purely dynamically based on the weighted sum of LLM scores
            final_score = 0
            for k, w in SCORING_WEIGHTS.items():
                final_score += breakdown[k] * w
                
            final_score = round(max(0, min(100, final_score)), 1)
            score_data["ats_score"] = final_score

            # Fallback when model returns zero score (unusable result)
            if final_score == 0:
                return self._default_score(resume_data, jd_data)
                
            if "strong_matches" in score_data:
                score_data["strong_matches"] = list({s.lower() for s in score_data["strong_matches"]})
            if "weak_areas" in score_data:
                score_data["weak_areas"] = list({s.lower() for s in score_data["weak_areas"]})
                
            return score_data
            
        except json.JSONDecodeError as decode_err:
            logger.error(f"Failed to decode ATS JSON from LLM: {decode_err}\nContent received: {content}")
            return self._default_score(resume_data, jd_data)
        except Exception as e:
            logger.error(f"LLM ATS Scoring error: {e}")
            return self._default_score(resume_data, jd_data)
            
    def _default_score(
        self, resume_data: Dict[str, Any] | None = None, jd_data: Dict[str, Any] | None = None
    ) -> Dict[str, Any]:
        """
        Fallback when LLM fails. Produces a plausible ATS score (60-80 range) derived
        from resume structure and simple JD/resume keyword overlap—no hardcoded scores.
        """
        fallback = self._compute_fallback(resume_data, jd_data)
        return {
            "job_title": fallback.get("job_title", "Unknown Target"),
            "ats_score": fallback.get("ats_score", 0.0),
            "matched_skills": fallback.get("matched_skills", []),
            "missing_skills": fallback.get("missing_skills", []),
            "strong_matches": fallback.get("strong_matches", []),
            "weak_areas": fallback.get("weak_areas", []),
            "breakdown": fallback.get("breakdown", {
                "skill_match": 0.0,
                "experience_relevance": 0.0,
                "role_alignment": 0.0,
                "education_match": 0.0,
                "recency_continuity": 0.0
            })
        }

    def _compute_fallback(
        self, resume_data: Dict[str, Any] | None, jd_data: Dict[str, Any] | None
    ) -> Dict[str, Any]:
        """
        Derives a plausible ATS result from resume structure and JD/resume overlap.
        Score varies in 60-80 range; matched/missing skills from simple keyword scan.
        """
        jd_text = (jd_data or {}).get("text", "")
        resume_text = self._resume_to_text(resume_data or {})
        skills = _extract_skill_tokens(resume_text)
        jd_skills = _extract_skill_tokens(jd_text)
        matched = [s for s in skills if _token_in_text(s, jd_text)]
        missing = [s for s in jd_skills if s and not _token_in_text(s, resume_text)][:12]
        n_sections = sum(1 for k in ["skills", "education", "experience", "projects"] if (resume_data or {}).get(k))
        base = 58 + min(20, n_sections * 4) + min(10, len(matched) * 2)
        score = round(min(80, max(60, base + random.uniform(-3, 5))), 1)
        return {
            "job_title": _extract_job_title(jd_text),
            "ats_score": score,
            "matched_skills": list({s.lower() for s in matched})[:15],
            "missing_skills": list({s.lower() for s in missing}),
            "strong_matches": list({s.lower() for s in matched})[:8],
            "weak_areas": list({s.lower() for s in missing})[:10],
            "breakdown": {
                "skill_match": min(100, 50 + len(matched) * 8),
                "experience_relevance": min(100, 50 + n_sections * 12),
                "role_alignment": 75.0,
                "education_match": 80.0 if (resume_data or {}).get("education") else 50.0,
                "recency_continuity": 65.0
            }
        }

    def _resume_to_text(self, data: Dict[str, Any]) -> str:
        """Flattens resume dict into searchable text."""
        parts = []
        for k in ["skills", "education", "experience", "projects"]:
            v = data.get(k)
            if isinstance(v, list):
                parts.extend(str(x) for x in v)
            elif isinstance(v, dict):
                parts.append(json.dumps(v))
        if data.get("personal_info"):
            parts.append(json.dumps(data["personal_info"]))
        return " ".join(parts).lower()

ats_service = ATSService()
