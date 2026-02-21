import React from 'react';
import { motion } from 'framer-motion';
import { FileText, Mic, CheckCircle2 } from 'lucide-react';

export const Hero: React.FC = () => {
  return (
    <section className="relative min-h-screen pt-32 pb-20 flex flex-col justify-center overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#050B14] via-[#000000] to-[#000000] z-0" />
      <div className="absolute inset-0 z-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] pointer-events-none" />

      {/* Floating Blobs */}
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.15, 0.3, 0.15],
          x: [0, 50, 0]
        }}
        transition={{ duration: 10, repeat: Infinity }}
        className="absolute top-[20%] right-[10%] w-96 h-96 bg-[#4A70A9] rounded-full blur-[100px]"
      />
      <motion.div
        animate={{
          scale: [1.2, 1, 1.2],
          opacity: [0.15, 0.3, 0.15],
          x: [0, -50, 0]
        }}
        transition={{ duration: 15, repeat: Infinity }}
        className="absolute bottom-[20%] left-[10%] w-80 h-80 bg-[#8FABD4] rounded-full blur-[100px]"
      />

      <div className="container mx-auto px-4 z-10 relative mt-1 md:mt-0">
        <div className="max-w-5xl mx-auto text-center">

          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#0A1120] border border-[#4A70A9]/50 text-[#8FABD4] mb-8 shadow-sm"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#8FABD4] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#4A70A9]"></span>
            </span>
            <span className="text-[10px] sm:text-sm font-medium tracking-wide uppercase">AI-Powered Career Optimization</span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-4xl sm:text-5xl md:text-7xl font-heading font-extrabold text-[#EFECE3] leading-[1.15] md:leading-[1.1] mb-6 md:mb-8 tracking-tight"
          >
            Land Your Dream Job Faster with <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#8FABD4] to-[#4A70A9]">
              AI-Powered Coaching
            </span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-base sm:text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-10 md:mb-12 leading-relaxed px-2"
          >
            ResumifyNG doesn't just scan your resume, it transforms it. Get unparalleled, industry-standard ATS scoring and practice with an ultra-realistic AI Hiring Manager to ace your next technical interview.
          </motion.p>

          {/* Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 px-4 sm:px-0"
          >
            <button
              onClick={() => {
                window.history.pushState({}, '', '/check-auth');
                const navEvent = new PopStateEvent('popstate');
                window.dispatchEvent(navEvent);
              }}
              className="w-full sm:w-auto px-8 py-4 bg-[#4A70A9] hover:bg-[#5C85C5] text-white rounded-2xl font-semibold text-base sm:text-lg transition-all shadow-[0_10px_30px_rgba(74,112,169,0.3)] hover:shadow-[0_15px_40px_rgba(74,112,169,0.4)] hover:-translate-y-1 flex items-center justify-center gap-2"
            >
              Get Started for Free <FileText className="w-5 h-5" />
            </button>
            <button
              onClick={() => {
                document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="w-full sm:w-auto px-8 py-4 bg-transparent border border-[#4A70A9]/50 hover:bg-[#4A70A9]/10 text-[#8FABD4] rounded-2xl font-semibold text-base sm:text-lg transition-all flex items-center justify-center gap-2"
            >
              View Premium Plans
            </button>
          </motion.div>

          {/* Social Proof / Stats */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-12 md:mt-16 pt-8 border-t border-white/10 flex flex-wrap justify-center gap-4 md:gap-16 opacity-80 px-4"
          >
            {['Hyper-Accurate ATS', 'Real-time Mock Interviews', 'LaTeX Integrated'].map((stat, i) => (
              <div key={i} className="flex items-center gap-2 text-sm sm:text-base">
                <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-[#8FABD4]" />
                <span className="text-gray-300 font-medium">{stat}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Abstract "Island" Divider at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#000000] to-transparent z-10" />
    </section>
  );
};