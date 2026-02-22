import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, User, FileText, UploadCloud, FileEdit, CheckCircle2, AlertCircle, TrendingUp, TrendingDown, Target, Loader2, Play, Download, Bot } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import Editor from 'react-simple-code-editor';
import Prism from 'prismjs';
import 'prismjs/components/prism-latex';
import 'prismjs/themes/prism-tomorrow.css'; // Dark theme for code editor
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, BarChart, CartesianGrid, Legend, Bar, Cell } from 'recharts';
import confetti from 'canvas-confetti';
import { Lock, Star } from 'lucide-react';

export const Home: React.FC = () => {
    const [userEmail, setUserEmail] = useState<string | null>(null);
    const [userId, setUserId] = useState<string | null>(null);

    // Upload & Editor State
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [latexCode, setLatexCode] = useState<string>(
        `% Write your .tex resume here\n\\documentclass[11pt]{article}\n\\begin{document}\n\n% Enter details here\n\n\\end{document}`
    );

    // Modal & Loading States
    const [isJdModalOpen, setIsJdModalOpen] = useState(false);
    const [jdText, setJdText] = useState("");
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<any>(null);
    const [isResultModalOpen, setIsResultModalOpen] = useState(false);
    const [isBrowserWarningOpen, setIsBrowserWarningOpen] = useState(false);

    // Storage States
    const [pastResumes, setPastResumes] = useState<any[]>([]);

    // ATS Graph State
    const [atsHistory, setAtsHistory] = useState<any[]>([]);

    // Profile Data State
    const [fullAtsHistory, setFullAtsHistory] = useState<any[]>([]);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [membershipTier, setMembershipTier] = useState<string>('guest');
    const [membershipExpiry, setMembershipExpiry] = useState<string | null>(null);
    const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);
    const [isWelcomeModalOpen, setIsWelcomeModalOpen] = useState(false);
    const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);

    // Interviews State
    const [interviewsData, setInterviewsData] = useState<any[]>([]);
    const [accountSinceDays, setAccountSinceDays] = useState<number | null>(null);

    useEffect(() => {
        if (sessionStorage.getItem('justSubscribed') === 'true') {
            setIsWelcomeModalOpen(true);
            confetti({
                particleCount: 150,
                spread: 100,
                origin: { y: 0.5 }
            });
            sessionStorage.removeItem('justSubscribed');
        }
    }, []);

    useEffect(() => {
        const fetchUserAndFiles = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setUserEmail(user.email ?? null);
                setUserId(user.id);

                if (user.created_at) {
                    const createdDate = new Date(user.created_at);
                    const now = new Date();
                    const diffTime = Math.abs(now.getTime() - createdDate.getTime());
                    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                    setAccountSinceDays(diffDays);
                }

                // Fetch real past resumes strictly for this logged-in user
                try {
                    const { data: resumesData, error: resumesError } = await supabase.storage.from('resumes').list(user.id, {
                        limit: 10,
                        sortBy: { column: 'created_at', order: 'desc' }
                    });
                    if (resumesError) {
                        console.error("Error fetching resumes:", resumesError);
                    } else if (resumesData) {
                        setPastResumes(resumesData.filter(file => file.name !== '.emptyFolderPlaceholder'));
                    }

                    // Fetch authentic ATS scores strictly for this logged-in user
                    const { data: scoresData, error: scoresError } = await supabase
                        .from('ats_scores')
                        .select('score, job_title, analysis_details, created_at')
                        .eq('user_id', user.id)
                        .order('created_at', { ascending: true }); // Chronological order for the graph

                    if (scoresError) {
                        console.error("Error fetching ATS scores:", scoresError);
                    } else if (scoresData) {
                        setFullAtsHistory(scoresData);
                        const formattedScores = scoresData.map((item: any) => ({
                            timestamp: new Date(item.created_at).getTime(),
                            score: Number(item.score) || 0
                        }));
                        setAtsHistory(formattedScores.slice(-15)); // Keep only latest 15 on graph ideally
                    }

                    // Fetch Interviews
                    const { data: interviews, error: interviewsError } = await supabase
                        .from('interviews')
                        .select('*')
                        .eq('user_id', user.id)
                        .order('created_at', { ascending: false });

                    if (interviewsError) {
                        console.error("Error fetching interviews:", interviewsError);
                    } else if (interviews) {
                        setInterviewsData(interviews);
                    }

                    // Fetch Profile Membership
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('membership_tier, membership_expiry')
                        .eq('id', user.id)
                        .single();
                    if (profile) {
                        setMembershipTier(profile.membership_tier);
                        setMembershipExpiry(profile.membership_expiry);
                    }

                } catch (err) {
                    console.error("Unexpected error fetching data:", err);
                }
            } else {
                window.history.pushState({}, '', '/onboard');
                window.dispatchEvent(new PopStateEvent('popstate'));
            }
        };
        fetchUserAndFiles();
    }, []);

    // Also refetch resumes after a specific successful analysis Upload
    const fetchRecentResumes = async (currentUserId: string) => {
        try {
            const { data, error } = await supabase.storage.from('resumes').list(currentUserId, {
                limit: 10,
                sortBy: { column: 'created_at', order: 'desc' }
            });
            if (data && !error) {
                setPastResumes(data.filter(file => file.name !== '.emptyFolderPlaceholder'));
            }
        } catch (err) { }
    };

    const handleSignOut = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) {
            toast.error(error.message);
        } else {
            toast.success("Signed out successfully!");
            window.history.pushState({}, '', '/');
            window.dispatchEvent(new PopStateEvent('popstate'));
        }
    };

    // Browser check for Web Speech API
    const checkBrowserSupportAndRedirect = () => {
        const ua = navigator.userAgent;
        // Check for Edge, Chrome, Safari (excluding Chromium variants like Brave which block STT)
        // Note: Brave masquerades as Chrome, but lacks the specific window.navigator.brave API natively in standard checks without async testing, 
        // however we can perform a basic heuristic or just show the broader modal.
        // Actually, a very common way to check for Brave is testing if `navigator.brave` exists (it's async, but we can do a quick check).

        const isChrome = /Chrome/.test(ua) && /Google Inc/.test(navigator.vendor);
        const isSafari = /Safari/.test(ua) && /Apple Computer/.test(navigator.vendor);
        const isEdge = /Edg/.test(ua);
        const isBrave = (navigator as any).brave !== undefined;

        if ((!isChrome && !isSafari && !isEdge) || isBrave) {
            setIsBrowserWarningOpen(true);
        } else {
            proceedToInterview();
        }
    };

    const proceedToInterview = () => {
        if (membershipTier === 'guest' && interviewsData.length >= 1) {
            setIsSubscriptionModalOpen(true);
            return;
        }
        setIsBrowserWarningOpen(false);
        setIsResultModalOpen(false); // Close result modal if open
        window.history.pushState({}, '', '/interview');
        window.dispatchEvent(new PopStateEvent('popstate'));
    };

    // --- File Handling Logic ---
    const handleFileClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (membershipTier === 'guest' && pastResumes.length >= 1) {
            if (e.target) e.target.value = '';
            setIsSubscriptionModalOpen(true);
            return;
        }

        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            const allowedTypes = [
                'application/pdf',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'application/x-tex',
                'text/plain'
            ];

            // Basic validation
            if (!allowedTypes.includes(file.type) && !file.name.endsWith('.tex') && !file.name.endsWith('.pdf') && !file.name.endsWith('.docx')) {
                toast.error("Please upload a .pdf, .docx, or .tex file.");
                return;
            }

            setSelectedFile(file);
            toast.success(`Selected file: ${file.name}`);
            setJdText("");
            setIsJdModalOpen(true);
        }
    };

    const handleLatexAnalyzeClick = () => {
        if (membershipTier === 'guest' && pastResumes.length >= 1) {
            setIsSubscriptionModalOpen(true);
            return;
        }

        if (!latexCode.trim()) {
            toast.error("Please enter some LaTeX code to analyze.");
            return;
        }
        setSelectedFile(null); // Clear selected file when using code editor
        setJdText("");
        setIsJdModalOpen(true);
    };

    // --- Analysis Logic ---
    const analyzeResume = async () => {
        if (!jdText.trim()) {
            toast.error("Please enter a Job Description.");
            return;
        }

        setIsJdModalOpen(false);
        setIsAnalyzing(true);

        try {
            let fileToUpload: File;

            // Determine if using selected file or generating from LaTeX editor
            if (selectedFile) {
                fileToUpload = selectedFile;
            } else {
                const blob = new Blob([latexCode], { type: 'text/plain' });
                fileToUpload = new File([blob], 'resume.tex', { type: 'application/x-tex' });
            }

            // 1. Upload to Supabase Storage
            const timestamp = new Date().getTime();
            const filename = `${userId}/${timestamp}_${fileToUpload.name}`;
            const { data: storageData, error: storageError } = await supabase.storage
                .from('resumes')
                .upload(filename, fileToUpload);

            if (storageError) {
                console.error("Storage upload warning:", storageError.message);
                toast.error(`Warning: Could not archive resume (${storageError.message}). Ensure the 'resumes' bucket exists. Analysis will continue.`, { duration: 5000 });
                // We don't throw an error here so the ATS analysis can still proceed even if archiving fails.
            }

            // 2. Prepare FormData for the backend API
            const formData = new FormData();
            formData.append('file', fileToUpload);
            formData.append('jd', jdText);

            // 3. Hit the backend endpoint
            const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/full-analysis`, {
                method: 'POST',
                body: formData,
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.detail || 'Analysis request failed.');
            }

            const data = await res.json();

            // 4. Store parsed_resume and jdText in localStorage with timestamp for 10-day caching
            const stamp = new Date().getTime();
            const resumeDataToStore = {
                parsed_resume: data.parsed_resume,
                timestamp: stamp
            };
            localStorage.setItem('parsed_resume_cache', JSON.stringify(resumeDataToStore));

            const jdDataToStore = {
                text: jdText,
                timestamp: stamp
            };
            localStorage.setItem('jdText_cache', JSON.stringify(jdDataToStore));

            const newScore = Math.round(data.ats_analysis.ats_score);
            const jobTitle = data.ats_analysis.job_title || "Unknown Target";

            // 5. Save the new authentic ATS score to Supabase
            if (userId) {
                const { error: insertError } = await supabase
                    .from('ats_scores')
                    .insert([{
                        user_id: userId,
                        score: newScore,
                        job_title: jobTitle,
                        analysis_details: data.ats_analysis
                    }]);

                if (insertError) {
                    console.error("Failed to save ATS Score to database:", insertError.message);
                    // Decide not to hard crash here, just log warning
                }

                // 6. Update local graph data instantly
                const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                setAtsHistory(prev => [...prev.slice(-14), { date: today, score: newScore }]);

                // Also update the full history for the Profile Modal
                setFullAtsHistory(prev => [...prev, {
                    score: newScore,
                    job_title: jobTitle,
                    analysis_details: data.ats_analysis,
                    created_at: new Date().toISOString()
                }]);

                // 7. Refetch recent resumes to show the newly uploaded one
                await fetchRecentResumes(userId);
            }

            setAnalysisResult(data);
            setIsResultModalOpen(true);
            toast.success("Analysis complete!");

        } catch (error: any) {
            console.error("Analysis Error:", error);
            toast.error(error.message || "Failed to analyze resume.");
        } finally {
            setIsAnalyzing(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = ''; // Reset input
            }
        }
    };

    // Download handler for Authentic Resumes
    const handleDownloadResume = async (fileName: string) => {
        if (!userId) return;
        const toastId = toast.loading(`Downloading ${fileName}...`);
        try {
            const { data, error } = await supabase.storage.from('resumes').download(`${userId}/${fileName}`);
            if (error) throw error;

            // Create object URL and trigger download
            const url = URL.createObjectURL(data);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName.split('_').slice(1).join('_') || fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            toast.success("Download complete!", { id: toastId });
        } catch (error: any) {
            toast.error("Failed to download resume: " + error.message, { id: toastId });
        }
    };

    const handleDownloadTranscript = (transcript: string, dateStr: string) => {
        const metadata = `\n\nAI-Interview conducted on https://resumifyng.vercel.app at ${new Date().toLocaleString('en-US')}\n`;
        const blob = new Blob([transcript + metadata], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Interview_${dateStr}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleUseLatestResume = async () => {
        if (pastResumes.length === 0) return;
        const latestResume = pastResumes[0];
        const toastId = toast.loading("Fetching latest resume...");
        try {
            const { data, error } = await supabase.storage.from('resumes').download(`${userId}/${latestResume.name}`);
            if (error) throw error;

            const cleanName = latestResume.name.split('_').slice(1).join('_') || latestResume.name;
            const file = new File([data], cleanName, { type: data.type });
            setSelectedFile(file);
            toast.dismiss(toastId);
            setJdText("");
            setIsJdModalOpen(true);
        } catch (error: any) {
            toast.error("Failed to fetch latest resume: " + error.message, { id: toastId });
        }
    };

    const handleDeleteAllInterviews = async () => {
        if (!userId || interviewsData.length === 0) return;
        const toastId = toast.loading("Deleting all transcripts...");
        try {
            const { error } = await supabase.from('interviews').delete().eq('user_id', userId);
            if (error) throw error;
            setInterviewsData([]);
            toast.success("All transcripts deleted!", { id: toastId });
        } catch (error: any) {
            toast.error("Failed to delete transcripts: " + error.message, { id: toastId });
        }
    };

    const hasValidCachedJD = () => {
        const cached = localStorage.getItem('jdText_cache');
        if (!cached) return false;
        try {
            const parsed = JSON.parse(cached);
            return (new Date().getTime() - parsed.timestamp) <= 864000000;
        } catch (e) {
            return false;
        }
    };

    const handleUseLastJD = () => {
        const cached = localStorage.getItem('jdText_cache');
        if (cached) {
            try {
                const parsed = JSON.parse(cached);
                if ((new Date().getTime() - parsed.timestamp) <= 864000000) {
                    setJdText(parsed.text);
                    toast.success("Loaded last used Job Description.");
                } else {
                    toast.error("Cached JD has expired.");
                    localStorage.removeItem('jdText_cache');
                }
            } catch (e) {
                toast.error("Failed to load cached JD.");
            }
        }
    };

    // Delete handler for Authentic Resumes
    const handleDeleteResume = async (fileName: string, e: React.MouseEvent) => {
        e.stopPropagation(); // prevent clicking the parent download trigger
        if (!userId) return;

        const toastId = toast.loading(`Deleting...`);
        try {
            const { data, error } = await supabase.storage.from('resumes').remove([`${userId}/${fileName}`]);
            if (error) throw error;
            if (!data || data.length === 0) {
                throw new Error("File not found or deletion blocked by Storage Policies (RLS). Please ensure you have enabled DELETE permissions for authenticated users on the 'resumes' bucket in Supabase.");
            }

            toast.success("Resume deleted!", { id: toastId });
            // Add a small delay for Supabase to eventually consistent reflect the delete
            setTimeout(() => fetchRecentResumes(userId), 500);

        } catch (error: any) {
            toast.error("Failed to delete resume: " + error.message, { id: toastId });
        }
    };

    return (
        <div className="relative w-full h-screen bg-[#334155] p-2 md:p-3 lg:p-4 flex flex-col overflow-hidden">
            {/* The Notch Navbar styled from landing page */}
            <div className="absolute top-0 left-0 right-0 z-50 flex justify-center pointer-events-none">
                <motion.div
                    initial={{ y: -100 }}
                    animate={{ y: 0 }}
                    transition={{ type: 'spring', stiffness: 100, damping: 20 }}
                    className="pointer-events-auto bg-[#334155] rounded-[2rem] px-6 py-3 md:px-8 md:py-4 shadow-[0_10px_35px_rgba(71,85,105,0.2)] flex items-center justify-between gap-6 md:gap-12 relative border border-[#334155]"
                >
                    {/* Logo */}
                    <div className="flex items-center gap-2 cursor-pointer group">
                        <img
                            src="/RNG_Logo.png"
                            alt="RNG Logo"
                            className="w-9 h-9 object-contain transition-transform group-hover:scale-105 drop-shadow-[0_0_10px_rgba(74,112,169,0.5)]"
                        />
                        <span className="font-heading font-bold text-xl tracking-tight text-[#EFECE3]">
                            ResumifyNG
                        </span>
                    </div>

                    <div className="flex items-center gap-4 md:gap-6">
                        <div className="hidden md:flex items-center gap-2 text-gray-400 text-sm font-medium">
                            <User className="w-4 h-4" />
                            <span>{userEmail || 'Loading...'}</span>
                        </div>

                        {/* Navigation Buttons Container */}
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => window.location.href = '/'}
                                className="flex items-center justify-center gap-2 bg-[#0A1120] hover:bg-[#1a2333] border border-[#4A70A9]/30 px-4 py-2 rounded-xl transition-all shadow-md hover:shadow-lg text-sm font-semibold text-[#EFECE3]"
                                title="Go to Landing Page"
                            >
                                <svg className="w-4 h-4 text-[#8FABD4]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>

                            </button>

                            {/* Dropdown Menu */}
                            <div className="relative group pb-2 -mb-2">
                                <button
                                    className="flex flex-row items-center gap-2 bg-[#0A1120] hover:bg-[#1a2333] border border-[#4A70A9]/30 px-4 py-2 rounded-xl transition-all shadow-md hover:shadow-lg text-sm font-semibold text-[#EFECE3]"
                                >
                                    <span className="hidden sm:inline">Account</span>
                                    <svg className="w-4 h-4 text-[#8FABD4]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                </button>

                                {/* Inner wrapper for spacing/hover bridge */}
                                <div className="absolute right-0 top-full pt-2 w-48 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 transform origin-top-right group-hover:scale-100 scale-95">
                                    <div className="bg-[#0A1120] border border-[#4A70A9]/30 rounded-xl shadow-xl py-1 overflow-hidden">
                                        <button
                                            onClick={() => setIsProfileModalOpen(true)}
                                            className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-[#EFECE3] hover:bg-[#1a2333] transition-colors"
                                        >
                                            <User className="w-4 h-4 text-[#8FABD4]" /> Profile
                                        </button>
                                        <button
                                            onClick={() => setIsStatusModalOpen(true)}
                                            className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-[#EFECE3] hover:bg-[#1a2333] transition-colors"
                                        >
                                            <Target className="w-4 h-4 text-[#8FABD4]" /> Membership status
                                        </button>
                                        <div className="h-[1px] bg-[#334155]/50 my-1"></div>
                                        <button
                                            onClick={handleSignOut}
                                            className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-red-400 hover:bg-[#1a2333] transition-colors"
                                        >
                                            <LogOut className="w-4 h-4" /> Logout
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Main Content Window layout matching landing page */}
            <main className="flex-1 bg-[#000000] rounded-[2rem] md:rounded-[2.5rem] overflow-y-auto overflow-x-hidden relative custom-scrollbar shadow-2xl ring-1 ring-[#475569] p-6 md:p-10 pt-28 lg:pt-10 z-10">

                {/* Background Elements from Landing Page */}
                < div className="absolute inset-0 bg-gradient-to-b from-[#050B14] via-[#000000] to-[#000000] z-0 pointer-events-none" />
                <div className="absolute inset-0 z-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] pointer-events-none" />

                {/* Floating Blobs */}
                <motion.div
                    animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.15, 0.3, 0.15],
                        x: [0, 50, 0]
                    }}
                    transition={{ duration: 10, repeat: Infinity }}
                    className="absolute top-[20%] right-[10%] w-96 h-96 bg-[#4A70A9] rounded-full blur-[100px] pointer-events-none"
                />
                <motion.div
                    animate={{
                        scale: [1.2, 1, 1.2],
                        opacity: [0.15, 0.3, 0.15],
                        x: [0, -50, 0]
                    }}
                    transition={{ duration: 15, repeat: Infinity }}
                    className="absolute bottom-[20%] left-[10%] w-80 h-80 bg-[#8FABD4] rounded-full blur-[100px] pointer-events-none"
                />

                <div className="max-w-[1600px] mx-auto w-full h-full flex flex-col gap-6 relative z-10">
                    <div className="flex justify-between items-start md:items-center flex-col md:flex-row gap-4">
                        <div className="flex flex-col gap-2">
                            <h1 className="text-3xl md:text-4xl font-heading font-bold text-[#EFECE3]">Dashboard</h1>
                            <p className="text-gray-400">Welcome back, get ready for your next career move.</p>
                        </div>

                        <button
                            onClick={checkBrowserSupportAndRedirect}
                            className="flex flex-row items-center gap-2 bg-[#4A70A9] hover:bg-[#5C85C5] border border-[#4A70A9]/50 px-5 py-2.5 rounded-xl transition-all shadow-[0_0_20px_rgba(74,112,169,0.3)] hover:shadow-[0_0_25px_rgba(74,112,169,0.5)] text-sm font-semibold text-white"
                        >
                            <Target className="w-5 h-5 text-white" /> Conduct an AI Interview
                        </button>
                    </div>

                    {/* Responsive Grid Layout: 12-column grid for precise width control */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 pb-32 lg:pb-10">

                        {/* div1: Upload Resume (Takes 5 columns) */}
                        <div className="lg:col-span-5 bg-[#0A1120] border border-[#4A70A9]/30 rounded-3xl p-6 flex flex-col gap-4 shadow-[0_0_30px_rgba(74,112,169,0.1)] transition-all hover:border-[#4A70A9]/60 min-h-[400px]">
                            <div className="flex justify-between items-center">
                                <h2 className="text-xl font-heading font-semibold text-[#EFECE3]">Upload Resume</h2>
                                <UploadCloud className="text-[#8FABD4] w-5 h-5" />
                            </div>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                className="hidden"
                                accept=".pdf,.docx,.tex"
                            />
                            <div
                                onClick={handleFileClick}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                                        const file = e.dataTransfer.files[0];
                                        const allowedTypes = [
                                            'application/pdf',
                                            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                                            'application/x-tex',
                                            'text/plain'
                                        ];

                                        if (!allowedTypes.includes(file.type) && !file.name.endsWith('.tex') && !file.name.endsWith('.pdf') && !file.name.endsWith('.docx')) {
                                            toast.error("Please upload a .pdf, .docx, or .tex file.");
                                            return;
                                        }

                                        setSelectedFile(file);
                                        toast.success(`Selected file: ${file.name}`);
                                        setJdText("");
                                        setIsJdModalOpen(true);
                                    }
                                }}
                                className="flex-1 border-2 border-dashed border-[#4A70A9]/30 rounded-2xl flex flex-col items-center justify-center bg-[#050B14]/50 hover:bg-[#4A70A9]/10 transition-colors cursor-pointer group p-6"
                            >
                                <div className="w-16 h-16 rounded-full bg-[#1a2333] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-inner">
                                    <FileText className="w-8 h-8 text-[#4A70A9] group-hover:text-[#8FABD4] transition-colors" />
                                </div>
                                <p className="text-gray-400 text-sm text-center px-4 group-hover:text-gray-300 transition-colors">
                                    Drag & drop your .pdf, .docx, or .tex file here<br />
                                    <span className="text-[#8FABD4] font-medium mt-3 inline-block px-4 py-1.5 rounded-full bg-[#1a2333] border border-[#334155]/50 group-hover:border-[#4A70A9]/50">Browse Files</span>
                                </p>
                            </div>
                        </div>

                        {/* div2: Write .tex (Takes 7 columns) */}
                        <div className="lg:col-span-7 bg-[#0A1120] border border-[#4A70A9]/30 rounded-3xl p-6 flex flex-col gap-4 shadow-[0_0_30px_rgba(74,112,169,0.1)] transition-all hover:border-[#4A70A9]/60 min-h-[400px] relative">
                            <div className="flex justify-between items-center">
                                <h2 className="text-xl font-heading font-semibold text-[#EFECE3]">LaTeX Editor</h2>
                                <button
                                    onClick={handleLatexAnalyzeClick}
                                    className="flex items-center gap-2 bg-[#4A70A9] hover:bg-[#5C85C5] text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-colors shadow-sm"
                                >
                                    <Play className="w-4 h-4" /> Analyze Code
                                </button>
                            </div>

                            <div className="flex-1 bg-[#2d2d2d] rounded-2xl overflow-hidden border border-[#334155]/50 shadow-inner relative flex">
                                {/* Editor container with line numbers */}
                                <div className="flex-1 overflow-auto custom-scrollbar font-mono text-sm relative flex" style={{ minHeight: '300px' }}>

                                    {/* Line Numbers Column */}
                                    <div className="w-10 flex-shrink-0 bg-[#1e1e1e] border-r border-[#334155]/50 flex flex-col items-end pr-3 select-none text-gray-500 font-mono text-xs" style={{ paddingTop: '16px', paddingBottom: '16px' }} aria-hidden="true">
                                        {Array.from({ length: latexCode.split('\n').length || 1 }).map((_, i) => (
                                            <div key={i + 1} style={{ height: '21px', lineHeight: '21px' }}>{i + 1}</div>
                                        ))}
                                    </div>

                                    {/* The Code Editor */}
                                    <div className="flex-1 min-w-0 bg-[#1e1e1e]">
                                        <Editor
                                            value={latexCode}
                                            onValueChange={code => setLatexCode(code)}
                                            highlight={code => Prism.highlight(code, Prism.languages.latex || Prism.languages.markup, 'latex')}
                                            padding={16}
                                            style={{
                                                fontFamily: '"Fira Code", "JetBrains Mono", monospace',
                                                fontSize: 14,
                                                minHeight: '100%',
                                                whiteSpace: 'pre', // Disable wrapping to perfectly align lines
                                                lineHeight: '21px', // Fixed height to match side numbers
                                            }}
                                            className="min-h-full"
                                            textareaClassName="focus:outline-none"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* div3: Performance Graph (Takes 8 columns now) */}
                        <div className="lg:col-span-8 bg-gradient-to-br from-[#0A1120] to-[#121b2e] border border-[#4A70A9]/30 rounded-3xl p-6 flex flex-col gap-4 shadow-[0_0_30px_rgba(74,112,169,0.1)] transition-all hover:border-[#4A70A9]/60 min-h-[300px]">
                            <div className="flex justify-between items-center">
                                <h2 className="text-xl font-heading font-semibold text-[#EFECE3]">ATS Performance</h2>
                                <span className="text-xs font-medium px-2 py-1 rounded bg-[#4A70A9]/20 text-[#8FABD4]">Trend</span>
                            </div>
                            <div className="flex-1 w-full relative z-10 pt-4 flex flex-col justify-center">
                                {atsHistory.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%" minHeight={200}>
                                        <AreaChart data={atsHistory} margin={{ top: 15, right: 10, left: -25, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#4A70A9" stopOpacity={0.6} />
                                                    <stop offset="95%" stopColor="#4A70A9" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <XAxis dataKey="timestamp" stroke="#475569" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => new Date(val).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} />
                                            <YAxis
                                                stroke="#475569"
                                                fontSize={11}
                                                tickLine={false}
                                                axisLine={false}
                                                domain={([dataMin, dataMax]) => [
                                                    Math.max(0, Math.floor(dataMin - 10)),
                                                    Math.min(100, Math.ceil(dataMax + 10))
                                                ]}
                                            />
                                            <Tooltip
                                                contentStyle={{ backgroundColor: '#0A1120', border: '1px solid #4A70A9', borderRadius: '12px', fontSize: '13px' }}
                                                itemStyle={{ color: '#EFECE3', fontWeight: 'bold' }}
                                                labelStyle={{ color: '#8FABD4', marginBottom: '4px' }}
                                                labelFormatter={(val) => new Date(val).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                formatter={(value: any) => [`${value}`, 'ATS Score']}
                                            />
                                            <Area
                                                type="monotone"
                                                dataKey="score"
                                                name="ATS Score"
                                                stroke="#8FABD4"
                                                strokeWidth={3}
                                                fillOpacity={1}
                                                fill="url(#colorScore)"
                                                dot={{ r: 4, fill: '#8FABD4', strokeWidth: 0 }}
                                                activeDot={{ r: 6, fill: '#EFECE3', stroke: '#4A70A9', strokeWidth: 2 }}
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full text-center opacity-70 px-4">
                                        <div className="w-16 h-16 mb-4 rounded-full bg-[#1a2333] flex items-center justify-center text-[#4A70A9]">
                                            <TrendingUp className="w-8 h-8 opacity-50" />
                                        </div>
                                        <p className="text-[#8FABD4] font-medium mb-1">No data, no insights...</p>
                                        <p className="text-s text-gray-400">Upload a resume and give the graph something to think about.</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* div4: Insights Section (Takes 4 columns now) */}
                        <div className="lg:col-span-4 bg-[#0A1120] border border-[#4A70A9]/30 rounded-3xl p-6 flex flex-col gap-4 shadow-[0_0_30px_rgba(74,112,169,0.1)] transition-all hover:border-[#4A70A9]/60 min-h-[300px] relative overflow-hidden">
                            {membershipTier === 'guest' && (
                                <div className="absolute inset-0 z-20 bg-[#000000]/70 backdrop-blur-[4px] flex flex-col items-center justify-center p-6 text-center">
                                    <div className="w-14 h-14 bg-[#1a2333] border border-[#4A70A9]/30 rounded-full flex items-center justify-center mb-4">
                                        <Lock className="w-6 h-6 text-[#8FABD4]" />
                                    </div>
                                    <h3 className="text-lg font-heading font-bold text-[#EFECE3] mb-2">Insights Locked</h3>
                                    <p className="text-gray-400 text-sm mb-4">Upgrade to view full advanced profile metrics and lifetime performance data.</p>
                                    <button
                                        onClick={() => window.location.href = '/plan'}
                                        className="bg-[#4A70A9] hover:bg-[#5C85C5] border border-[#4A70A9]/50 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-md"
                                    >
                                        Unlock Premium
                                    </button>
                                </div>
                            )}

                            <div className="flex justify-between items-center relative z-10">
                                <h2 className="text-xl font-heading font-semibold text-[#EFECE3]">Your Insights</h2>
                                <span className="text-xs font-medium px-2 py-1 rounded bg-[#4A70A9]/20 text-[#8FABD4]">Overview</span>
                            </div>

                            {atsHistory.length > 0 || pastResumes.length > 0 ? (
                                <div className="flex-1 grid grid-cols-2 gap-3">
                                    {/* AI Interviews */}
                                    <div className="bg-[#050B14] rounded-2xl p-3 border border-[#334155]/50 flex flex-col justify-center items-center text-center hover:border-[#4A70A9]/40 transition-colors">
                                        <div className="w-8 h-8 rounded-full bg-[#1a2333] flex items-center justify-center text-[#8FABD4] mb-2">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                                        </div>
                                        <span className="text-xl font-bold font-heading text-[#EFECE3]">{interviewsData.length}</span>
                                        <span className="text-[10px] text-gray-400 mt-1 uppercase tracking-wider">Interviews</span>
                                    </div>

                                    {/* Resumes Analyzed */}
                                    <div className="bg-[#050B14] rounded-2xl p-3 border border-[#334155]/50 flex flex-col justify-center items-center text-center hover:border-[#4A70A9]/40 transition-colors">
                                        <div className="w-8 h-8 rounded-full bg-[#1a2333] flex items-center justify-center text-[#4A70A9] mb-2">
                                            <FileText className="w-4 h-4" />
                                        </div>
                                        <span className="text-xl font-bold font-heading text-[#EFECE3]">{pastResumes.length > 0 ? pastResumes.length : 0}</span>
                                        <span className="text-[10px] text-gray-400 mt-1 uppercase tracking-wider">Resumes</span>
                                    </div>

                                    {/* Questions Answered */}
                                    <div className="bg-[#050B14] rounded-2xl p-3 border border-[#334155]/50 flex flex-col justify-center items-center text-center hover:border-[#4A70A9]/40 transition-colors col-span-2">
                                        <div className="w-8 h-8 rounded-full bg-[#1a2333] flex items-center justify-center text-emerald-500 mb-2">
                                            <CheckCircle2 className="w-4 h-4" />
                                        </div>
                                        <span className="text-xl font-bold font-heading text-[#EFECE3]">{interviewsData.reduce((acc, curr) => acc + (curr.questions_count || 0), 0)}</span>
                                        <span className="text-[10px] text-gray-400 mt-1 uppercase tracking-wider">Questions Answered</span>
                                    </div>

                                    {/* Average ATS Score */}
                                    <div className="bg-[#050B14] rounded-2xl p-3 border border-[#334155]/50 flex flex-col justify-center items-center text-center hover:border-[#4A70A9]/40 transition-colors">
                                        <div className="w-8 h-8 rounded-full bg-[#1a2333] flex items-center justify-center text-[#8FABD4] mb-2">
                                            <TrendingUp className="w-4 h-4" />
                                        </div>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-xl font-bold font-heading text-[#EFECE3]">
                                                {atsHistory.length > 0 ? Math.round(atsHistory.reduce((acc, curr) => acc + (Number(curr.score) || 0), 0) / atsHistory.length) : 0}
                                            </span>
                                            <span className="text-xs font-medium text-gray-500">/100</span>
                                        </div>
                                        <span className="text-[10px] text-gray-400 mt-1 uppercase tracking-wider">Avg Score</span>
                                    </div>

                                    {/* Account Since */}
                                    <div className="bg-[#050B14] rounded-2xl p-3 border border-[#334155]/50 flex flex-col justify-center items-center text-center hover:border-[#4A70A9]/40 transition-colors">
                                        <div className="w-8 h-8 rounded-full bg-[#1a2333] flex items-center justify-center text-rose-400 mb-2">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                        </div>
                                        <span className="text-sm font-bold font-heading text-[#EFECE3]">
                                            {accountSinceDays !== null ? (accountSinceDays === 0 ? "Today" : `${accountSinceDays} days`) : "..."}
                                        </span>
                                        <span className="text-[10px] text-gray-400 mt-1 uppercase tracking-wider">Since</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center text-center opacity-70 px-4 bg-[#050B14]/50 rounded-2xl border border-[#334155]/30">
                                    <p className="text-[#8FABD4] font-medium text-sm mb-1">Zero events observed...</p>
                                    <p className="text-s text-gray-400">Start using the system to generate insights.</p>
                                </div>
                            )}
                        </div>

                        {/* div5: Past Resumes (Takes 6 columns) */}
                        <div className="lg:col-span-6 bg-[#0A1120] border border-[#4A70A9]/30 rounded-3xl p-6 flex flex-col gap-4 shadow-[0_0_30px_rgba(74,112,169,0.1)] transition-all hover:border-[#4A70A9]/60 min-h-[300px] max-h-[400px]">
                            <div className="flex justify-between items-center">
                                <h2 className="text-xl font-heading font-semibold text-[#EFECE3]">Past Resumes</h2>
                                {pastResumes.length > 0 && (
                                    <button onClick={handleUseLatestResume} className="text-xs bg-[#4A70A9]/20 hover:bg-[#4A70A9]/40 text-[#8FABD4] px-3 py-1.5 rounded-lg border border-[#4A70A9]/50 transition-colors flex items-center gap-1.5">
                                        <UploadCloud className="w-3.5 h-3.5" /> Use Latest
                                    </button>
                                )}
                            </div>
                            <div className="flex-1 flex flex-col gap-3 overflow-y-auto custom-scrollbar pr-2">
                                {pastResumes.length > 0 ? (
                                    pastResumes.map((file, i) => {
                                        // Removing the prefix timestamp to display cleanly
                                        const cleanName = file.name.split('_').slice(1).join('_') || file.name;
                                        const dateLabel = new Date(file.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                                        return (
                                            <div
                                                key={file.id || i}
                                                onClick={() => handleDownloadResume(file.name)}
                                                className="bg-[#050B14] p-4 rounded-2xl border border-[#334155]/50 flex justify-between items-center group hover:border-[#4A70A9]/50 transition-colors shadow-sm cursor-pointer"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-[#1a2333] flex items-center justify-center text-[#4A70A9] group-hover:bg-[#4A70A9]/20 transition-colors">
                                                        {file.name.endsWith('.pdf') ? (
                                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                                        ) : (
                                                            <FileText className="w-5 h-5" />
                                                        )}
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-medium text-gray-200 truncate max-w-[160px] md:max-w-[200px]">{cleanName}</span>
                                                        <span className="text-xs text-gray-500">{dateLabel}</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={(e) => handleDeleteResume(file.name, e)}
                                                        className="text-rose-400 hover:text-rose-300 transition-colors p-2 bg-rose-500/10 hover:bg-rose-500/20 rounded-lg"
                                                        title="Delete Resume"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                    </button>
                                                    <button className="text-[#4A70A9] hover:text-[#8FABD4] transition-colors p-2 bg-[#1a2333] hover:bg-[#334155] rounded-lg" title="Download Resume">
                                                        <UploadCloud className="w-4 h-4 rotate-180" />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-center opacity-70 px-4">
                                        <p className="text-[#8FABD4] font-medium text-sm mb-1">No resumes here yet...</p>
                                        <p className="text-s text-gray-400">Upload one to start weaving your profile.</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* div6: Past Interviews (Takes 6 columns) */}
                        <div className="lg:col-span-6 bg-[#0A1120] border border-[#4A70A9]/30 rounded-3xl p-6 flex flex-col gap-4 shadow-[0_0_30px_rgba(74,112,169,0.1)] transition-all hover:border-[#4A70A9]/60 min-h-[300px] max-h-[400px]">
                            <div className="flex justify-between items-center">
                                <h2 className="text-xl font-heading font-semibold text-[#EFECE3]">Interviews</h2>
                                {interviewsData.length > 0 && (
                                    <button onClick={handleDeleteAllInterviews} className="text-xs bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 px-3 py-1.5 rounded-lg border border-rose-500/30 transition-colors flex items-center gap-1.5">
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        Delete All
                                    </button>
                                )}
                            </div>
                            <div className="flex-1 flex flex-col gap-3 overflow-y-auto custom-scrollbar pr-2">
                                {interviewsData.length > 0 ? (
                                    interviewsData.map((interview, i) => {
                                        const dateObj = new Date(interview.created_at);
                                        const dateLabel = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                                        const dateForFile = dateObj.toLocaleDateString('en-US').replace(/\//g, '-');
                                        return (
                                            <div
                                                key={interview.id || i}
                                                onClick={() => handleDownloadTranscript(interview.transcript, dateForFile)}
                                                className="bg-[#050B14] p-4 rounded-2xl border border-[#334155]/50 flex justify-between items-center group hover:border-[#4A70A9]/50 transition-colors shadow-sm cursor-pointer"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-[#1a2333] flex items-center justify-center text-[#4A70A9] group-hover:bg-[#4A70A9]/20 transition-colors">
                                                        <Bot className="w-5 h-5" />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-medium text-gray-200 truncate max-w-[160px] md:max-w-[200px]">Tech Interview</span>
                                                        <span className="text-xs text-gray-500">{dateLabel} • {interview.questions_count || 0} Qs</span>
                                                    </div>
                                                </div>
                                                <button className="text-[#4A70A9] hover:text-[#8FABD4] opacity-0 group-hover:opacity-100 transition-opacity p-2 bg-[#1a2333] rounded-lg">
                                                    <Download className="w-4 h-4" />
                                                </button>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-center opacity-70 px-4">
                                        <p className="text-[#8FABD4] font-medium text-sm mb-1">No interviews yet...</p>
                                        <p className="text-s text-gray-400">The system is ready when you are.</p>
                                    </div>
                                )}
                            </div>
                        </div>

                    </div>
                </div>
            </main >

            {/* --- Modals and Overlays --- */}

            {/* Loading Overlay */}
            <AnimatePresence>
                {isProfileModalOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[60] flex items-center justify-center bg-[#000000]/60 backdrop-blur-md pointer-events-auto p-4 md:p-8"
                        onClick={() => setIsProfileModalOpen(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-[#0A1120] border border-[#4A70A9]/30 rounded-3xl max-w-5xl w-full max-h-[90vh] flex flex-col shadow-[0_20px_60px_rgba(0,0,0,0.5)] overflow-hidden"
                        >
                            {/* Modal Header */}
                            <div className="flex justify-between items-center p-6 border-b border-[#334155]/50 bg-[#050B14]/80">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-[#4A70A9]/10 flex items-center justify-center border border-[#4A70A9]/30">
                                        <User className="w-6 h-6 text-[#8FABD4]" />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-heading font-bold text-[#EFECE3]">Your Profile Hub</h2>
                                        <p className="text-gray-400 text-sm">Career Targets & Lifetime ATS Breakdown</p>
                                    </div>
                                </div>
                                <button onClick={() => setIsProfileModalOpen(false)} className="text-gray-500 hover:text-white transition-colors p-2 rounded-lg hover:bg-[#1a2333]">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>

                            {/* Modal Content */}
                            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">

                                {/* Section 1: Career Targets */}
                                <div className="flex flex-col gap-4">
                                    <div className="flex items-center gap-2">
                                        <Target className="w-5 h-5 text-[#4A70A9]" />
                                        <h3 className="text-xl font-heading font-semibold text-[#EFECE3]">Career Targets</h3>
                                    </div>
                                    <div className="bg-[#050B14] rounded-2xl p-6 border border-[#334155]/50 flex flex-wrap gap-3">
                                        {fullAtsHistory.map(h => h.job_title).filter((v, i, a) => v && v !== "Unknown Target" && a.indexOf(v) === i).length > 0 ? (
                                            fullAtsHistory
                                                .map(h => h.job_title)
                                                .filter((v, i, a) => v && v !== "Unknown Target" && a.indexOf(v) === i)
                                                .map((title, i) => (
                                                    <span key={i} className="px-4 py-2 bg-[#1a2333] border border-[#4A70A9]/30 text-[#8FABD4] rounded-xl text-sm font-medium shadow-sm flex items-center gap-2 hover:border-[#4A70A9]/60 transition-colors">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-[#4A70A9]"></span>
                                                        {title}
                                                    </span>
                                                ))
                                        ) : (
                                            <p className="text-gray-500 text-sm italic py-2">No specific career targets identified yet.</p>
                                        )}
                                    </div>
                                </div>

                                {/* Section 2: Consolidated ATS Breakdown */}
                                <div className="flex flex-col gap-4">
                                    <div className="flex items-center gap-2">
                                        <TrendingUp className="w-5 h-5 text-[#4A70A9]" />
                                        <h3 className="text-xl font-heading font-semibold text-[#EFECE3]">Consolidated Breakdown</h3>
                                    </div>

                                    <div className="w-full">
                                        {/* Score Radar Chart */}
                                        <div className="bg-[#050B14] rounded-2xl p-6 border border-[#334155]/50 flex flex-col items-center max-w-3xl mx-auto">
                                            <h4 className="text-sm font-medium text-gray-400 w-full text-center mb-4 uppercase tracking-wider">Average Skill Matching Profile</h4>
                                            <div className="w-full h-[350px] relative">
                                                {(() => {
                                                    const validHistories = fullAtsHistory.filter(h => h.analysis_details?.breakdown);
                                                    if (validHistories.length === 0) {
                                                        return <div className="absolute inset-0 flex items-center justify-center text-gray-600 text-sm italic">Not enough data to graph</div>;
                                                    }

                                                    // Calculate Averages
                                                    const totals: any = {
                                                        skill_match: 0, experience_relevance: 0, role_alignment: 0, education_match: 0, recency_continuity: 0
                                                    };

                                                    validHistories.forEach(h => {
                                                        const bd = h.analysis_details.breakdown;
                                                        totals.skill_match += bd.skill_match || 0;
                                                        totals.experience_relevance += bd.experience_relevance || 0;
                                                        totals.role_alignment += bd.role_alignment || 0;
                                                        totals.education_match += bd.education_match || 0;
                                                        totals.recency_continuity += bd.recency_continuity || 0;
                                                    });

                                                    const count = validHistories.length;
                                                    const radarData = [
                                                        { subject: 'Skills', A: Math.round(totals.skill_match / count), fullMark: 100 },
                                                        { subject: 'Experience', A: Math.round(totals.experience_relevance / count), fullMark: 100 },
                                                        { subject: 'Alignment', A: Math.round(totals.role_alignment / count), fullMark: 100 },
                                                        { subject: 'Education', A: Math.round(totals.education_match / count), fullMark: 100 },
                                                        { subject: 'Continuity', A: Math.round(totals.recency_continuity / count), fullMark: 100 },
                                                    ];

                                                    return (
                                                        <ResponsiveContainer width="100%" height="100%">
                                                            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                                                                <PolarGrid stroke="#334155" />
                                                                <PolarAngleAxis dataKey="subject" tick={{ fill: '#8FABD4', fontSize: 13 }} />
                                                                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                                                <Radar name="Average Score" dataKey="A" stroke="#4A70A9" fill="#4A70A9" fillOpacity={0.4} />
                                                                <Tooltip
                                                                    contentStyle={{ backgroundColor: '#0A1120', border: '1px solid #4A70A9', borderRadius: '8px' }}
                                                                    itemStyle={{ color: '#EFECE3' }}
                                                                />
                                                            </RadarChart>
                                                        </ResponsiveContainer>
                                                    );
                                                })()}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Loading Overlay */}
            <AnimatePresence>
                {isAnalyzing && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[60] flex items-center justify-center bg-[#000000]/80 backdrop-blur-sm pointer-events-auto"
                    >
                        <div className="bg-[#0A1120] border border-[#4A70A9]/50 rounded-[2rem] p-10 flex flex-col items-center gap-6 shadow-[0_0_50px_rgba(74,112,169,0.2)]">
                            <div className="relative w-20 h-20">
                                {/* Connecting circles animation */}
                                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 3, ease: "linear" }} className="absolute inset-0 border-4 border-dashed border-[#4A70A9] rounded-full opacity-50"></motion.div>
                                <motion.div animate={{ rotate: -360 }} transition={{ repeat: Infinity, duration: 4, ease: "linear" }} className="absolute inset-2 border-4 border-dashed border-[#8FABD4] rounded-full opacity-70"></motion.div>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <Loader2 className="w-8 h-8 text-[#EFECE3] animate-spin" />
                                </div>
                            </div>
                            <div className="text-center">
                                <h3 className="text-xl font-heading font-bold text-[#EFECE3] mb-2">Analyzing Resume</h3>
                                <p className="text-[#8FABD4] text-sm animate-pulse">Running advanced ATS matching...</p>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Job Description Modal */}
            <AnimatePresence>
                {isJdModalOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[60] flex items-center justify-center bg-[#000000]/60 backdrop-blur-md pointer-events-auto p-4"
                        onClick={() => setIsJdModalOpen(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-[#0A1120] border border-[#4A70A9]/30 rounded-3xl p-8 max-w-4xl w-full flex flex-col gap-6 shadow-[0_20px_60px_rgba(0,0,0,0.5)]"
                        >
                            <div className="flex justify-between items-center border-b border-[#334155]/50 pb-4">
                                <div>
                                    <h2 className="text-2xl font-heading font-bold text-[#EFECE3]">Job Description</h2>
                                    <p className="text-gray-400 text-sm mt-1">Paste the JD to check your ATS compatibility</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    {hasValidCachedJD() && (
                                        <button onClick={handleUseLastJD} className="text-xs bg-[#4A70A9]/20 hover:bg-[#4A70A9]/30 text-[#8FABD4] px-3 py-2 rounded-lg border border-[#4A70A9]/50 transition-colors flex items-center gap-1.5 shadow-sm">
                                            <FileText className="w-3.5 h-3.5" /> Use Last JD
                                        </button>
                                    )}
                                    <button onClick={() => setIsJdModalOpen(false)} className="text-gray-500 hover:text-white transition-colors p-2 flex items-center justify-center rounded-lg hover:bg-[#1a2333]">
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                    </button>
                                </div>
                            </div>

                            <textarea
                                value={jdText}
                                onChange={(e) => setJdText(e.target.value)}
                                placeholder="Paste the complete job requirements, responsibilities, and description here..."
                                className="w-full h-96 bg-[#050B14] border border-[#4A70A9]/30 rounded-2xl p-6 text-[#EFECE3] placeholder:text-gray-600 focus:outline-none focus:border-[#4A70A9] custom-scrollbar resize-none transition-colors text-base"
                            />

                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    onClick={() => setIsJdModalOpen(false)}
                                    className="px-6 py-2.5 rounded-xl text-gray-400 hover:text-white hover:bg-[#1a2333] transition-colors font-medium text-sm border border-transparent"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={analyzeResume}
                                    className="bg-[#4A70A9] hover:bg-[#5C85C5] text-white px-8 py-2.5 rounded-xl font-medium text-sm transition-all shadow-md hover:shadow-lg flex items-center gap-2"
                                >
                                    Analyze <Target className="w-4 h-4" />
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Results Modal */}
            <AnimatePresence>
                {isResultModalOpen && analysisResult && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[60] flex items-center justify-center bg-[#000000]/60 backdrop-blur-md pointer-events-auto p-4 md:p-8"
                        onClick={() => setIsResultModalOpen(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-[#0A1120] border border-[#4A70A9]/30 rounded-3xl max-w-5xl w-full max-h-[90vh] flex flex-col shadow-[0_20px_60px_rgba(0,0,0,0.5)] overflow-hidden"
                        >
                            {/* Modal Header */}
                            <div className="flex justify-between items-center p-6 border-b border-[#334155]/50 bg-[#050B14]/80">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-[#4A70A9]/10 flex items-center justify-center border border-[#4A70A9]/30">
                                        <Target className="w-6 h-6 text-[#8FABD4]" />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-heading font-bold text-[#EFECE3]">Analysis Report</h2>
                                        <p className="text-gray-400 text-sm">Targeted ATS Breakdown</p>
                                    </div>
                                </div>
                                <button onClick={() => setIsResultModalOpen(false)} className="text-gray-500 hover:text-white transition-colors p-2 rounded-lg hover:bg-[#1a2333]">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>

                            {/* Modal Content - Scrollable area */}
                            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">

                                {/* Disclaimer */}
                                <div className="bg-[#4A70A9]/10 border border-[#4A70A9]/30 rounded-xl p-4 flex items-start gap-3">
                                    <AlertCircle className="w-5 h-5 text-[#8FABD4] flex-shrink-0 mt-0.5" />
                                    <p className="text-sm text-[#EFECE3]/80 leading-relaxed">
                                        <span className="font-semibold text-[#8FABD4]">Note:</span> This ATS calculation is an estimation based on standard industry practices. Actual scoring algorithms vary significantly across different companies and specific ATS providers.
                                    </p>
                                </div>

                                {/* Top Stats Row */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {/* Overall Score */}
                                    <div className="bg-[#050B14] rounded-2xl p-6 border border-[#334155]/50 flex flex-col items-center justify-center text-center relative overflow-hidden group">
                                        <div className="absolute inset-0 bg-gradient-to-br from-[#4A70A9]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                        <div className="relative z-10">
                                            <p className="text-[#8FABD4] text-sm font-medium mb-2 uppercase tracking-wider">ATS Score</p>
                                            <div className="flex items-baseline gap-1 justify-center">
                                                <span className="text-6xl font-heading font-bold text-[#EFECE3]">
                                                    {Math.round(analysisResult.ats_analysis.ats_score)}
                                                </span>
                                                <span className="text-gray-500 text-xl">/100</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Breakdown Meters */}
                                    <div className="md:col-span-2 bg-[#050B14] rounded-2xl p-6 border border-[#334155]/50 flex flex-col gap-4">
                                        <h3 className="text-[#EFECE3] font-medium font-heading tracking-wide mb-1">Score Breakdown</h3>
                                        <div className="space-y-3">
                                            {Object.entries(analysisResult.ats_analysis.breakdown).map(([key, value]: [string, any]) => (
                                                <div key={key} className="flex items-center gap-4">
                                                    <span className="w-32 text-xs text-gray-400 capitalize">{key.replace('_', ' ')}</span>
                                                    <div className="flex-1 h-2 bg-[#1a2333] rounded-full overflow-hidden">
                                                        <motion.div
                                                            initial={{ width: 0 }}
                                                            animate={{ width: `${value}%` }}
                                                            transition={{ duration: 1, ease: "easeOut" }}
                                                            className="h-full bg-gradient-to-r from-[#4A70A9] to-[#8FABD4] rounded-full"
                                                        />
                                                    </div>
                                                    <span className="w-8 text-xs text-[#8FABD4] text-right font-medium">{Math.round(value)}%</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Skills Breakdown */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Matched / Strong */}
                                    <div className="flex flex-col gap-6">
                                        <div className="bg-[#050B14] rounded-2xl p-6 border border-emerald-900/30">
                                            <div className="flex items-center gap-2 mb-4">
                                                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                                <h3 className="text-[#EFECE3] font-medium font-heading">Matched Skills</h3>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {analysisResult.ats_analysis.matched_skills.map((skill: string, i: number) => (
                                                    <span key={i} className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg text-xs font-medium capitalize">
                                                        {skill}
                                                    </span>
                                                ))}
                                                {analysisResult.ats_analysis.matched_skills.length === 0 && <span className="text-xs text-gray-500 italic">No exact matches found.</span>}
                                            </div>
                                        </div>

                                        <div className="bg-[#050B14] rounded-2xl p-6 border border-[#4A70A9]/30 relative overflow-hidden">
                                            <div className="absolute top-0 right-0 p-4 opacity-5"><TrendingUp className="w-24 h-24" /></div>
                                            <div className="flex items-center gap-2 mb-4 relative z-10">
                                                <TrendingUp className="w-5 h-5 text-[#8FABD4]" />
                                                <h3 className="text-[#EFECE3] font-medium font-heading">Strong Matches (Contextual)</h3>
                                            </div>
                                            <div className="flex flex-wrap gap-2 relative z-10">
                                                {analysisResult.ats_analysis.strong_matches.map((skill: string, i: number) => (
                                                    <span key={i} className="px-3 py-1 bg-[#4A70A9]/10 text-[#8FABD4] border border-[#4A70A9]/20 rounded-lg text-xs font-medium capitalize tracking-wide">
                                                        {skill}
                                                    </span>
                                                ))}
                                                {analysisResult.ats_analysis.strong_matches.length === 0 && <span className="text-xs text-gray-500 italic">No strong matches found.</span>}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Missing / Weak */}
                                    <div className="flex flex-col gap-6">
                                        <div className="bg-[#050B14] rounded-2xl p-6 border border-rose-900/30">
                                            <div className="flex items-center gap-2 mb-4">
                                                <AlertCircle className="w-5 h-5 text-rose-500" />
                                                <h3 className="text-[#EFECE3] font-medium font-heading">Missing Skills</h3>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {analysisResult.ats_analysis.missing_skills.map((skill: string, i: number) => (
                                                    <span key={i} className="px-3 py-1 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-lg text-xs font-medium capitalize">
                                                        {skill}
                                                    </span>
                                                ))}
                                                {analysisResult.ats_analysis.missing_skills.length === 0 && <span className="text-xs text-gray-500 italic">You matched all required skills!</span>}
                                            </div>
                                        </div>

                                        <div className="bg-[#050B14] rounded-2xl p-6 border border-[#334155]/50 relative overflow-hidden">
                                            <div className="absolute top-0 right-0 p-4 opacity-5"><TrendingDown className="w-24 h-24" /></div>
                                            <div className="flex items-center gap-2 mb-4 relative z-10">
                                                <TrendingDown className="w-5 h-5 text-gray-400" />
                                                <h3 className="text-[#EFECE3] font-medium font-heading">Weak Areas to Improve</h3>
                                            </div>
                                            <div className="flex flex-wrap gap-2 relative z-10">
                                                {analysisResult.ats_analysis.weak_areas.map((skill: string, i: number) => (
                                                    <span key={i} className="px-3 py-1 bg-[#1a2333] text-gray-400 border border-[#334155] rounded-lg text-xs font-medium capitalize">
                                                        {skill}
                                                    </span>
                                                ))}
                                                {analysisResult.ats_analysis.weak_areas.length === 0 && <span className="text-xs text-gray-500 italic">No weak areas identified.</span>}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Next Steps Button */}
                                <div className="flex justify-end gap-4 pt-4 border-t border-[#334155]/30">
                                    <button
                                        onClick={() => {
                                            checkBrowserSupportAndRedirect();
                                        }}
                                        className="bg-[#050B14] border border-[#4A70A9]/50 hover:bg-[#1a2333] text-[#8FABD4] hover:text-white px-6 py-3 rounded-xl font-semibold text-sm transition-all shadow-sm flex items-center gap-2"
                                    >
                                        <Target className="w-4 h-4" /> Conduct an AI Interview
                                    </button>
                                    <button
                                        onClick={() => setIsResultModalOpen(false)}
                                        className="bg-[#4A70A9] hover:bg-[#5C85C5] text-white px-8 py-3 rounded-xl font-semibold text-sm transition-all shadow-md hover:shadow-lg"
                                    >
                                        Done
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Browser Warning Modal */}
            <AnimatePresence>
                {isBrowserWarningOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[70] flex items-center justify-center bg-[#000000]/80 backdrop-blur-md pointer-events-auto p-4"
                        onClick={() => setIsBrowserWarningOpen(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-[#0A1120] border border-orange-500/50 rounded-3xl p-8 max-w-md w-full flex flex-col gap-6 shadow-[0_20px_60px_rgba(249,115,22,0.15)]"
                        >
                            <div className="flex flex-col items-center text-center gap-4">
                                <div className="w-16 h-16 rounded-full bg-orange-500/10 flex items-center justify-center border border-orange-500/20">
                                    <AlertCircle className="w-8 h-8 text-orange-400" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-heading font-bold text-[#EFECE3]">Browser Unsupported</h2>
                                    <p className="text-gray-400 text-sm mt-3 leading-relaxed">
                                        You are using a browser that blocks native Voice Dictation (e.g., Brave, Firefox, or unsupported Chromium).
                                        <strong className="text-orange-400 block mt-2">The AI's microphone features will not work.</strong>
                                    </p>
                                    <p className="text-gray-500 text-xs mt-3">
                                        For the intended hands-free voice experience, please use Google Chrome, Microsoft Edge, or Safari.
                                    </p>
                                </div>
                            </div>

                            <div className="flex flex-col gap-3 pt-4 border-t border-[#334155]/50">
                                <button
                                    onClick={proceedToInterview}
                                    className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-xl font-semibold text-sm transition-all shadow-md flex justify-center w-full"
                                >
                                    I Understand, Continue Anyway
                                </button>
                                <button
                                    onClick={() => setIsBrowserWarningOpen(false)}
                                    className="bg-[#1a2333] hover:bg-[#334155] text-gray-300 px-6 py-3 rounded-xl font-semibold text-sm transition-all flex justify-center w-full"
                                >
                                    Cancel
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Subscription Required Modal */}
            <AnimatePresence>
                {isSubscriptionModalOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[80] flex items-center justify-center bg-[#000000]/80 backdrop-blur-md pointer-events-auto p-4"
                        onClick={() => setIsSubscriptionModalOpen(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-[#0A1120] border border-[#8FABD4]/30 rounded-3xl p-6 md:p-8 max-w-[340px] w-full flex flex-col gap-5 shadow-[0_20px_60px_rgba(143,171,212,0.15)] relative overflow-hidden"
                        >
                            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#4A70A9] to-[#8FABD4]"></div>
                            <div className="flex flex-col items-center text-center gap-3">
                                <div className="w-14 h-14 rounded-full bg-[#1a2333] flex items-center justify-center border border-[#4A70A9]/30">
                                    <Star className="w-7 h-7 text-[#8FABD4]" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-heading font-bold text-[#EFECE3]">Buy Subscription</h2>
                                    <p className="text-gray-400 text-xs md:text-sm mt-3 leading-relaxed">
                                        You've reached the limit of your Free Plan. Upgrade to unlock unlimited AI interviews, resumes, and deep insights.
                                    </p>
                                </div>
                            </div>
                            <div className="flex flex-col gap-2 pt-3 border-t border-[#334155]/50">
                                <button
                                    onClick={() => window.location.href = '/plan'}
                                    className="bg-[#4A70A9] hover:bg-[#5C85C5] text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-md flex justify-center w-full shadow-[#4A70A9]/20"
                                >
                                    View Plans & Upgrade
                                </button>
                                <button
                                    onClick={() => setIsSubscriptionModalOpen(false)}
                                    className="bg-transparent hover:bg-[#1a2333] text-gray-400 px-5 py-2.5 rounded-xl font-medium text-sm transition-all flex justify-center w-full"
                                >
                                    Not Now
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Welcome Member Modal */}
            <AnimatePresence>
                {isWelcomeModalOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[80] flex items-center justify-center bg-[#000000]/80 backdrop-blur-md pointer-events-auto p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.95, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: 20 }}
                            className="bg-[#0A1120] border border-emerald-500/30 rounded-3xl p-8 max-w-sm w-full flex flex-col gap-6 shadow-[0_20px_60px_rgba(16,185,129,0.15)] relative overflow-hidden text-center"
                        >
                            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 to-teal-500"></div>
                            <div className="flex flex-col items-center text-center gap-4">
                                <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                                    <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                                </div>
                                <h2 className="text-2xl font-heading font-bold text-[#EFECE3]">Congratulations!</h2>
                                <p className="text-gray-400 text-sm leading-relaxed">
                                    You are now a Premium Member. You've officially unlocked unlimited resumes, interviews, and deep insights. Let's land that dream job!
                                </p>
                            </div>
                            <button
                                onClick={() => setIsWelcomeModalOpen(false)}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-xl font-semibold text-sm transition-all shadow-md mt-2"
                            >
                                Let's Go
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Membership Status Modal */}
            <AnimatePresence>
                {isStatusModalOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[75] flex items-center justify-center bg-[#000000]/70 backdrop-blur-md pointer-events-auto p-4"
                        onClick={() => setIsStatusModalOpen(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-[#0A1120] border border-[#4A70A9]/30 rounded-3xl p-6 md:p-8 max-w-md w-full flex flex-col shadow-[0_20px_60px_rgba(0,0,0,0.5)] relative overflow-hidden"
                        >
                            <button onClick={() => setIsStatusModalOpen(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors p-2 rounded-lg hover:bg-[#1a2333] z-10">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>

                            <div className="flex flex-col items-center text-center gap-4 relative z-10 pt-4">
                                {membershipTier === 'member' ? (
                                    <>
                                        <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                                            <Star className="w-8 h-8 text-emerald-400 fill-emerald-400" />
                                        </div>
                                        <div>
                                            <h2 className="text-2xl font-heading font-bold text-[#EFECE3] flex items-center justify-center gap-2">
                                                Premium Member
                                            </h2>
                                            <p className="text-emerald-400/80 text-sm mt-1 font-medium bg-emerald-500/10 inline-block px-3 py-1 rounded-full border border-emerald-500/20">
                                                Status: Active
                                            </p>
                                        </div>
                                        <div className="bg-[#1a2333] border border-[#334155] rounded-2xl p-5 w-full mt-2 text-left space-y-3">
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-gray-400">Plan</span>
                                                <span className="text-[#EFECE3] font-medium">ResumifyNG Premium Yearly</span>
                                            </div>
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-gray-400">Expiration Date</span>
                                                <span className="text-[#EFECE3] font-medium">
                                                    {membershipExpiry ? new Date(membershipExpiry).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Lifetime'}
                                                </span>
                                            </div>
                                            <div className="pt-3 mt-3 border-t border-[#334155]/50 text-emerald-400/80 text-xs text-center">
                                                You have unlimited access to features.
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="w-16 h-16 rounded-full bg-[#1a2333] flex items-center justify-center border border-[#4A70A9]/30">
                                            <User className="w-8 h-8 text-gray-400" />
                                        </div>
                                        <div>
                                            <h2 className="text-2xl font-heading font-bold text-[#EFECE3]">Guest User</h2>
                                            <p className="text-gray-400 text-sm mt-1">Free Tier</p>
                                        </div>
                                        <div className="bg-[#050B14] border border-[#4A70A9]/20 rounded-2xl p-5 w-full mt-2 space-y-4 relative overflow-hidden group">
                                            <div className="absolute inset-0 bg-[#4A70A9]/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                                            <p className="text-gray-300 text-sm text-left leading-relaxed">
                                                You are currently on the free plan which includes basic access (1 Resume Analysis, 1 AI Interview).
                                            </p>
                                            <button
                                                onClick={() => window.location.href = '/plan'}
                                                className="w-full bg-[#4A70A9] hover:bg-[#5C85C5] text-white px-5 py-3 rounded-xl font-semibold text-sm transition-all shadow-[0_0_15px_rgba(74,112,169,0.2)] hover:shadow-[0_0_20px_rgba(74,112,169,0.4)] flex items-center justify-center gap-2"
                                            >
                                                <Star className="w-4 h-4 fill-white flex-shrink-0" /> Unlock Premium
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

        </div >
    );
};
