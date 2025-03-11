import React from 'react'
import Portal from './Portal'
import './ATSScoreModal.css'

function ATSScoreModal({ data, onClose }) {
  const handleStartInterview = () => {
    // Navigate to interview page
    window.location.href = '/interview'
  }

  return (
    <Portal>
      <div className="modal-overlay" onClick={(e) => {
        if (e.target.className === 'modal-overlay') {
          onClose()
        }
      }}>
        <div className="modal-content">
          <button className="close-button" onClick={onClose}>×</button>
          
          <div className="score-section">
            <h2>ATS Compatibility Score</h2>
            <div className="score-circle">
              <span className="score-number">{Math.round(data.score)}%</span>
            </div>
          </div>

          <div className="recommendations-section">
            <h3>Recommendations</h3>
            <ul className="recommendations-list">
              {data.recommendations.map((rec, index) => (
                <li key={index} className="recommendation-item">
                  {rec}
                </li>
              ))}
            </ul>
          </div>

          <div className="modal-actions">
            <button 
              className="button interview-button"
              onClick={handleStartInterview}
            >
              Begin Interview
            </button>
          </div>
        </div>
      </div>
    </Portal>
  )
}

export default ATSScoreModal 