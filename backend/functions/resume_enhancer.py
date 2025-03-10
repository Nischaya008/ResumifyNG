from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import spacy

router = APIRouter()
nlp = spacy.load("en_core_web_sm")

# Generalized function to enhance resumes across industries
def enhance_resume(resume_data, job_description=""):
    recommendations = []
    resume_skills = set(resume_data.get("Skills", []))
    resume_text = " ".join(resume_data.get("Experience", []) + resume_data.get("Education", []) + resume_data.get("Projects", []))

    job_description_skills = set()
    if job_description:
        job_doc = nlp(job_description)
        job_description_skills = {ent.text.lower() for ent in job_doc.ents if ent.label_ == "SKILL"}

    missing_skills = job_description_skills - {skill.lower() for skill in resume_skills}
    if missing_skills:
        recommendations.append(f"Consider adding these skills to align with the job: {', '.join(missing_skills)}.")

    if job_description:
        vectorizer = TfidfVectorizer(stop_words="english")
        tfidf_matrix = vectorizer.fit_transform([resume_text, job_description])
        similarity = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0]
        if similarity < 0.6:
            recommendations.append("Your resume lacks alignment with the job description. Try incorporating more relevant keywords.")

    experience_lines = resume_data.get("Experience", [])
    if experience_lines:
        for line in experience_lines:
            if any(skill in line.lower() for skill in missing_skills):
                recommendations.append(f"Strengthen your experience section by emphasizing relevant skills: {line}")

    recommendations.append("Ensure clear and ATS-friendly formatting (use standard fonts like Arial, avoid tables, and use simple bullet points).")
    recommendations.append("Use strong action verbs like 'developed', 'optimized', 'led', or 'implemented' to describe responsibilities.")
    recommendations.append("Quantify achievements where possible (e.g., 'Increased revenue by 25%' or 'Reduced processing time by 40%').")

    return recommendations

@router.post("/enhance_resume")
async def enhance_resume_endpoint(resume_data: dict, job_description: str = ""):
    try:
        recommendations = enhance_resume(resume_data, job_description)
        return JSONResponse(content={"recommendations": recommendations})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
