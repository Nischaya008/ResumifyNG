import React from 'react';
import { motion } from 'framer-motion';
import { Quote } from 'lucide-react';

const testimonials = [
    {
        quote: "The ATS feedback was brutal but exactly what I needed. I added the missing React and AWS keywords it suggested, and immediately started getting callbacks.",
        author: "Ansh Soni",
        role: "Data Analyst"
    },
    {
        quote: "The AI Hiring Manager asked me a system design question I completely bombed in the mock interview. Two days later, a real recruiter asked me the EXACT same concept. I nailed it because of ResumifyNG.",
        author: "Shreshta",
        role: "Backend Developer"
    },
    {
        quote: "I've tried 5 different resume parsers and none of them perfectly grouped my LaTeX project experience like this one. It's magical. Saved me hours of editing.",
        author: "Priya Menon",
        role: "Chartered Accountant"
    },
    {
        quote: "The voice interactions in the mock interviews feel incredibly real. It's genuinely stressful in a good way. Helped me stop saying 'umm' so much.",
        author: "Vinayak Kumar",
        role: "HR Recruiter"
    },
    {
        quote: "I didn't realize how much my resume lacked clear metrics until the ATS feedback highlighted my weakbullet points. Landed a FAANG offer a month later.",
        author: "Kavya Singh",
        role: "Data Scientist"
    },
    {
        quote: "Best 50 bucks I've ever spent. The unlimited AI interviews meant I could practice my specific JD over and over until my pitch was flawless.",
        author: "Aman Gupta",
        role: "Full Stack Dev"
    },
    {
        quote: "The fact that it directly analyzes exactly what the hiring managers are looking for using the JD is a gamechanger. I don't use anything else now.",
        author: "Deepak Randhawa",
        role: "DevOps Engineer"
    },
    {
        quote: "The UI is incredibly sleek, but the backend NLP engine is the real star. The skill gap analysis chart is an eye opener for where I need to improve.",
        author: "Sneha Patel",
        role: "Machine Learning Engineer"
    }
];

export const Testimonials: React.FC = () => {
    // Duplicate for seamless infinite scroll
    const marqueeItems = [...testimonials, ...testimonials];

    return (
        <section id="testimonials" className="py-20 md:py-24 bg-transparent relative overflow-hidden">
            <div className="absolute inset-0 bg-[#050B14]/40 z-0 border-y border-[#4A70A9]/20" />
            <div className="absolute inset-0 z-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] pointer-events-none" />

            <div className="container mx-auto px-4 relative z-10">
                <div className="text-center mb-16 md:mb-20">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="inline-flex items-center justify-center px-4 py-1.5 rounded-full border border-[#4A70A9]/40 bg-[#000000] mb-6 shadow-sm"
                    >
                        <span className="text-sm font-medium text-[#8FABD4] uppercase tracking-wider">Social Proof</span>
                    </motion.div>
                    <h2 className="text-3xl sm:text-4xl md:text-5xl font-heading font-bold text-[#EFECE3] mb-4">
                        Trusted by <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#8FABD4] to-[#4A70A9]">Top Talent</span>
                    </h2>
                </div>

                {/* Marquee Container */}
                <div className="relative w-full overflow-hidden flex [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
                    <motion.div
                        className="flex gap-6 sm:gap-8 w-max"
                        animate={{
                            x: ["0%", "-50%"]
                        }}
                        transition={{
                            ease: "linear",
                            duration: 40,
                            repeat: Infinity,
                        }}
                    >
                        {marqueeItems.map((t, i) => (
                            <div
                                key={i}
                                className="w-[320px] sm:w-[400px] shrink-0 bg-[#0A1120] border border-[#4A70A9]/40 rounded-3xl p-6 sm:p-8 relative shadow-[0_10px_40px_rgba(0,0,0,0.4)] hover:border-[#8FABD4]/50 transition-colors"
                            >
                                <Quote className="absolute top-6 right-8 w-10 h-10 sm:w-12 sm:h-12 text-[#4A70A9]/10" />

                                <div className="mb-6">
                                    <div className="flex gap-1 mb-4">
                                        {[...Array(5)].map((_, j) => (
                                            <svg key={j} className="w-4 h-4 text-yellow-500 fill-current" viewBox="0 0 20 20">
                                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                            </svg>
                                        ))}
                                    </div>
                                    <p className="text-gray-300 text-sm sm:text-base italic leading-relaxed font-heading relative z-10 w-full line-clamp-4 min-h-[5.5rem]">
                                        "{t.quote}"
                                    </p>
                                </div>

                                <div className="flex items-center gap-3 pt-4 border-t border-[#4A70A9]/20">
                                    <div className="w-10 h-10 rounded-full bg-[#4A70A9] flex items-center justify-center text-white font-bold text-base font-heading shadow-inner shrink-0">
                                        {t.author.charAt(0)}
                                    </div>
                                    <div>
                                        <h4 className="text-[#EFECE3] font-bold text-sm sm:text-base line-clamp-1">{t.author}</h4>
                                        <p className="text-[#8FABD4] text-xs sm:text-sm line-clamp-1">{t.role}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </motion.div>
                </div>
            </div>
        </section>
    );
};
