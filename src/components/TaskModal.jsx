import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { 
  X, 
  Loader2, 
  Calendar, 
  Clock, 
  Tag, 
  AlertCircle, 
  CheckSquare, 
  ChevronDown 
} from 'lucide-react';

// Priority configuration
const PRIORITIES = [
  { 
    id: 'Low', 
    label: 'Low', 
    activeClass: 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white border-slate-300 dark:border-slate-600' 
  },
  { 
    id: 'Medium', 
    label: 'Medium', 
    activeClass: 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700' 
  },
  { 
    id: 'High', 
    label: 'High', 
    activeClass: 'bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300 border-red-300 dark:border-red-700' 
  },
];

// Helper: Today's local date string YYYY-MM-DD
const getLocalDateString = (d = new Date()) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function TaskModal({
  isOpen,
  onClose,
  onSubmit,
  initialData = null, // null for Add, task object for Edit
  subjects = [],
  isSaving = false,
}) {
  const isEditMode = Boolean(initialData?.id);
  const title = isEditMode ? 'Edit Task' : 'Add Task';

  const [taskTitle, setTaskTitle] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('');
  const [priority, setPriority] = useState('Medium');

  // Inline errors
  const [titleError, setTitleError] = useState('');
  const [dateError, setDateError] = useState('');

  const modalRef = useRef(null);
  const titleInputRef = useRef(null);

  // Initialize or reset form values
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setTaskTitle(initialData.title || '');
        setSubjectId(initialData.subject_id || '');
        setDueDate(initialData.due_date || '');
        // Format HH:MM:SS to HH:MM if needed
        setDueTime(initialData.due_time ? initialData.due_time.slice(0, 5) : '');
        setPriority(initialData.priority || 'Medium');
      } else {
        setTaskTitle('');
        setSubjectId('');
        setDueDate(getLocalDateString());
        setDueTime('');
        setPriority('Medium');
      }
      setTitleError('');
      setDateError('');

      // Auto-focus title input
      const timer = setTimeout(() => {
        titleInputRef.current?.focus();
      }, 50);

      return () => clearTimeout(timer);
    }
  }, [isOpen, initialData]);

  // Handle Escape and focus trap
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isSaving) {
        onClose();
      }

      if (e.key === 'Tab' && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSaving, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmedTitle = taskTitle.trim();

    let hasError = false;

    // Validate title
    if (!trimmedTitle) {
      setTitleError('Task title is required.');
      hasError = true;
    } else if (trimmedTitle.length > 120) {
      setTitleError('Task title must be 120 characters or fewer.');
      hasError = true;
    } else {
      setTitleError('');
    }

    // Validate time without date
    if (dueTime && !dueDate) {
      setDateError('Due date is required when setting a due time.');
      hasError = true;
    } else {
      setDateError('');
    }

    if (hasError) return;

    onSubmit({
      id: initialData?.id,
      title: trimmedTitle,
      subject_id: subjectId || null,
      due_date: dueDate || null,
      due_time: dueTime ? `${dueTime}:00` : null,
      priority,
      is_completed: initialData?.is_completed ?? false,
      completed_at: initialData?.completed_at ?? null,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSaving) onClose();
      }}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-modal-title"
        className="bg-white dark:bg-[#1E293B] rounded-2xl border border-[#E2E8F0] dark:border-slate-800 p-6 max-w-lg w-full shadow-2xl transition-colors transform animate-in zoom-in-95 duration-200 relative"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0] dark:border-slate-800 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#4F46E5]/10 text-[#4F46E5] dark:text-indigo-400 flex items-center justify-center shadow-sm">
              <CheckSquare className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div>
              <h2
                id="task-modal-title"
                className="text-base sm:text-lg font-bold text-[#131B2E] dark:text-white"
              >
                {title}
              </h2>
              <p className="text-[11px] text-[#777587] dark:text-slate-400">
                {isEditMode
                  ? 'Update task details, schedule, or priority'
                  : 'Add a new study assignment or review block'}
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={isSaving}
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title Input */}
          <div>
            <label
              htmlFor="task-title-input"
              className="block text-xs font-semibold text-[#131B2E] dark:text-slate-200 mb-1.5 uppercase tracking-wider"
            >
              Task Title *
            </label>
            <input
              id="task-title-input"
              ref={titleInputRef}
              type="text"
              required
              maxLength={120}
              disabled={isSaving}
              value={taskTitle}
              onChange={(e) => {
                setTaskTitle(e.target.value);
                if (titleError) setTitleError('');
              }}
              placeholder="e.g. Read Chapter 4 on Thermodynamics"
              className={`w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border rounded-xl text-xs sm:text-sm text-[#131B2E] dark:text-white placeholder-[#777587] transition-all focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20 ${
                titleError
                  ? 'border-red-500 focus:border-red-500'
                  : 'border-[#CBD5E1] dark:border-slate-700 focus:border-[#4F46E5]'
              }`}
            />
            {titleError && (
              <p className="text-xs text-red-500 font-medium mt-1 animate-in fade-in">
                {titleError}
              </p>
            )}
            <div className="flex justify-between items-center text-[11px] text-[#777587] dark:text-slate-400 mt-1">
              <span>Short, action-oriented assignment description</span>
              <span>{taskTitle.length}/120</span>
            </div>
          </div>

          {/* Subject Dropdown */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="task-subject-select"
                className="block text-xs font-semibold text-[#131B2E] dark:text-slate-200 uppercase tracking-wider"
              >
                Subject
              </label>
              {subjects.length === 0 && (
                <Link
                  to="/subjects"
                  className="text-[11px] font-semibold text-[#4F46E5] dark:text-indigo-400 hover:underline"
                >
                  Add a subject first
                </Link>
              )}
            </div>

            <div className="relative">
              <select
                id="task-subject-select"
                disabled={isSaving}
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                className="w-full pl-3.5 pr-9 py-2.5 bg-white dark:bg-slate-900 border border-[#CBD5E1] dark:border-slate-700 rounded-xl text-xs sm:text-sm text-[#131B2E] dark:text-white focus:outline-none focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/20 appearance-none disabled:opacity-60"
              >
                <option value="">No subject (General study)</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Schedule: Due Date & Due Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label
                htmlFor="task-due-date-input"
                className="block text-xs font-semibold text-[#131B2E] dark:text-slate-200 mb-1.5 uppercase tracking-wider"
              >
                Due Date
              </label>
              <div className="relative">
                <input
                  id="task-due-date-input"
                  type="date"
                  disabled={isSaving}
                  value={dueDate}
                  onChange={(e) => {
                    setDueDate(e.target.value);
                    if (dateError) setDateError('');
                  }}
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-[#CBD5E1] dark:border-slate-700 rounded-xl text-xs sm:text-sm text-[#131B2E] dark:text-white focus:outline-none focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/20"
                />
              </div>
              {dateError && (
                <p className="text-xs text-red-500 font-medium mt-1">{dateError}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="task-due-time-input"
                className="block text-xs font-semibold text-[#131B2E] dark:text-slate-200 mb-1.5 uppercase tracking-wider"
              >
                Due Time (Optional)
              </label>
              <div className="relative">
                <input
                  id="task-due-time-input"
                  type="time"
                  disabled={isSaving}
                  value={dueTime}
                  onChange={(e) => {
                    setDueTime(e.target.value);
                    if (dateError) setDateError('');
                  }}
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-[#CBD5E1] dark:border-slate-700 rounded-xl text-xs sm:text-sm text-[#131B2E] dark:text-white focus:outline-none focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/20"
                />
              </div>
            </div>
          </div>

          {/* Priority Segmented Control */}
          <div>
            <label className="block text-xs font-semibold text-[#131B2E] dark:text-slate-200 mb-1.5 uppercase tracking-wider">
              Priority
            </label>
            <div className="grid grid-cols-3 gap-2">
              {PRIORITIES.map((p) => {
                const isSelected = priority === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    disabled={isSaving}
                    onClick={() => setPriority(p.id)}
                    className={`min-h-[40px] py-2 px-3 rounded-xl border text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center justify-center ${
                      isSelected
                        ? `${p.activeClass} shadow-sm ring-1 ring-offset-1 ring-slate-400 dark:ring-offset-slate-900`
                        : 'border-[#CBD5E1] dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E2E8F0] dark:border-slate-800">
            <button
              type="button"
              disabled={isSaving}
              onClick={onClose}
              className="min-h-[44px] px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-[#131B2E] dark:hover:text-white text-xs sm:text-sm font-semibold transition-all focus-visible:ring-2 focus-visible:ring-[#4F46E5] focus-visible:ring-offset-2 disabled:opacity-50 cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] text-white text-xs sm:text-sm font-semibold transition-all shadow-md shadow-[#4F46E5]/25 hover:shadow-lg flex items-center justify-center gap-2 focus-visible:ring-2 focus-visible:ring-[#4F46E5] focus-visible:ring-offset-2 disabled:opacity-50 cursor-pointer"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving Task...</span>
                </>
              ) : (
                <span>{isEditMode ? 'Save Changes' : 'Create Task'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
