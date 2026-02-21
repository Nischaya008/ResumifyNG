import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUp } from 'lucide-react';

export const ScrollToTop: React.FC = () => {
    const [isVisible, setIsVisible] = useState(false);
    const [isAtBottom, setIsAtBottom] = useState(false);

    useEffect(() => {
        const toggleVisibility = () => {
            // Look for the scrollable main container in App.tsx
            const mainContent = document.querySelector('main');

            if (mainContent) {
                // If scrolled past 300px down, show the button
                if (mainContent.scrollTop > 300) {
                    setIsVisible(true);
                } else {
                    setIsVisible(false);
                }

                // Check if we've reached near the bottom (Footer area)
                // Stop it from overlapping the absolute bottom of the footer
                const isBottom = Math.abs(mainContent.scrollHeight - mainContent.scrollTop - mainContent.clientHeight) < 100;
                setIsAtBottom(isBottom);
            }
        };

        const mainContent = document.querySelector('main');
        if (mainContent) {
            mainContent.addEventListener('scroll', toggleVisibility);
        }

        return () => {
            if (mainContent) {
                mainContent.removeEventListener('scroll', toggleVisibility);
            }
        };
    }, []);

    const scrollToTop = () => {
        const mainContent = document.querySelector('main');
        if (mainContent) {
            mainContent.scrollTo({
                top: 0,
                behavior: 'smooth',
            });
        }
    };

    return (
        <AnimatePresence>
            {isVisible && !isAtBottom && (
                <motion.div
                    initial={{ opacity: 0, y: 20, scale: 0.8 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 20, scale: 0.8 }}
                    transition={{ duration: 0.2 }}
                    className="fixed bottom-8 left-8 z-50"
                >
                    <button
                        onClick={scrollToTop}
                        aria-label="Scroll to top"
                        className="p-3 bg-[#4A70A9] hover:bg-[#5C85C5] text-white rounded-2xl shadow-[0_4px_14px_rgba(74,112,169,0.39)] transition-all transform hover:-translate-y-1 hover:shadow-[0_6px_20px_rgba(74,112,169,0.5)] focus:outline-none focus:ring-2 focus:ring-[#8FABD4] focus:ring-offset-2 focus:ring-offset-[#050B14]"
                    >
                        <ArrowUp className="w-6 h-6" />
                    </button>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
