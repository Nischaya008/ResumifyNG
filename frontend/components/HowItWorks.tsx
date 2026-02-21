import React from 'react';
import { motion } from 'framer-motion';
import { UploadCloud, FileText, MicVocal } from 'lucide-react';

const steps = [
    {
        icon: UploadCloud,
        title: "Upload Your Profile",
        desc: "Drag and drop your PDF, DOCX, or write raw LaTeX. We handle the rest, parsing your personal info, projects, and work experience flawlessly."
    },
    {
        icon: FileText,
        title: "Target a Job Description",
        desc: "Paste the exact JD you want. Our system immediately cross-references your profile against the actual market requirements, giving you actionable feedback."
    },
    {
        icon: MicVocal,
        title: "Face the AI Interviewer",
        desc: "Click 'Conduct Interview.' Let our voice-activated AI put you in the hot seat with targeted, dynamic technical questions mapped directly to your skills."
    }
];

export const HowItWorks: React.FC = () => {
    return (
        <section id="how-it-works" className="py-20 md:py-24 bg-transparent relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-t from-[#0A1120] to-transparent z-0 opacity-50" />

            <div className="container mx-auto px-4 sm:px-6 relative z-10">
                <div className="text-center mb-16 md:mb-20">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="inline-flex items-center justify-center px-4 py-1.5 rounded-full border border-[#4A70A9]/40 bg-[#050B14] mb-6"
                    >
                        <span className="text-sm font-medium text-[#8FABD4] uppercase tracking-wider">Process</span>
                    </motion.div>
                    <h2 className="text-3xl sm:text-4xl md:text-5xl font-heading font-bold text-[#EFECE3] mb-4 md:mb-6">
                        How It <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#8FABD4] to-[#4A70A9]">Works</span>
                    </h2>
                    <p className="text-gray-400 max-w-2xl mx-auto text-base sm:text-lg">
                        The 3-Step path to landing your next offer. Fast, secure, and incredibly effective.
                    </p>
                </div>

                <div className="relative max-w-5xl mx-auto">
                    {/* Connecting Line (Desktop) */}
                    <div className="hidden md:block absolute top-[45px] left-[10%] right-[10%] h-0.5 bg-gradient-to-r from-transparent via-[#4A70A9]/30 to-transparent z-0" />

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8">
                        {steps.map((step, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: index * 0.2 }}
                                className="relative flex flex-col items-center text-center z-10"
                            >
                                <div className="w-24 h-24 rounded-[2rem] bg-[#0A1120] border border-[#4A70A9]/50 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(74,112,169,0.2)] transform rotate-3 hover:rotate-0 transition-transform duration-300">
                                    <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-[#4A70A9] flex items-center justify-center text-white font-bold text-sm shadow-md z-20">
                                        {index + 1}
                                    </div>
                                    <step.icon className="w-10 h-10 text-[#8FABD4]" />
                                </div>

                                <h3 className="text-xl sm:text-2xl font-bold text-[#EFECE3] mb-4 font-heading">{step.title}</h3>
                                <p className="text-gray-400 text-sm sm:text-base leading-relaxed px-2">
                                    {step.desc}
                                </p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
};
