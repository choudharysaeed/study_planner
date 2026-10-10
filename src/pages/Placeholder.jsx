import React from 'react';
import { Link } from 'react-router-dom';
import { 
  BookMarked, 
  CheckSquare, 
  Timer, 
  BarChart2, 
  ArrowLeft,
  Construction
} from 'lucide-react';

const ICONS = {
  Subjects: BookMarked,
  Tasks: CheckSquare,
  Timer: Timer,
  Progress: BarChart2,
};

export default function Placeholder({ title = 'Feature' }) {
  const Icon = ICONS[title] || Construction;

  return (
    <div className="p-6 sm:p-10 max-w-4xl mx-auto">
      <div className="bg-white dark:bg-[#1E293B] rounded-2xl border border-[#E2E8F0] dark:border-slate-800 p-8 sm:p-12 text-center shadow-sm">
        <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-[#EAEDFF] dark:bg-indigo-950/60 text-[#3525CD] dark:text-indigo-400 flex items-center justify-center shadow-md">
          <Icon className="w-8 h-8" />
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#131B2E] dark:text-white tracking-tight">
          {title}
        </h1>
        <p className="text-sm text-[#464555] dark:text-slate-400 mt-2 max-w-md mx-auto">
          Coming soon. This dedicated screen is being prepared to expand your Study Planner academic cockpit.
        </p>

        <div className="mt-8">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] text-white text-xs font-semibold shadow-sm transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Dashboard</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
