from flask import Flask, request, jsonify
from fastapi import FastAPI, UploadFile, File, Body
from fastapi.responses import JSONResponse
import fitz  # PyMuPDF
import docx
import re
import spacy
import os
import logging
from collections import defaultdict
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.cluster import KMeans
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np
from fastapi import APIRouter

# Configure logging
logging.basicConfig(level=logging.INFO)

# Load lightweight NLP model
nlp = spacy.load("en_core_web_sm")

# Predefined Skill Database (Can be extended)
SKILLS_DB = {"Python", "JavaScript", "ReactJS", "NodeJS", "SQL", "C++", "AWS", "Docker", "Kubernetes", "Leadership", "Communication"}

# Common Resume Sections
SECTION_HEADERS = {
    "skills": ["technical skills", "skills", "technologies"],
    "experience": ["experience", "work experience", "professional experience"],
    "projects": ["projects", "personal projects"],
    "education": ["education", "academic background", "qualifications"],
    "achievements": ["achievements", "awards", "recognition"],
    "coursework": ["coursework", "relevant coursework"],
    "personal_details": ["contact", "personal details", "information"],
    "hobbies": ["hobbies", "interests"]
}

# Weights for each section with penalties for missing sections
weights = {
    "Skills": 5,
    "Experience": 4,
    "Projects": 3,
    "Education": 2,
    "Achievements": 2,
    "Coursework": 1,
    "Hobbies": 1
}

# Improved regex patterns for extraction
email_pattern = re.compile(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}")
phone_pattern = re.compile(r'\+?\d{10,15}')
linkedin_pattern = re.compile(r"https?:\/\/(www\.)?linkedin\.com\/in\/[a-zA-Z0-9_-]+")
github_pattern = re.compile(r"https?:\/\/(www\.)?github\.com\/[a-zA-Z0-9_-]+")

# Extract text from PDF
def extract_text_from_pdf(file_path):
    text = ""
    try:
        with fitz.open(file_path) as doc:
            for page in doc:
                text += page.get_text("text") + "\n"
    except Exception as e:
        logging.error(f"Error extracting text from PDF: {e}")
    return text

# Extract text from DOCX
def extract_text_from_docx(file_path):
    text = ""
    try:
        doc = docx.Document(file_path)
        for para in doc.paragraphs:
            text += para.text + "\n"
    except Exception as e:
        logging.error(f"Error extracting text from DOCX: {e}")
    return text

# Extract text from LaTeX
def extract_text_from_latex(latex_code):
    text = re.sub(r'\\[a-zA-Z]+\{(.*?)\}', r'\1', latex_code)  # Remove LaTeX commands
    text = re.sub(r'\{.*?\}', '', text)  # Remove remaining braces
    return text

# Improved section detection using regex and NLP
def detect_sections(text):
    sections = defaultdict(list)
    lines = text.split("\n")
    current_section = None

    for line in lines:
        line = line.strip()
        if not line:
            continue

        # Match section headers dynamically
        for key, headers in SECTION_HEADERS.items():
            if any(header.lower() in line.lower() for header in headers):
                current_section = key
                break

        if current_section and line not in SECTION_HEADERS.keys():
            sections[current_section].append(line.strip())

    return sections

# Extract Skills using Vector Similarity
def extract_skills(text):
    vectorizer = TfidfVectorizer().fit(SKILLS_DB)
    text_vector = vectorizer.transform([text])
    found_skills = []

    for skill in SKILLS_DB:
        skill_vector = vectorizer.transform([skill])
        similarity = (text_vector * skill_vector.T).toarray()[0][0]
        if similarity > 0.1:  # Threshold for match
            found_skills.append(skill)

    return found_skills

# Extract Education Information
def extract_education(edu_lines):
    education_list = []
    degree_pattern = re.compile(r'(B\.E\.|B\.Tech|M\.E\.|M\.Tech|Ph\.D|MBA|Bachelor|Master)')
    for line in edu_lines:
        if degree_pattern.search(line):
            education_list.append(line.strip())
    return education_list

# Extract Experience Details using AI Clustering
def extract_experience(exp_lines):
    if not exp_lines:
        return []

    vectorizer = TfidfVectorizer(stop_words='english')
    X = vectorizer.fit_transform(exp_lines)
    kmeans = KMeans(n_clusters=min(3, len(exp_lines)), random_state=42, n_init=10)
    clusters = kmeans.fit_predict(X)

    structured_experience = defaultdict(list)
    for idx, label in enumerate(clusters):
        structured_experience[label].append(exp_lines[idx])

    return [ " ".join(structured_experience[key]) for key in sorted(structured_experience.keys())]

