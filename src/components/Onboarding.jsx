'use client';
import React, { useState } from 'react';
import { ChevronRight, Target, TrendingUp, Award, Sparkles } from 'lucide-react';

export default function Onboarding({ onComplete }) {
  const [currentScreen, setCurrentScreen] = useState(0);
  const [direction, setDirection] = useState('forward');

  const screens = [
    {
      icon: Target,
      title: "Welcome to Kommit Pro",
      description: "Your personal companion for building lasting habits and achieving your goals, one day at a time.",
      gradient: "from-teal-500 via-cyan-500 to-blue-500",
      accentColor: "teal"
    },
    {
      icon: TrendingUp,
      title: "Track Your Progress",
      description: "Visualize your journey with powerful streak counters, detailed analytics, and beautiful progress charts.",
      gradient: "from-cyan-500 via-blue-500 to-indigo-500",
      accentColor: "cyan"
    },
    {
      icon: Award,
      title: "Unlock Achievements",
      description: "Earn badges and celebrate milestones as you build momentum and transform your daily routines.",
      gradient: "from-blue-500 via-indigo-500 to-purple-500",
      accentColor: "blue"
    },
    {
      icon: Sparkles,
      title: "Stay Motivated",
      description: "Get daily inspiration, personalized insights, and gentle reminders to keep you on track.",
      gradient: "from-indigo-500 via-purple-500 to-pink-500",
      accentColor: "indigo"
    }
  ];

  const handleNext = () => {
    if (currentScreen < screens.length - 1) {
      setDirection('forward');
      setCurrentScreen(currentScreen + 1);
    } else {
      onComplete();
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  const isLastScreen = currentScreen === screens.length - 1;
  const CurrentIcon = screens[currentScreen].icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background blobs */}
      <div className="absolute inset-0 overflow-hidden">
        <div className={`absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br ${screens[currentScreen].gradient} rounded-full blur-3xl opacity-20 animate-pulse`}></div>
        <div className={`absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr ${screens[currentScreen].gradient} rounded-full blur-3xl opacity-20 animate-pulse`} style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Glass card */}
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden border border-white/20">
          {/* Header */}
          <div className="relative h-20 bg-gradient-to-r from-white/80 to-white/60 backdrop-blur-lg flex items-center justify-between px-6 border-b border-slate-200/50">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${screens[currentScreen].gradient} animate-pulse`}></div>
              <div className={`text-2xl font-black bg-gradient-to-r ${screens[currentScreen].gradient} bg-clip-text text-transparent`}>
                Kommit Pro
              </div>
            </div>
            {!isLastScreen && (
              <button
                onClick={handleSkip}
                className="text-sm font-medium text-slate-400 hover:text-slate-700 transition-all duration-300 hover:scale-105"
              >
                Skip
              </button>
            )}
          </div>

          {/* Content Area */}
          <div className="px-8 py-16 min-h-[580px] flex flex-col items-center justify-between">
            {/* Icon with animated gradient background */}
            <div className="relative mb-12">
              {/* Outer glow ring */}
              <div className={`absolute inset-0 bg-gradient-to-br ${screens[currentScreen].gradient} rounded-full blur-2xl opacity-30 animate-pulse`}></div>
              
              {/* Main icon container */}
              <div className={`relative w-40 h-40 rounded-full bg-gradient-to-br ${screens[currentScreen].gradient} flex items-center justify-center shadow-2xl transform transition-all duration-500 hover:scale-110 hover:rotate-6`}>
                {/* Inner glow */}
                <div className="absolute inset-2 bg-white/10 rounded-full"></div>
                
                {/* Icon */}
                <CurrentIcon className="w-20 h-20 text-white relative z-10 drop-shadow-lg animate-float" />
              </div>

              {/* Floating particles */}
              <div className={`absolute -top-2 -right-2 w-3 h-3 rounded-full bg-gradient-to-r ${screens[currentScreen].gradient} animate-ping`}></div>
              <div className={`absolute -bottom-2 -left-2 w-2 h-2 rounded-full bg-gradient-to-r ${screens[currentScreen].gradient} animate-ping`} style={{ animationDelay: '0.5s' }}></div>
            </div>

            {/* Text Content with slide animation */}
            <div 
              key={currentScreen}
              className="text-center space-y-6 flex-1 flex flex-col justify-center animate-slideIn"
            >
              <h1 className="text-4xl font-black text-slate-900 leading-tight">
                {screens[currentScreen].title}
              </h1>
              <p className="text-slate-600 text-lg leading-relaxed px-2 font-medium">
                {screens[currentScreen].description}
              </p>
            </div>

            {/* Enhanced Dots Indicator */}
            <div className="flex gap-3 mb-10">
              {screens.map((screen, index) => (
                <div
                  key={index}
                  className={`rounded-full transition-all duration-500 ${
                    index === currentScreen
                      ? `w-12 h-3 bg-gradient-to-r ${screen.gradient} shadow-lg`
                      : 'w-3 h-3 bg-slate-300 hover:bg-slate-400'
                  }`}
                />
              ))}
            </div>

            {/* Enhanced Action Button */}
            <button
              onClick={handleNext}
              className={`group w-full py-5 rounded-2xl font-bold text-white text-lg transition-all duration-300 shadow-2xl hover:shadow-3xl transform hover:scale-[1.02] active:scale-[0.98] bg-gradient-to-r ${screens[currentScreen].gradient} relative overflow-hidden`}
            >
              {/* Button shine effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000"></div>
              
              <div className="flex items-center justify-center gap-3 relative z-10">
                <span>{isLastScreen ? 'Get Started' : 'Next'}</span>
                <ChevronRight className="w-6 h-6 group-hover:translate-x-1 transition-transform duration-300" />
              </div>
            </button>
          </div>
        </div>

        {/* Bottom decorative element */}
        <div className="text-center mt-8 text-slate-400 text-sm font-medium">
          Swipe-free habits tracking
        </div>
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        .animate-float {
          animation: float 3s ease-in-out infinite;
        }

        .animate-slideIn {
          animation: slideIn 0.5s ease-out;
        }
      `}</style>
    </div>
  );
}