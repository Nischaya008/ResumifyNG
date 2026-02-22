import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Target, Send, ArrowLeft, Bot, User, Loader2, Mic, MicOff, Volume2, VolumeX, Download, LogOut } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';

interface Message {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export const Interview: React.FC = () => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [interimText, setInterimText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isInitializing, setIsInitializing] = useState(true);
    const [errorState, setErrorState] = useState<string | null>(null);
    const [isQuotaExceeded, setIsQuotaExceeded] = useState(false);
    const [isSttSupported, setIsSttSupported] = useState(true);
    const [hasSavedTranscript, setHasSavedTranscript] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const parsedResumeRef = useRef<any>(null);
    const jdTextRef = useRef<string>("");

    const hasInitialized = useRef(false);

    useEffect(() => {
        const checkAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                window.location.href = '/onboard';
            }
        };
        checkAuth();
    }, []);

    const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    // Voice / Web Speech API State & Refs
    const [isMuted, setIsMuted] = useState(false);
    const isMutedRef = useRef(false);
    const [isListening, setIsListening] = useState(false);
    const recognitionRef = useRef<any>(null);
    const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

    const isListeningRef = useRef(false);

    const toggleMute = () => {
        setIsMuted(prev => {
            const newVal = !prev;
            isMutedRef.current = newVal;
            if (newVal) {
                window.speechSynthesis.cancel();
            }
            return newVal;
        });
    };

    const startListening = () => {
        if (recognitionRef.current && isSttSupported) {
            try {
                isListeningRef.current = true;
                setIsListening(true);
                recognitionRef.current.start();
            } catch (e) {
                // Ignore if already started
            }
        }
    };

    const stopListening = () => {
        isListeningRef.current = false;
        setIsListening(false);
        if (recognitionRef.current) {
            try {
                recognitionRef.current.stop();
            } catch (e) {
                // Ignore
            }
        }
    };

    const playTTS = (text: string) => {
        if (isMutedRef.current) {
            if (!isMobileDevice) {
                startListening();
            }
            return;
        }

        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);

        const voices = window.speechSynthesis.getVoices();
        const englishVoices = voices.filter(v => v.lang.startsWith('en'));
        if (englishVoices.length > 0) {
            const preferred = englishVoices.find(v => v.name.includes('Google') || v.name.includes('Natural')) || englishVoices[0];
            utterance.voice = preferred;
        }

        // Increased TTS speed slightly as requested
        utterance.rate = 1.1;

        utterance.onend = () => {
            if (!isMobileDevice) {
                startListening();
            }
        };

        const cleanText = text.replace(/```[\s\S]*?```/g, '').replace(/[#*_~]/g, '');
        utterance.text = cleanText;

        utteranceRef.current = utterance;
        window.speechSynthesis.speak(utterance);
    };

    useEffect(() => {
        const ua = navigator.userAgent;
        const isChrome = /Chrome/.test(ua) && /Google Inc/.test(navigator.vendor);
        const isSafari = /Safari/.test(ua) && /Apple Computer/.test(navigator.vendor);
        const isEdge = /Edg/.test(ua);
        const isBrave = (navigator as any).brave !== undefined;

        const hasApi = !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

        if (!hasApi || (!isChrome && !isSafari && !isEdge) || isBrave) {
            setIsSttSupported(false);
            return;
        }

        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SpeechRecognition) {
            const recognition = new SpeechRecognition();
            // Force continuous to false for better compatibility with Edge & Mobile devices, onend loop will handle keeping it alive.
            recognition.continuous = false;
            recognition.interimResults = true;
            recognition.lang = 'en-US';

            recognition.onresult = (event: any) => {
                let interimTranscript = '';
                let finalStr = '';
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        finalStr += event.results[i][0].transcript;
                    } else {
                        interimTranscript += event.results[i][0].transcript;
                    }
                }

                if (finalStr) {
                    setInputValue(prev => {
                        const spacer = prev && !prev.endsWith(' ') ? ' ' : '';
                        return prev + spacer + finalStr.trim();
                    });
                }
                setInterimText(interimTranscript);
            };

            recognition.onerror = (event: any) => {
                if (event.error !== 'no-speech') {
                    console.warn('Speech recognition error:', event.error);
                }
                // Only explicitly kill the mic if the user denied permission
                if (event.error === 'not-allowed') {
                    isListeningRef.current = false;
                    setIsListening(false);
                    toast.error("Microphone access denied.");
                } else if (event.error === 'network') {
                    toast.error("STT Network Error. Your browser might not support Web Speech, or you may be offline.", { id: 'stt-network-err', duration: 4000 });
                }
                // For 'network', 'no-speech', etc., we do nothing else here and let onend restart it
            };

            recognition.onend = () => {
                // Keep the mic alive if the user hasn't explicitly stopped it
                if (isListeningRef.current) {
                    if (isMobileDevice) {
                        isListeningRef.current = false;
                        setIsListening(false);
                        return;
                    }
                    // Slight delay to prevent aggressive browser rate-limit blocking
                    setTimeout(() => {
                        if (isListeningRef.current) {
                            try {
                                recognition.start();
                            } catch (e) {
                                // Usually throws if already started somehow, safe to ignore
                            }
                        }
                    }, 100);
                } else {
                    setIsListening(false);
                }
            };

            recognitionRef.current = recognition;
        }

        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
            window.speechSynthesis.cancel();
        };
    }, []);

    useEffect(() => {
        const checkSetupAndInit = async () => {
            // First check user quota
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await supabase.from('profiles').select('membership_tier').eq('id', user.id).single();
                const { count } = await supabase.from('interviews').select('*', { count: 'exact', head: true }).eq('user_id', user.id);
                if (profile?.membership_tier === 'guest' && count && count >= 1) {
                    setIsQuotaExceeded(true);
                    setIsInitializing(false);
                    return;
                }
            }

            // 1. Check local storage for parsed resume and JD
            const storedResumeStr = localStorage.getItem('parsed_resume_cache');
            const storedJdStr = localStorage.getItem('jdText_cache');

            let isValidCache = false;

            if (storedResumeStr && storedJdStr) {
                try {
                    const storedResumeObj = JSON.parse(storedResumeStr);
                    const storedJdObj = JSON.parse(storedJdStr);

                    const now = new Date().getTime();
                    const TEN_DAYS_MS = 10 * 24 * 60 * 60 * 1000;

                    if (
                        storedResumeObj.timestamp && (now - storedResumeObj.timestamp) < TEN_DAYS_MS &&
                        storedJdObj.timestamp && (now - storedJdObj.timestamp) < TEN_DAYS_MS
                    ) {
                        parsedResumeRef.current = storedResumeObj.parsed_resume;
                        jdTextRef.current = storedJdObj.text;
                        isValidCache = true;
                    } else {
                        // Clear expired cache
                        localStorage.removeItem('parsed_resume_cache');
                        localStorage.removeItem('jdText_cache');
                    }
                } catch (e) {
                    console.error("Invalid data format in cache:", e);
                    localStorage.removeItem('parsed_resume_cache');
                    localStorage.removeItem('jdText_cache');
                }
            }

            if (!isValidCache) {
                setErrorState("Missing data");
                setIsInitializing(false);
                return;
            }

            // Valid cache, start interview silently guarding against double-calls
            if (!hasInitialized.current) {
                hasInitialized.current = true;
                startInterview();
            }
        };

        checkSetupAndInit();
    }, []);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.scrollLeft = inputRef.current.scrollWidth;
        }
    }, [inputValue, interimText]);

    const startInterview = async () => {
        setIsInitializing(false);
        setIsLoading(true);
        await fetchNextMessage([]);
    };

    const fetchNextMessage = async (currentHistory: Message[]) => {
        try {
            const payload = {
                personal_info: parsedResumeRef.current.personal_information,
                skills: parsedResumeRef.current.skills || [],
                education: parsedResumeRef.current.education
                    ? parsedResumeRef.current.education.map((e: any) => `${e.degree || ''} at ${e.institution || ''}`.trim())
                    : [],
                experience: parsedResumeRef.current.work_experience
                    ? parsedResumeRef.current.work_experience.map((e: any) => `${e.job_title || ''} at ${e.company || ''}`.trim())
                    : [],
                projects: parsedResumeRef.current.projects
                    ? parsedResumeRef.current.projects.map((p: any) => p.name || '')
                    : [],
                jd: jdTextRef.current,
                history: currentHistory.map(m => ({ role: m.role, content: m.content }))
            };

            const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/interview`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok || !response.body) {
                throw new Error('Network response was not ok');
            }

            // Add a blank placeholder message for the assistant that we will append to
            setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

            const reader = response.body.getReader();
            const decoder = new TextDecoder('utf-8');

            let fullAssistantResponse = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) {
                    playTTS(fullAssistantResponse);
                    break;
                }

                const chunk = decoder.decode(value, { stream: true });
                fullAssistantResponse += chunk;

                // Append chunk to the latest message continuously
                setMessages(prev => {
                    const newMessages = [...prev];
                    const lastIndex = newMessages.length - 1;
                    const lastMessage = newMessages[lastIndex];

                    if (lastMessage && lastMessage.role === 'assistant') {
                        // Create a NEW object instead of mutating to prevent StrictMode double-call bugs
                        newMessages[lastIndex] = {
                            ...lastMessage,
                            content: lastMessage.content + chunk
                        };
                    }
                    return newMessages;
                });
            }

        } catch (error) {
            console.error("Error fetching stream:", error);
            setMessages(prev => [...prev, { role: 'assistant', content: 'Connection lost. Please try again.' }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSend = async () => {
        const finalContent = (inputValue + ' ' + interimText).trim();
        if (!finalContent || isLoading) return;

        stopListening();
        window.speechSynthesis.cancel();

        const userMsg: Message = { role: 'user', content: finalContent };
        const updatedHistory = [...messages, userMsg];

        setMessages(updatedHistory);
        setInputValue('');
        setInterimText('');
        setIsLoading(true);

        await fetchNextMessage(updatedHistory);
    };

    const handleDownloadTranscript = async () => {
        if (messages.length === 0) {
            toast.error("No transcript to download yet.");
            return;
        }

        const userMessages = messages.filter(m => m.role === 'user');
        const questionsCount = userMessages.length;

        let transcriptText = "AI Interview Transcript\n=======================\n\n";
        messages.forEach(msg => {
            const roleName = msg.role === 'user' ? 'You' : 'AI';
            transcriptText += `${roleName}: ${msg.content}\n\n`;
        });

        const todayStr = new Date().toLocaleDateString('en-US').replace(/\//g, '-');
        const fileName = `Interview_${todayStr}.txt`;

        const loadingToast = toast.loading("Saving transcript...");

        try {
            if (!hasSavedTranscript) {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    const { error } = await supabase.from('interviews').insert({
                        user_id: user.id,
                        transcript: transcriptText,
                        questions_count: questionsCount
                    });

                    if (error) {
                        console.error("Failed to save transcript to DB:", error);
                        toast.error("Failed to save to database, but download will proceed.", { id: loadingToast });
                    } else {
                        setHasSavedTranscript(true);
                        toast.success("Transcript saved and downloaded!", { id: loadingToast });
                    }
                } else {
                    toast.dismiss(loadingToast);
                }
            } else {
                toast.success("Transcript downloaded!", { id: loadingToast });
            }

            const metadata = `\n=======================\n\nAI-Interview conducted on https://resumifyng.vercel.app at ${new Date().toLocaleString('en-US')}\n`;
            const blob = new Blob([transcriptText + metadata], { type: "text/plain" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

        } catch (error) {
            console.error(error);
            toast.error("An error occurred while saving the transcript.", { id: loadingToast });
        }
    };

    const handleExit = async () => {
        if (messages.length > 0 && !hasSavedTranscript) {
            const userMessages = messages.filter(m => m.role === 'user');
            const questionsCount = userMessages.length;

            let transcriptText = "AI Interview Transcript\n=======================\n\n";
            messages.forEach(msg => {
                const roleName = msg.role === 'user' ? 'You' : 'AI';
                transcriptText += `${roleName}: ${msg.content}\n\n`;
            });

            const loadingToast = toast.loading("Saving transcript before exit...");

            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    await supabase.from('interviews').insert({
                        user_id: user.id,
                        transcript: transcriptText,
                        questions_count: questionsCount
                    });
                }
                toast.success("Transcript saved!", { id: loadingToast });
            } catch (error) {
                console.error(error);
                toast.dismiss(loadingToast);
            }
        }

        stopListening();
        window.speechSynthesis.cancel();

        window.history.pushState({}, '', '/home');
        window.dispatchEvent(new PopStateEvent('popstate'));
    };

    // --- Fallback View ---
    if (isQuotaExceeded) {
        return (
            <div className="relative w-full h-screen bg-[#334155] p-2 md:p-3 lg:p-4 flex flex-col overflow-hidden">
                <main className="flex-1 bg-[#000000] rounded-[2rem] md:rounded-[2.5rem] relative shadow-2xl ring-1 ring-[#475569] p-6 lg:p-10 flex flex-col items-center justify-center text-center">
                    <div className="bg-[#0A1120] border border-[#8FABD4]/30 rounded-3xl p-10 max-w-xl w-full shadow-[0_0_30px_rgba(143,171,212,0.15)] relative overflow-hidden">
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#4A70A9] to-[#8FABD4]"></div>
                        <Target className="w-16 h-16 text-[#8FABD4] mx-auto mb-6 opacity-80" />
                        <h2 className="text-2xl font-heading font-bold text-[#EFECE3] mb-4">Interview Limit Reached</h2>
                        <p className="text-gray-400 mb-8 leading-relaxed">
                            You've used your free interview allowance. Upgrade your plan to unlock unlimited AI interviews and land your dream job faster.
                        </p>
                        <div className="flex flex-col gap-3">
                            <button
                                onClick={() => window.location.href = '/plan'}
                                className="bg-[#4A70A9] hover:bg-[#5C85C5] text-white px-8 py-3 rounded-xl font-semibold shadow-md transition-all flex items-center justify-center w-full"
                            >
                                View Premium Plans
                            </button>
                            <button
                                onClick={handleExit}
                                className="bg-transparent hover:bg-[#1a2333] border border-[#334155] text-gray-400 hover:text-white px-8 py-3 rounded-xl font-semibold transition-all flex items-center justify-center w-full"
                            >
                                <ArrowLeft className="w-4 h-4 mr-2" /> Return to Dashboard
                            </button>
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    if (errorState) {
        return (
            <div className="relative w-full h-screen bg-[#334155] p-2 md:p-3 lg:p-4 flex flex-col overflow-hidden">
                <main className="flex-1 bg-[#000000] rounded-[2rem] md:rounded-[2.5rem] relative shadow-2xl ring-1 ring-[#475569] p-6 lg:p-10 flex flex-col items-center justify-center text-center">
                    <div className="bg-[#0A1120] border border-[#4A70A9]/30 rounded-3xl p-10 max-w-xl w-full shadow-[0_0_30px_rgba(74,112,169,0.1)]">
                        <Target className="w-16 h-16 text-[#4A70A9] mx-auto mb-6" />
                        <h2 className="text-2xl font-heading font-bold text-[#EFECE3] mb-4">Interview Setup Required</h2>
                        <p className="text-gray-400 mb-8">
                            A parsed resume and a job description are required to tailor the interview. Please run the resume analysis first.
                        </p>
                        <button
                            onClick={handleExit}
                            className="bg-[#4A70A9] hover:bg-[#5C85C5] text-white px-8 py-3 rounded-xl font-semibold shadow-md transition-all flex items-center justify-center gap-2 mx-auto w-full max-w-[200px]"
                        >
                            <ArrowLeft className="w-4 h-4" /> Go Back
                        </button>
                    </div>
                </main>
            </div>
        );
    }

    // --- Normal View ---
    return (
        <div className="relative w-full min-h-[100dvh] lg:h-[100dvh] bg-[#334155] flex flex-col lg:overflow-hidden">
            <div className="flex-1 w-full flex flex-col p-2 md:p-3 lg:p-4 py-12 sm:py-2 md:py-3 lg:py-4 transform scale-[0.95] lg:scale-100 origin-top lg:origin-center lg:pt-4">
                <main className="flex-1 bg-[#000000] rounded-[2rem] md:rounded-[2.5rem] relative shadow-2xl ring-1 ring-[#475569] flex flex-col lg:overflow-hidden border border-[#334155]/50 min-h-[85vh] lg:min-h-0">

                    {/* Header */}
                    <div className="bg-[#0A1120] border-b border-[#4A70A9]/20 px-6 py-4 flex items-center justify-between shrink-0 shadow-sm z-10">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={handleExit}
                                className="w-10 h-10 rounded-full bg-[#1a2333] flex items-center justify-center text-gray-400 hover:text-white hover:bg-[#334155] transition-colors"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#4A70A9] to-[#8FABD4] p-[2px] shadow-[0_0_15px_rgba(74,112,169,0.3)]">
                                    <div className="w-full h-full bg-[#0A1120] rounded-full flex items-center justify-center">
                                        <Bot className="w-5 h-5 text-[#8FABD4]" />
                                    </div>
                                </div>
                                <div>
                                    <h1 className="font-heading font-bold text-[#EFECE3] text-lg">AI Technical Interview</h1>
                                    <div className="flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                        <span className="text-xs text-emerald-400">Agent Connected</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        {/* Speaker & Download Toggle Buttons */}
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleDownloadTranscript}
                                className="w-10 h-10 rounded-full flex items-center justify-center transition-colors bg-[#4A70A9]/20 text-[#8FABD4] hover:bg-[#4A70A9]/30"
                                title="Download Transcript"
                            >
                                <Download className="w-5 h-5" />
                            </button>
                            <button
                                onClick={toggleMute}
                                className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${isMuted
                                    ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20'
                                    : 'bg-[#4A70A9]/20 text-[#8FABD4] hover:bg-[#4A70A9]/30'
                                    }`}
                            >
                                {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>

                    {/* Chat Area */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-gradient-to-b from-[#050B14] to-[#000000]">
                        <div className="max-w-4xl mx-auto flex flex-col gap-6">

                            {isInitializing && (
                                <div className="flex justify-center items-center py-20 opacity-50">
                                    <Loader2 className="w-8 h-8 text-[#4A70A9] animate-spin" />
                                </div>
                            )}

                            {messages.map((msg, index) => (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className={`flex gap-4 max-w-[85%] ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
                                >
                                    {/* Avatar */}
                                    <div className="shrink-0 pt-1">
                                        {msg.role === 'user' ? (
                                            <div className="w-8 h-8 rounded-full bg-[#334155] flex items-center justify-center shadow-md">
                                                <User className="w-4 h-4 text-[#8FABD4]" />
                                            </div>
                                        ) : (
                                            <div className="w-8 h-8 rounded-full bg-[#4A70A9]/20 border border-[#4A70A9]/30 flex items-center justify-center shadow-md">
                                                <Bot className="w-4 h-4 text-[#8FABD4]" />
                                            </div>
                                        )}
                                    </div>

                                    {/* Bubble */}
                                    <div className={`p-4 rounded-2xl shadow-sm leading-relaxed ${msg.role === 'user'
                                        ? 'bg-[#4A70A9] text-white rounded-tr-sm'
                                        : 'bg-[#0A1120] text-[#EFECE3] border border-[#4A70A9]/30 rounded-tl-sm shadow-[0_5px_15px_rgba(74,112,169,0.05)]'
                                        }`}>
                                        <p className="whitespace-pre-wrap text-sm md:text-base">{msg.content}</p>
                                    </div>
                                </motion.div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>
                    </div>

                    {/* Input Area */}
                    <div className="p-4 md:p-6 bg-[#0A1120] border-t border-[#4A70A9]/20 shrink-0 z-10">
                        <div className="max-w-4xl mx-auto flex gap-3">
                            {isSttSupported && (
                                <button
                                    onClick={() => {
                                        if (isListening) {
                                            stopListening();
                                        } else {
                                            startListening();
                                        }
                                    }}
                                    className={`w-12 shrink-0 rounded-xl transition-all shadow-md flex items-center justify-center ${isListening
                                        ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse'
                                        : 'bg-[#1a2333] hover:bg-[#334155] border border-[#334155]/50 text-gray-400 hover:text-white'
                                        }`}
                                >
                                    {isListening ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                                </button>
                            )}
                            <input
                                ref={inputRef}
                                type="text"
                                disabled={isLoading || isInitializing}
                                value={inputValue + (interimText ? (inputValue ? ' ' : '') + interimText : '')}
                                onChange={e => {
                                    setInputValue(e.target.value);
                                    setInterimText(''); // clear interim if user manually types
                                }}
                                onKeyDown={e => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSend();
                                    }
                                }}
                                placeholder={isLoading ? "Interviewer is typing..." : "Type or speak your response..."}
                                className="flex-1 bg-[#1a2333] border border-[#334155]/50 focus:border-[#4A70A9] rounded-xl px-4 py-3 text-[#EFECE3] placeholder:text-gray-500 focus:outline-none transition-colors"
                            />
                            <button
                                onClick={handleSend}
                                disabled={isLoading || !inputValue.trim() || isInitializing}
                                className="w-12 shrink-0 bg-[#4A70A9] hover:bg-[#5C85C5] disabled:bg-[#334155] disabled:cursor-not-allowed text-white rounded-xl transition-all shadow-md flex items-center justify-center"
                            >
                                <Send className="w-5 h-5" />
                            </button>
                            <button
                                onClick={handleExit}
                                className="w-12 md:w-auto md:px-4 shrink-0 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
                                title="Exit Interview"
                            >
                                <div className="hidden md:block text-sm font-semibold">Exit</div>
                                <LogOut className="w-5 h-5" />
                            </button>
                        </div>
                        {isSttSupported ? (
                            <p className="text-center text-xs text-gray-500 mt-3 hidden md:block">Press <kbd className="font-mono bg-[#1a2333] px-1.5 py-0.5 rounded text-gray-400 mx-1">Enter</kbd> to send. Mic starts automatically.</p>
                        ) : (
                            <p className="text-center text-xs text-orange-500/80 mt-3 hidden md:block">Microphone features disabled on this browser.</p>
                        )}
                    </div>

                </main>
            </div>
        </div>
    );
};
