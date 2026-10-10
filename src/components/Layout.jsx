import React, { useState, useEffect } from 'react';
import { Outlet, Link } from 'react-router-dom';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';
import { BookOpen, LogOut, Sun, Moon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const { signOut } = useAuth();

  // Initialize dark mode from localStorage or system preference
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('study_planner_theme');
    if (saved) return saved === 'dark';
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
      localStorage.setItem('study_planner_theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('study_planner_theme', 'light');
    }
  }, [darkMode]);

  const toggleDarkMode = () => {
    setDarkMode((prev) => !prev);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (err) {
      console.error('[auth] Error signing out:', err);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8FF] dark:bg-[#0F172A] text-[#131B2E] dark:text-slate-100 font-['Inter',sans-serif] transition-colors duration-200">
      {/* Desktop Fixed Left Sidebar */}
      <Sidebar darkMode={darkMode} onToggleDarkMode={toggleDarkMode} />

      {/* Mobile / Tablet Header (Hidden on lg and up) */}
      <header className="lg:hidden sticky top-0 z-30 bg-white/95 dark:bg-[#1E293B]/95 backdrop-blur-md border-b border-[#E2E8F0] dark:border-slate-800 px-4 py-3 flex items-center justify-between transition-colors">
        <Link to="/dashboard" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#3525CD] to-[#4F46E5] flex items-center justify-center text-white shadow-sm">
            <BookOpen className="w-4 h-4 stroke-[2.2]" />
          </div>
          <span className="font-bold text-base tracking-tight text-[#131B2E] dark:text-white">
            StudyPlanner
          </span>
        </Link>

        <div className="flex items-center gap-2">
          {/* Dark Mode Toggle */}
          <button
            type="button"
            onClick={toggleDarkMode}
            className="p-2 rounded-lg text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Toggle dark mode"
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-500" />}
          </button>

          {/* Sign Out Button */}
          <button
            type="button"
            onClick={handleSignOut}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20 text-red-600 dark:text-red-400 text-xs font-semibold hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Content Area (offset by 256px on desktop, padding bottom for mobile nav) */}
      <div className="lg:pl-64 flex flex-col min-h-screen">
        <main className="flex-1 pb-24 lg:pb-12">
          <Outlet />
        </main>
      </div>

      {/* Mobile Fixed Bottom Navigation */}
      <BottomNav />
    </div>
  );
}
