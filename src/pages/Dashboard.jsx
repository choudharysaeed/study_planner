import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { 
  Clock, 
  CheckCircle2, 
  Flame, 
  Plus, 
  AlertCircle, 
  Loader2, 
  Tag, 
  Calendar, 
  Check, 
  ChevronDown,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import Toast from '../components/Toast';
import AuthDebugPanel from '../components/AuthDebugPanel';
import PomodoroTimer from '../components/PomodoroTimer';

// Subject color preset choices
const PRESET_COLORS = [
  '#4F46E5', // Indigo
  '#14B8A6', // Teal
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#10B981', // Emerald
  '#8B5CF6', // Purple
  '#0EA5E9', // Sky
  '#EC4899', // Pink
];

// Helper: Format today's date as YYYY-MM-DD in local timezone
const getLocalDateString = (d = new Date()) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Helper: Format start of today (midnight 00:00:00.000) in local timezone
const getStartOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

// Helper: Format end of today (tomorrow midnight 00:00:00.000) in local timezone
const getEndOfToday = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(0, 0, 0, 0);
  return d;
};

// Helper: Format start of 7 days ago (midnight 00:00:00.000) in local timezone
const getSevenDaysAgo = () => {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  d.setHours(0, 0, 0, 0);
  return d;
};

export default function Dashboard() {
  const { user } = useAuth();

  // Reference for scrolling to the Add Task form
  const addTaskInputRef = useRef(null);

  // Today's local date representations
  const todayStr = useMemo(() => getLocalDateString(), []);
  const todayFormatted = useMemo(() => {
    return new Intl.DateTimeFormat('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date());
  }, []);

  // Time of day greeting
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }, []);

  // User display name
  const firstName = useMemo(() => {
    const rawName =
      user?.user_metadata?.full_name ||
      user?.user_metadata?.name ||
      user?.email?.split('@')[0] ||
      'Student';
    return rawName.trim().split(' ')[0];
  }, [user]);

  // Main state
  const [loading, setLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState(null);
  const [toast, setToast] = useState(null);

  // Data state
  const [subjects, setSubjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [summary, setSummary] = useState({
    pomodorosToday: 0,
    tasksCompletedToday: 0,
    studyHoursWeek: '0.0',
  });

  // Version counter to trigger stats refetch whenever a session completes
  const [statsVersion, setStatsVersion] = useState(0);

  const handleSessionSaved = useCallback(() => {
    console.log('[stats] onSessionSaved callback received in Dashboard, incrementing statsVersion');
    setStatsVersion((prev) => prev + 1);
  }, []);

  // Quick Add Task Form State
  const [taskTitle, setTaskTitle] = useState('');
  const [taskSubjectId, setTaskSubjectId] = useState('');
  const [taskDueDate, setTaskDueDate] = useState(todayStr);
  const [taskDueTime, setTaskDueTime] = useState('');
  const [taskPriority, setTaskPriority] = useState('Medium');
  const [savingTask, setSavingTask] = useState(false);

  // Inline Add Subject Form State (for users with no subjects)
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectColor, setNewSubjectColor] = useState(PRESET_COLORS[0]);
  const [savingSubject, setSavingSubject] = useState(false);
  const [showSubjectModal, setShowSubjectModal] = useState(false);

  // Subject lookup map: { [id]: subject }
  const subjectsMap = useMemo(() => {
    const map = {};
    subjects.forEach((s) => {
      map[s.id] = s;
    });
    return map;
  }, [subjects]);

  // Priority sorting weight: High (3), Medium (2), Low (1)
  const priorityWeight = { High: 3, Medium: 2, Low: 1 };

  // Filter incomplete tasks for the Pomodoro timer task selector
  const incompleteTasks = useMemo(() => {
    return tasks.filter((t) => !t.is_completed);
  }, [tasks]);

  // Fetch all dashboard data from Supabase
  const loadDashboardData = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setDashboardError(null);

    const startOfToday = getStartOfToday();
    const endOfToday = getEndOfToday();
    const sevenDaysAgo = getSevenDaysAgo();

    console.log('[stats] Computed date filters:', {
      startOfToday: startOfToday.toISOString(),
      endOfToday: endOfToday.toISOString(),
      sevenDaysAgo: sevenDaysAgo.toISOString(),
    });

    try {
      // Execute real Supabase queries in parallel with Promise.all
      const [
        subjectsRes,
        tasksRes,
        pomodorosTodayRes,
        tasksCompletedTodayRes,
        weekSessionsRes
      ] = await Promise.all([
        // Query 1: Fetch user's subjects
        supabase
          .from('subjects')
          .select('id, name, color, created_at')
          .eq('user_id', user.id)
          .order('name', { ascending: true }),

        // Query 2: Fetch today's tasks and uncompleted overdue tasks for user
        supabase
          .from('tasks')
          .select('id, user_id, subject_id, title, due_date, due_time, priority, is_completed, completed_at, created_at')
          .eq('user_id', user.id)
          .lte('due_date', todayStr),

        // Query 3: Fetch and count pomodoro sessions completed today (local day window)
        supabase
          .from('pomodoro_sessions')
          .select('id, duration_minutes, completed_at', { count: 'exact' })
          .eq('user_id', user.id)
          .gte('completed_at', startOfToday.toISOString())
          .lt('completed_at', endOfToday.toISOString()),

        // Query 4: Count tasks completed today
        supabase
          .from('tasks')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('is_completed', true)
          .gte('completed_at', startOfToday.toISOString())
          .lt('completed_at', endOfToday.toISOString()),

        // Query 5: Fetch pomodoro session durations for the last 7 days
        supabase
          .from('pomodoro_sessions')
          .select('duration_minutes')
          .eq('user_id', user.id)
          .gte('completed_at', sevenDaysAgo.toISOString()),
      ]);

      // Check query errors
      if (subjectsRes.error) throw subjectsRes.error;
      if (tasksRes.error) throw tasksRes.error;
      if (pomodorosTodayRes.error) throw pomodorosTodayRes.error;
      if (tasksCompletedTodayRes.error) throw tasksCompletedTodayRes.error;
      if (weekSessionsRes.error) throw weekSessionsRes.error;

      // 1. Process Subjects
      const loadedSubjects = subjectsRes.data || [];
      setSubjects(loadedSubjects);
      if (loadedSubjects.length > 0 && !taskSubjectId) {
        setTaskSubjectId(loadedSubjects[0].id);
      }

      // 2. Filter & Sort Tasks:
      // Keep tasks where due_date == todayStr OR (due_date < todayStr AND !is_completed)
      const rawTasks = tasksRes.data || [];
      const filteredTasks = rawTasks.filter((t) => {
        if (t.due_date === todayStr) return true;
        if (t.due_date < todayStr && !t.is_completed) return true;
        return false;
      });

      // Sort by due_time ascending (nulls last), then priority (High first)
      filteredTasks.sort((a, b) => {
        // First compare due_time
        if (a.due_time && !b.due_time) return -1;
        if (!a.due_time && b.due_time) return 1;
        if (a.due_time && b.due_time) {
          const timeCmp = a.due_time.localeCompare(b.due_time);
          if (timeCmp !== 0) return timeCmp;
        }
        // Then priority (High first)
        const pA = priorityWeight[a.priority] || 2;
        const pB = priorityWeight[b.priority] || 2;
        return pB - pA;
      });

      setTasks(filteredTasks);

      // 3. Compute Summary Metrics
      const pomodorosCount = pomodorosTodayRes.count ?? (pomodorosTodayRes.data?.length ?? 0);
      const tasksCompletedCount = tasksCompletedTodayRes.count ?? 0;

      // Sum minutes in the last 7 days
      const totalMinutes = (weekSessionsRes.data || []).reduce(
        (acc, curr) => acc + (Number(curr.duration_minutes) || 0),
        0
      );
      const studyHours = (totalMinutes / 60).toFixed(1);

      console.log('[stats] Stats query result:', {
        pomodorosTodayCount: pomodorosCount,
        pomodorosTodayRows: pomodorosTodayRes.data,
        weekSessionsCount: weekSessionsRes.data?.length,
        computedStudyHours: studyHours,
      });

      setSummary({
        pomodorosToday: pomodorosCount,
        tasksCompletedToday: tasksCompletedCount,
        studyHoursWeek: studyHours,
      });

    } catch (err) {
      console.error('[stats] Dashboard data loading error:', err);
      setDashboardError(err.message || 'Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  }, [user?.id, todayStr]);

  // Load on mount, user change, or when statsVersion changes
  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData, statsVersion]);

  // Optimistic Toggle Task Checkbox
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

    // Update tasks completed count optimistically
    setSummary((prev) => ({
      ...prev,
      tasksCompletedToday: Math.max(
        0,
        prev.tasksCompletedToday + (nextCompleted ? 1 : -1)
      ),
    }));

    // 2. Persist to Supabase
    try {
      const { error } = await supabase
        .from('tasks')
        .update({
          is_completed: nextCompleted,
          completed_at: nextCompletedAt,
        })
        .eq('id', task.id)
        .eq('user_id', user.id);

      if (error) throw error;
    } catch (err) {
      console.error('[dashboard] Error updating task:', err);
      // Revert optimistic update
      setTasks((prev) =>
        prev.map((t) =>
          t.id === task.id
            ? { ...t, is_completed: previousCompleted, completed_at: task.completed_at }
            : t
        )
      );
      setSummary((prev) => ({
        ...prev,
        tasksCompletedToday: Math.max(
          0,
          prev.tasksCompletedToday + (previousCompleted ? 1 : -1)
        ),
      }));
      setToast({
        type: 'error',
        message: 'Could not update task. Changes were reverted.',
      });
    }
  };

  // Submit Quick Add Task
  const handleCreateTask = async (e) => {
    e.preventDefault();

    if (!taskTitle.trim()) {
      setToast({ type: 'error', message: 'Please enter a task title.' });
      return;
    }

    setSavingTask(true);
    try {
      // Insert new task into Supabase tasks table
      const { data, error } = await supabase
        .from('tasks')
        .insert([
          {
            user_id: user.id,
            subject_id: taskSubjectId || null,
            title: taskTitle.trim(),
            due_date: taskDueDate || todayStr,
            due_time: taskDueTime ? taskDueTime : null,
            priority: taskPriority,
            is_completed: false,
            completed_at: null,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      // Add new task to list without full page reload if it belongs in today's view
      if (data.due_date === todayStr) {
        setTasks((prev) => {
          const updated = [data, ...prev];
          return updated.sort((a, b) => {
            if (a.due_time && !b.due_time) return -1;
            if (!a.due_time && b.due_time) return 1;
            if (a.due_time && b.due_time) {
              const c = a.due_time.localeCompare(b.due_time);
              if (c !== 0) return c;
            }
            return (priorityWeight[b.priority] || 2) - (priorityWeight[a.priority] || 2);
          });
        });
      }

      // Clear input fields
      setTaskTitle('');
      setTaskDueTime('');
      setTaskDueDate(todayStr);

      setToast({ type: 'success', message: 'Task saved' });
    } catch (err) {
      console.error('[dashboard] Error creating task:', err);
      setToast({
        type: 'error',
        message: err.message || 'Failed to save task. Please try again.',
      });
    } finally {
      setSavingTask(false);
    }
  };

  // Submit Inline Create Subject (when user has no subjects)
  const handleCreateSubject = async (e) => {
    e.preventDefault();
    if (!newSubjectName.trim()) {
      setToast({ type: 'error', message: 'Subject name is required.' });
      return;
    }

    setSavingSubject(true);
    try {
      // Insert new subject into Supabase subjects table
      const { data, error } = await supabase
        .from('subjects')
        .insert([
          {
            user_id: user.id,
            name: newSubjectName.trim(),
            color: newSubjectColor,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      // Update local subjects list and auto-select
      setSubjects((prev) => [...prev, data]);
      setTaskSubjectId(data.id);
      setNewSubjectName('');
      setShowSubjectModal(false);

      setToast({ type: 'success', message: `Subject "${data.name}" added!` });
    } catch (err) {
      console.error('[dashboard] Error creating subject:', err);
      setToast({
        type: 'error',
        message: err.message || 'Failed to create subject.',
      });
    } finally {
      setSavingSubject(false);
    }
  };

  // Priority badge styling
  const renderPriorityBadge = (priority) => {
    switch (priority) {
      case 'High':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800/40">
            High
          </span>
        );
      case 'Medium':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40">
            Medium
          </span>
        );
      case 'Low':
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            Low
          </span>
        );
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-200">
      {/* Toast Notification */}
      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* Dev-only Debug Panel */}
      <AuthDebugPanel />

      {/* 1. HEADER SECTION */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#131B2E] dark:text-white">
            {greeting}, {firstName}!
          </h1>
          <p className="text-xs sm:text-sm text-[#464555] dark:text-slate-400 mt-1 flex items-center gap-1.5 font-medium">
            <Calendar className="w-4 h-4 text-[#4F46E5] dark:text-indigo-400 shrink-0" />
            <span>{todayFormatted}</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              addTaskInputRef.current?.focus();
              addTaskInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] text-white text-xs font-semibold shadow-md shadow-[#4F46E5]/20 hover:shadow-lg transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Task</span>
          </button>
        </div>
      </header>

      {/* Global Error Banner */}
      {dashboardError && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-900 dark:text-red-200 text-xs flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">{dashboardError}</p>
            <button
              onClick={loadDashboardData}
              className="mt-2 text-xs font-bold underline hover:no-underline"
            >
              Retry query
            </button>
          </div>
        </div>
      )}

      {/* 2. SUMMARY CARDS (3 Cards) */}
      <section aria-label="Summary Metrics">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          {/* Card 1: Pomodoros Completed Today */}
          <div className="bg-white dark:bg-[#1E293B] rounded-2xl border border-[#E2E8F0] dark:border-slate-800 p-5 sm:p-6 shadow-sm transition-colors">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-[#464555] dark:text-slate-400">
                Pomodoros Today
              </span>
              <div className="w-9 h-9 rounded-xl bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
            </div>
            {loading ? (
              <div className="h-8 w-20 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse" />
            ) : (
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-[#131B2E] dark:text-white font-mono">
                  {summary.pomodorosToday}
                </span>
                <span className="text-xs text-[#777587] dark:text-slate-400 font-medium">sessions</span>
              </div>
            )}
            <p className="text-[11px] text-[#777587] dark:text-slate-400 mt-2">
              Focus intervals finished today
            </p>
          </div>

          {/* Card 2: Tasks Completed Today */}
          <div className="bg-white dark:bg-[#1E293B] rounded-2xl border border-[#E2E8F0] dark:border-slate-800 p-5 sm:p-6 shadow-sm transition-colors">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-[#464555] dark:text-slate-400">
                Tasks Completed
              </span>
              <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-[#22C55E] flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
            {loading ? (
              <div className="h-8 w-20 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse" />
            ) : (
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-[#131B2E] dark:text-white font-mono">
                  {summary.tasksCompletedToday}
                </span>
                <span className="text-xs text-[#777587] dark:text-slate-400 font-medium">completed today</span>
              </div>
            )}
            <p className="text-[11px] text-[#777587] dark:text-slate-400 mt-2">
              Tasks marked done today
            </p>
          </div>

          {/* Card 3: Study Hours This Week */}
          <div className="bg-white dark:bg-[#1E293B] rounded-2xl border border-[#E2E8F0] dark:border-slate-800 p-5 sm:p-6 shadow-sm transition-colors">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-[#464555] dark:text-slate-400">
                Study Hours (Week)
              </span>
              <div className="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-950/50 text-[#14B8A6] flex items-center justify-center">
                <Flame className="w-5 h-5" />
              </div>
            </div>
            {loading ? (
              <div className="h-8 w-20 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse" />
            ) : (
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-[#131B2E] dark:text-white font-mono">
                  {summary.studyHoursWeek}
                </span>
                <span className="text-xs text-[#777587] dark:text-slate-400 font-medium">hours</span>
              </div>
            )}
            <p className="text-[11px] text-[#777587] dark:text-slate-400 mt-2">
              Last 7 days of Pomodoro blocks
            </p>
          </div>
        </div>
      </section>

      {/* Main Responsive Grid Layout: Left Column for Tasks & Quick Add, Right Column for Pomodoro Timer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Today's Tasks: Desktop Left (col 1..8), Mobile Stacks 1st */}
        <div className="lg:col-span-7 xl:col-span-8 order-1">
          {/* 3. TODAY'S TASKS LIST */}
          <section className="bg-white dark:bg-[#1E293B] rounded-2xl border border-[#E2E8F0] dark:border-slate-800 p-6 shadow-sm transition-colors">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#EAEDFF] dark:bg-indigo-950/60 text-[#3525CD] dark:text-indigo-400 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[#131B2E] dark:text-white tracking-tight">
                Today&apos;s Tasks
              </h2>
              <p className="text-xs text-[#777587] dark:text-slate-400">
                Tasks scheduled for today or pending from earlier
              </p>
            </div>
          </div>

          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
            {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}
          </span>
        </div>

        {/* Task list rows */}
        {loading ? (
          <div className="space-y-3 py-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-16 rounded-xl bg-slate-100 dark:bg-slate-800/60 animate-pulse"
              />
            ))}
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-12 px-4 rounded-xl border border-dashed border-[#E2E8F0] dark:border-slate-800">
            <div className="w-12 h-12 mx-auto rounded-full bg-[#EAEDFF] dark:bg-indigo-950/50 text-[#3525CD] dark:text-indigo-400 flex items-center justify-center mb-3">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-[#131B2E] dark:text-white">
              No tasks for today.
            </h3>
            <p className="text-xs text-[#777587] dark:text-slate-400 mt-1 mb-4">
              Add one below or visit the Tasks tab to plan upcoming homework.
            </p>
            <button
              type="button"
              onClick={() => {
                addTaskInputRef.current?.focus();
                addTaskInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#4F46E5] text-white text-xs font-semibold hover:bg-[#4338CA] transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add a task</span>
            </button>
          </div>
        ) : (
          <div className="divide-y divide-[#E2E8F0] dark:divide-slate-800">
            {tasks.map((task) => {
              const subject = subjectsMap[task.subject_id];
              const isOverdue = task.due_date < todayStr && !task.is_completed;

              return (
                <div
                  key={task.id}
                  className={`py-3.5 flex items-center justify-between gap-3 sm:gap-4 transition-colors rounded-lg px-2 -mx-2 hover:bg-slate-50 dark:hover:bg-slate-800/40 ${
                    task.is_completed ? 'opacity-65' : ''
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* Checkbox */}
                    <button
                      type="button"
                      onClick={() => handleToggleTask(task)}
                      className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                        task.is_completed
                          ? 'bg-[#22C55E] border-[#22C55E] text-white'
                          : 'border-slate-300 dark:border-slate-600 hover:border-[#4F46E5] bg-white dark:bg-slate-900'
                      }`}
                      aria-label={task.is_completed ? 'Mark task incomplete' : 'Mark task complete'}
                    >
                      {task.is_completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </button>

                    {/* Task Title and Subject info */}
                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-sm font-semibold truncate text-[#131B2E] dark:text-white ${
                          task.is_completed ? 'line-through text-slate-400 dark:text-slate-500' : ''
                        }`}
                      >
                        {task.title}
                      </p>

                      <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-[#777587] dark:text-slate-400">
                        {/* Subject color dot and name */}
                        {subject ? (
                          <span className="inline-flex items-center gap-1.5 font-medium">
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: subject.color || '#4F46E5' }}
                            />
                            <span className="truncate max-w-[120px]">{subject.name}</span>
                          </span>
                        ) : (
                          <span className="text-slate-400">General</span>
                        )}

                        {/* Due time if specified */}
                        {task.due_time && (
                          <span className="flex items-center gap-1 font-mono text-slate-500 dark:text-slate-400">
                            <Clock className="w-3 h-3" />
                            <span>{task.due_time}</span>
                          </span>
                        )}

                        {/* Overdue tag */}
                        {isOverdue && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400 uppercase">
                            Overdue
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Priority Badge */}
                  <div className="shrink-0 flex items-center gap-2">
                    {renderPriorityBadge(task.priority)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
          </section>
        </div>

        {/* Pomodoro Timer: Desktop Right (col 9..12, row-span-2, sticky), Mobile Stacks 2nd (below Today's Tasks) */}
        <div className="lg:col-span-5 xl:col-span-4 order-2 lg:row-span-2 lg:sticky lg:top-8">
          <PomodoroTimer 
            onSessionSaved={handleSessionSaved}
            incompleteTasks={incompleteTasks}
          />
        </div>

        {/* Quick Add Task Form: Desktop Left below tasks, Mobile Stacks 3rd */}
        <div className="lg:col-span-7 xl:col-span-8 order-3">
          {/* 4. QUICK ADD TASK FORM */}
          <section className="bg-white dark:bg-[#1E293B] rounded-2xl border border-[#E2E8F0] dark:border-slate-800 p-6 shadow-sm transition-colors">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#14B8A6]/10 text-[#14B8A6] flex items-center justify-center">
              <Plus className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[#131B2E] dark:text-white tracking-tight">
                Quick Add Task
              </h2>
              <p className="text-xs text-[#777587] dark:text-slate-400">
                Instantly schedule study assignments and review blocks
              </p>
            </div>
          </div>

          {subjects.length > 0 && (
            <button
              type="button"
              onClick={() => setShowSubjectModal(true)}
              className="text-xs font-semibold text-[#4F46E5] dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Tag className="w-3.5 h-3.5" />
              <span>+ New Subject</span>
            </button>
          )}
        </div>

        {/* If user has no subjects yet, show inline subject creator */}
        {subjects.length === 0 && (
          <div className="mb-6 p-4 rounded-xl bg-[#FAF8FF] dark:bg-slate-800/60 border border-[#EAEDFF] dark:border-slate-700">
            <div className="flex items-start gap-2.5 mb-3">
              <Tag className="w-4 h-4 text-[#4F46E5] shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-[#131B2E] dark:text-white uppercase tracking-wider">
                  First Step: Add a Subject
                </h4>
                <p className="text-xs text-[#464555] dark:text-slate-400 mt-0.5">
                  Every task is organized under a subject (e.g., Computer Science, Biology, Calculus).
                </p>
              </div>
            </div>

            <form onSubmit={handleCreateSubject} className="space-y-3">
              <div className="flex flex-col sm:flex-row gap-2.5">
                <input
                  type="text"
                  required
                  value={newSubjectName}
                  onChange={(e) => setNewSubjectName(e.target.value)}
                  placeholder="Subject name (e.g. CS 201 Algorithms)"
                  className="flex-1 px-3 py-2 bg-white dark:bg-slate-900 border border-[#CBD5E1] dark:border-slate-700 rounded-lg text-xs text-[#131B2E] dark:text-white placeholder-[#777587] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20"
                />

                {/* Color choices */}
                <div className="flex items-center gap-1.5 px-2 py-1 bg-white dark:bg-slate-900 border border-[#CBD5E1] dark:border-slate-700 rounded-lg">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewSubjectColor(c)}
                      className={`w-5 h-5 rounded-full transition-transform cursor-pointer ${
                        newSubjectColor === c ? 'scale-125 ring-2 ring-offset-1 ring-slate-400' : ''
                      }`}
                      style={{ backgroundColor: c }}
                      title={c}
                    />
                  ))}
                </div>

                <button
                  type="submit"
                  disabled={savingSubject}
                  className="px-4 py-2 rounded-lg bg-[#4F46E5] hover:bg-[#4338CA] text-white text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-60 transition-colors cursor-pointer"
                >
                  {savingSubject ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  <span>Save Subject</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Task Form */}
        <form onSubmit={handleCreateTask} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Title (Required) */}
            <div className="sm:col-span-2">
              <label htmlFor="taskTitle" className="block text-xs font-semibold text-[#131B2E] dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                Task Title *
              </label>
              <input
                id="taskTitle"
                ref={addTaskInputRef}
                type="text"
                required
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                placeholder="e.g. Problem Set 4: Dynamic Programming"
                className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-[#CBD5E1] dark:border-slate-700 rounded-xl text-xs text-[#131B2E] dark:text-white placeholder-[#777587] transition-all focus:outline-none focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/20"
              />
            </div>

            {/* Subject Dropdown */}
            <div>
              <label htmlFor="taskSubject" className="block text-xs font-semibold text-[#131B2E] dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                Subject
              </label>
              <div className="relative">
                <select
                  id="taskSubject"
                  value={taskSubjectId}
                  onChange={(e) => setTaskSubjectId(e.target.value)}
                  disabled={subjects.length === 0}
                  className="w-full pl-3 pr-8 py-2.5 bg-white dark:bg-slate-900 border border-[#CBD5E1] dark:border-slate-700 rounded-xl text-xs text-[#131B2E] dark:text-white focus:outline-none focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/20 appearance-none disabled:opacity-50"
                >
                  {subjects.length === 0 ? (
                    <option value="">No subjects yet</option>
                  ) : (
                    subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))
                  )}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Priority Dropdown */}
            <div>
              <label htmlFor="taskPriority" className="block text-xs font-semibold text-[#131B2E] dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                Priority
              </label>
              <div className="relative">
                <select
                  id="taskPriority"
                  value={taskPriority}
                  onChange={(e) => setTaskPriority(e.target.value)}
                  className="w-full pl-3 pr-8 py-2.5 bg-white dark:bg-slate-900 border border-[#CBD5E1] dark:border-slate-700 rounded-xl text-xs text-[#131B2E] dark:text-white focus:outline-none focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/20 appearance-none"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            {/* Due Date (Default Today) */}
            <div>
              <label htmlFor="taskDueDate" className="block text-xs font-semibold text-[#131B2E] dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                Due Date
              </label>
              <input
                id="taskDueDate"
                type="date"
                required
                value={taskDueDate}
                onChange={(e) => setTaskDueDate(e.target.value)}
                className="w-full px-3 py-2.5 bg-white dark:bg-slate-900 border border-[#CBD5E1] dark:border-slate-700 rounded-xl text-xs text-[#131B2E] dark:text-white focus:outline-none focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/20"
              />
            </div>

            {/* Due Time (Optional) */}
            <div>
              <label htmlFor="taskDueTime" className="block text-xs font-semibold text-[#131B2E] dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                Due Time (Optional)
              </label>
              <input
                id="taskDueTime"
                type="time"
                value={taskDueTime}
                onChange={(e) => setTaskDueTime(e.target.value)}
                className="w-full px-3 py-2.5 bg-white dark:bg-slate-900 border border-[#CBD5E1] dark:border-slate-700 rounded-xl text-xs text-[#131B2E] dark:text-white focus:outline-none focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/20"
              />
            </div>

            {/* Spacer */}
            <div className="hidden lg:block" />

            {/* Submit Button */}
            <div>
              <button
                type="submit"
                disabled={savingTask}
                className="w-full py-2.5 px-4 rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] text-white font-semibold text-xs shadow-md shadow-[#4F46E5]/25 hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
              >
                {savingTask ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving Task...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    <span>Add Task to List</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
          </section>
        </div>
      </div>

      {/* MODAL: CREATE NEW SUBJECT */}
      {showSubjectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-[#1E293B] rounded-2xl border border-[#E2E8F0] dark:border-slate-800 p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-base font-bold text-[#131B2E] dark:text-white mb-1">
              Add New Subject
            </h3>
            <p className="text-xs text-[#464555] dark:text-slate-400 mb-4">
              Enter a title and pick an accent color for your course.
            </p>

            <form onSubmit={handleCreateSubject} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#131B2E] dark:text-slate-300 mb-1 uppercase tracking-wider">
                  Subject Name
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={newSubjectName}
                  onChange={(e) => setNewSubjectName(e.target.value)}
                  placeholder="e.g. Physics 150"
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-[#CBD5E1] dark:border-slate-700 rounded-lg text-xs text-[#131B2E] dark:text-white focus:outline-none focus:border-[#4F46E5]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#131B2E] dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                  Color Tag
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewSubjectColor(c)}
                      className={`w-6 h-6 rounded-full transition-transform cursor-pointer ${
                        newSubjectColor === c ? 'scale-125 ring-2 ring-offset-1 ring-slate-400' : ''
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSubjectModal(false)}
                  className="px-3 py-2 rounded-lg text-xs font-medium text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingSubject}
                  className="px-4 py-2 rounded-lg bg-[#4F46E5] text-white text-xs font-semibold hover:bg-[#4338CA] transition-colors flex items-center gap-1.5 disabled:opacity-60"
                >
                  {savingSubject && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Create</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
