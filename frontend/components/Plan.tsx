import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Check, CreditCard, Lock, Loader2, User, LogOut, Target } from 'lucide-react';
import { motion } from 'framer-motion';
import { Footer } from './Footer';
import toast from 'react-hot-toast';

interface PlanProps { }

export const Plan: React.FC<PlanProps> = () => {
    const [loading, setLoading] = useState(false);
    const [user, setUser] = useState<any>(null);
    const [authChecking, setAuthChecking] = useState(true);

    const handleSignOut = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) {
            toast.error(error.message);
        } else {
            toast.success("Signed out successfully!");
            window.location.href = '/';
        }
    };

    useEffect(() => {
        let isMounted = true;
        const checkAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                if (isMounted) window.location.href = '/onboard';
                return;
            }

            // Check membership status
            const { data: profile } = await supabase
                .from('profiles')
                .select('membership_tier')
                .eq('id', session.user.id)
                .single();

            if (profile?.membership_tier !== 'guest') {
                if (isMounted) {
                    toast.success("Already a member!");
                    window.location.href = '/home';
                }
                return;
            }

            if (isMounted) {
                setUser(session.user);
                setAuthChecking(false);
            }
        };

        checkAuth();

        // Load Razorpay Script
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.async = true;
        document.body.appendChild(script);

        return () => {
            isMounted = false;
            document.body.removeChild(script);
        };
    }, []);

    if (authChecking) {
        return (
            <div className="min-h-screen bg-[#050B14] flex flex-col items-center justify-center p-4">
                <Loader2 className="w-10 h-10 text-[#4A70A9] animate-spin mb-6" />
                <h2 className="text-2xl font-bold text-[#EFECE3] mb-2 font-heading">
                    Verifying Membership
                </h2>
                <p className="text-gray-400 text-center max-w-sm">
                    Checking your subscription status...
                </p>
            </div>
        );
    }

    const handlePayment = async () => {
        if (!user) {
            window.location.href = '/onboard';
            return;
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('membership_tier')
            .eq('id', user.id)
            .single();

        if (profile?.membership_tier !== 'guest') {
            toast.success("Already a member!");
            window.location.href = '/home';
            return;
        }

        setLoading(true);

        try {
            // Create Order
            const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/payment/create-order`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ amount: 50, currency: "INR" }),
            });

            if (!res.ok) {
                throw new Error('Failed to create order');
            }

            const orderData = await res.json();

            const options = {
                key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'your_razorpay_key', // Ensure this is set in frontend `.env`
                amount: orderData.amount,
                currency: orderData.currency,
                name: 'ResumifyNG',
                description: 'Premium Membership',
                order_id: orderData.order_id,
                handler: async function (response: any) {
                    try {
                        // Verify payment
                        const verifyRes = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/payment/verify`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_signature: response.razorpay_signature,
                                user_id: user.id
                            }),
                        });

                        if (!verifyRes.ok) {
                            throw new Error('Payment verification failed');
                        }

                        // Payment Strategy succeeded
                        sessionStorage.setItem('justSubscribed', 'true');
                        window.location.href = '/home';

                    } catch (error) {
                        console.error(error);
                        alert('Payment verification failed! Please contact support if amount was deducted.');
                    }
                },
                prefill: {
                    email: user?.email || '',
                },
                theme: {
                    color: '#4A70A9',
                },
            };

            const rzp = new (window as any).Razorpay(options);
            rzp.open();

        } catch (error) {
            console.error(error);
            alert('Could not start checkout. Please try again later.');
        } finally {
            setLoading(false);
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
                    <div className="flex items-center gap-2 cursor-pointer group" onClick={() => window.location.href = '/'}>
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
                            <span>{user?.email || 'Loading...'}</span>
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
                                            onClick={() => window.location.href = '/home'}
                                            className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-[#EFECE3] hover:bg-[#1a2333] transition-colors"
                                        >
                                            <User className="w-4 h-4 text-[#8FABD4]" /> Profile
                                        </button>
                                        <button
                                            onClick={() => window.location.href = '/home'}
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
            <main className="flex-1 bg-[#000000] rounded-[2rem] md:rounded-[2.5rem] overflow-y-auto overflow-x-hidden relative custom-scrollbar shadow-2xl ring-1 ring-[#475569]">

                {/* Background Elements */}
                <div className="absolute inset-0 bg-gradient-to-b from-[#050B14] via-[#000000] to-[#000000] z-0 pointer-events-none" />
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

                <section className="py-24 bg-transparent relative z-10">
                    <div className="container mx-auto px-4">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl md:text-5xl font-heading font-bold text-[#EFECE3] mb-6">
                                Unlock Premium <span className="text-[#8FABD4]">Features</span>
                            </h2>
                            <p className="text-gray-400 max-w-2xl mx-auto text-lg">
                                Upgrade to a premium membership to unlock unlimited interview coaching and remove usage limits.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                            {/* Free Tier */}
                            <div className="bg-[#050B14]/50 border border-[#4A70A9]/30 rounded-[2rem] p-8 flex flex-col hover:bg-[#0A1120] transition-colors shadow-lg">
                                <h3 className="text-2xl font-bold text-[#EFECE3] mb-2">Guest</h3>
                                <div className="text-4xl font-heading font-bold text-[#EFECE3] mb-6">Free</div>
                                <p className="text-gray-400 mb-8">Basic limits to test the application limits.</p>

                                <ul className="space-y-4 mb-8 flex-1">
                                    <li className="flex items-center gap-3 text-gray-400">
                                        <Check className="w-5 h-5 text-[#8FABD4]" /> 1 Resume Upload Limit
                                    </li>
                                    <li className="flex items-center gap-3 text-gray-400">
                                        <Check className="w-5 h-5 text-[#8FABD4]" /> 1 Mock Interview Trial
                                    </li>
                                    <li className="flex items-center gap-3 text-gray-500 opacity-50 line-through">
                                        <Check className="w-5 h-5 text-gray-600" /> Unlock Insights Graph
                                    </li>
                                </ul>

                                <button
                                    onClick={() => window.location.href = '/home'}
                                    className="w-full py-3 rounded-xl border border-[#4A70A9]/50 text-[#8FABD4] font-medium hover:bg-[#4A70A9]/20 transition-colors"
                                >
                                    Current Plan
                                </button>
                            </div>

                            {/* Premium Tier */}
                            <div className="relative bg-gradient-to-b from-[#0A1120] to-[#000000] border border-[#8FABD4]/50 rounded-[2rem] p-8 flex flex-col shadow-[0_0_40px_rgba(143,171,212,0.15)] transform hover:-translate-y-1 transition-transform duration-300">
                                <div className="absolute top-0 right-0 bg-green-500/90 text-white text-xs font-bold px-3 py-1 rounded-bl-xl rounded-tr-[1.8rem]">
                                    LAUNCH OFFER
                                </div>
                                <h3 className="text-2xl font-bold text-[#EFECE3] mb-2">Member</h3>
                                <div className="flex items-end gap-2 mb-6">
                                    <div className="text-4xl font-heading font-bold text-[#EFECE3]">₹50</div>
                                    <div className="text-xl text-gray-400 line-through mb-1">₹200</div>
                                    <div className="text-sm text-gray-500 mb-1">/year</div>
                                </div>
                                <p className="text-gray-400 mb-8">Full access to AI coaching, unlimited resumes, and insights.</p>

                                <ul className="space-y-4 mb-8 flex-1">
                                    <li className="flex items-center gap-3 text-gray-300">
                                        <Check className="w-5 h-5 text-[#8FABD4]" /> Unlimited AI Interviews
                                    </li>
                                    <li className="flex items-center gap-3 text-gray-300">
                                        <Check className="w-5 h-5 text-[#8FABD4]" /> Unlimited Resume Uploads
                                    </li>
                                    <li className="flex items-center gap-3 text-gray-300">
                                        <Check className="w-5 h-5 text-[#8FABD4]" /> Unlock Personal Insights
                                    </li>
                                    <li className="flex items-center gap-3 text-gray-300">
                                        <Check className="w-5 h-5 text-[#8FABD4]" /> Priority Access to Features
                                    </li>
                                </ul>

                                <button
                                    onClick={handlePayment}
                                    disabled={loading}
                                    className="w-full py-3 rounded-xl bg-[#4A70A9] text-[#EFECE3] font-bold hover:bg-[#5C85C5] transition-colors shadow-lg shadow-[#4A70A9]/30 disabled:opacity-50 flex justify-center items-center"
                                >
                                    {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Get Membership'}
                                </button>

                                <div className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-500">
                                    <Lock className="w-3 h-3" /> Secure payment via Razorpay
                                </div>
                            </div>
                        </div>

                        <div className="mt-12 flex justify-center gap-6 opacity-40 grayscale hover:grayscale-0 transition-all duration-500">
                            <div className="flex items-center gap-2 text-gray-300 font-bold"><CreditCard className="w-6 h-6" /> VISA</div>
                            <div className="flex items-center gap-2 text-gray-300 font-bold"><CreditCard className="w-6 h-6" /> MasterCard</div>
                            <div className="flex items-center gap-2 text-gray-300 font-bold"><span className="text-xl">UPI</span></div>
                        </div>
                    </div>
                </section>

                <Footer />
            </main>
        </div>
    );
};
