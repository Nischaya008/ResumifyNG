import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, Check, X, ArrowRight, Eye, EyeOff, Hash, Github } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';

export const Onboard: React.FC = () => {
    const [signInEmail, setSignInEmail] = useState('');
    const [signInPassword, setSignInPassword] = useState('');
    const [showSignInPassword, setShowSignInPassword] = useState(false);
    const [isSigningIn, setIsSigningIn] = useState(false);
    const [isResettingPassword, setIsResettingPassword] = useState(false);

    const [signUpEmail, setSignUpEmail] = useState('');
    const [signUpPassword, setSignUpPassword] = useState('');
    const [signUpConfirmPassword, setSignUpConfirmPassword] = useState('');
    const [showSignUpPassword, setShowSignUpPassword] = useState(false);
    const [isSigningUp, setIsSigningUp] = useState(false);

    const [otp, setOtp] = useState('');
    const [showOtpInput, setShowOtpInput] = useState(false);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const emailParam = params.get('email');
        if (emailParam) {
            setSignInEmail(emailParam);
        }
    }, []);

    const reqLength = signUpPassword.length >= 6;
    const reqAlphanumeric = /[a-zA-Z]/.test(signUpPassword) && /[0-9]/.test(signUpPassword);
    const reqSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(signUpPassword);
    const reqMatch = signUpPassword === signUpConfirmPassword && signUpPassword.length > 0;

    const isSignInValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(signInEmail) && signInPassword.length > 0;

    const navigateHome = () => {
        window.history.pushState({}, '', '/home');
        window.dispatchEvent(new PopStateEvent('popstate'));
    };

    const handleSignIn = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isSignInValid) return;

        setIsSigningIn(true);
        const { data, error } = await supabase.auth.signInWithPassword({
            email: signInEmail,
            password: signInPassword,
        });
        setIsSigningIn(false);

        if (error) {
            if (error.message.toLowerCase().includes('email not confirmed')) {
                toast.error("Email unverified. Please complete OTP verification.");
            } else {
                toast.error(error.message);
            }
            return;
        }
        toast.success("Logged in successfully!");
        navigateHome();
    };

    const handleForgotPassword = async () => {
        if (!signInEmail) {
            toast.error("Please enter your email to reset password");
            return;
        }
        setIsResettingPassword(true);
        const { error } = await supabase.auth.resetPasswordForEmail(signInEmail, {
            redirectTo: window.location.origin + '/forgot',
        });
        setIsResettingPassword(false);
        if (error) {
            toast.error(error.message);
        } else {
            toast.success("Password reset email sent!");
        }
    };

    const handleGoogleSignIn = async () => {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin + '/check-auth',
            }
        });
        if (error) toast.error(error.message);
    };

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!(reqLength && reqAlphanumeric && reqSpecial && reqMatch)) return;

        setIsSigningUp(true);
        const { data, error } = await supabase.auth.signUp({
            email: signUpEmail,
            password: signUpPassword,
        });
        setIsSigningUp(false);

        if (error) {
            toast.error(error.message);
            return;
        }

        toast.success("OTP sent to your email!");
        setShowOtpInput(true);
    };

    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!otp) return;

        setIsSigningUp(true);
        const { data, error } = await supabase.auth.verifyOtp({
            email: signUpEmail,
            token: otp,
            type: 'signup'
        });
        setIsSigningUp(false);

        if (error) {
            toast.error(error.message);
            return;
        }

        toast.success("You are now in the books of upgrading your resume, congrats.");
        navigateHome();
    };

    return (
        <div className="relative h-[100dvh] lg:h-auto lg:min-h-screen bg-[#050B14] flex flex-col justify-start md:justify-center items-center p-4 pb-12 md:pb-4 overflow-y-auto overflow-x-hidden md:overflow-hidden">
            {/* Background Decor */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#0A1120] to-[#000000] z-0" />
            <div className="absolute inset-0 z-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] pointer-events-none" />

            {/* Back to Home Navigation */}
            <button
                onClick={() => {
                    window.history.pushState({}, '', '/');
                    const navEvent = new PopStateEvent('popstate');
                    window.dispatchEvent(navEvent);
                }}
                className="absolute top-8 left-8 z-20 flex items-center gap-2 text-gray-400 hover:text-[#8FABD4] transition-colors group"
            >
                <img src="/RNG_Logo.png" alt="ResumifyNG Logo" className="w-8 h-8 object-contain group-hover:scale-105 transition-transform drop-shadow-[0_0_10px_rgba(74,112,169,0.5)]" />
                <span className="font-heading font-bold tracking-tight text-xl text-[#EFECE3]">ResumifyNG</span>
            </button>

            {/* Main Container */}
            <div className="w-full max-w-6xl z-10 flex flex-col lg:flex-row gap-8 lg:gap-12 items-stretch justify-center pt-16">

                {/* Sign In Card */}
                <motion.div
                    initial={{ opacity: 0, x: -50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6 }}
                    className="flex-1 bg-[#000000]/60 backdrop-blur-xl border border-[#4A70A9]/30 rounded-[2rem] p-8 md:p-12 shadow-[0_0_50px_rgba(74,112,169,0.1)] flex flex-col"
                >
                    <div className="mb-8 text-center lg:text-left">
                        <h2 className="text-3xl font-heading font-bold text-[#EFECE3] mb-2">Welcome Back</h2>
                        <p className="text-gray-400">Log in to track your applications and continue coaching.</p>
                    </div>

                    <button
                        onClick={handleGoogleSignIn}
                        className="w-full mb-6 py-3 px-4 bg-white hover:bg-gray-100 text-black font-semibold rounded-xl flex items-center justify-center gap-3 transition-colors shadow-sm"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                        Sign in with Google
                    </button>

                    <div className="flex items-center gap-4 mb-6">
                        <div className="flex-1 h-px bg-gray-800"></div>
                        <span className="text-xs text-gray-500 uppercase">Or continue with</span>
                        <div className="flex-1 h-px bg-gray-800"></div>
                    </div>

                    <form className="flex-1 flex flex-col justify-center space-y-6" onSubmit={handleSignIn}>
                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-gray-300 ml-1">Email Address</label>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                                    <input
                                        type="email"
                                        placeholder="john@example.com"
                                        value={signInEmail}
                                        onChange={(e) => setSignInEmail(e.target.value)}
                                        required
                                        className="w-full bg-[#0A1120] border border-[#4A70A9]/30 text-[#EFECE3] rounded-xl px-12 py-4 focus:outline-none focus:border-[#8FABD4] focus:ring-1 focus:ring-[#8FABD4] transition-all"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <div className="flex justify-between items-center ml-1">
                                    <label className="text-sm font-medium text-gray-300">Password</label>
                                    <button
                                        type="button"
                                        onClick={handleForgotPassword}
                                        className="text-xs text-[#8FABD4] hover:text-white transition-colors"
                                    >
                                        Forgot password?
                                    </button>
                                </div>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                                    <input
                                        type={showSignInPassword ? "text" : "password"}
                                        placeholder="••••••••"
                                        value={signInPassword}
                                        onChange={(e) => setSignInPassword(e.target.value)}
                                        required
                                        className="w-full bg-[#0A1120] border border-[#4A70A9]/30 text-[#EFECE3] rounded-xl pl-12 pr-12 py-4 focus:outline-none focus:border-[#8FABD4] focus:ring-1 focus:ring-[#8FABD4] transition-all"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowSignInPassword(!showSignInPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                                    >
                                        {showSignInPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <button
                            disabled={!isSignInValid || isSigningIn}
                            type="submit"
                            className={`w-full py-4 mt-8 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg ${isSignInValid
                                ? "bg-[#4A70A9] hover:bg-[#5C85C5] text-white shadow-[#4A70A9]/30"
                                : "bg-[#0A1120] text-gray-500 border border-[#4A70A9]/20 cursor-not-allowed"
                                }`}
                        >
                            {isSigningIn ? "Signing In..." : "Sign In"} <ArrowRight className="w-5 h-5" />
                        </button>
                    </form>
                </motion.div>

                {/* Vertical Divider / Or (Visible mainly on Desktop) */}
                <div className="hidden lg:flex flex-col items-center justify-center relative">
                    <div className="w-px h-full bg-gradient-to-b from-transparent via-[#4A70A9]/30 to-transparent"></div>
                    <div className="absolute top-1/2 -translate-y-1/2 bg-[#050B14] p-3 rounded-full border border-[#4A70A9]/30 text-xs font-bold text-gray-500 uppercase">OR</div>
                </div>

                {/* Sign Up Card */}
                <motion.div
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6, delay: 0.1 }}
                    className="flex-1 bg-gradient-to-br from-[#0A1120]/80 to-[#000000]/80 backdrop-blur-xl border border-[#8FABD4]/40 rounded-[2rem] p-8 md:p-12 shadow-[0_0_60px_rgba(143,171,212,0.15)] flex flex-col"
                >
                    <div className="mb-10 text-center lg:text-left">
                        <h2 className="text-3xl font-heading font-bold text-[#EFECE3] mb-2">Create Account</h2>
                        <p className="text-gray-400">Join to get AI-powered insights on your career path.</p>
                    </div>

                    <form className="flex-1 flex flex-col justify-center space-y-6" onSubmit={showOtpInput ? handleVerifyOtp : handleSignUp}>
                        <div className="space-y-4">

                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-gray-300 ml-1">Email Address</label>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                                    <input
                                        type="email"
                                        placeholder="john@example.com"
                                        value={signUpEmail}
                                        onChange={(e) => setSignUpEmail(e.target.value)}
                                        disabled={showOtpInput}
                                        required
                                        className="w-full bg-[#050B14] border border-[#4A70A9]/40 text-[#EFECE3] rounded-xl px-12 py-4 focus:outline-none focus:border-[#8FABD4] focus:ring-1 focus:ring-[#8FABD4] transition-all disabled:opacity-50"
                                    />
                                </div>
                            </div>

                            {!showOtpInput ? (
                                <>
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-medium text-gray-300 ml-1">Password</label>
                                        <div className="relative">
                                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                                            <input
                                                type={showSignUpPassword ? "text" : "password"}
                                                placeholder="Create a strong password"
                                                value={signUpPassword}
                                                onChange={(e) => setSignUpPassword(e.target.value)}
                                                required
                                                className="w-full bg-[#050B14] border border-[#4A70A9]/40 text-[#EFECE3] rounded-xl pl-12 pr-12 py-4 focus:outline-none focus:border-[#8FABD4] focus:ring-1 focus:ring-[#8FABD4] transition-all"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowSignUpPassword(!showSignUpPassword)}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                                            >
                                                {showSignUpPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-sm font-medium text-gray-300 ml-1">Confirm Password</label>
                                        <div className="relative">
                                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                                            <input
                                                type={showSignUpPassword ? "text" : "password"}
                                                placeholder="Repeat password"
                                                value={signUpConfirmPassword}
                                                onChange={(e) => setSignUpConfirmPassword(e.target.value)}
                                                required
                                                className="w-full bg-[#050B14] border border-[#4A70A9]/40 text-[#EFECE3] rounded-xl pl-12 pr-12 py-4 focus:outline-none focus:border-[#8FABD4] focus:ring-1 focus:ring-[#8FABD4] transition-all"
                                            />
                                        </div>
                                    </div>

                                    {/* Dynamic Validation Checklist */}
                                    <AnimatePresence>
                                        {signUpPassword.length > 0 && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                exit={{ opacity: 0, height: 0 }}
                                                className="bg-[#000000]/40 rounded-xl p-4 border border-[#4A70A9]/20 overflow-hidden"
                                            >
                                                <p className="text-xs text-gray-400 mb-2 font-medium">Password Requirements:</p>
                                                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-y-1.5 gap-x-4 text-[11px] leading-tight">
                                                    <li className="flex items-center gap-1.5">
                                                        {reqLength ? <Check className="w-3.5 h-3.5 text-green-400 shrink-0" /> : <X className="w-3.5 h-3.5 text-gray-500 shrink-0" />}
                                                        <span className={reqLength ? "text-gray-300 truncate" : "text-gray-500 truncate"}>At least 6 characters</span>
                                                    </li>
                                                    <li className="flex items-center gap-1.5">
                                                        {reqAlphanumeric ? <Check className="w-3.5 h-3.5 text-green-400 shrink-0" /> : <X className="w-3.5 h-3.5 text-gray-500 shrink-0" />}
                                                        <span className={reqAlphanumeric ? "text-gray-300 truncate" : "text-gray-500 truncate"}>Letters & numbers</span>
                                                    </li>
                                                    <li className="flex items-center gap-1.5">
                                                        {reqSpecial ? <Check className="w-3.5 h-3.5 text-green-400 shrink-0" /> : <X className="w-3.5 h-3.5 text-gray-500 shrink-0" />}
                                                        <span className={reqSpecial ? "text-gray-300 truncate" : "text-gray-500 truncate"}>Special character</span>
                                                    </li>
                                                    <li className="flex items-center gap-1.5">
                                                        {reqMatch ? <Check className="w-3.5 h-3.5 text-green-400 shrink-0" /> : <X className="w-3.5 h-3.5 text-gray-500 shrink-0" />}
                                                        <span className={reqMatch ? "text-gray-300 truncate" : "text-gray-500 truncate"}>Passwords match</span>
                                                    </li>
                                                </ul>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </>
                            ) : (
                                <div className="space-y-1.5 animate-in fade-in slide-in-from-right-4 duration-500">
                                    <label className="text-sm font-medium text-gray-300 ml-1">Secure OTP Code</label>
                                    <div className="relative">
                                        <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                                        <input
                                            type="text"
                                            placeholder="Enter 8-digit code"
                                            value={otp}
                                            onChange={(e) => setOtp(e.target.value)}
                                            maxLength={8}
                                            required
                                            className="w-full bg-[#050B14] border border-[#4A70A9]/40 text-[#EFECE3] rounded-xl px-12 py-4 focus:outline-none focus:border-[#8FABD4] focus:ring-1 focus:ring-[#8FABD4] transition-all tracking-widest font-mono"
                                        />
                                    </div>
                                    <p className="text-xs text-[#8FABD4] mt-2 ml-1">Check your inbox for the OTP we just sent.</p>
                                </div>
                            )}
                        </div>

                        <button
                            disabled={(!showOtpInput && !(reqLength && reqAlphanumeric && reqSpecial && reqMatch)) || isSigningUp || (showOtpInput && otp.length < 8)}
                            type="submit"
                            className={`w-full py-4 mt-8 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg ${(!showOtpInput && reqLength && reqAlphanumeric && reqSpecial && reqMatch) || (showOtpInput && otp.length >= 8)
                                ? "bg-[#4A70A9] hover:bg-[#5C85C5] text-white shadow-[#4A70A9]/30"
                                : "bg-[#0A1120] text-gray-500 border border-[#4A70A9]/20 cursor-not-allowed"
                                }`}
                        >
                            {isSigningUp
                                ? "Processing..."
                                : showOtpInput
                                    ? "Verify OTP"
                                    : "Sign Up"} <ArrowRight className="w-5 h-5" />
                        </button>
                    </form>
                </motion.div>

            </div>
        </div>
    );
};
