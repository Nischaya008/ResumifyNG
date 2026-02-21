import os
from groq import Groq
from models.interview import InterviewRequest, MessageModel
from config import settings

class InterviewService:
    def __init__(self):
        self.api_key = settings.GROQ_API_KEY
        # If API key is missing, this will fail or we can handle it
        self.client = Groq(api_key=self.api_key) if self.api_key else None
        self.model = "llama-3.3-70b-versatile"

    def _build_system_prompt(self, request: InterviewRequest) -> str:
        prompt = (
            "You are an expert technical interviewer conducting an interview. "
            "Your goal is to be natural, professional, and engaging. "
            "You will ask relevant questions, follow up on the candidate's answers, "
            "and cross-question to test their depth of knowledge.\n\n"
            "Here is the candidate's background:\n"
        )
        
        if request.personal_info:
            prompt += f"Contact: {request.personal_info.email or ''} | {request.personal_info.phone or ''}\n"
        if request.skills:
            prompt += f"Skills: {', '.join(request.skills)}\n"
        if request.education:
            prompt += f"Education: {'; '.join(request.education)}\n"
        if request.experience:
            prompt += f"Experience: {'; '.join(request.experience)}\n"
        if request.projects:
            prompt += f"Projects: {'; '.join(request.projects)}\n"
            
        prompt += f"\nHere is the Job Description they are interviewing for:\n{request.jd}\n\n"
        prompt += (
            "Instructions:\n"
            "1. If this is the first message (no history), start by introducing yourself briefly and asking an opening question based on their background or the JD.\n"
            "2. IMPORTANT: Do NOT give yourself a human name (e.g. 'Rohan', 'John'). You are strictly an AI interviewer. Introduce yourself as the 'AI Hiring Manager' or 'AI Technical Interviewer'.\n"
            "3. If there is history, continue the conversation naturally based on their last response.\n"
            "4. Ask one question at a time. Keep your responses concise (under 150 words usually).\n"
            "5. Do not break character. Do not provide a transcript of a fake interview. YOU are the interviewer, the user is the candidate."
        )
        return prompt

    async def generate_response_stream(self, request: InterviewRequest):
        if not self.client:
            raise ValueError("GROQ_API_KEY is not configured.")

        messages = [
            {"role": "system", "content": self._build_system_prompt(request)}
        ]

        # Append history
        if request.history:
            for msg in request.history:
                messages.append({"role": msg.role, "content": msg.content})

        try:
            stream = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                max_tokens=1000,
                temperature=0.7,
                stream=True
            )
            for chunk in stream:
                if chunk.choices[0].delta.content is not None:
                    # Yielding in SSE format: "data: ...\n\n"
                    yield chunk.choices[0].delta.content
        except Exception as e:
            # Yield error if it happens during streaming or connection
            yield f"Error: {str(e)}"

interview_service = InterviewService()
