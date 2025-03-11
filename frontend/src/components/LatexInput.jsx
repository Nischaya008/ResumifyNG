import { useState, useEffect } from 'react'
import './LatexInput.css'

function LatexInput({ onSubmit, isLoading }) {
  const [latexCode, setLatexCode] = useState('')
  const [lineCount, setLineCount] = useState(1)

  // Update line count when latex code changes
  useEffect(() => {
    const lines = latexCode.split('\n').length
    setLineCount(Math.max(1, lines))
  }, [latexCode])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (latexCode.trim()) {
      onSubmit(latexCode)
    }
  }

  // Generate line numbers
  const renderLineNumbers = () => {
    return Array.from({ length: lineCount }, (_, i) => (
      <div key={i + 1}>{i + 1}</div>
    ))
  }

  return (
    <div className="latex-editor-container">
      <div className="latex-editor-header">
        <h2>LaTeX Editor</h2>
        <div className="latex-editor-controls">
          <div className="latex-editor-dot"></div>
          <div className="latex-editor-dot"></div>
          <div className="latex-editor-dot"></div>
        </div>
      </div>
      
      <form onSubmit={handleSubmit}>
        <div className="latex-editor-wrapper">
          <div className="latex-editor-line-numbers">
            {renderLineNumbers()}
          </div>
          <textarea
            className="latex-editor-textarea"
            value={latexCode}
            onChange={(e) => setLatexCode(e.target.value)}
            placeholder="% Enter your LaTeX code here...\n\n\\documentclass{article}\n\\begin{document}\n  Your resume content here...\n\\end{document}"
            disabled={isLoading}
            spellCheck="false"
          />
        </div>
        
        <div className="latex-editor-footer">
          <div className="latex-editor-status">
            {lineCount} line{lineCount !== 1 ? 's' : ''}
          </div>
          <button 
            type="submit" 
            className="latex-submit-button" 
            disabled={!latexCode.trim() || isLoading}
          >
            {isLoading ? 'Processing...' : 'Submit LaTeX'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default LatexInput
