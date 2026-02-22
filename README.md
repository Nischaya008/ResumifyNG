# ResumifyNG
> “What cannot be measured cannot be improved.”
<p align="center"><strong>ResumifyNG – Platform Preview</strong></p>

<details open>
<summary><strong>▸ Landing Page</strong></summary>
<p align="center">
  <img src="https://github.com/Nischaya008/ResumifyNG/blob/main/assets/Web_View%20(1).png?raw=true" width="100%" alt="Landing Page" />
</p>
</details>

<details>
<summary><strong>▸ Insights Dashboard</strong></summary>
<p align="center">
  <img src="https://github.com/Nischaya008/ResumifyNG/blob/main/assets/Web_View%20(2).png?raw=true" width="100%" alt="Dashboard" />
</p>
</details>

<details>
<summary><strong>▸ ATS Resume Analysis</strong></summary>
<p align="center">
  <img src="https://github.com/Nischaya008/ResumifyNG/blob/main/assets/Web_View%20(3).png?raw=true" width="100%" alt="ATS Analysis" />
</p>
</details>

<details>
<summary><strong>▸ Profile Hub</strong></summary>
<p align="center">
  <img src="https://github.com/Nischaya008/ResumifyNG/blob/main/assets/Web_View%20(6).png?raw=true" width="100%" alt="Dashboard" />
</p>
</details>

<details>
<summary><strong>▸ AI Technical Interview</strong></summary>
<p align="center">
  <img src="https://github.com/Nischaya008/ResumifyNG/blob/main/assets/Web_View%20(4).png?raw=true" width="100%" alt="AI Interview" />
</p>
</details>

<details>
<summary><strong>▸ Membership Plans</strong></summary>
<p align="center">
  <img src="https://github.com/Nischaya008/ResumifyNG/blob/main/assets/Web_View%20(5).png?raw=true" width="100%" alt="Dashboard" />
</p>
</details>


<p align="center">
  <strong>AI‑powered resume optimization and technical interview simulation platform</strong><br/>
  Industry‑grade ATS scoring • Voice‑interactive AI interviews • Resume intelligence dashboard
</p>

---

## Overview

**ResumifyNG** is a full‑stack, production‑grade career preparation platform that helps candidates **optimize resumes for Applicant Tracking Systems (ATS)** and **practice real technical interviews** with an autonomous AI Hiring Manager.

Unlike keyword scanners or scripted mock tools, ResumifyNG models how **real ATS pipelines and hiring managers actually behave**, combining deterministic scoring logic with large‑language‑model reasoning and ultra‑low‑latency conversational AI.

This project is designed to be:

* Architecturally realistic
* Technically defensible for evaluation and grading
* Scalable for real‑world deployment

---

## Core Capabilities

### ▸ Hyper‑Accurate ATS Scoring Engine

* Resume vs Job Description evaluation with a **true 0–100 ATS score**
* Granular matched vs missing skill extraction
* Weighted scoring matrix enforcing industry‑standard penalties and boosts
* Fully explainable results (no black‑box scoring)

### ▸ Voice‑Interactive AI Hiring Manager

* Real‑time, microphone‑driven technical interviews
* Adaptive questioning based on resume + JD context
* Sub‑second latency using streaming LLM responses
* Strict persona guardrails to simulate real interview pressure

### ▸ Resume Authoring & LaTeX Support

* Upload **PDF / DOCX / LaTeX (.tex)** resumes
* Built‑in LaTeX editor with syntax highlighting
* Instant analysis without external compilation tools

### ▸ Personal Insights Dashboard

* Historical ATS performance graph
* Lifetime skill gap analysis
* Interview count, resume count, account age metrics
* Downloadable interview transcripts

---

## System Architecture

<p align="center">
  <img src="https://github.com/Nischaya008/ResumifyNG/blob/main/assets/Flowchart%20(2).png?raw=true" alt="System Flowchart" width="90%" />
</p>

### High‑Level Flow

1. User uploads resume or writes LaTeX in the frontend
2. Client authenticates via Supabase and uploads assets
3. FastAPI backend performs OCR, parsing, structuring, and ATS evaluation
4. LLMs generate deterministic analysis or stream interview responses
5. Results and transcripts are persisted in Supabase
6. Dashboard updates in real time

---

## Technology Stack

### Frontend

* React 19 (Vite)
* TypeScript
* Tailwind CSS
* Framer Motion
* Recharts
* PrismJS

### Backend

* Python 3
* FastAPI
* Uvicorn
* Docker

### AI & NLP

* Hugging Face Inference API (Meta‑Llama‑3‑8B‑Instruct)
* Groq LPU Inference (Llama‑3.3‑70B)

### Infrastructure

* Supabase (Auth, PostgreSQL, Storage)
* Razorpay (Payments)
* Vercel (Frontend)
* Render (Backend)

---

## Resume Analysis Pipeline

### 1. Ingestion & OCR

* File validation (<10MB)
* PDF: `pdfplumber`, `pdf2image`, OCR fallback
* DOCX: `python-docx`
* TEX: `pypandoc`

### 2. LLM Parsing

* Strict JSON schema extraction
* Personal info, skills, education, experience, projects
* Markdown and hallucination sanitization

### 3. Normalization

* Skill standardization
* Duplicate removal
* Canonical mapping

### 4. ATS Evaluation

* Resume vs JD comparison
* Matched vs missing skill matrix
* Deterministic post‑processing in Python
* Final explainable score out of 100

---

## AI Interview System

### Frontend

* Web Speech API (SpeechRecognition)
* Browser‑native Text‑to‑Speech
* Streaming UI updates via SSE
* Compatibility guards for unsupported browsers

### Backend

* Streaming LLM responses using Groq
* Resume + JD context injection
* Enforced Hiring Manager persona
* Secure transcript persistence

---

## Authentication & Security

* Supabase GoTrue authentication
* Google OAuth + Email OTP flows
* Secure password reset system
* JWT‑based session handling
* RLS‑protected database access
* Temp‑file sanitation on backend

---

## Membership & Payments

| Tier   | Features                                                    |
| ------ | ----------------------------------------------------------- |
| Guest  | 1 resume upload, 1 interview                                |
| Member | Unlimited resumes, unlimited interviews, insights dashboard |

* ₹50 / year premium plan
* Razorpay order creation and HMAC verification
* Server‑side membership enforcement

---

## Local Development

```bash
# Frontend
cd client
npm install
npm run dev

# Backend
cd server
pip install -r requirements.txt
uvicorn main:app --reload
```

---

## Project Goals

* Simulate real hiring pipelines, not tutorials
* Enforce deterministic evaluation where possible
* Use LLMs as reasoning engines, not oracles
* Remain defensible for academic evaluation
* Stay scalable for production deployment

---

## License

**This project is proprietary and strictly confidential. Unauthorized use, reproduction, distribution, or modification is strictly prohibited and will result in legal action. All rights reserved. See the [LICENSE](https://github.com/Nischaya008/ResumifyNG/blob/main/LICENSE) for details.**

---

## Contact
For any inquiries or feedback, reach out via:
- Email: nischayagarg008@gmail.com
- Twitter: [@Nischaya008](https://x.com/Nischaya008)
- LinkedIn: [Nischaya Garg](https://www.linkedin.com/in/nischaya008/)

Stay Innovated, Keep Coding, Think BIG!
> “Preparation reveals the truth before the test does.”
