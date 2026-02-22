import re
from typing import List, Set, Dict, Any

# ---------------------------------------------------------------------------
# Canonical skill aliases: map resume/JD variants to a single comparable form.
# Composite skills (e.g. "javascript/typescript") expand to multiple canonicals.
# ---------------------------------------------------------------------------
CANONICAL_SKILL_MAP: Dict[str, List[str]] = {
    # JS/TS
    "javascript/typescript": ["javascript", "typescript"],
    "javascript": ["javascript"],
    "typescript": ["typescript"],
    "js/ts": ["javascript", "typescript"],
    # Node
    "nodejs": ["node.js"],
    "node.js": ["node.js"],
    "node": ["node.js"],
    # React ecosystem
    "reactjs": ["react"],
    "react.js": ["react"],
    "react": ["react"],
    "nextjs": ["next.js"],
    "next.js": ["next.js"],
    # Backend
    "expressjs": ["express"],
    "express.js": ["express"],
    "express": ["express"],
    "fastapi": ["fastapi"],
    "django": ["django"],
    "flask": ["flask"],
    "spring boot": ["spring boot"],
    "spring": ["spring boot"],
    # APIs
    "rest apis": ["rest apis"],
    "rest api": ["rest apis"],
    "restful": ["rest apis"],
    "rest": ["rest apis"],
    # DBs
    "postgresql": ["postgresql"],
    "postgres": ["postgresql"],
    "mysql": ["mysql"],
    "mongodb": ["mongodb"],
    "mongo": ["mongodb"],
    "redis": ["redis"],
    "nosql": ["nosql"],
    "sql": ["sql"],
    # Cloud
    "aws": ["aws"],
    "gcp": ["gcp"],
    "google cloud": ["gcp"],
    "azure": ["azure"],
    # DevOps
    "ci/cd": ["ci/cd"],
    "cicd": ["ci/cd"],
    "github actions": ["ci/cd"],
    "jenkins": ["ci/cd"],
    "docker": ["docker"],
    "git": ["git"],
    # Frontend (alternatives – one satisfies "frontend framework")
    "vue": ["vue"],
    "vue.js": ["vue"],
    "angular": ["angular"],
    "angularjs": ["angular"],
    # Languages
    "c++": ["c++"],
    "cpp": ["c++"],
    "python": ["python"],
    "java": ["java"],
    # HTML/CSS often implied by React; map for matching
    "html": ["html"],
    "css": ["css"],
    "html5": ["html"],
    "css3": ["css"],
}


def _normalize_key(s: str) -> str:
    """Lowercase, strip, collapse spaces/slashes for lookup."""
    s = s.lower().strip()
    s = re.sub(r"\s+", " ", s)
    return s


def canonicalize_skills(skills: List[str]) -> Set[str]:
    """
    Maps each skill to canonical form(s) using CANONICAL_SKILL_MAP.
    Used for both resume and JD skills so that 'nodejs' and 'node.js' match.
    """
    out: Set[str] = set()
    for skill in skills:
        if not isinstance(skill, str):
            continue
        key = _normalize_key(skill)
        # Remove parentheticals for lookup only
        key_clean = re.sub(r"\(.*?\)", "", key).strip()
        if key_clean in CANONICAL_SKILL_MAP:
            out.update(CANONICAL_SKILL_MAP[key_clean])
        else:
            # Try without trailing .js / .ts
            key_alt = re.sub(r"\.(js|ts)$", "", key_clean)
            if key_alt in CANONICAL_SKILL_MAP:
                out.update(CANONICAL_SKILL_MAP[key_alt])
            else:
                # Keep as-is (lowercased) so we don't drop valid skills
                if len(key_clean) > 1:
                    out.add(key_clean)
    return out


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

def _tokenize_or_group(phrase: str) -> List[Set[str]]:
    """
    Splits a phrase like 'React.js / Next.js / Angular / Vue.js' into OR groups.
    Returns list of sets; each set is one "at least one of" group (normalized).
    """
    groups: List[Set[str]] = []
    # Split by " / " or " or " to get alternatives
    parts = re.split(r"\s+/\s+|\s+or\s+", phrase, flags=re.I)
    if len(parts) > 1:
        tokens = [p.strip().lower() for p in parts if p.strip()]
        if tokens:
            groups.append(set(tokens))
    return groups


