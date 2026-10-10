import React, { useState } from 'react';
import { 
  Edit2, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  Check, 
  ChevronDown, 
  ChevronUp, 
  BookOpen 
} from 'lucide-react';

export default function SubjectCard({
  subject,
  taskStats = { total: 0, completed: 0 },
  onEdit,
  onDelete,
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  const total = taskStats.total || 0;
  const completed = taskStats.completed || 0;
  const pending = Math.max(0, total - completed);
  const progressPercent = total > 0 ? Math.round((completed / total) * 100) : 0;

  const subjectColor = subject.color || '#4F46E5';

  return (
    <div
      className="bg-white dark:bg-[#1E293B] rounded-2xl border border-[#E2E8F0] dark:border-slate-800 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col relative group"
    >
      {/* Top Color Accent Bar */}
      <div 
        className="h-2 w-full transition-colors"
        style={{ backgroundColor: subjectColor }}
      />

      <div className="p-5 sm:p-6 flex-1 flex flex-col justify-between">
        {/* Header: Dot + Name + Actions */}
        <div>
          <div className="flex items-start justify-between gap-3">
            <div 
              className="flex items-center gap-2.5 min-w-0 cursor-pointer flex-1"
              onClick={() => setIsExpanded((prev) => !prev)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setIsExpanded((prev) => !prev);
                }
              }}
              aria-expanded={isExpanded}
              aria-label={`Toggle task breakdown for ${subject.name}`}
            >
              {/* Color Dot */}
              <span
                className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm ring-2 ring-white dark:ring-slate-900"
                style={{ backgroundColor: subjectColor }}
              />
              <h3 
                className="text-base sm:text-lg font-bold text-[#131B2E] dark:text-white truncate hover:text-[#4F46E5] dark:hover:text-indigo-400 transition-colors"
                title={subject.name}
              >
                {subject.name}
              </h3>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(subject);
                }}
                className="p-2 rounded-xl text-slate-400 hover:text-[#4F46E5] dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                aria-label={`Edit ${subject.name}`}
                title={`Edit ${subject.name}`}
              >
                <Edit2 className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(subject);
                }}
                className="p-2 rounded-xl text-slate-400 hover:text-[#EF4444] dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                aria-label={`Delete ${subject.name}`}
                title={`Delete ${subject.name}`}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Card Body (Clickable to view task details) */}
          <div
            className="mt-4 cursor-pointer"
            onClick={() => setIsExpanded((prev) => !prev)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setIsExpanded((prev) => !prev);
              }
            }}
          >
            {/* Task stats summary line */}
            <div className="flex items-center justify-between text-xs text-[#777587] dark:text-slate-400 mb-2">
              <span className="font-medium">
                {total === 0 ? 'No tasks' : `${completed} of ${total} completed`}
              </span>
              <span className="font-semibold font-mono text-[#131B2E] dark:text-white">
                {progressPercent}%
              </span>
            </div>

            {/* Progress bar */}
            <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500 ease-out"
                style={{
                  width: `${progressPercent}%`,
                  backgroundColor: progressPercent === 100 ? '#22C55E' : subjectColor,
                }}
              />
            </div>
          </div>
        </div>

        {/* Expandable Breakdown Drawer */}
        {isExpanded && (
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs animate-in fade-in duration-150">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                <span className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  Total
                </span>
                <span className="text-sm font-bold font-mono text-[#131B2E] dark:text-white">
                  {total}
                </span>
              </div>

              <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/30">
                <span className="block text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                  Done
                </span>
                <span className="text-sm font-bold font-mono text-emerald-700 dark:text-emerald-300">
                  {completed}
                </span>
              </div>

              <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/30">
                <span className="block text-[10px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                  Pending
                </span>
                <span className="text-sm font-bold font-mono text-amber-700 dark:text-amber-300">
                  {pending}
                </span>
              </div>
            </div>
            <p className="text-[11px] text-center text-slate-400 dark:text-slate-500 mt-2 italic">
              Click to close details
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
