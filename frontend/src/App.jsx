import { useState, useCallback, useRef, useEffect } from 'react'
import axiosInstance from './config/axios'
import { BrowserRouter as Router, Routes, Route, useLocation, Link } from 'react-router-dom'
import './App.css'
import Toast from './components/Toast'
import FileUpload from './components/FileUpload'
import LatexInput from './components/LatexInput'
import JobDescription from './components/JobDescription'
import InterviewPage from './components/InterviewPage'
import LandingPage from './components/LandingPage'
import ATSScoreModal from './components/ATSScoreModal'
import { FaGithub, FaLinkedin, FaTwitter } from 'react-icons/fa'
import Portal from './components/Portal'

function AppContent() {
  const location = useLocation()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [isDocumentSubmitted, setIsDocumentSubmitted] = useState(false)
  const [isJobDescriptionSubmitted, setIsJobDescriptionSubmitted] = useState(false)
  const [atsData, setATSData] = useState(null)
  const [showATSModal, setShowATSModal] = useState(false)
  const [toast, setToast] = useState(null)
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 })
  const [isHovering, setIsHovering] = useState(false)
  const cursorRef = useRef(null)

  // Handle cursor movement with RAF
  useEffect(() => {
    let cursor = { x: 0, y: 0 }
    let raf
    let hoverTimeout

    const updateCursorPosition = () => {
      if (cursorRef.current) {
        cursorRef.current.style.transform = `translate3d(${cursor.x}px, ${cursor.y}px, 0)`
      }
      raf = requestAnimationFrame(updateCursorPosition)
    }

    const handleMouseMove = (e) => {
      cursor.x = e.pageX
      cursor.y = e.pageY
    }

    const handleMouseOver = (e) => {
      if (e.target.tagName === 'BUTTON' || e.target.tagName === 'A' || e.target.closest('button') || e.target.closest('a')) {
        clearTimeout(hoverTimeout)
        setIsHovering(true)
      }
    }

    const handleMouseOut = () => {
      clearTimeout(hoverTimeout)
      hoverTimeout = setTimeout(() => setIsHovering(false), 50)
    }

    window.addEventListener('mousemove', handleMouseMove, { passive: true })
    document.addEventListener('mouseover', handleMouseOver)
    document.addEventListener('mouseout', handleMouseOut)
    raf = requestAnimationFrame(updateCursorPosition)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseover', handleMouseOver)
      document.removeEventListener('mouseout', handleMouseOut)
      cancelAnimationFrame(raf)
      clearTimeout(hoverTimeout)
    }
  }, [])

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    
    // Clear any existing timeout
    if (window.toastTimeout) {
      clearTimeout(window.toastTimeout);
    }
  }, []);

  const hideToast = useCallback(() => {
    setToast(null);
  }, []);

  const handleFileSubmit = async (file) => {
    setIsLoading(true)
    setError(null)
    
    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await axiosInstance.post('/api/upload_resume', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
      
      const resumeData = {
        resume_data: response.data,
        job_description: localStorage.getItem('jobDescription') || ''
      }
      
      localStorage.setItem('resumeData', JSON.stringify(resumeData))
      showToast('Resume uploaded and parsed successfully!')
      setIsDocumentSubmitted(true)
    } catch (err) {
      const errorMessage = 'Failed to upload resume: ' + (err.response?.data?.error || err.message)
      showToast(errorMessage, 'error')
      setError(errorMessage)
      console.error('Upload error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleLatexSubmit = async (latexCode) => {
    setIsLoading(true)
    setError(null)

    try {
      const latexFile = new File([latexCode], 'resume.tex', { type: 'text/plain' })
      const formData = new FormData()
      formData.append('file', latexFile)

      const response = await axiosInstance.post('/api/upload_resume', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
      
      const resumeData = {
        resume_data: response.data,
        job_description: localStorage.getItem('jobDescription') || ''
      }
      
      localStorage.setItem('resumeData', JSON.stringify(resumeData))
      showToast('LaTeX resume parsed successfully!')
      setIsDocumentSubmitted(true)
    } catch (err) {
      const errorMessage = 'Failed to parse LaTeX: ' + (err.response?.data?.error || err.message)
      showToast(errorMessage, 'error')
      setError(errorMessage)
      console.error('LaTeX parsing error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleJobDescriptionSubmit = (description) => {
    try {
      const existingData = JSON.parse(localStorage.getItem('resumeData') || '{}')
      const updatedData = {
        ...existingData,
        job_description: description
      }
      localStorage.setItem('resumeData', JSON.stringify(updatedData))
      showToast('Job description saved!')
      setIsJobDescriptionSubmitted(true)
    } catch (err) {
      console.error('Error saving job description:', err)
      const errorMessage = 'Failed to save job description'
      showToast(errorMessage, 'error')
      setError(errorMessage)
    }
  }

  const generateATSScore = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const storedData = JSON.parse(localStorage.getItem('resumeData'))
      if (!storedData) {
        showToast('Please upload a resume and add job description first', 'error')
        return
      }

      const requestData = {
        resume_data: storedData.resume_data.resume_data || storedData.resume_data,
        job_description: storedData.job_description
      }

      console.log('Sending data to backend:', requestData)

      const [atsResponse, enhanceResponse] = await Promise.all([
        axiosInstance.post('/api/generate_ats', requestData),
        axiosInstance.post('/api/enhance_resume', requestData)
      ])

      console.log('Received ATS response:', atsResponse.data)
      console.log('Received enhance response:', enhanceResponse.data)

      if (atsResponse.data && enhanceResponse.data) {
        setATSData({
          score: Number(atsResponse.data.ats_score) || 0,
          recommendations: enhanceResponse.data.recommendations || []
        })
        setShowATSModal(true)
      } else {
        throw new Error('Invalid response from server')
      }
    } catch (error) {
      console.error('Error generating ATS score:', error)
      const errorMessage = 'Failed to generate ATS score. Please try again.'
      setError(errorMessage)
      showToast(errorMessage, 'error')
    } finally {
      setIsLoading(false)
    }
  }

  // Handle mouse movement for cursor glow effect with debouncing
  const [mousePosition, setMousePosition] = useState({ x: '50%', y: '50%' });
  const requestRef = useRef();
  const previousTimeRef = useRef();

  const animate = time => {
    if (previousTimeRef.current !== undefined) {
      const element = document.querySelector('.container');
      if (element) {
        element.style.setProperty('--mouse-x', mousePosition.x);
        element.style.setProperty('--mouse-y', mousePosition.y);
      }
    }
    previousTimeRef.current = time;
    requestRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current);
  }, [mousePosition]);

  const handleMouseMove = useCallback((event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    setMousePosition({ x: `${x}%`, y: `${y}%` });
  }, []);

  return (
    <>
      <Portal>
        <div className={`custom-cursor ${isHovering ? 'hover' : ''}`} ref={cursorRef} />
      </Portal>
      <div className={`app-container ${(!isDocumentSubmitted || !isJobDescriptionSubmitted) && location.pathname === '/app' ? 'no-scroll' : ''} ${isJobDescriptionSubmitted && location.pathname === '/app' ? 'show-scrollbar' : ''}`}>
      {location.pathname !== '/' && location.pathname !== '' && location.pathname !== '/interview' && (
        <Link to="/" className="header" style={{ textDecoration: 'none' }}>
          <h1>ResumifyNG</h1>
          <p>Your AI-Powered Resume & Interview Coach</p>
        </Link>
      )}
      
      <div className="linktree">
        <div className="linktree-item" data-tooltip="GitHub">
          <a href="https://github.com/Nischaya008" target="_blank" rel="noopener noreferrer">
            <FaGithub />
          </a>
        </div>
        <div className="linktree-item" data-tooltip="LinkedIn">
          <a href="https://www.linkedin.com/in/nischaya008/" target="_blank" rel="noopener noreferrer">
            <FaLinkedin />
          </a>
        </div>
        <div className="linktree-item" data-tooltip="Twitter">
          <a href="https://x.com/Nischaya008" target="_blank" rel="noopener noreferrer">
            <FaTwitter />
          </a>
        </div>
      </div>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/app" element={
          <div className="container" onMouseMove={handleMouseMove}>
            {error && <div className="error-message">{error}</div>}
            <div className="parent">
              <div className="div1">
                {!isDocumentSubmitted && (
                  <FileUpload onSubmit={handleFileSubmit} isLoading={isLoading} />
                )}
              </div>
              <div className="div2">
                {!isDocumentSubmitted && (
                  <LatexInput onSubmit={handleLatexSubmit} isLoading={isLoading} />
                )}
              </div>
              <div className="div3">
                {isDocumentSubmitted && !isJobDescriptionSubmitted && (
                  <JobDescription onSubmit={handleJobDescriptionSubmit} />
                )}
              </div>
              <div className="div3">
                {isJobDescriptionSubmitted && (
                  <>
                    <button
                      onClick={generateATSScore}
                      className="button ats-button"
                    >
                      Generate ATS Score
                    </button>
                    
                    <div className="resume-facts">
                       <div className="fact-card">
                         <h3>Did You Know?</h3>
                         <p>75% of resumes are rejected by ATS before reaching human eyes. A well-optimized resume significantly increases your chances.</p>
                       </div>
                       <div className="fact-card">
                         <h3>ATS Tip</h3>
                         <p>Using industry-standard job titles and including relevant keywords from the job description can improve your ATS score.</p>
                       </div>
                       <div className="fact-card">
                         <h3>Success Rate</h3>
                         <p>Candidates who tailor their resumes to specific job descriptions are 3x more likely to get an interview.</p>
                       </div>
                       <div className="fact-card">
                         <h3>Industry Insight</h3>
                         <p>Companies with 1,000+ employees use ATS 99% of the time. Even 75% of small businesses now rely on ATS software.</p>
                       </div>
                     </div>

                    <div className="tips-section">
                      <h2>Resume Success Tips</h2>
                      <div className="tips-grid">
                        <div className="tip-item">
                          <p>Use clear, standard fonts like Arial or Calibri</p>
                        </div>
                        <div className="tip-item">
                          <p>Include measurable achievements and metrics</p>
                        </div>
                        <div className="tip-item">
                          <p>Keep formatting simple and consistent</p>
                        </div>
                        <div className="tip-item">
                          <p>Focus on relevant skills and experience</p>
                        </div>
                        <div className="tip-item">
                          <p>Use industry-specific keywords strategically</p>
                        </div>
                        <div className="tip-item">
                          <p>Avoid complex tables and graphics that ATS can't read</p>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        } />
        <Route path="/interview" element={<InterviewPage />} />
      </Routes>
      {showATSModal && atsData && (
        <ATSScoreModal
          data={atsData}
          onClose={() => setShowATSModal(false)}
        />
      )}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={hideToast}
          duration={3000}
        />
      )}
     </div>
   </>
  )
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  )
}

export default App
