import React from 'react';
import { motion } from 'framer-motion';

const techStack = [
  { name: 'FastAPI', type: 'Backend' },
  { name: 'Python 3.11', type: 'Language' },
  { name: 'React 18', type: 'Frontend' },
  { name: 'spaCy', type: 'NLP' },
  { name: 'LangChain', type: 'AI' },
  { name: 'Pusher', type: 'Real-time' },
  { name: 'Framer Motion', type: 'UI' },
  { name: 'gTTS', type: 'Audio' },
];

export const TechStack: React.FC = () => {
  return (
    <section id="tech" className="py-20 bg-transparent relative overflow-hidden">
      <div className="absolute inset-0 bg-[#000000] z-0"></div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="bg-gradient-to-br from-[#050B14] to-[#000000] border border-[#4A70A9]/30 rounded-[2.5rem] p-8 md:p-16 shadow-[0_0_50px_rgba(74,112,169,0.1)]">
          <div className="flex flex-col md:flex-row items-center justify-between gap-12">

            <div className="md:w-1/2">
              <h2 className="text-3xl md:text-4xl font-heading font-bold text-[#EFECE3] mb-6">
                Built with a <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#8FABD4] to-[#4A70A9]">Robust Tech Stack</span>
              </h2>
              <p className="text-gray-400 text-lg mb-8 leading-relaxed">
                We leverage the speed of FastAPI, the intelligence of modern NLP, and the interactivity of React to deliver a seamless experience.
              </p>

              <div className="flex flex-wrap gap-3">
                {techStack.map((tech, i) => (
                  <span key={i} className="px-4 py-2 rounded-full bg-[#0A1120] border border-[#4A70A9]/40 text-[#8FABD4] text-sm font-medium hover:bg-[#4A70A9]/20 transition-colors shadow-sm">
                    {tech.name}
                  </span>
                ))}
              </div>
            </div>

            <div className="md:w-1/2 w-full">
              {/* Abstract Code/Architecture Visualization */}
              <div className="relative w-full aspect-video bg-[#000000]/60 rounded-3xl border border-[#4A70A9]/30 p-6 backdrop-blur-sm flex flex-col justify-center items-center overflow-hidden">
                <div className="absolute inset-0 bg-grid-white/[0.02] [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))]"></div>

                <div className="flex items-center gap-4 mb-8 w-full justify-center">
                  <motion.div
                    animate={{ y: [0, -10, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="w-16 h-16 rounded-2xl bg-[#0A1120] flex items-center justify-center border border-[#8FABD4]/50 shadow-md z-10"
                  >
                    <span className="font-bold text-[#EFECE3]">React</span>
                  </motion.div>
                  <div className="h-0.5 w-12 bg-[#4A70A9]/30 relative overflow-hidden">
                    <motion.div
                      animate={{ x: [-50, 50] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                      className="absolute inset-0 bg-[#8FABD4]/80 w-1/2"
                    />
                  </div>
                  <motion.div
                    animate={{ y: [0, -10, 0] }}
                    transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                    className="w-16 h-16 rounded-2xl bg-[#0A1120] flex items-center justify-center border border-[#4A70A9]/50 shadow-md z-10"
                  >
                    <span className="font-bold text-[#EFECE3]">FastAPI</span>
                  </motion.div>
                </div>

                <div className="w-full bg-[#050B14]/80 rounded-xl p-4 font-mono text-xs text-[#EFECE3] border border-[#4A70A9]/20 shadow-inner z-10">
                  <p className="mb-1"><span className="text-[#8FABD4]">POST</span> /api/interview</p>
                  <p className="mb-1"><span className="text-gray-500">{`{`}</span> "session": "active", "audio": <span className="text-yellow-500">Blob</span> <span className="text-gray-500">{`}`}</span></p>
                  <p className="text-green-500">{`>>> Processing NLP & TTS...`}</p>
                </div>

              </div>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
};
