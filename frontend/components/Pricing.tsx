import React from 'react';
import { Check, CreditCard, Lock } from 'lucide-react';
import { toast } from 'react-hot-toast';

export const Pricing: React.FC = () => {
  return (
    <section id="pricing" className="py-20 md:py-24 bg-transparent relative">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="text-center mb-12 md:mb-16">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-heading font-bold text-[#EFECE3] mb-4 md:mb-6">
            Invest in your <span className="text-[#8FABD4]">Future</span>
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto text-base sm:text-lg px-2">
            Secure processing for premium tools. Unlock advanced resume optimization and unlimited interview coaching.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 max-w-4xl mx-auto">
          {/* Guest Tier */}
          <div className="bg-[#050B14]/50 border border-[#4A70A9]/30 rounded-[2rem] p-6 sm:p-8 flex flex-col hover:bg-[#0A1120] transition-colors shadow-lg">
            <h3 className="text-xl sm:text-2xl font-bold text-[#EFECE3] mb-2">Guest</h3>
            <div className="text-3xl sm:text-4xl font-heading font-bold text-[#EFECE3] mb-4 sm:mb-6">₹0</div>
            <p className="text-gray-400 text-sm sm:text-base mb-6 sm:mb-8">Perfect for testing the waters.</p>

            <ul className="space-y-3 sm:space-y-4 mb-6 sm:mb-8 flex-1 text-sm sm:text-base">
              <li className="flex items-center gap-3 text-gray-400">
                <Check className="w-4 h-4 sm:w-5 sm:h-5 text-[#8FABD4] shrink-0" /> 1 Resume Upload Limit
              </li>
              <li className="flex items-center gap-3 text-gray-400">
                <Check className="w-4 h-4 sm:w-5 sm:h-5 text-[#8FABD4] shrink-0" /> 1 Free Mock Interview Trial
              </li>
              <li className="flex items-center gap-3 text-gray-500 line-through opacity-50">
                <Check className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 shrink-0" /> Unlock Insights Graph
              </li>
            </ul>

            <button
              onClick={() => {
                window.history.pushState({}, '', '/check-auth');
                window.dispatchEvent(new PopStateEvent('popstate'));
              }}
              className="w-full py-3 sm:py-4 rounded-xl border border-[#4A70A9]/50 text-[#8FABD4] font-semibold text-sm sm:text-base hover:bg-[#4A70A9]/20 transition-colors"
            >
              Get Started for Free
            </button>
          </div>

          {/* Premium Tier */}
          <div className="relative bg-gradient-to-b from-[#0A1120] to-[#000000] border border-[#8FABD4]/50 rounded-[2rem] p-6 sm:p-8 flex flex-col shadow-[0_0_40px_rgba(143,171,212,0.15)] transform hover:-translate-y-1 transition-transform duration-300">
            <div className="absolute top-0 right-0 bg-green-500/90 text-white text-[10px] sm:text-xs font-bold px-3 py-1 rounded-bl-xl rounded-tr-[1.8rem]">
              LAUNCH OFFER
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-[#EFECE3] mb-2">Member</h3>
            <div className="flex items-end gap-2 mb-4 sm:mb-6">
              <div className="text-3xl sm:text-4xl font-heading font-bold text-[#EFECE3]">₹50</div>
              <div className="text-lg sm:text-xl text-gray-400 line-through mb-1">₹200</div>
              <div className="text-xs sm:text-sm text-gray-500 mb-1">/year</div>
            </div>
            <p className="text-gray-400 text-sm sm:text-base mb-6 sm:mb-8">Unleash your full potential and land the offer.</p>

            <ul className="space-y-3 sm:space-y-4 mb-6 sm:mb-8 flex-1 text-sm sm:text-base">
              <li className="flex items-center gap-3 text-gray-300">
                <Check className="w-4 h-4 sm:w-5 sm:h-5 text-[#8FABD4] shrink-0" /> Unlimited AI Voice Interviews
              </li>
              <li className="flex items-center gap-3 text-gray-300">
                <Check className="w-4 h-4 sm:w-5 sm:h-5 text-[#8FABD4] shrink-0" /> Unlimited Resume Uploads
              </li>
              <li className="flex items-center gap-3 text-gray-300">
                <Check className="w-4 h-4 sm:w-5 sm:h-5 text-[#8FABD4] shrink-0" /> Unlock Full Personal Insights
              </li>
              <li className="flex items-center gap-3 text-gray-300">
                <Check className="w-4 h-4 sm:w-5 sm:h-5 text-[#8FABD4] shrink-0" /> Priority Access to Features
              </li>
            </ul>

            <button
              onClick={() => {
                window.history.pushState({}, '', '/check-auth?mode=subscribe');
                window.dispatchEvent(new PopStateEvent('popstate'));
              }}
              className="w-full py-3 sm:py-4 rounded-xl bg-[#4A70A9] text-[#EFECE3] font-bold text-sm sm:text-base hover:bg-[#5C85C5] transition-colors shadow-lg shadow-[#4A70A9]/30"
            >
              Subscribe Now
            </button>

            <div className="mt-4 flex items-center justify-center gap-2 text-[10px] sm:text-xs text-gray-500">
              <Lock className="w-3 h-3 shrink-0" /> Secure payment via Razorpay
            </div>
          </div>
        </div>

        <div className="mt-10 sm:mt-12 flex justify-center gap-4 sm:gap-6 opacity-40 grayscale hover:grayscale-0 transition-all duration-500">
          <div className="flex items-center gap-1 sm:gap-2 text-gray-300 font-bold text-xs sm:text-base"><CreditCard className="w-5 h-5 sm:w-6 sm:h-6" /> VISA</div>
          <div className="flex items-center gap-1 sm:gap-2 text-gray-300 font-bold text-xs sm:text-base"><CreditCard className="w-5 h-5 sm:w-6 sm:h-6" /> MasterCard</div>
          <div className="flex items-center gap-1 sm:gap-2 text-gray-300 font-bold"><span className="text-lg sm:text-xl">UPI</span></div>
        </div>

      </div>
    </section>
  );
};
