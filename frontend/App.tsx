import React, { useState, useEffect } from 'react';
import { DynamicHeader } from './components/DynamicHeader';
import { Hero } from './components/Hero';
import { Features } from './components/Features';
import { HowItWorks } from './components/HowItWorks';
import { Pricing } from './components/Pricing';
import { Testimonials } from './components/Testimonials';
import { FAQ } from './components/FAQ';
import { Footer } from './components/Footer';
import { ScrollToTop } from './components/ScrollToTop';
import { Onboard } from './components/Onboard';
import { Home } from './components/Home';
import { Forgot } from './components/Forgot';
import { AuthLoadingScreen } from './components/AuthLoadingScreen';
import { Interview } from './components/Interview';
import { Plan } from './components/Plan';
import { Toaster } from 'react-hot-toast';
import { supabase } from './lib/supabase';

function App() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname);
    };

    // Listen for back/forward navigation
    window.addEventListener('popstate', handleLocationChange);

    // Listen for auth events
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        window.history.pushState({}, '', '/forgot');
        window.dispatchEvent(new PopStateEvent('popstate'));
      }
    });

    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      subscription.unsubscribe();
    };
  }, []);

  if (currentPath === '/check-auth') {
    return (
      <>
        <AuthLoadingScreen />
        <Toaster position="top-right" toastOptions={{
          style: {
            background: '#0A1120',
            color: '#EFECE3',
            border: '1px solid #4A70A9',
          }
        }} />
      </>
    );
  }

  if (currentPath === '/home') {
    return (
      <>
        <Home />
        <Toaster position="top-right" toastOptions={{
          style: {
            background: '#0A1120',
            color: '#EFECE3',
            border: '1px solid #4A70A9',
          }
        }} />
      </>
    );
  }

  if (currentPath === '/onboard') {
    return (
      <>
        <Onboard />
        <Toaster position="top-right" toastOptions={{
          style: {
            background: '#0A1120',
            color: '#EFECE3',
            border: '1px solid #4A70A9',
          }
        }} />
      </>
    );
  }

  if (currentPath === '/forgot') {
    return (
      <>
        <Forgot />
        <Toaster position="top-right" toastOptions={{
          style: {
            background: '#0A1120',
            color: '#EFECE3',
            border: '1px solid #4A70A9',
          }
        }} />
      </>
    );
  }

  if (currentPath === '/interview') {
    return (
      <>
        <Interview />
        <Toaster position="top-right" toastOptions={{
          style: {
            background: '#0A1120',
            color: '#EFECE3',
            border: '1px solid #4A70A9',
          }
        }} />
      </>
    );
  }

  if (currentPath === '/plan') {
    return (
      <>
        <Plan />
        <Toaster position="top-right" toastOptions={{
          style: {
            background: '#0A1120',
            color: '#EFECE3',
            border: '1px solid #4A70A9',
          }
        }} />
      </>
    );
  }

  return (
    <>
      <div className="relative w-full h-screen bg-[#334155] p-2 md:p-3 lg:p-4 flex flex-col overflow-hidden">

        {/* The Notch Navbar - Positioned absolutely to overlay the frame and content */}
        <DynamicHeader />

        {/* Main Content Window - Uses #000000 for maximum contrast */}
        <main className="flex-1 bg-[#000000] rounded-[2rem] md:rounded-[2.5rem] overflow-y-auto overflow-x-hidden relative custom-scrollbar shadow-2xl ring-1 ring-[#475569]">
          <Hero />

          {/* Spacer */}
          <div className="h-4 bg-[#000000]"></div>

          <div className="space-y-4 px-2 md:px-4 pb-4">
            <div className="rounded-[2rem] overflow-hidden bg-[#0A1120] border border-[#4A70A9]/30 shadow-[0_0_30px_rgba(74,112,169,0.1)]">
              <Features />
            </div>

            <div className="rounded-[2rem] overflow-hidden bg-[#000000] border border-[#4A70A9]/30 shadow-[0_0_30px_rgba(74,112,169,0.1)]">
              <HowItWorks />
            </div>

            <div className="rounded-[2rem] overflow-hidden bg-[#0A1120] border border-[#4A70A9]/30 shadow-[0_0_30px_rgba(74,112,169,0.1)]">
              <Testimonials />
            </div>

            <div className="rounded-[2rem] overflow-hidden bg-gradient-to-b from-[#0A1120] to-[#000000] border border-[#4A70A9]/30 shadow-[0_0_30px_rgba(74,112,169,0.1)]">
              <Pricing />
            </div>

            <div className="rounded-[2rem] overflow-hidden bg-[#000000] border border-[#4A70A9]/30 shadow-[0_0_30px_rgba(74,112,169,0.1)]">
              <FAQ />
            </div>
          </div>

          <Footer />
        </main>
      </div>
      <ScrollToTop />
      <Toaster position="top-right" toastOptions={{
        style: {
          background: '#0A1120',
          color: '#EFECE3',
          border: '1px solid #4A70A9',
        }
      }} />
    </>
  );
}

export default App;