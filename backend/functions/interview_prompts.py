from typing import Dict, Any

def generate_initial_prompt(resume_data: Dict[Any, Any], job_description: str) -> str:
    name = resume_data.get("Name", "")
    skills = ", ".join(resume_data.get("Skills", []))
    experience = " ".join(resume_data.get("Experience", []))
    projects = " ".join(resume_data.get("Projects", []))
    
    return f"""You are an expert AI technical interviewer. Based on the candidate's profile:

Name: {name}
Skills: {skills}
Experience: {experience}
Projects: {projects}
Job Description: {job_description}

Conduct a professional technical interview that:
1. Starts with a brief introduction addressing the candidate by their name
2. Focuses on technical skills relevant to the job
3. Asks about specific projects and experiences
4. Includes practical coding scenarios and system design questions
5. Validates the depth of their knowledge through follow-up questions

Keep responses concise and professional. Begin with a personalized introduction using their name, then proceed with your first question."""

def generate_follow_up_prompt(previous_context: str, user_response: str) -> str:
    return f"""Based on the previous context:
{previous_context}

And the candidate's response:
{user_response}

As an expert technical interviewer:
1. Evaluate the technical accuracy and completeness of the response
2. Keep follow-up questions focused and avoid excessive drilling on the same topic
3. Look for opportunities to explore different aspects of their experience
4. If the current topic has been sufficiently covered, consider transitioning to a new relevant area
5. Maintain a balance between depth and breadth in the interview

Remember to:
- Avoid more than 2-3 follow-up questions on the same topic
- Connect different skills and experiences when transitioning topics
- Keep the conversation flowing naturally while covering diverse aspects of their background

Maintain a professional tone and ensure the interview remains comprehensive yet engaging."""