import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

const faqs = [
    {
        q: "Do I have to pay to use ResumifyNG?",
        a: "No! You can sign up completely free and get a taste of our powerful ATS scoring and AI interview capabilities. To unlock unlimited sessions, our premium membership is highly affordable."
    },
    {
        q: "Is my voice recorded during the mock interview?",
        a: "We process your voice in real-time using secure browser APIs to generate instantaneous AI responses. We do save your text-based transcripts so you can review your performance later, but we never store audio files."
    },
    {
        q: "What file formats are supported?",
        a: "We support standard PDFs, DOCX (Microsoft Word), and direct .tex (LaTeX) files."
    },
    {
        q: "How accurate is the ATS scoring?",
        a: "Our ATS engine utilizes a fine-tuned deterministic strict-JSON pipeline running on Llama 3 models. It cross-references your exact skills against the Job Description precisely how enterprise ATS software does."
    }
];

export const FAQ: React.FC = () => {
    const [openIndex, setOpenIndex] = useState<number | null>(0);

    return (
        <section id="faq" className="py-20 md:py-24 bg-transparent relative">
            <div className="container mx-auto px-4 max-w-3xl">
                <div className="text-center mb-12 flex flex-col items-center">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="inline-flex items-center justify-center px-4 py-1.5 rounded-full border border-[#4A70A9]/40 bg-[#050B14] mb-6"
                    >
                        <span className="text-sm font-medium text-[#8FABD4] uppercase tracking-wider">FAQ</span>
                    </motion.div>
                    <h2 className="text-3xl sm:text-4xl md:text-5xl font-heading font-bold text-[#EFECE3] mb-4">
                        Frequently Asked <span className="text-[#8FABD4]">Questions</span>
                    </h2>
                </div>

                <div className="space-y-4">
                    {faqs.map((faq, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 10 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.1 }}
                            className="border border-[#4A70A9]/30 rounded-2xl overflow-hidden bg-[#0A1120]"
                        >
                            <button
                                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                                className="w-full px-6 py-5 flex items-center justify-between text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8FABD4]"
                            >
                                <span className="font-bold text-[#EFECE3] text-base sm:text-lg">{faq.q}</span>
                                <ChevronDown
                                    className={`w-5 h-5 text-[#8FABD4] transition-transform duration-300 ${openIndex === i ? 'rotate-180' : ''
                                        }`}
                                />
                            </button>

                            <AnimatePresence>
                                {openIndex === i && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                                    >
                                        <div className="px-6 pb-6 text-gray-400 text-sm sm:text-base leading-relaxed border-t border-[#4A70A9]/10 pt-4">
                                            {faq.a}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
};
