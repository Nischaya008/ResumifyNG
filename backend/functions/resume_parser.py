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
        # Extract sections from the resume data
        personal_details = resume_data.get("Personal Details", {})
        skills = resume_data.get("Skills", [])
        experience = resume_data.get("Experience", [])
        projects = resume_data.get("Projects", [])
        achievements = resume_data.get("Achievements", [])
        education = resume_data.get("Education", [])
        coursework = resume_data.get("Coursework", [])
        hobbies = resume_data.get("Hobbies", [])

        # Calculate scores for each section with penalties for missing sections
        total_score = 0
        total_weight = sum(weights.values())
        total_word_count = sum(len(section.split()) for section in [
            " ".join(skills),
            " ".join(experience),
            " ".join(projects),
            " ".join(education),
            " ".join(achievements),
            " ".join(coursework),
            " ".join(hobbies)
        ])

        # Function to calculate section score with penalties
        def calculate_section_score(section, weight):
            if not section:
                return -weight  # Penalty for missing section
            return (len(section) / total_word_count) * weight

        total_score += calculate_section_score(" ".join(skills), weights["Skills"])
        total_score += calculate_section_score(" ".join(experience), weights["Experience"])
        total_score += calculate_section_score(" ".join(projects), weights["Projects"])
        total_score += calculate_section_score(" ".join(education), weights["Education"])
        total_score += calculate_section_score(" ".join(achievements), weights["Achievements"])
        total_score += calculate_section_score(" ".join(coursework), weights["Coursework"])
        total_score += calculate_section_score(" ".join(hobbies), weights["Hobbies"])

        # Normalize ATS score to a percentage
        ats_score = max(0, (total_score / total_weight) * 100)

        # Job description matching (if provided)
        if job_description:
            resume_text = " ".join([
                " ".join(skills),
                " ".join(experience),
                " ".join(projects),
                " ".join(education),
                " ".join(achievements),
                " ".join(coursework)
            ])

            # Calculate TF-IDF vectors
            vectorizer = TfidfVectorizer()
            tfidf_matrix = vectorizer.fit_transform([resume_text, job_description])
            similarity_matrix = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])
            job_description_similarity = similarity_matrix[0][0] * 100  # Convert to percentage

            # Combine ATS score with job description similarity
            final_score = (ats_score * 0.7) + (job_description_similarity * 0.3)
        else:
            final_score = ats_score

        # Ensure final score is between 0% and 100%
        final_score = max(0, min(final_score, 100))

        return JSONResponse(content={"ats_score": final_score})

    except Exception as e:
        logging.error(f"Error generating ATS score: {e}")
        return JSONResponse(content={"error": f"An error occurred while generating the ATS score: {str(e)}"}, status_code=500)
