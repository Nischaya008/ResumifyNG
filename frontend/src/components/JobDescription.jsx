import { useState, useRef, useEffect } from 'react'
import './JobDescription.css'

function JobDescription({ onSubmit }) {
  const [description, setDescription] = useState('')
  const [error, setError] = useState(null)
  const textareaRef = useRef(null)

  // Handle focus restoration when window regains focus
  useEffect(() => {
    const handleFocus = () => {
      if (textareaRef.current && document.activeElement === document.body) {
        textareaRef.current.focus()
      }
    }

    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (description.trim()) {
      // Get existing resume data
      const existingData = JSON.parse(localStorage.getItem('resumeData') || '{}')
      
      // Create new merged structure ensuring correct nesting
      const mergedData = {
        resume_data: existingData.resume_data || existingData,
        job_description: description
      }
      
      // Store merged data
      localStorage.setItem('resumeData', JSON.stringify(mergedData))
      onSubmit(description)
    }
  }

  return (
    <div className="job-description-container">
      <div className="job-description-header">
        <h2>Job Description</h2>
        <p className="job-description-subheader">
          Paste the job description to analyze how well your resume matches the requirements
        </p>
      </div>
      
      {error && <div className="error-message">{error}</div>}
      
      <form onSubmit={handleSubmit}>
        <textarea
          ref={textareaRef}
          className="job-description-textarea"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onFocus={() => {
            if (textareaRef.current) {
              textareaRef.current.focus()
            }
          }}
          onClick={() => {
            if (textareaRef.current) {
              textareaRef.current.focus()
            }
          }}
          onBlur={() => {
            // Ensure we can regain focus after blur
            if (textareaRef.current) {
              textareaRef.current.tabIndex = 0
            }
          }}
          tabIndex={0}
          placeholder="Copy and paste the job description here. Include the job title, responsibilities, requirements, and any other details provided in the job posting..."
        />
        <button
          type="submit"
          className="job-description-button"
          disabled={!description.trim()}
        >
          Submit Description
        </button>
      </form>
      
      <div className="job-description-tips">
        <h3>Tips for Better Results:</h3>
        <ul>
          <li>Include the complete job description for the most accurate analysis</li>
          <li>Make sure to include all requirements and qualifications</li>
          <li>The more detailed the job description, the better the matching accuracy</li>
        </ul>
      </div>
    </div>
  )
}

export default JobDescription
