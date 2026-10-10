import React from 'react';
import { 
  Check, 
  Clock, 
  Calendar, 
  Edit2, 
  Trash2, 
  AlertCircle 
} from 'lucide-react';

/**
 * Format date & time cleanly into human-readable text.
 * Handles "Today", "Tomorrow", "Yesterday", and standard calendar formats.
 */
function formatTaskDateTime(dueDate, dueTime) {
  if (!dueDate) {
    if (!dueTime) return 'No due date';
    // Format only due time if present
    const [hrs, mins] = dueTime.split(':');
    const h = parseInt(hrs, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const formattedH = h % 12 === 0 ? 12 : h % 12;
    return `At ${formattedH}:${mins || '00'} ${ampm}`;
  }

  // Parse YYYY-MM-DD
  const [y, m, d] = dueDate.split('-').map(Number);
  const taskDate = new Date(y, m - 1, d);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const taskTimeZero = new Date(y, m - 1, d, 0, 0, 0, 0).getTime();

  let dateLabel = '';
  if (taskTimeZero === today.getTime()) {
    dateLabel = 'Today';
  } else if (taskTimeZero === tomorrow.getTime()) {
    dateLabel = 'Tomorrow';
  } else if (taskTimeZero === yesterday.getTime()) {
    dateLabel = 'Yesterday';
  } else {
    dateLabel = new Intl.DateTimeFormat('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: taskDate.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
    }).format(taskDate);
  }

  // Append formatted 12-hour time if set
  if (dueTime) {
    const [hrs, mins] = dueTime.split(':');
    const h = parseInt(hrs, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const formattedH = h % 12 === 0 ? 12 : h % 12;
    return `${dateLabel} · ${formattedH}:${mins || '00'} ${ampm}`;
  }

  return dateLabel;
}

export default function TaskRow({
  task,
  subject,
  todayStr,
  onToggle,
  onEdit,
  onDelete,
}) {
  const isCompleted = Boolean(task.is_completed);
  const isOverdue = Boolean(task.due_date && task.due_date < todayStr && !isCompleted);

  // Priority badge styling
  const renderPriorityBadge = () => {
    switch (task.priority) {
      case 'High':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800/40 shrink-0">
            High
          </span>
        );
      case 'Medium':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40 shrink-0">
            Medium
          </span>
        );
      case 'Low':
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shrink-0">
            Low
          </span>
        );
    }
  };

  return (
    <div
      className={`p-4 sm:px-5 sm:py-4 bg-white dark:bg-[#1E293B] rounded-2xl border border-[#E2E8F0] dark:border-slate-800 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 ${
        isCompleted ? 'opacity-65 bg-slate-50/60 dark:bg-slate-900/40' : ''
      }`}
    >
      {/* Left section: Checkbox + Title + Meta details */}
      <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
        {/* Checkbox button */}
        <button
          type="button"
          onClick={() => onToggle(task)}
          className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 sm:mt-0 transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-[#4F46E5] focus-visible:ring-offset-2 ${
            isCompleted
              ? 'bg-[#22C55E] border-[#22C55E] text-white shadow-sm'
              : 'border-slate-300 dark:border-slate-600 hover:border-[#4F46E5] dark:hover:border-indigo-400 bg-white dark:bg-slate-900'
          }`}
          aria-label={
            isCompleted
              ? `Mark task "${task.title}" as incomplete`
              : `Mark task "${task.title}" as complete`
          }
        >
          {isCompleted && <Check className="w-3.5 h-3.5 stroke-[3]" />}
        </button>

        {/* Content details */}
        <div className="min-w-0 flex-1">
          <p
            className={`text-sm sm:text-base font-semibold leading-snug break-words text-[#131B2E] dark:text-white transition-all ${
              isCompleted ? 'line-through text-slate-400 dark:text-slate-500' : ''
            }`}
          >
            {task.title}
          </p>

          {/* Metadata chips: Subject, Due Date/Time, Overdue */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 mt-1.5 text-xs text-[#777587] dark:text-slate-400">
            {/* Subject Indicator */}
            {subject ? (
              <span className="inline-flex items-center gap-1.5 font-medium px-2 py-0.5 rounded-md bg-slate-50 dark:bg-slate-900/80 border border-slate-200/60 dark:border-slate-800">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: subject.color || '#4F46E5' }}
                />
                <span className="truncate max-w-[130px]">{subject.name}</span>
              </span>
            ) : (
              <span className="text-slate-400 dark:text-slate-500 italic text-[11px]">
                No subject
              </span>
            )}

            {/* Due Date & Time */}
            {task.due_date && (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-600 dark:text-slate-300">
                <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>{formatTaskDateTime(task.due_date, task.due_time)}</span>
              </span>
            )}

            {/* Overdue tag */}
            {isOverdue && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 dark:bg-red-950/80 text-red-600 dark:text-red-400 uppercase tracking-wider shrink-0 border border-red-200 dark:border-red-900">
                <AlertCircle className="w-3 h-3" />
                <span>Overdue</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Right section: Priority Badge + Action Buttons */}
      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800/80">
        <div>{renderPriorityBadge()}</div>

        <div className="flex items-center gap-1">
          {/* Edit button */}
          <button
            type="button"
            onClick={() => onEdit(task)}
            className="p-2 rounded-xl text-slate-400 hover:text-[#4F46E5] dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-[#4F46E5]"
            aria-label={`Edit task ${task.title}`}
            title={`Edit task "${task.title}"`}
          >
            <Edit2 className="w-4 h-4" />
          </button>

          {/* Delete button */}
          <button
            type="button"
            onClick={() => onDelete(task)}
            className="p-2 rounded-xl text-slate-400 hover:text-[#EF4444] dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-[#EF4444]"
            aria-label={`Delete task ${task.title}`}
            title={`Delete task "${task.title}"`}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
