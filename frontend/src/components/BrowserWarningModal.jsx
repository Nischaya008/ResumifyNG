import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import Toast from './Toast';
import './BrowserWarningModal.css';

function BrowserWarningModal({ isOpen, onClose }) {
  const [showToast, setShowToast] = useState(false);

  const handleOpenChrome = () => {
    // Create a custom URL with x-browser scheme
    const currentUrl = window.location.href;
    const chromeUrl = `x-browser://chrome/${encodeURIComponent(currentUrl)}`;
    
    try {
      // Create a hidden link and click it
      const link = document.createElement('a');
      link.href = chromeUrl;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Close the modal after a short delay
      setTimeout(() => {
        onClose();
      }, 500);
    } catch (error) {
      console.error('Failed to open Chrome:', error);
      // Show download link instead
      window.open('https://www.google.com/chrome', '_blank');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    }
  };
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          className="modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div 
            className="modal-content"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ type: "spring", damping: 20 }}
          >
            <div className="modal-header">
              <h2>Browser Compatibility Notice</h2>
            </div>
            <div className="modal-body">
              <p>For the best experience with ResumifyNG, we recommend using Google Chrome.</p>
              <p>Some features may not work correctly in other browsers.</p>
            </div>
            <div className="modal-footer">
              <motion.button
                className="continue-button"
                onClick={onClose}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Continue Anyway
              </motion.button>
              <motion.button
                className="open-chrome-button"
                onClick={handleOpenChrome}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Open in Chrome
              </motion.button>
            </div>
            {showToast && (
              <Toast
                message="Google Chrome is not installed. Please install Chrome for the best experience."
                type="warning"
                onClose={() => setShowToast(false)}
              />
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default BrowserWarningModal;
