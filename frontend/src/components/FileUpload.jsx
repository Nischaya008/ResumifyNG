import { useState } from 'react'
import { FaFileUpload, FaFilePdf, FaFileWord } from 'react-icons/fa'
import './FileUpload.css'

function FileUpload({ onSubmit, isLoading }) {
  const [file, setFile] = useState(null)

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0]
    if (selectedFile && (selectedFile.type === 'application/pdf' || 
        selectedFile.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')) {
      setFile(selectedFile)
    } else {
      alert('Please upload a PDF or DOCX file')
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (file) {
      onSubmit(file)
    }
  }

  const getFileIcon = () => {
    if (!file) return <FaFileUpload className="file-input-icon" />
    
    if (file.type === 'application/pdf') {
      return <FaFilePdf className="file-input-icon" />
    } else {
      return <FaFileWord className="file-input-icon" />
    }
  }

  return (
    <div className="file-upload-container">
      <div className="file-upload-header">
        <h2>Upload Resume</h2>
        <p className="file-upload-description">
          Upload your resume in PDF or DOCX format to get started
        </p>
      </div>
      
      <form onSubmit={handleSubmit}>
        <div className="file-input-wrapper">
          <label className="file-input-label" htmlFor="resume-file">
            {getFileIcon()}
            <span className="file-input-text">
              {file ? file.name : 'Drag & drop your file or click to browse'}
            </span>
          </label>
          <input
            id="resume-file"
            type="file"
            accept=".pdf,.docx"
            onChange={handleFileChange}
            className="file-input"
            disabled={isLoading}
          />
        </div>
        
        {file && (
          <div className="file-name-display">
            Selected: {file.name}
          </div>
        )}
        
        <button 
          type="submit" 
          className="file-upload-button" 
          disabled={!file || isLoading}
        >
          {isLoading ? 'Uploading...' : 'Upload Resume'}
        </button>
      </form>
      
      <div className="file-format-info">
        Supported formats: PDF, DOCX
      </div>
      <div className="file-upload-disclaimer">
        Processing may take some time due to heavy backend operations. Please be patient!
      </div>
    </div>
  )
}

export default FileUpload
