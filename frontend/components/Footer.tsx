import React from 'react';
import { Linkedin, Mail, Github, Heart, Globe, Code2 } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-[#050B14] py-8 border-t border-[#4A70A9]/30 mt-[-2rem] relative z-10 rounded-b-[2rem] md:rounded-b-[2.5rem]">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">

          {/* Logo & Copyright */}
          <div className="flex flex-col items-center md:items-start text-center md:text-left">
            <div className="flex items-center gap-2 mb-2">
              <img src="/RNG_Logo.png" alt="ResumifyNG Logo" className="w-8 h-8 object-contain" />
              <span className="text-xl font-heading font-bold text-[#EFECE3]">ResumifyNG</span>
            </div>
            <p className="text-gray-500 text-sm">
              &copy; {new Date().getFullYear()} ResumifyNG. All rights reserved.
            </p>
          </div>

          {/* Social Links */}
          <div className="flex flex-wrap justify-center gap-4">
            <a href="https://nischayagarg.vercel.app/" target="_blank" rel="noreferrer" title="Portfolio" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:bg-[#8FABD4] hover:text-[#0A1120] transition-all border border-[#4A70A9]/20 hover:border-transparent">
              <Globe className="w-4 h-4" />
            </a>
            <a href="https://www.linkedin.com/in/nischaya008/" target="_blank" rel="noreferrer" title="LinkedIn" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:bg-[#8FABD4] hover:text-[#0A1120] transition-all border border-[#4A70A9]/20 hover:border-transparent">
              <Linkedin className="w-4 h-4" />
            </a>
            <a href="https://github.com/Nischaya008" target="_blank" rel="noreferrer" title="GitHub" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:bg-[#8FABD4] hover:text-[#0A1120] transition-all border border-[#4A70A9]/20 hover:border-transparent">
              <Github className="w-4 h-4" />
            </a>
            <a href="https://leetcode.com/u/Nischaya008/" target="_blank" rel="noreferrer" title="Leetcode" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:bg-[#8FABD4] hover:text-[#0A1120] transition-all border border-[#4A70A9]/20 hover:border-transparent">
              <Code2 className="w-4 h-4" />
            </a>
            <a href="mailto:nischayagarg008@gmail.com" title="Email" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:bg-[#8FABD4] hover:text-[#0A1120] transition-all border border-[#4A70A9]/20 hover:border-transparent">
              <Mail className="w-4 h-4" />
            </a>
          </div>

          {/* Made With */}
          <div className="flex items-center text-sm text-gray-500">
            <p className="flex items-center gap-1.5">
              Made by <span className="font-semibold text-gray-300 ml-0.5">Nischaya Garg</span>
            </p>
          </div>

        </div>
      </div>
    </footer>
  );
};