# Improved function to extract personal details
def extract_personal_details(text):
    personal_info = {}
    try:
        email_match = email_pattern.search(text)
        if email_match:
            personal_info["Email"] = email_match.group()

        phone_match = phone_pattern.search(text)
        if phone_match:
            personal_info["Phone"] = phone_match.group()

        linkedin_match = linkedin_pattern.search(text)
        if linkedin_match:
            personal_info["LinkedIn"] = linkedin_match.group()

        github_match = github_pattern.search(text)
        if github_match:
            personal_info["GitHub"] = github_match.group()
    except Exception as e:
        logging.error(f"Error extracting personal details: {e}")
    return personal_info

router = APIRouter()

@router.post("/upload_resume")
async def upload_resume(file: UploadFile = File(...)):
    # Create temp directory if it doesn't exist
    temp_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "temp")
    os.makedirs(temp_dir, exist_ok=True)
    
    file_location = os.path.join(temp_dir, file.filename)
    try:
        with open(file_location, "wb+") as file_object:
            file_object.write(file.file.read())

        if file.filename.endswith('.pdf'):
            text = extract_text_from_pdf(file_location)
        elif file.filename.endswith('.docx'):
            text = extract_text_from_docx(file_location)
        elif file.filename.endswith('.tex'):
            with open(file_location, 'r') as f:
                text = extract_text_from_latex(f.read())
        else:
            return JSONResponse(content={"error": "Unsupported file type"}, status_code=400)

        sections = detect_sections(text)

        structured_data = {
            "Personal Details": extract_personal_details(text),
            "Skills": extract_skills("\n".join(sections.get("skills", []))),
            "Experience": extract_experience(sections.get("experience", [])),
            "Projects": sections.get("projects", []),
            "Achievements": sections.get("achievements", []),
            "Education": extract_education(sections.get("education", [])),
            "Coursework": sections.get("coursework", []),
            "Hobbies": sections.get("hobbies", [])
        }

        return JSONResponse(content=structured_data)

    except Exception as e:
        logging.error(f"Error processing file: {e}")
        return JSONResponse(content={"error": "An error occurred while processing the file."}, status_code=500)
    finally:
        try:
            if os.path.exists(file_location):
                os.remove(file_location)
        except Exception as e:
            logging.error(f"Error cleaning up temp file: {e}")

