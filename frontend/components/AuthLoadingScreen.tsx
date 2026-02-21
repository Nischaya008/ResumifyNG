import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

export const AuthLoadingScreen: React.FC = () => {
    useEffect(() => {
        let isMounted = true;
        const checkSession = async () => {
            // Intentional delay for smooth UI transition
            await new Promise(resolve => setTimeout(resolve, 1500));

            const { data: { session } } = await supabase.auth.getSession();
            const params = new URLSearchParams(window.location.search);
            const mode = params.get('mode');

            if (session) {
                if (mode === 'subscribe') {
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('membership_tier')
                        .eq('id', session.user.id)
                        .single();

                    if (profile?.membership_tier !== 'guest') {
                        if (isMounted) toast.success("Already a member!");
                        window.history.pushState({}, '', '/home');
                    } else {
                        window.history.pushState({}, '', '/plan');
                    }
                } else {
                    window.history.pushState({}, '', '/home');
                }
            } else {
                window.history.pushState({}, '', '/onboard');
            }
            if (isMounted) {
                const navEvent = new PopStateEvent('popstate');
                window.dispatchEvent(navEvent);
            }
        };

        checkSession();
        return () => { isMounted = false; }
    }, []);

    return (
        <div className="relative min-h-screen bg-[#000000] flex flex-col justify-center items-center p-4 overflow-hidden font-sans">
            <div className="absolute inset-0 bg-gradient-to-b from-[#0A1120] to-[#000000] z-0" />

            {/* Ambient Background Glows */}
            <motion.div
                animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.1, 0.3, 0.1],
                }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute w-96 h-96 bg-[#4A70A9] rounded-full blur-[120px] pointer-events-none"
            />
            <motion.div
                animate={{
                    scale: [1.2, 1, 1.2],
                    opacity: [0.1, 0.2, 0.1],
                }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                className="absolute w-72 h-72 bg-[#8FABD4] rounded-full blur-[100px] pointer-events-none translate-x-20 translate-y-20"
            />
            <div className="absolute inset-0 z-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] pointer-events-none" />

            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                className="z-10 flex flex-col items-center"
            >
                {/* Logo with pulsing glow */}
                <div className="relative mb-12">
                    <motion.div
                        animate={{ opacity: [0.5, 1, 0.5], scale: [0.95, 1.05, 0.95] }}
                        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute inset-0 bg-[#4A70A9] blur-2xl rounded-full opacity-30"
                    />
                    <motion.img
                        src="/RNG_Logo.png"
                        alt="RNG Logo"
                        className="w-20 h-20 object-contain drop-shadow-[0_0_15px_rgba(74,112,169,0.8)] relative z-10"
                        animate={{ y: [0, -8, 0] }}
                        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    />
                </div>

                {/* Animated Loading Rings */}
                <div className="relative flex items-center justify-center mb-8">
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                        className="absolute w-24 h-24 border border-t-[#8FABD4] border-r-transparent border-b-[#4A70A9] border-l-transparent rounded-full opacity-50"
                    />
                    <motion.div
                        animate={{ rotate: -360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        className="absolute w-16 h-16 border-2 border-t-white border-r-transparent border-b-[#8FABD4] border-l-transparent rounded-full opacity-80"
                    />
                    <Loader2 className="w-6 h-6 text-white animate-spin z-10 drop-shadow-md" />
                </div>

                {/* Text Content */}
                <div className="text-center relative">
                    <motion.h2
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2, duration: 0.5 }}
                        className="text-2xl md:text-3xl font-heading font-bold text-[#EFECE3] mb-3 tracking-wide"
                    >
                        Authenticating
                    </motion.h2>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4, duration: 0.8 }}
                        className="flex items-center justify-center gap-2 text-gray-400 font-medium"
                    >
                        <span>Establishing secure connection</span>
                        <motion.span
                            animate={{ opacity: [0, 1, 0] }}
                            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: 0 }}
                        >.</motion.span>
                        <motion.span
                            animate={{ opacity: [0, 1, 0] }}
                            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
                        >.</motion.span>
                        <motion.span
                            animate={{ opacity: [0, 1, 0] }}
                            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
                        >.</motion.span>
                    </motion.div>
                </div>
            </motion.div>
        </div>
    );
};
