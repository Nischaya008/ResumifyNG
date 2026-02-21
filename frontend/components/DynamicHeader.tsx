import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Rocket, ChevronRight } from 'lucide-react';

const navItems = [
  { label: 'Features', href: '#features' },
  { label: 'Process', href: '#how-it-works' },
  { label: 'Testimonials', href: '#testimonials' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'FAQ', href: '#faq' },
];

export const DynamicHeader: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Function to handle scroll inside the main container
  const scrollToSection = (href: string) => {
    setIsMobileMenuOpen(false);
    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <>
      <div className="absolute top-0 left-0 right-0 z-50 flex justify-center pointer-events-none">
        {/* The Notch Container */}
        <motion.div
          initial={{ y: -100 }}
          animate={{ y: 0 }}
          transition={{ type: 'spring', stiffness: 100, damping: 20 }}
          className="pointer-events-auto bg-[#334155] rounded-[2rem] px-6 py-3 md:px-8 md:py-4 shadow-[0_10px_35px_rgba(71,85,105,0.2)] flex items-center gap-6 md:gap-12 relative border border-[#334155]"
        >
          {/* Logo */}
          <div
            className="flex items-center gap-2 cursor-pointer group"
            onClick={() => document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            <img src="/RNG_Logo.png" alt="ResumifyNG Logo" className="w-9 h-9 object-contain group-hover:scale-105 transition-transform drop-shadow-[0_0_10px_rgba(74,112,169,0.5)]" />
            <span className="font-heading font-bold text-xl tracking-tight text-[#EFECE3]">
              ResumifyNG
            </span>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8">
            {navItems.map((item) => (
              <button
                key={item.label}
                onClick={() => scrollToSection(item.href)}
                className="text-sm font-medium text-gray-400 hover:text-[#8FABD4] transition-colors relative group"
              >
                {item.label}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[#8FABD4] transition-all group-hover:w-full" />
              </button>
            ))}
          </nav>

          {/* CTA Button */}
          <div className="hidden md:flex">
            <button
              onClick={() => {
                window.history.pushState({}, '', '/check-auth');
                const navEvent = new PopStateEvent('popstate');
                window.dispatchEvent(navEvent);
              }}
              className="flex items-center gap-2 bg-[#EFECE3] hover:bg-white text-[#0A1120] text-sm font-semibold px-5 py-2.5 rounded-full transition-all shadow-md hover:shadow-lg"
            >
              <span>Get Started</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Mobile Toggle */}
          <button
            className="md:hidden text-[#EFECE3] p-1"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X /> : <Menu />}
          </button>
        </motion.div>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            className="fixed top-24 left-4 right-4 z-40 bg-[#0A1120] rounded-3xl p-6 shadow-2xl border border-[#4A70A9]/30 md:hidden flex flex-col gap-4"
          >
            {navItems.map((item) => (
              <button
                key={item.label}
                onClick={() => scrollToSection(item.href)}
                className="text-left text-lg font-medium text-gray-300 hover:text-[#8FABD4] py-3 border-b border-white/10 last:border-0"
              >
                {item.label}
              </button>
            ))}
            <button
              onClick={() => {
                window.history.pushState({}, '', '/check-auth');
                const navEvent = new PopStateEvent('popstate');
                window.dispatchEvent(navEvent);
              }}
              className="w-full bg-[#4A70A9] text-[#EFECE3] font-bold py-3.5 rounded-xl mt-2 flex items-center justify-center gap-2 shadow-lg shadow-[#4A70A9]/20"
            >
              <Rocket className="w-5 h-5" /> Launch App
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};