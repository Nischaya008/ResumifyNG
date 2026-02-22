import React from 'react';
import { motion } from 'framer-motion';
import { Target, MonitorPlay, Code2, LineChart, Zap } from 'lucide-react';

const features = [
  {
    icon: Target,
    title: "Don't Guess. Know Your Score.",
    desc: "Stop sending your resume into a black hole. Our advanced LLM-powered engine analyzes your resume against any Job Description with pinpoint precision. We highlight missing technical skills and provide an industry-aligned score out of 100.",
    color: "bg-blue-500"
  },
  {
    icon: MonitorPlay,
    title: "Practice with the Ultimate AI",
    desc: "Feel the pressure before the real thing. Connect your microphone and experience a real-time, zero-latency conversational interview. Tailored specifically to your resume, our AI probes your weaknesses and tests your knowledge.",
    color: "bg-purple-500"
  },
  {
    icon: Code2,
    title: "Integrated LaTeX Editor",
    desc: "Built for Engineers & Academics. Prefer coding your resume? Use our built-in LaTeX editor to write, compile, and instantly analyze your .tex resume files directly in the browser.",
    color: "bg-emerald-500"
  },
  {
    icon: LineChart,
    title: "Track Your Growth",
    desc: "Watch your ATS standing improve over time with our authentic, real-time ATS Performance graph. Dive into your Profile to view your Lifetime Skill Gap Analysis. Track your total mock interviews, review past resumes, and download full .txt interview transcripts.",
    color: "bg-orange-500"
  },
  {
    icon: Zap,
    title: "Seamless Experience Across Devices",
    desc: "Time is money. Use our Quick Action buttons to instantly upload your latest resume. With intelligent local caching, your resume analysis requires zero re-processing. Fully optimized with custom navbar support for both desktop and mobile, practice seamlessly.",
    color: "bg-pink-500"
  }
];

export const Features: React.FC = () => {
  return (
    <section id="features" className="py-20 md:py-24 bg-transparent relative">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="mb-12 md:mb-16 text-center max-w-4xl mx-auto">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-heading font-bold text-[#EFECE3] mb-4 md:mb-6">
            Everything you need to <span className="text-[#8FABD4]">get hired.</span>
          </h2>
          <p className="text-gray-400 text-base sm:text-lg px-2">
            Our platform combines the power of ultra-low latency LLMs, real-time audio processing, and sleek design to give you the competitive edge.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 lg:gap-8 max-w-6xl mx-auto">
          {features.map((feature, index) => {
            const isLastOdd = index === features.length - 1 && features.length % 2 !== 0;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -5 }}
                className={`group relative bg-[#050B14]/50 border border-[#4A70A9]/30 rounded-3xl p-6 sm:p-8 overflow-hidden hover:border-[#8FABD4]/50 transition-all duration-300 shadow-[0_4px_20px_rgba(0,0,0,0.5)] flex flex-col h-full ${isLastOdd ? 'md:col-span-2 md:w-[calc(50%-0.75rem)] lg:w-[calc(50%-1rem)] md:justify-self-center' : ''
                  }`}
              >
                <div className={`absolute top-0 right-0 w-32 h-32 ${feature.color} opacity-[0.05] blur-[50px] rounded-full group-hover:opacity-[0.15] transition-opacity duration-500`} />

                <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl ${feature.color}/20 flex items-center justify-center mb-5 sm:mb-6 group-hover:scale-110 transition-transform duration-300`}>
                  <feature.icon className={`w-6 h-6 sm:w-7 sm:h-7 text-[#8FABD4]`} />
                </div>

                <h3 className="text-lg sm:text-xl font-bold text-[#EFECE3] mb-3 font-heading">{feature.title}</h3>
                <p className="text-gray-400 text-sm sm:text-base leading-relaxed flex-grow">
                  {feature.desc}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
