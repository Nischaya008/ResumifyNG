import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import Toast from './Toast';
import './BrowserWarningModal.css';

function BrowserWarningModal({ isOpen, onClose }) {
  const [showToast, setShowToast] = useState(false);

  // No additional handlers needed
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
              <p>For optimal performance and compatibility, please use Google Chrome.</p>
              <p>Some features may be limited or unavailable in other browsers.</p>
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
