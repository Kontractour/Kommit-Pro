'use client';
import { Home, Plus, Award, BookOpen, User } from 'lucide-react';

export default function BottomNav({ activeTab, onTabChange }) {
  const tabs = [
    { id: 'home', icon: Home, label: 'Home' },
    { id: 'habits', icon: Plus, label: 'Habits' },
    { id: 'achievements', icon: Award, label: 'Badges' },
    { id: 'journal', icon: BookOpen, label: 'Journal' },
    { id: 'profile', icon: User, label: 'Profile' },
  ];

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-30 safe-area-bottom">
      <div className="grid grid-cols-5 h-16">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center justify-center gap-1 transition-all ${
                isActive 
                  ? 'text-teal-600' 
                  : 'text-slate-400 active:scale-95'
              }`}
            >
              <Icon 
                className={`w-6 h-6 transition-all ${
                  isActive ? 'scale-110' : ''
                }`} 
              />
              <span className={`text-xs font-medium ${
                isActive ? 'font-bold' : ''
              }`}>
                {tab.label}
              </span>
              {isActive && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-teal-600 rounded-t-full"></div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}