def phrase_to_canonical_skills(phrase: str) -> Set[str]:
    """
    Reduce a JD phrase to atomic canonical skills. A line CONTAINS skills; it is not a skill.
    e.g. "proficiency in javascript / typescript" -> {"javascript", "typescript"}
    """
    phrase = phrase.strip().lower()
    if not phrase:
        return set()
    out: Set[str] = set()
    # Split by " / " first (common in JDs: "React.js / Next.js / Angular / Vue.js")
    for part in re.split(r"\s+/\s+", phrase):
        part = part.strip()
        if not part:
            continue
        # Try whole part in canonical map
        canon = canonicalize_skills([part])
        # Only keep canonical forms that are real skill atoms (no space, or in map)
        for s in canon:
            if " " not in s or s in CANONICAL_SKILL_MAP:
                out.add(s)
        # If part is multi-word and didn't map to known skills, try word-by-word
        if " " in part:
            for word in part.split():
                word = re.sub(r"[^\w.]", "", word)
                if not word or len(word) < 2:
                    continue
                key_clean = re.sub(r"\.(js|ts)$", "", word)
                if key_clean in CANONICAL_SKILL_MAP or word in CANONICAL_SKILL_MAP:
                    out.update(canonicalize_skills([word]))
    return out


def is_probable_skill(token: str) -> bool:
    """
    Filters out sentence fragments and verb phrases that JD parsers often
    wrongly extract as "skills". Only noun-like technical tokens should pass.
    """
    t = token.strip().lower()
    if not t or len(t) < 2 or len(t) > 40:
        return False
    banned_starts = (
        "work ", "write ", "collaborate ", "develop ",
        "maintain ", "design ", "debug ", "participate ",
        "basic ", "strong ", "good ", "familiarity ", "understanding ",
        "experience with ", "knowledge of ", "ability to ", "proficiency in ",
    )
    if any(t.startswith(b) for b in banned_starts):
        return False
    # Multi-word tokens: allow only known technical patterns (e.g. "rest apis", "node.js")
    if " " in t and not any(k in t for k in (".js", ".ts", "api", "apis", "sql", "cloud", "rest", "noql")):
        return False
    return True


def _extract_skill_tokens_from_line(line: str) -> List[str]:
    """Extract atomic canonical skills from a line. Phrases are reduced to skill atoms."""
    line = line.lower()
    line = re.sub(r"\(.*?\)", "", line)
    parts = re.split(r"[,;]|\s+/\s+", line)
    tokens: List[str] = []
    for p in parts:
        p = p.strip()
        if 2 <= len(p) <= 40 and not p.startswith(("we ", "you ", "the ", "and ", "or ")) and is_probable_skill(p):
            # Explode phrase -> canonical skills only (FIX 1)
            canon = phrase_to_canonical_skills(p)
            tokens.extend(canon)
    return tokens


