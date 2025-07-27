import React from 'react'
import Portal from './Portal'
import './ATSScoreModal.css'

// Set your deployed backend URL here
const BACKEND_URL = 'https://resumifyng-backend.onrender.com';

function ATSScoreModal({ data, onClose }) {
  const handleStartInterview = async () => {
    // Ensure Razorpay script is loaded
    if (!window.Razorpay) {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      document.body.appendChild(script);
      script.onload = () => handleStartInterview();
      return;
    }
    // 1. Create order from backend
    document.body.style.cursor = 'auto'; // Remove custom cursor before payment
    const res = await fetch(`${BACKEND_URL}/api/create-order`, { method: 'POST' });
    const { orderId, key } = await res.json();

    // 2. Configure Razorpay options
    const options = {
      key,
      amount: 1900, // 19 INR in paise
      currency: 'INR',
      name: 'ResumifyNG',
      description: 'Interview Session',
      order_id: orderId,
      handler: async function (response) {
        // 3. Verify payment on backend
        const verifyRes = await fetch(`${BACKEND_URL}/api/verify-payment`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(response),
        });
        if (verifyRes.ok) {
          // Payment successful, allow interview
          window.location.href = '/interview';
        } else {
          alert('Payment verification failed. Please try again.');
        }
      },
      prefill: {
        // Optionally prefill user info
        email: 'user@example.com',
        contact: '9999999999',
      },
      theme: { color: '#3399cc' },
    };

    // 4. Open Razorpay checkout
    const rzp = new window.Razorpay(options);
    rzp.on('modal.closed', function() {
      document.body.style.cursor = '';
    });
    rzp.open();
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
