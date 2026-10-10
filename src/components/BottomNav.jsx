import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  BookMarked,
  CheckSquare,
  Timer,
  BarChart2
} from 'lucide-react';

const NAV_ITEMS = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { name: 'Subjects', path: '/subjects', icon: BookMarked },
  { name: 'Tasks', path: '/tasks', icon: CheckSquare },
  { name: 'Timer', path: '/timer', icon: Timer },
  { name: 'Progress', path: '/progress', icon: BarChart2 },
];

export default function BottomNav() {
  return (
    <nav
      aria-label="Mobile Navigation"
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-[#1E293B]/95 backdrop-blur-md border-t border-[#E2E8F0] dark:border-slate-800 transition-colors duration-200 shadow-lg"
    >
      <div className="grid grid-cols-5 h-16 max-w-lg mx-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors ${
                  isActive
                    ? 'text-[#4F46E5] dark:text-indigo-400 font-bold'
                    : 'text-[#464555] dark:text-slate-400 hover:text-[#131B2E] dark:hover:text-slate-200'
                }`
              }
            >
              <Icon className="w-5 h-5 shrink-0" />
              <span className="truncate">{item.name}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