@router.post("/generate_ats")
async def generate_ats(resume_data: dict, job_description: str = Body(None)):
    try:
        import re
        from collections import Counter
        # Extract sections from the resume data
        personal_details = resume_data.get("Personal Details", {})
        skills = resume_data.get("Skills", [])
        experience = resume_data.get("Experience", [])
        projects = resume_data.get("Projects", [])
        achievements = resume_data.get("Achievements", [])
        education = resume_data.get("Education", [])
        coursework = resume_data.get("Coursework", [])
        hobbies = resume_data.get("Hobbies", [])

        # --- 1. Section Completeness ---
        section_names = ["Skills", "Experience", "Projects", "Education", "Achievements", "Coursework", "Hobbies"]
        section_data = [skills, experience, projects, education, achievements, coursework, hobbies]
        section_completeness = sum(1 for s in section_data if s) / len(section_data)

        # --- 2. Keyword Extraction from Job Description ---
        job_keywords = set()
        job_titles = set()
        required_skills = set()
        preferred_skills = set()
        certs = set()
        if job_description:
            job_doc = nlp(job_description)
            for ent in job_doc.ents:
                if ent.label_ in ["SKILL", "ORG", "PRODUCT"]:
                    job_keywords.add(ent.text.lower())
                if ent.label_ == "TITLE":
                    job_titles.add(ent.text.lower())
                if ent.label_ == "CERTIFICATE":
                    certs.add(ent.text.lower())
            # Fallback: extract capitalized words and common skill patterns
            job_keywords.update([w.lower() for w in re.findall(r"[A-Za-z0-9\+\#\.]+", job_description) if len(w) > 2])
            # Heuristic: required skills ("must have", "required")
            for line in job_description.split("\n"):
                if "must have" in line.lower() or "required" in line.lower():
                    required_skills.update([w.lower() for w in re.findall(r"[A-Za-z0-9\+\#\.]+", line) if len(w) > 2])
                if "preferred" in line.lower() or "nice to have" in line.lower():
                    preferred_skills.update([w.lower() for w in re.findall(r"[A-Za-z0-9\+\#\.]+", line) if len(w) > 2])

        # --- 3. Resume Keyword Matching ---
        resume_text = " ".join([
            " ".join(skills),
            " ".join(experience),
            " ".join(projects),
            " ".join(education),
            " ".join(achievements),
            " ".join(coursework),
            " ".join(hobbies)
        ]).lower()
        resume_words = set(re.findall(r"[A-Za-z0-9\+\#\.]+", resume_text))
        # Exact keyword match
        matched_keywords = job_keywords & resume_words
        matched_required = required_skills & resume_words
        matched_preferred = preferred_skills & resume_words
        matched_titles = job_titles & resume_words
        matched_certs = certs & resume_words
        # Contextual: keywords in experience/projects
        exp_proj_text = " ".join(experience + projects).lower()
        contextual_matches = job_keywords & set(re.findall(r"[A-Za-z0-9\+\#\.]+", exp_proj_text))

        # --- 4. Synonym/Partial Matching (spaCy similarity) ---
        nlp_keywords = [nlp(k) for k in job_keywords]
        nlp_resume_words = [nlp(w) for w in resume_words]
        synonym_matches = 0
        for kw in nlp_keywords:
            for rw in nlp_resume_words:
                if kw.similarity(rw) > 0.85:
                    synonym_matches += 1
                    break

        # --- 5. Experience Quantification ---
        years_exp = 0
        for line in experience:
            match = re.search(r"(\d+)\s*(?:years|yrs|year)", line.lower())
            if match:
                years_exp += int(match.group(1))
        years_exp = min(years_exp, 20)  # Cap at 20 for scoring

        # --- 6. Quantified Achievements ---
        quantified_achievements = 0
        for line in achievements + experience:
            if re.search(r"\b(\d+%|\$\d+|increased|reduced|improved|grew|decreased)\b", line.lower()):
                quantified_achievements += 1

        # --- 7. Error Checking (basic spelling/grammar) ---
        # (Optional: Uncomment if language_tool_python is available)
        # import language_tool_python
        # tool = language_tool_python.LanguageTool('en-US')
        # matches = tool.check(resume_text)
        # error_count = len(matches)
        # For now, use a simple typo check:
        error_count = sum(1 for w in resume_words if len(w) > 3 and w.count(w[0]) == len(w))  # e.g., 'aaaaa'

        # --- 8. Section Formatting (penalize missing sections) ---
        missing_sections = [name for name, data in zip(section_names, section_data) if not data]

        # --- 9. Scoring ---
        # Weights: keyword/context (50), experience (15), quantified (10), section (10), error (5), formatting (10)
        score_keyword = (len(matched_keywords) + 0.5 * len(matched_preferred) + 1.5 * len(matched_required) + 0.5 * len(matched_titles) + 0.5 * len(matched_certs) + 0.5 * synonym_matches) / (len(job_keywords) + 1)  # avoid div0
        score_context = (len(contextual_matches) / (len(job_keywords) + 1))
        score_experience = years_exp / 20
        score_quantified = min(quantified_achievements, 5) / 5
        score_section = section_completeness
        score_error = max(0, 1 - error_count / 10)
        score_formatting = max(0, 1 - len(missing_sections) / len(section_names))
        # Weighted sum
        final_score = (
            0.35 * score_keyword +
            0.15 * score_context +
            0.15 * score_experience +
            0.10 * score_quantified +
            0.10 * score_section +
            0.05 * score_error +
            0.10 * score_formatting
        ) * 100
        final_score = max(0, min(final_score, 100))

        # --- 10. Detailed Breakdown ---
        breakdown = {
            "keyword_match": round(score_keyword * 100, 1),
            "contextual_match": round(score_context * 100, 1),
            "experience": round(score_experience * 100, 1),
            "quantified_achievements": round(score_quantified * 100, 1),
            "section_completeness": round(score_section * 100, 1),
            "error_free": round(score_error * 100, 1),
            "formatting": round(score_formatting * 100, 1),
            "missing_sections": missing_sections,
            "matched_keywords": list(matched_keywords),
            "matched_required": list(matched_required),
            "matched_preferred": list(matched_preferred),
            "matched_titles": list(matched_titles),
            "matched_certs": list(matched_certs),
            "synonym_matches": int(synonym_matches),
            "years_experience": years_exp,
            "quantified_achievements_count": quantified_achievements,
            "error_count": error_count
        }
        return JSONResponse(content={"ats_score": round(final_score, 1), "breakdown": breakdown})

    except Exception as e:
        logging.error(f"Error generating ATS score: {e}")
        return JSONResponse(content={"error": f"An error occurred while generating the ATS score: {str(e)}"}, status_code=500)
