import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  BookOpen,
  LayoutDashboard,
  BookMarked,
  CheckSquare,
  Timer,
  BarChart2,
  LogOut,
  Sun,
  Moon
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const NAV_ITEMS = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { name: 'Subjects', path: '/subjects', icon: BookMarked },
  { name: 'Tasks', path: '/tasks', icon: CheckSquare },
  { name: 'Timer', path: '/timer', icon: Timer },
  { name: 'Progress', path: '/progress', icon: BarChart2 },
];

export default function Sidebar({ darkMode, onToggleDarkMode }) {
  const { user, signOut } = useAuth();

  const fullName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split('@')[0] ||
    'Student';

  const userEmail = user?.email || '';

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (err) {
      console.error('[auth] Error signing out:', err);
    }
  };

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 z-30 bg-white dark:bg-[#1E293B] border-r border-[#E2E8F0] dark:border-slate-800 transition-colors duration-200">
      {/* Brand Header */}
      <div className="p-6 border-b border-[#E2E8F0] dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#3525CD] to-[#4F46E5] flex items-center justify-center text-white shadow-md shadow-[#4F46E5]/20">
            <BookOpen className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <span className="font-bold text-lg tracking-tight text-[#131B2E] dark:text-white block">
              StudyPlanner
            </span>
            <span className="text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#EAEDFF] dark:bg-indigo-950/60 text-[#3525CD] dark:text-indigo-300 uppercase">
              Academic Flow
            </span>
          </div>
        </div>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  isActive
                    ? 'bg-[#4F46E5] text-white shadow-sm shadow-[#4F46E5]/25'
                    : 'text-[#464555] dark:text-slate-300 hover:bg-[#F2F3FF] dark:hover:bg-slate-800/60 hover:text-[#131B2E] dark:hover:text-white'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.name}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Bottom Controls (Dark Mode, Profile & Sign Out) */}
      <div className="p-4 border-t border-[#E2E8F0] dark:border-slate-800 space-y-3">
        {/* Dark Mode Toggle */}
        <button
          type="button"
          onClick={onToggleDarkMode}
          className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-semibold text-[#464555] dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <span className="flex items-center gap-2">
            {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-500" />}
            <span>{darkMode ? 'Light Mode' : 'Dark Mode'}</span>
          </span>
          <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
            {darkMode ? 'Dark' : 'Light'}
          </span>
        </button>

        {/* User Card */}
        <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-[#FAF8FF] dark:bg-slate-800/40 border border-[#E2E8F0] dark:border-slate-800">
          <div className="w-8 h-8 rounded-full bg-[#3525CD] text-white flex items-center justify-center font-bold text-xs ring-2 ring-[#EAEDFF] dark:ring-indigo-900 shrink-0">
            {fullName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-[#131B2E] dark:text-white truncate">
              {fullName}
            </p>
            <p className="text-[11px] text-[#777587] dark:text-slate-400 truncate font-mono">
              {userEmail}
            </p>
          </div>
        </div>

        {/* Sign Out Button */}
        <button
          type="button"
          onClick={handleSignOut}
          className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl border border-red-200 dark:border-red-900/40 bg-red-50/50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 font-semibold text-xs transition-colors cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
