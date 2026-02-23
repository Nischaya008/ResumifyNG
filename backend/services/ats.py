import logging
import json
import re
from config import settings
from typing import Dict, Any, Set
from utils.nlp import extract_jd_skills, parse_jd_structured, canonicalize_skills
from huggingface_hub import AsyncInferenceClient

logger = logging.getLogger("backend")

SCORING_WEIGHTS = {
    "skill_match": 0.55,
    "experience_relevance": 0.15,
    "role_alignment": 0.15,
    "education_match": 0.05,
    "recency_continuity": 0.10
}

MISSING_SKILL_PENALTY = 3  # per mandatory *requirement* (OR group or standalone)
JOB_TITLE_MISMATCH_PENALTY = 7


def _role_title_keywords(title: str) -> Set[str]:
    """Extract role-related keywords for semantic containment (e.g. full-stack, developer, intern)."""
    if not title:
        return set()
    t = re.sub(r"[^\w\s]", " ", title.lower())
    tokens = set(t.split())
    # Normalize common variants
    if "full" in tokens and "stack" in tokens:
        tokens.add("fullstack")
        tokens.add("full-stack")
    if "fullstack" in tokens or "full-stack" in tokens:
        tokens.update(("full", "stack"))
    return tokens


def _title_semantic_match(jd_title: str, resume_title: str, resume_data: Dict[str, Any]) -> bool:
    """
    True if resume is semantically aligned with JD title (containment).
    E.g. 'Full-Stack Developer Intern' aligns with 'Software Engineer (Backend / Full-Stack)'.
    """
    jd_kw = _role_title_keywords(jd_title)
    resume_kw = _role_title_keywords(resume_title)
    if not jd_kw:
        return True
    # Resume summary or role often contains the JD title intent
    summary = (resume_data.get("summary") or resume_data.get("professional_summary") or "")
    summary_kw = _role_title_keywords(summary)
    resume_kw |= summary_kw
    # Any JD keyword present in resume context => match
    return bool(jd_kw & resume_kw)


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
        Parses JD into structured required/optional/OR groups and flat skill list.
        """
        structured = parse_jd_structured(jd_text)
        all_skills = list(structured["all_required_canonical"] | structured["all_optional_canonical"])
        return {
            "text": jd_text,
            "extracted_skills": all_skills,
            "jd_structured": structured,
            "responsibilities": jd_text,
            "role_intent": jd_text[:100],
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
DO NOT decide the final ATS score. Only evaluate evidence and assign 0-100 scores per category in "breakdown".
Output a strict JSON object. Do not output anything other than JSON.

INSTRUCTIONS:
1. Job Title: Identify the exact job title from the JD (e.g. "Full Stack Developer Intern"). Focus ONLY on the role name. Do NOT output "Job Title" or "Location". Must be a non-empty string.
2. Breakdown: Assign 0-100 for each category based on evidence (experience_relevance, role_alignment, education_match, recency_continuity). Do NOT output skill lists — those are computed by the system.

Required JSON Schema (output only these fields):
{{
  "job_title": "string",
  "ats_score": 0.0,
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

            # --- Structured JD + canonical skills (skill lists are never from LLM) ---
            jd_structured = jd_data.get("jd_structured")
            if not jd_structured:
                jd_structured = parse_jd_structured(jd_data.get("text", ""))

            resume_canonical = canonicalize_skills(resume_data.get("skills", []))
            required_or_groups = jd_structured.get("required_or_groups", [])
            required_standalone = jd_structured.get("required_standalone", set())
            optional_skills = jd_structured.get("all_optional_canonical", set())
            all_required = jd_structured.get("all_required_canonical", set())

            if not all_required:
                raise RuntimeError(
                    "JD parsing produced zero required skills. "
                    "Refusing to score to avoid garbage ATS output."
                )

            logger.info("REQUIRED SKILLS USED FOR SCORING: %s", sorted(all_required))
            logger.info("FINAL REQUIRED CANONICAL: %s", sorted(jd_structured.get("all_required_canonical", set())))
            logger.info("OPTIONAL: %s", sorted(jd_structured.get("all_optional_canonical", set())))

            # OR-group handling: one requirement satisfied if any skill in group is in resume
            satisfied_or = sum(1 for g in required_or_groups if (g & resume_canonical))
            satisfied_standalone = sum(1 for s in required_standalone if s in resume_canonical)
            total_required = len(required_or_groups) + len(required_standalone) or 1
            matched_required = satisfied_or + satisfied_standalone
            raw_ratio = matched_required / total_required

            # Matched set for scoring (required + optional present in resume)
            matched_set = (all_required | optional_skills) & resume_canonical
            # Missing required (exclude satisfied OR groups)
            missing_required_tokens = all_required - resume_canonical
            for g in required_or_groups:
                if g & resume_canonical:
                    missing_required_tokens -= g

            # --- NUMERICAL SCORING OVERRIDE ---
            breakdown = score_data.get("breakdown", {})
            raw_role_alignment = float(breakdown.get("role_alignment", 0))

            # 1. Normalize breakdown (other dimensions only; skill_match set below)
            for k in SCORING_WEIGHTS:
                if k == "skill_match":
                    continue
                raw_val = float(breakdown.get(k, 0))
                breakdown[k] = 60 + (raw_val * 0.4)

            # Fix #4: Gate experience_relevance when resume has no experience (after norm)
            if not resume_data.get("experience"):
                breakdown["experience_relevance"] = 20

            # 2. Skill score from required requirements only; no penalty for optional
            skill_match_score = 40 + (raw_ratio * 60)
            missing_requirements = total_required - matched_required
            skill_penalty = min(20, missing_requirements * MISSING_SKILL_PENALTY)
            skill_match_score = max(15, skill_match_score - skill_penalty)  # Fix #3: floor 15 for spread

            # Fix #5: Depth bonus – reward more matched skills (domain-agnostic)
            depth_bonus = min(10, len(matched_set) // 2)
            skill_match_score = min(100, skill_match_score + depth_bonus)

            breakdown["skill_match"] = skill_match_score
            score_data["breakdown"] = breakdown

            # 3. Job Title: semantic containment (Fix 5)
            jd_title_str = score_data.get("job_title", "")
            resume_title_str = (resume_data.get("job_title") or resume_data.get("personal_info", {}).get("title") or "")
            if not resume_title_str and isinstance(resume_data.get("personal_info"), dict):
                resume_title_str = str(resume_data.get("personal_info", {}).get("role", ""))
            title_penalty = 0
            if jd_title_str and not _title_semantic_match(jd_title_str, resume_title_str, resume_data):
                if len(resume_title_str or "") >= 3:
                    title_penalty = JOB_TITLE_MISMATCH_PENALTY

            # 4. Compute Final Score
            final_score = 0
            for k, w in SCORING_WEIGHTS.items():
                final_score += breakdown[k] * w
            final_score -= title_penalty

            # 5. Realistic bands cap & garbage detection
            if matched_required == 0 and raw_role_alignment < 30:
                score_data["ats_score"] = round(max(0, final_score - 30), 1)
            else:
                if final_score > 90:
                    final_score = 90 + (final_score - 90) * 0.3
                final_score = round(max(0, min(100, final_score)), 1)
                score_data["ats_score"] = final_score

            # Final hard override — skill lists only from canonical JD + resume, never LLM
            final_matched = sorted(all_required & resume_canonical)
            final_missing = sorted(all_required - resume_canonical)
            score_data["matched_skills"] = final_matched
            score_data["missing_skills"] = final_missing
            score_data["strong_matches"] = final_matched
            score_data["weak_areas"] = final_missing

            return score_data
            
        except json.JSONDecodeError as decode_err:
            logger.error(f"Failed to decode ATS JSON from LLM: {decode_err}\nContent received: {content}")
            return self._default_score()
        except RuntimeError:
            raise
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
