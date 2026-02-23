import logging
import json
from config import settings
from typing import Dict, Any
from utils.nlp import extract_jd_skills
from huggingface_hub import AsyncInferenceClient

logger = logging.getLogger("backend")

SCORING_WEIGHTS = {
    "skill_match": 0.40,
    "experience_relevance": 0.25,
    "role_alignment": 0.15,
    "education_match": 0.10,
    "recency_continuity": 0.10
}

MISSING_SKILL_PENALTY = 7        # per mandatory skill
JOB_TITLE_MISMATCH_PENALTY = 15

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
        Extracts skill-like terms for quick reference, though LLM handles deeper analysis.
        """
        skills = extract_jd_skills(jd_text)
        return {
            "text": jd_text,
            "extracted_skills": skills,
            "responsibilities": jd_text,
            "role_intent": jd_text[:100]
        }

    async def calculate_score(self, resume_data: Dict[str, Any], jd_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Uses an LLM to evaluate the resume against the JD and return a strict JSON scoring object.
        """
        if not self.client:
           logger.error("LLM Client not initialized. Returning default score.")
           return self._default_score()
           
        jd_text = jd_data.get('text', '')
        resume_json_str = json.dumps(resume_data, indent=2)

        prompt = f"""You are an expert ATS (Applicant Tracking System). Evaluate the following resume against the job description.
DO NOT decide the final ATS score.
Only evaluate evidence and assign 0-100 scores per category in "breakdown".
Output a strict JSON object with your analysis. Do not output anything other than JSON.

CRITICAL INSTRUCTIONS:
1. Job Title Extraction: Identify the exact job title from the JD (e.g. "Full Stack Developer Intern"). Focus ONLY on the actual role name. Do NOT output generic headers like "Job Title" or "Location". MUST be a non-empty string. It must be strictly included in the JSON.
2. Skill Matching: Perform a case-insensitive semantic match. Evaluate strictly against the required technologies in the JD.
3. Missing Skills & Weak Areas: ONLY output exact technical skill names (1-3 words max, e.g., "AWS", "React", "REST APIs", "SQL"). DO NOT output full sentences, descriptive phrases, or soft skills like "Basic knowledge of...". A skill CANNOT be in both matched and missing.
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
                return self._default_score()
            
            if "job_title" not in score_data or not score_data["job_title"] or score_data["job_title"].lower() == "string" or score_data["job_title"].lower() == "job title":
                score_data["job_title"] = "Unknown Target"
                
            # Deterministic Post-Processing for Matched/Missing Contradictions
            jd_skills = {s.lower() for s in jd_data.get("extracted_skills", [])}
            resume_skills = {s.lower() for s in resume_data.get("skills", [])}
            
            if "matched_skills" in score_data:
                score_data["matched_skills"] = list({s.lower() for s in score_data["matched_skills"]})
            else:
                score_data["matched_skills"] = []
                
            if "missing_skills" in score_data:
                matched_set = set(score_data["matched_skills"])
                missing_clean = []
                for s in score_data["missing_skills"]:
                    s_lower = s.lower()
                    # If it's explicitly in resume skills but LLM missed it or marked it missing, fix it.
                    # Or if another LLM hallucination put it in matched_set
                    if s_lower not in matched_set and s_lower not in resume_skills:
                        missing_clean.append(s_lower)
                    elif s_lower in resume_skills and s_lower not in matched_set:
                        # Auto-correct the LLM mistake!
                        score_data["matched_skills"].append(s_lower)
                        matched_set.add(s_lower)
                        
                score_data["missing_skills"] = list(set(missing_clean))

            # --- NUMERICAL SCORING OVERRIDE ---
            
            # 1. Normalize breakdown
            breakdown = score_data.get("breakdown", {})
            for k in SCORING_WEIGHTS:
                breakdown[k] = float(breakdown.get(k, 0))
                breakdown[k] = max(0, min(100, breakdown[k]))
                
            # 2. Recompute skill score based on ground truth jd_skills
            total_required = len(jd_skills) or 1
            matched_count = len(set(score_data["matched_skills"]) & jd_skills)
            missing_count = len(jd_skills - set(score_data["matched_skills"]))
            
            skill_match_score = (matched_count / total_required) * 100
            skill_penalty = missing_count * MISSING_SKILL_PENALTY
            skill_match_score = max(0, skill_match_score - skill_penalty)
            
            breakdown["skill_match"] = skill_match_score
            score_data["breakdown"] = breakdown
            
            # 3. Job Title Penalty
            jd_title_str = score_data.get("job_title", "").lower()
            resume_title_str = resume_data.get("job_title", "").lower()
            
            title_penalty = 0
            if jd_title_str and resume_title_str and jd_title_str not in resume_title_str:
                title_penalty = JOB_TITLE_MISMATCH_PENALTY
                
            # 4. Compute Final Score
            final_score = 0
            for k, w in SCORING_WEIGHTS.items():
                final_score += breakdown[k] * w
                
            final_score -= title_penalty
            
            # 5. Realistic bands cap
            if final_score > 85 and missing_count > 0:
                final_score = 78.0
                
            final_score = round(max(0, min(100, final_score)), 1)
            score_data["ats_score"] = final_score
                
            if "strong_matches" in score_data:
                score_data["strong_matches"] = list({s.lower() for s in score_data["strong_matches"]})
            if "weak_areas" in score_data:
                score_data["weak_areas"] = list({s.lower() for s in score_data["weak_areas"]})
                
            return score_data
            
        except json.JSONDecodeError as decode_err:
            logger.error(f"Failed to decode ATS JSON from LLM: {decode_err}\nContent received: {content}")
            return self._default_score()
        except Exception as e:
            logger.error(f"LLM ATS Scoring error: {e}")
            return self._default_score()
            
    def _default_score(self) -> Dict[str, Any]:
        return {
            "job_title": "Unknown Target",
            "ats_score": 0.0,
            "matched_skills": [],
            "missing_skills": [],
            "strong_matches": [],
            "weak_areas": ["LLM Scoring Unavailable"],
            "breakdown": {
                "skill_match": 0.0,
                "experience_relevance": 0.0,
                "role_alignment": 0.0,
                "education_match": 0.0,
                "recency_continuity": 0.0
            }
        }

ats_service = ATSService()
