import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  CheckSquare, 
  Plus, 
  Search, 
  X, 
  AlertCircle, 
  Loader2, 
  Filter, 
  ArrowUpDown, 
  CheckCircle2, 
  Clock, 
  Trash2, 
  FolderPlus,
  ChevronDown
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import Toast from '../components/Toast';
import ConfirmDialog from '../components/ConfirmDialog';
import TaskModal from '../components/TaskModal';
import TaskRow from '../components/TaskRow';

// Helper: Format today's date string YYYY-MM-DD in local timezone
const getLocalDateString = (d = new Date()) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function Tasks() {
  const { user } = useAuth();

  // Data states
  const [tasks, setTasks] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Today's local date string
  const todayStr = useMemo(() => getLocalDateString(), []);

  // Filter and sort states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All'); // 'All' | 'Pending' | 'Completed' | 'Overdue'
  const [subjectFilter, setSubjectFilter] = useState('ALL'); // 'ALL' | 'NO_SUBJECT' | subject_id
  const [sortBy, setSortBy] = useState('DUE_DATE_ASC'); // 'DUE_DATE_ASC' | 'DUE_DATE_DESC' | 'PRIORITY_DESC' | 'CREATED_DESC'

  // Toast notification state
  const [toast, setToast] = useState(null);

  // Task Modal states (Add / Edit)
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [savingTask, setSavingTask] = useState(false);

  // Single Task Delete Dialog states
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState(null);
  const [deletingTask, setDeletingTask] = useState(false);

  // Bulk Clear Completed Dialog states
  const [clearCompletedOpen, setClearCompletedOpen] = useState(false);
  const [clearingCompleted, setClearingCompleted] = useState(false);

  // Lookup map for subjects: { [id]: subject }
  const subjectsMap = useMemo(() => {
    const map = {};
    subjects.forEach((s) => {
      map[s.id] = s;
    });
    return map;
  }, [subjects]);

  // Load tasks and subjects from Supabase
  const loadTasksAndSubjects = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);

    try {
      /**
       * Supabase Queries:
       * 1. Query all tasks belonging to current authenticated user.
       * 2. Query all subjects belonging to current user ordered by name.
       */
      const [tasksRes, subjectsRes] = await Promise.all([
        supabase
          .from('tasks')
          .select('id, title, subject_id, due_date, due_time, priority, is_completed, completed_at, created_at')
          .eq('user_id', user.id),

        supabase
          .from('subjects')
          .select('id, name, color')
          .eq('user_id', user.id)
          .order('name', { ascending: true }),
      ]);

      if (tasksRes.error) throw tasksRes.error;
      if (subjectsRes.error) throw subjectsRes.error;

      setTasks(tasksRes.data || []);
      setSubjects(subjectsRes.data || []);
    } catch (err) {
      console.error('[tasks] Failed to load tasks or subjects:', err);
      setError(err.message || 'Failed to load tasks. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadTasksAndSubjects();
  }, [loadTasksAndSubjects]);

  // Priority weights for sorting (High: 3, Medium: 2, Low: 1)
  const priorityWeight = { High: 3, Medium: 2, Low: 1 };

  // Filtered and sorted tasks computed client-side
  const filteredAndSortedTasks = useMemo(() => {
    let result = [...tasks];

    // 1. Text Search Filter (Title)
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      result = result.filter((t) => t.title.toLowerCase().includes(q));
    }

    // 2. Status Filter
    if (statusFilter === 'Pending') {
      result = result.filter((t) => !t.is_completed);
    } else if (statusFilter === 'Completed') {
      result = result.filter((t) => Boolean(t.is_completed));
    } else if (statusFilter === 'Overdue') {
      result = result.filter(
        (t) => !t.is_completed && t.due_date && t.due_date < todayStr
      );
    }

    // 3. Subject Filter
    if (subjectFilter === 'NO_SUBJECT') {
      result = result.filter((t) => !t.subject_id);
    } else if (subjectFilter !== 'ALL') {
      result = result.filter((t) => t.subject_id === subjectFilter);
    }

    // 4. Client-side Sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case 'DUE_DATE_DESC': {
          // Null due dates last
          if (!a.due_date && b.due_date) return 1;
          if (a.due_date && !b.due_date) return -1;
          if (a.due_date && b.due_date) {
            const dateCmp = b.due_date.localeCompare(a.due_date);
            if (dateCmp !== 0) return dateCmp;
            // Compare time descending
            if (a.due_time && b.due_time) {
              return b.due_time.localeCompare(a.due_time);
            }
          }
          return 0;
        }

        case 'PRIORITY_DESC': {
          const pA = priorityWeight[a.priority] || 2;
          const pB = priorityWeight[b.priority] || 2;
          if (pB !== pA) return pB - pA;
          // Sub-sort by due date earliest
          if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date);
          return 0;
        }

        case 'CREATED_DESC': {
          if (a.created_at && b.created_at) {
            return b.created_at.localeCompare(a.created_at);
          }
          return 0;
        }

        case 'DUE_DATE_ASC':
        default: {
          // Null due dates last
          if (!a.due_date && b.due_date) return 1;
          if (a.due_date && !b.due_date) return -1;
          if (a.due_date && b.due_date) {
            const dateCmp = a.due_date.localeCompare(b.due_date);
            if (dateCmp !== 0) return dateCmp;
            // Compare time ascending
            if (a.due_time && b.due_time) {
              return a.due_time.localeCompare(b.due_time);
            }
          }
          // Secondary sort: Priority High first
          return (priorityWeight[b.priority] || 2) - (priorityWeight[a.priority] || 2);
        }
      }
    });

    return result;
  }, [tasks, searchQuery, statusFilter, subjectFilter, sortBy, todayStr]);

  // Status counts for filter tab badges
  const counts = useMemo(() => {
    let pending = 0;
    let completed = 0;
    let overdue = 0;

    tasks.forEach((t) => {
      if (t.is_completed) {
        completed += 1;
      } else {
        pending += 1;
        if (t.due_date && t.due_date < todayStr) {
          overdue += 1;
        }
      }
    });

    return { all: tasks.length, pending, completed, overdue };
  }, [tasks, todayStr]);

  // Optimistic Toggle Checkbox
  const handleToggleTask = async (task) => {
    const previousCompleted = task.is_completed;
    const nextCompleted = !previousCompleted;
    const nextCompletedAt = nextCompleted ? new Date().toISOString() : null;

    // 1. Optimistic UI update
    setTasks((prev) =>
      prev.map((t) =>
        t.id === task.id
          ? { ...t, is_completed: nextCompleted, completed_at: nextCompletedAt }
          : t
      )
    );

    // 2. Persist to Supabase
    try {
      /**
       * Supabase Update Query:
       * Toggles task completion state and records completion timestamp.
       */
      const { error: updateError } = await supabase
        .from('tasks')
        .update({
          is_completed: nextCompleted,
          completed_at: nextCompletedAt,
        })
        .eq('id', task.id)
        .eq('user_id', user.id);

      if (updateError) throw updateError;
    } catch (err) {
      console.error('[tasks] Error updating task completion:', err);
      // Revert optimistic update
      setTasks((prev) =>
        prev.map((t) =>
          t.id === task.id
            ? { ...t, is_completed: previousCompleted, completed_at: task.completed_at }
            : t
        )
      );
      setToast({
        type: 'error',
        message: 'Could not update task. Changes were reverted.',
      });
    }
  };

  // Add / Edit Modal Submissions
  const handleOpenAddModal = () => {
    setEditingTask(null);
    setTaskModalOpen(true);
  };

  const handleOpenEditModal = (task) => {
    setEditingTask(task);
    setTaskModalOpen(true);
  };

  const handleSaveTask = async (formData) => {
    if (!user?.id) return;
    setSavingTask(true);

    try {
      if (formData.id) {
        // EDIT MODE: Update existing task in Supabase
        /**
         * Supabase Update Query:
         * Updates task metadata (title, subject_id, due date/time, priority).
         */
        const { data, error: updateError } = await supabase
          .from('tasks')
          .update({
            title: formData.title,
            subject_id: formData.subject_id,
            due_date: formData.due_date,
            due_time: formData.due_time,
            priority: formData.priority,
          })
          .eq('id', formData.id)
          .eq('user_id', user.id)
          .select()
          .single();

        if (updateError) throw updateError;

        setTasks((prev) =>
          prev.map((t) => (t.id === data.id ? { ...t, ...data } : t))
        );
        setToast({ type: 'success', message: 'Task updated' });
      } else {
        // ADD MODE: Insert new task into Supabase
        /**
         * Supabase Insert Query:
         * Adds a new task row for current authenticated user.
         */
        const { data, error: insertError } = await supabase
          .from('tasks')
          .insert({
            user_id: user.id,
            title: formData.title,
            subject_id: formData.subject_id,
            due_date: formData.due_date,
            due_time: formData.due_time,
            priority: formData.priority,
            is_completed: false,
            completed_at: null,
          })
          .select()
          .single();

        if (insertError) throw insertError;

        setTasks((prev) => [data, ...prev]);
        setToast({ type: 'success', message: 'Task added' });
      }

      setTaskModalOpen(false);
    } catch (err) {
      console.error('[tasks] Error saving task:', err);
      setToast({
        type: 'error',
        message: err.message || 'Failed to save task. Please try again.',
      });
    } finally {
      setSavingTask(false);
    }
  };

  // Delete Handlers
  const handleOpenDeleteDialog = (task) => {
    setTaskToDelete(task);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!taskToDelete || !user?.id) return;
    setDeletingTask(true);

    try {
      /**
       * Supabase Delete Query:
       * Deletes the specified task matching user_id.
       */
      const { error: deleteError } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskToDelete.id)
        .eq('user_id', user.id);

      if (deleteError) throw deleteError;

      setTasks((prev) => prev.filter((t) => t.id !== taskToDelete.id));
      setToast({ type: 'success', message: 'Task deleted' });
      setDeleteDialogOpen(false);
      setTaskToDelete(null);
    } catch (err) {
      console.error('[tasks] Error deleting task:', err);
      setToast({
        type: 'error',
        message: err.message || 'Failed to delete task.',
      });
    } finally {
      setDeletingTask(false);
    }
  };

  // Bulk Clear Completed Handlers
  const completedTaskIds = useMemo(() => {
    return tasks.filter((t) => t.is_completed).map((t) => t.id);
  }, [tasks]);

  const handleConfirmClearCompleted = async () => {
    if (completedTaskIds.length === 0 || !user?.id) return;
    setClearingCompleted(true);

    try {
      /**
       * Supabase Bulk Delete Query:
       * Removes all completed tasks for current user.
       */
      const { error: clearError } = await supabase
        .from('tasks')
        .delete()
        .in('id', completedTaskIds)
        .eq('user_id', user.id);

      if (clearError) throw clearError;

      setTasks((prev) => prev.filter((t) => !t.is_completed));
      setToast({
        type: 'success',
        message: `${completedTaskIds.length} completed tasks cleared`,
      });
      setClearCompletedOpen(false);
    } catch (err) {
      console.error('[tasks] Error clearing completed tasks:', err);
      setToast({
        type: 'error',
        message: err.message || 'Failed to clear completed tasks.',
      });
    } finally {
      setClearingCompleted(false);
    }
  };

  // Reset all filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setStatusFilter('All');
    setSubjectFilter('ALL');
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-200">
      {/* Toast Notification Container */}
      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* 1. PAGE HEADER */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#3525CD] to-[#4F46E5] flex items-center justify-center text-white shadow-sm">
              <CheckSquare className="w-5 h-5 stroke-[2.2]" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#131B2E] dark:text-white">
              Tasks
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-[#464555] dark:text-slate-400 mt-1 font-medium">
            Organize, prioritize, and track your study assignments
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Bulk Clear Completed Button */}
          {completedTaskIds.length > 0 && (
            <button
              type="button"
              onClick={() => setClearCompletedOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1E293B] hover:bg-red-50 dark:hover:bg-red-950/20 text-slate-600 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 text-xs sm:text-sm font-semibold transition-all min-h-[44px] cursor-pointer"
              title="Clear all completed tasks"
            >
              <Trash2 className="w-4 h-4" />
              <span>Clear Completed ({completedTaskIds.length})</span>
            </button>
          )}

          {/* Primary Add Task Button */}
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] text-white text-xs sm:text-sm font-semibold shadow-md shadow-[#4F46E5]/25 hover:shadow-lg transition-all min-h-[44px] cursor-pointer"
            aria-label="Add new task"
          >
            <Plus className="w-4 h-4" />
            <span>Add Task</span>
          </button>
        </div>
      </header>

      {/* Global Error Banner */}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-900 dark:text-red-200 text-xs sm:text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">{error}</p>
            <button
              onClick={loadTasksAndSubjects}
              className="mt-2 text-xs font-bold underline hover:no-underline cursor-pointer"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* 2. FILTERS & SEARCH CONTROLS */}
      <section 
        className="bg-white dark:bg-[#1E293B] rounded-2xl border border-[#E2E8F0] dark:border-slate-800 p-4 sm:p-5 shadow-sm space-y-4"
        aria-label="Task Filters"
      >
        {/* Top line: Search Input + Subject Filter + Sort By */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
          {/* Search by Title */}
          <div className="lg:col-span-6 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tasks by title..."
              className="w-full pl-10 pr-9 py-2.5 bg-slate-50 dark:bg-slate-900 border border-[#CBD5E1] dark:border-slate-700 rounded-xl text-xs sm:text-sm text-[#131B2E] dark:text-white placeholder-[#777587] focus:outline-none focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/20 transition-all"
              aria-label="Search tasks"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Subject Filter Dropdown */}
          <div className="lg:col-span-3 relative">
            <select
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
              className="w-full pl-3.5 pr-8 py-2.5 bg-slate-50 dark:bg-slate-900 border border-[#CBD5E1] dark:border-slate-700 rounded-xl text-xs sm:text-sm text-[#131B2E] dark:text-white focus:outline-none focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/20 appearance-none cursor-pointer"
              aria-label="Filter by subject"
            >
              <option value="ALL">All subjects</option>
              <option value="NO_SUBJECT">No subject</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Sort Dropdown */}
          <div className="lg:col-span-3 relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full pl-3.5 pr-8 py-2.5 bg-slate-50 dark:bg-slate-900 border border-[#CBD5E1] dark:border-slate-700 rounded-xl text-xs sm:text-sm text-[#131B2E] dark:text-white focus:outline-none focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/20 appearance-none cursor-pointer"
              aria-label="Sort tasks"
            >
              <option value="DUE_DATE_ASC">Due date (earliest first)</option>
              <option value="DUE_DATE_DESC">Due date (latest first)</option>
              <option value="PRIORITY_DESC">Priority (High first)</option>
              <option value="CREATED_DESC">Recently created</option>
            </select>
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Bottom line: Filter Tabs (All, Pending, Completed, Overdue) */}
        <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-3 flex-wrap gap-2">
          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
            {[
              { id: 'All', label: 'All', count: counts.all },
              { id: 'Pending', label: 'Pending', count: counts.pending },
              { id: 'Completed', label: 'Completed', count: counts.completed },
              { id: 'Overdue', label: 'Overdue', count: counts.overdue, danger: true },
            ].map((tab) => {
              const isActive = statusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'bg-[#4F46E5] text-white shadow-sm shadow-[#4F46E5]/25'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                  aria-pressed={isActive}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : tab.danger && tab.count > 0
                        ? 'bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400 font-bold'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Showing {filteredAndSortedTasks.length} of {tasks.length}
          </span>
        </div>
      </section>

      {/* 3. TASK LIST / FEED */}
      {loading ? (
        /* Loading Skeleton List */
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="p-5 bg-white dark:bg-[#1E293B] rounded-2xl border border-[#E2E8F0] dark:border-slate-800 animate-pulse flex items-center justify-between gap-4 shadow-sm"
            >
              <div className="flex items-center gap-3.5 flex-1">
                <div className="w-5 h-5 rounded-md bg-slate-200 dark:bg-slate-700 shrink-0" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 w-48 sm:w-72 bg-slate-200 dark:bg-slate-700 rounded-md" />
                  <div className="h-3 w-32 bg-slate-200 dark:bg-slate-700 rounded-md" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-14 h-5 rounded-full bg-slate-200 dark:bg-slate-700" />
                <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-700" />
                <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-700" />
              </div>
            </div>
          ))}
        </div>
      ) : tasks.length === 0 ? (
        /* Empty State: No tasks at all */
        <div className="text-center py-16 px-4 rounded-2xl border-2 border-dashed border-[#E2E8F0] dark:border-slate-800 bg-white/50 dark:bg-slate-900/40">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[#EAEDFF] dark:bg-indigo-950/60 text-[#3525CD] dark:text-indigo-400 flex items-center justify-center shadow-md">
            <FolderPlus className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-bold text-[#131B2E] dark:text-white">
            No tasks yet
          </h2>
          <p className="text-xs sm:text-sm text-[#464555] dark:text-slate-400 max-w-md mx-auto mt-1.5 mb-6">
            Add your first task to get started with homework deadlines, assignments, and study goals.
          </p>
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] text-white text-xs sm:text-sm font-semibold shadow-md shadow-[#4F46E5]/20 hover:shadow-lg transition-all min-h-[44px] cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Task</span>
          </button>
        </div>
      ) : filteredAndSortedTasks.length === 0 ? (
        /* Empty Filter Matches */
        <div className="text-center py-12 px-4 rounded-2xl border border-[#E2E8F0] dark:border-slate-800 bg-white dark:bg-[#1E293B]">
          <p className="text-sm font-semibold text-[#131B2E] dark:text-white">
            No tasks match these filters.
          </p>
          <p className="text-xs text-[#777587] dark:text-slate-400 mt-1 mb-4">
            Try adjusting your search keywords, status tabs, or subject dropdown.
          </p>
          <button
            type="button"
            onClick={handleResetFilters}
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        /* Task List Rows */
        <div className="space-y-3" role="list">
          {filteredAndSortedTasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              subject={subjectsMap[task.subject_id]}
              todayStr={todayStr}
              onToggle={handleToggleTask}
              onEdit={handleOpenEditModal}
              onDelete={handleOpenDeleteDialog}
            />
          ))}
        </div>
      )}

      {/* 4. ADD / EDIT TASK MODAL */}
      <TaskModal
        isOpen={taskModalOpen}
        onClose={() => setTaskModalOpen(false)}
        onSubmit={handleSaveTask}
        initialData={editingTask}
        subjects={subjects}
        isSaving={savingTask}
      />

      {/* 5. CONFIRM DELETE SINGLE TASK DIALOG */}
      <ConfirmDialog
        isOpen={deleteDialogOpen}
        title="Delete this task?"
        message={`Delete "${taskToDelete?.title || 'this task'}"? This cannot be undone.`}
        confirmText="Delete Task"
        cancelText="Cancel"
        onConfirm={handleConfirmDelete}
        onClose={() => {
          if (!deletingTask) {
            setDeleteDialogOpen(false);
            setTaskToDelete(null);
          }
        }}
        isLoading={deletingTask}
        danger={true}
      />

      {/* 6. CONFIRM CLEAR COMPLETED DIALOG */}
      <ConfirmDialog
        isOpen={clearCompletedOpen}
        title="Clear all completed tasks?"
        message={`Delete all ${completedTaskIds.length} completed tasks? This cannot be undone.`}
        confirmText="Clear Completed"
        cancelText="Cancel"
        onConfirm={handleConfirmClearCompleted}
        onClose={() => {
          if (!clearingCompleted) {
            setClearCompletedOpen(false);
          }
        }}
        isLoading={clearingCompleted}
        danger={true}
      />
    </div>
  );
}
