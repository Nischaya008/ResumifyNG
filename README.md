![ResumifyNG Banner](https://github.com/Nischaya008/Image_hosting/blob/main/Screenshot%202025-03-12%20234504.png)

# ResumifyNG

🚀 **AI-powered Resume and Interview Coaching Platform**

ResumifyNG is an advanced AI-driven platform designed to enhance resumes, analyze ATS compatibility, and provide real-time interview coaching. Built with **FastAPI** (Python) and **React** (JavaScript), it utilizes **NLP, ML, and real-time communication** to optimize career preparation.

## 🔥 Features

✅ **AI Resume Parsing** - Extracts structured information from PDFs and DOCX files using NLP (spaCy).  
✅ **Resume Enhancement** - Provides improvement suggestions with ATS compatibility analysis.  
✅ **AI-powered Interview Coach** - Simulated interview sessions with real-time feedback.  
✅ **Text-to-Speech (TTS)** - AI-driven voice responses for better interaction.  
✅ **Real-time Communication** - Pusher-powered instant updates for smooth user experience.  
✅ **Seamless UI** - Responsive design, animations (Framer Motion), and modern frontend techniques.  

---

## 🏗️ System Architecture

### Backend (FastAPI, Python 3.11)
- **Resume Parser:** Extracts key information from PDFs and DOCX files.
- **Resume Enhancer:** AI-powered suggestions and ATS optimization.
- **Interview Handler:** Simulates real-time interviews and processes audio.
- **Text-to-Speech (TTS):** Uses gTTS and FFmpeg for voice interaction.
- **Real-time Updates:** Pusher integration for instant notifications.

### Frontend (React 18 + Vite)
- **Modern UI:** Component-based architecture with animations.
- **Real-time Features:** Live updates using Pusher.js.
- **Smooth Experience:** Parallax effects, scroll animations, and optimized rendering.

---

## 🛠️ Tech Stack

### **Backend Technologies**
- FastAPI (Python 3.11)
- spaCy (NLP)
- PyMuPDF, python-docx (Document Processing)
- scikit-learn (ML)
- LangChain (LLM Integration)
- Pusher (Real-time Communication)
- gTTS & FFmpeg (Text-to-Speech & Audio Processing)

### **Frontend Technologies**
- React 18 with Vite
- React Router (Routing)
- Framer Motion (Animations)
- Pusher.js (Real-time Updates)
- Intersection Observer & Parallax Effects

---

## 🌐 API Endpoints

### **Resume Processing**
- `POST /api/parse` → Parse resumes from PDF/DOCX.
- `POST /api/enhance` → Provide ATS optimization suggestions.

### **Interview Handling**
- `POST /api/interview` → Start an AI-driven interview session.

### **System Health**
- `GET /health` → Check service status and environment variables.

---

## 🚀 Deployment

### **Backend (Railway Deployment)**
```dockerfile
FROM python:3.11-slim
RUN apt-get update && apt-get install -y ffmpeg libglib2.0-0
```

### **Frontend (Vercel Deployment)**
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ],
  "headers": [
    { "source": "/api/(.*)", "headers": [
        { "key": "Access-Control-Allow-Origin", "value": "*" }
      ]
    }
  ]
}
```

---

## 🛠️ Development Setup

### **Backend Setup**
```bash
# Install dependencies
pip install -r requirements.txt

# Run the development server
uvicorn main:app --host 0.0.0.0 --port 8080
```

### **Frontend Setup**
```bash
# Install dependencies
npm install

# Run the development server
npm run dev

# Build for production
npm run build
```

---

## 🔒 Security Measures

### **Backend Security**
- Environment variable protection
- API key validation
- Secure file upload handling

### **Frontend Security**
- CORS protection
- Secure API calls
- Protected routes

---

## ❗ Error Handling

### **Backend**
- Global exception handling
- Structured API error responses
- Validation for file uploads

### **Frontend**
- API error handling
- Component error boundaries
- Form validation & real-time connection monitoring

---

## 🤝 Contributing
1. Fork the repository
2. Create a feature branch (`git checkout -b feature-xyz`)
3. Commit your changes (`git commit -m "Added feature XYZ"`)
4. Push to the branch (`git push origin feature-xyz`)
5. Open a Pull Request 🚀

---

## 📜 License

**This project is proprietary and strictly confidential. Unauthorized use, reproduction, distribution, or modification is strictly prohibited and will result in legal action. All rights reserved. See the [LICENSE](https://github.com/Nischaya008/ResumifyNG/blob/main/LICENSE) for details.**


---

## 📞 Contact
For any inquiries or feedback, reach out via:
- 📧 Email: nischayagarg008@gmail.com
- 🐦 Twitter: [@Nischaya008](https://x.com/Nischaya008)
- 💼 LinkedIn: [Nischaya Garg](https://www.linkedin.com/in/nischaya008/)

### ⭐ Star this repository if you find it useful! 😊

Stay Innovated, Keep Coding, Think BIG! 🚀
