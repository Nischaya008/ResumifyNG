import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, Check, X, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';

export const Forgot: React.FC = () => {
    const [userEmail, setUserEmail] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const [isCheckingUser, setIsCheckingUser] = useState(true);

    useEffect(() => {
        const fetchSession = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user?.email) {
                setUserEmail(user.email);
            }
            setIsCheckingUser(false);
        };
        fetchSession();
    }, []);

    const reqLength = newPassword.length >= 6;
    const reqAlphanumeric = /[a-zA-Z]/.test(newPassword) && /[0-9]/.test(newPassword);
    const reqSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(newPassword);
    const reqMatch = newPassword === confirmPassword && newPassword.length > 0;
    const isValid = reqLength && reqAlphanumeric && reqSpecial && reqMatch;

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isValid) return;

        setIsUpdating(true);
        const { error } = await supabase.auth.updateUser({
            password: newPassword
        });
        setIsUpdating(false);

        if (error) {
            toast.error(error.message);
        } else {
            toast.success("Password updated successfully!");
            // Sign out the user, then redirect to /onboard with the email prefilled
            await supabase.auth.signOut();
            window.history.pushState({}, '', `/onboard?email=${encodeURIComponent(userEmail)}`);
            window.dispatchEvent(new PopStateEvent('popstate'));
        }
    };

    if (isCheckingUser) {
        return (
            <div className="min-h-screen bg-[#050B14] flex items-center justify-center">
                <p className="text-[#8FABD4]">Verifying secure link...</p>
            </div>
        );
    }

    return (
        <div className="relative min-h-screen bg-[#050B14] flex flex-col justify-center items-center p-4 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-[#0A1120] to-[#000000] z-0" />
            <div className="absolute inset-0 z-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] pointer-events-none" />

            <button
                onClick={() => {
                    window.history.pushState({}, '', '/');
                    const navEvent = new PopStateEvent('popstate');
                    window.dispatchEvent(navEvent);
                }}
                className="absolute top-8 left-8 z-20 flex items-center gap-2 text-gray-400 hover:text-[#8FABD4] transition-colors"
            >
                <span className="font-heading font-bold tracking-tight text-xl text-[#EFECE3]">ResumifyNG</span>
            </button>

            <motion.div
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                className="z-10 bg-[#000000]/60 backdrop-blur-xl border border-[#4A70A9]/30 rounded-[2rem] p-8 md:p-12 shadow-[0_0_50px_rgba(74,112,169,0.1)] w-full max-w-md"
            >
                <div className="mb-10 text-center">
                    <h2 className="text-3xl font-heading font-bold text-[#EFECE3] mb-2">Reset Password</h2>
                    <p className="text-gray-400">Enter a new secure password.</p>
                </div>

                <form className="flex flex-col gap-6" onSubmit={handleUpdatePassword}>
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-gray-300 ml-1">Email Address</label>
                        <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                            <input
                                type="email"
                                value={userEmail}
                                disabled
                                className="w-full bg-[#050B14] border border-[#4A70A9]/40 text-gray-500 rounded-xl px-12 py-4 cursor-not-allowed opacity-70"
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-gray-300 ml-1">New Password</label>
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                            <input
                                type={showPassword ? "text" : "password"}
                                placeholder="Create a strong password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required
                                className="w-full bg-[#050B14] border border-[#4A70A9]/40 text-[#EFECE3] rounded-xl pl-12 pr-12 py-4 focus:outline-none focus:border-[#8FABD4] focus:ring-1 focus:ring-[#8FABD4] transition-all"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                            >
                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-gray-300 ml-1">Confirm Password</label>
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                            <input
                                type={showPassword ? "text" : "password"}
                                placeholder="Repeat password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                className="w-full bg-[#050B14] border border-[#4A70A9]/40 text-[#EFECE3] rounded-xl pl-12 pr-12 py-4 focus:outline-none focus:border-[#8FABD4] focus:ring-1 focus:ring-[#8FABD4] transition-all"
                            />
                        </div>
                    </div>

                    <AnimatePresence>
                        {newPassword.length > 0 && (
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

                    <button
                        disabled={!isValid || isUpdating}
                        type="submit"
                        className={`w-full py-4 mt-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg ${isValid
                            ? "bg-[#4A70A9] hover:bg-[#5C85C5] text-white shadow-[#4A70A9]/30"
                            : "bg-[#0A1120] text-gray-500 border border-[#4A70A9]/20 cursor-not-allowed"
                            }`}
                    >
                        {isUpdating ? "Updating..." : "Update Password"} <ArrowRight className="w-5 h-5" />
                    </button>
                </form>
            </motion.div>
        </div>
    );
};