def parse_jd_structured(jd_text: str) -> Dict[str, Any]:
    """
    Parses JD into structured skill tiers and OR groups.
    Returns:
      required_or_groups: list of sets; each set = "at least one of these"
      required_standalone: set of required single skills (canonical not applied here; caller does it)
      optional: set of good-to-have skills
      all_required_canonical: set of all canonical required skills (for display/backward compat)
      all_optional_canonical: set of all optional skills
    """
    text = jd_text.strip()
    lower = text.lower()
    required_or_groups: List[Set[str]] = []
    required_standalone: Set[str] = set()
    optional: Set[str] = set()

    # Restrict skill extraction to skill-bearing sections only (no fallback to entire JD)
    skill_sections: List[str] = []
    section_patterns = [
        r"(required\s+skills|skills\s*&\s*qualifications)[\s\S]*?(?=good\s+to\s+have|preferred|fundamental|what\s+you\s+will\s+learn|$)",
        r"technical\s+skills[\s\S]*?(?=good\s+to\s+have|preferred|fundamental|$)",
        r"(key\s+responsibilities|responsibilities)[\s\S]*?(?=required\s+skills|technical\s+skills|good\s+to\s+have|$)",
        r"fundamental\s+knowledge[\s\S]*?(?=good\s+to\s+have|preferred|$)",
    ]
    for pat in section_patterns:
        m = re.search(pat, lower, re.I | re.DOTALL)
        if m:
            skill_sections.append(m.group(0))
    required_section = "\n".join(skill_sections)

    # No skill-bearing sections detected → do NOT parse entire JD as skills
    if not required_section.strip():
        return {
            "required_or_groups": [],
            "required_standalone": set(),
            "optional": set(),
            "all_required_canonical": set(),
            "all_optional_canonical": set(),
        }

    optional_section = ""

    good_to_have_match = re.search(
        r"(?:good\s+to\s+have|preferred|not\s+mandatory)\s*[:\s]*([\s\S]*?)(?=what\s+you\s+will\s+learn|about\s+the\s+role|$|\n\n[A-Z])",
        lower,
        re.I | re.DOTALL,
    )
    if good_to_have_match:
        optional_section = good_to_have_match.group(1)

    # Known required skill phrases that are OR groups (from typical JDs)
    or_patterns = [
        r"(\w+(?:\s*\.\s*js|\s*\.\s*ts)?\s*(?:/\s*\w+(?:\s*\.\s*js|\s*\.\s*ts)?)+)",
        r"(?:at\s+least\s+one\s+of|one\s+of)\s*[:\s]*([\w\s.,/]+?)(?=\.|$|\n)",
        r"(\w+(?:\s*/\s*\w+)+)",
    ]

    def add_required_line(line: str) -> None:
        line = line.strip()
        if not line or len(line) > 120:
            return
        # Check for "X / Y / Z" pattern first
        for pat in or_patterns:
            for m in re.finditer(pat, line, re.I):
                phrase = m.group(1).strip()
                for group in _tokenize_or_group(phrase):
                    if len(group) >= 2:
                        # SOLUTION 2: canonicalize OR-groups at insertion time
                        required_or_groups.append(canonicalize_skills(list(group)))
                        return
        # No OR group: extract and store only canonical skill atoms (FIX 2)
        for token in _extract_skill_tokens_from_line(line):
            if len(token) >= 2 and token not in ("etc", "e.g", "i.e"):
                for s in canonicalize_skills([token]):
                    required_standalone.add(s)

    # Process required section by lines; detect "at least one of the following" multi-line OR
    lines = [ln.strip() for ln in re.split(r"[\n•\-*]", required_section) if ln.strip()]

    # FIX 3: Remove metadata lines before tokenization
    metadata_prefixes = (
        "location",
        "duration",
        "stipend",
        "about the role",
        "what you will learn",
        "education",
    )
    lines = [ln for ln in lines if not ln.lower().startswith(metadata_prefixes)]

    i = 0
    while i < len(lines):
        line = lines[i]
        if re.match(r"^(required|technical|qualifications?|skills?)\s*$", line, re.I):
            i += 1
            continue
        # Multi-line OR: "at least one of the following" / "one of the following" then bullet lines
        if re.search(r"at\s+least\s+one\s+of|one\s+of\s+the\s+following", line, re.I):
            next_tokens: Set[str] = set()
            j = i + 1
            while j < len(lines) and j < i + 6:
                bullet = lines[j]
                # First token often the main tech: "Node.js (Express / Fastify)" -> node.js
                first = re.match(r"^([\w.]+)", bullet)
                if first:
                    next_tokens.add(first.group(1).lower())
                j += 1
            if len(next_tokens) >= 2:
                # SOLUTION 2: canonicalize OR-groups at insertion time
                required_or_groups.append(canonicalize_skills(list(next_tokens)))
                i = j
                continue
        add_required_line(line)
        i += 1

    # Optional section: all tokens go to optional set (no OR groups for good-to-have)
    for line in re.split(r"[\n•\-*]", optional_section):
        line = line.strip()
        if not line:
            continue
        for token in _extract_skill_tokens_from_line(line):
            if len(token) >= 2:
                for s in canonicalize_skills([token]):
                    optional.add(s)

    # FIX 3: Nuke English junk – only keep single-word or known multi-word skills
    required_standalone = {
        s for s in required_standalone
        if " " not in s or s in CANONICAL_SKILL_MAP
    }

    # Normalize and canonicalize for scoring
    def canonicalize_set(s: Set[str]) -> Set[str]:
        return canonicalize_skills(list(s))

    req_flat = set()
    for g in required_or_groups:
        req_flat.update(g)  # groups are already canonical
    req_flat.update(required_standalone)
    opt_canon = canonicalize_set(optional)

    # Explicitly optional skills are demoted: do not treat as required
    all_required_canonical = req_flat - opt_canon

    # FIX 2: Only allow skills in the technical allow-list (no single-word fallback)
    technical_skills = {v for vals in CANONICAL_SKILL_MAP.values() for v in vals}
    all_required_canonical = {
        s for s in all_required_canonical
        if s in technical_skills
    }

    # SOLUTION 4: Fail-fast if parser leaked phrases
    _allowed_multi = {"rest apis", "spring boot"}  # node.js has no space
    assert all(
        (" " not in s) or (s in _allowed_multi)
        for s in all_required_canonical
    ), f"INVALID REQUIRED SKILLS: {all_required_canonical}"

    # OR groups are already canonical; use as-is for matching
    canonical_or_groups = list(required_or_groups)
    required_standalone_canon = required_standalone  # already filtered + canonical

    return {
        "required_or_groups": canonical_or_groups,
        "required_standalone": required_standalone_canon,
        "optional": opt_canon,
        "all_required_canonical": all_required_canonical,
        "all_optional_canonical": opt_canon,
    }


def extract_jd_skills(jd_text: str) -> List[str]:
    """
    Extracts skill-like terms from Job Description text (flat list).
    Prefer parse_jd_structured() for scoring; this is kept for backward compat.
    """
    structured = parse_jd_structured(jd_text)
    required = list(structured["all_required_canonical"])
    optional = list(structured["all_optional_canonical"])
    return required + optional

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
