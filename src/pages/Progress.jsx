import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { 
  Clock, 
  Timer, 
  CheckCircle2, 
  Flame, 
  Trophy, 
  RotateCw, 
  AlertCircle, 
  ChevronRight, 
  BookMarked, 
  CheckSquare, 
  Sparkles,
  CalendarDays
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import Toast from '../components/Toast';
import BarChart from '../components/BarChart';

/**
 * Helper to convert any Date or timestamp string into a local 'YYYY-MM-DD' key
 * using the user's local timezone (not UTC).
 */
const toLocalDateKey = (dateInput) => {
  if (!dateInput) return '';
  const d = typeof dateInput === 'string' || typeof dateInput === 'number' ? new Date(dateInput) : dateInput;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Format a completion date as "Fri, 9 Oct"
 */
const formatCompletionDate = (isoString) => {
  if (!isoString) return '';
  const d = new Date(isoString);
  const weekday = d.toLocaleDateString('en-US', { weekday: 'short' });
  const day = d.getDate();
  const month = d.toLocaleDateString('en-US', { month: 'short' });
  return `${weekday}, ${day} ${month}`;
};

/**
 * Compute start of day N days ago in local timezone
 */
const getStartDateForPeriod = (days) => {
  const d = new Date();
  d.setDate(d.getDate() - (days - 1));
  d.setHours(0, 0, 0, 0);
  return d;
};

export default function Progress() {
  const { user } = useAuth();

  // Period state: 7 (Last 7 days) or 30 (Last 30 days)
  const [period, setPeriod] = useState(7);

  // Raw data states from Supabase
  const [sessions, setSessions] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [subjects, setSubjects] = useState([]);

  // UI state
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const [refreshCount, setRefreshCount] = useState(0);

  // Fetch progress data from Supabase
  const loadProgressData = useCallback(async (isManualRefresh = false) => {
    if (!user?.id) return;

    if (isManualRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const startDate = getStartDateForPeriod(period);

      /**
       * Execute the 3 required Supabase queries concurrently with Promise.all:
       * 1. pomodoro_sessions for the selected period
       * 2. completed tasks inside the selected period
       * 3. subjects for mapping colors and names
       */
      const [sessionsRes, tasksRes, subjectsRes] = await Promise.all([
        supabase
          .from('pomodoro_sessions')
          .select('id, duration_minutes, completed_at')
          .eq('user_id', user.id)
          .gte('completed_at', startDate.toISOString()),
        supabase
          .from('tasks')
          .select('id, title, subject_id, completed_at')
          .eq('user_id', user.id)
          .eq('is_completed', true)
          .gte('completed_at', startDate.toISOString()),
        supabase
          .from('subjects')
          .select('id, name, color')
          .eq('user_id', user.id)
      ]);

      if (sessionsRes.error) throw new Error(`Sessions: ${sessionsRes.error.message}`);
      if (tasksRes.error) throw new Error(`Tasks: ${tasksRes.error.message}`);
      if (subjectsRes.error) throw new Error(`Subjects: ${subjectsRes.error.message}`);

      setSessions(sessionsRes.data || []);
      setTasks(tasksRes.data || []);
      setSubjects(subjectsRes.data || []);

      if (isManualRefresh) {
        setToast({ type: 'success', message: 'Progress data updated!' });
      }
    } catch (err) {
      console.error('[progress] Error loading data:', err);
      setError(err.message || 'Failed to load progress data. Please try again.');
      setToast({ type: 'error', message: 'Failed to load progress data' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id, period]);

  // Trigger loading when user, period, or manual refresh changes
  useEffect(() => {
    loadProgressData();
  }, [loadProgressData, refreshCount]);

  // 1. SUMMARY METRICS COMPUTATION (JavaScript useMemo)
  const summaryStats = useMemo(() => {
    // Total focus time in hours (with one decimal)
    const totalMinutes = sessions.reduce((sum, s) => {
      const duration = Number(s.duration_minutes);
      return sum + (isNaN(duration) ? 0 : duration);
    }, 0);
    const totalHours = (totalMinutes / 60).toFixed(1);

    // Pomodoros completed
    const pomodoroCount = sessions.length;

    // Tasks completed
    const taskCount = tasks.length;

    return {
      totalHours,
      totalMinutes,
      pomodoroCount,
      taskCount
    };
  }, [sessions, tasks]);

  // 2. STREAK COUNTER COMPUTATION (JavaScript useMemo, Local Timezone)
  const streakStats = useMemo(() => {
    const activeDates = new Set();
    sessions.forEach((s) => {
      if (s.completed_at) {
        activeDates.add(toLocalDateKey(s.completed_at));
      }
    });

    const today = new Date();
    const todayKey = toLocalDateKey(today);

    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    const yesterdayKey = toLocalDateKey(yesterday);

    const studiedToday = activeDates.has(todayKey);
    const studiedYesterday = activeDates.has(yesterdayKey);

    // Current streak: consecutive days ending today (or yesterday if today has no session yet)
    let currentStreak = 0;
    let checkDate = new Date();

    if (studiedToday) {
      checkDate = new Date(today);
      while (activeDates.has(toLocalDateKey(checkDate))) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      }
    } else if (studiedYesterday) {
      checkDate = new Date(yesterday);
      while (activeDates.has(toLocalDateKey(checkDate))) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      }
    } else {
      currentStreak = 0;
    }

    // Longest streak in the loaded data (across the selected period days)
    let longestStreak = 0;
    let running = 0;

    for (let i = period - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const k = toLocalDateKey(d);

      if (activeDates.has(k)) {
        running++;
        if (running > longestStreak) {
          longestStreak = running;
        }
      } else {
        running = 0;
      }
    }

    longestStreak = Math.max(longestStreak, currentStreak);

    return {
      currentStreak,
      longestStreak,
      studiedToday
    };
  }, [sessions, period]);

  // 3. BAR CHART DATA COMPUTATION (7 or 30 days)
  const chartData = useMemo(() => {
    const result = [];
    const todayKey = toLocalDateKey(new Date());

    // Count sessions per date key
    const countByDate = {};
    sessions.forEach((s) => {
      if (s.completed_at) {
        const k = toLocalDateKey(s.completed_at);
        countByDate[k] = (countByDate[k] || 0) + 1;
      }
    });

    for (let i = period - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);

      const dateKey = toLocalDateKey(d);
      const count = countByDate[dateKey] || 0;
      const isToday = dateKey === todayKey;

      const label =
        period === 7
          ? d.toLocaleDateString('en-US', { weekday: 'short' })
          : `${d.getMonth() + 1}/${d.getDate()}`;

      const weekday = d.toLocaleDateString('en-US', { weekday: 'short' });
      const day = d.getDate();
      const month = d.toLocaleDateString('en-US', { month: 'short' });
      const fullDateLabel = `${weekday}, ${day} ${month}`;

      result.push({
        date: d,
        dateKey,
        label,
        fullDateLabel,
        count,
        isToday,
        ariaLabel: `${weekday} ${day} ${month}: ${count} pomodoro${count === 1 ? '' : 's'}`
      });
    }

    return result;
  }, [sessions, period]);

  // 4. COMPLETED TASKS GROUPED BY SUBJECT (JavaScript useMemo)
  const completedTasksBySubject = useMemo(() => {
    if (!tasks || tasks.length === 0) return [];

    const subjectsMap = new Map((subjects || []).map((s) => [s.id, s]));
    const groups = {};

    tasks.forEach((task) => {
      const subjectId = task.subject_id;
      const subject = subjectId ? subjectsMap.get(subjectId) : null;
      const key = subjectId && subject ? subjectId : 'no-subject';
      const name = subject ? subject.name : 'No subject';
      const color = subject ? subject.color || '#4F46E5' : '#94A3B8';

      if (!groups[key]) {
        groups[key] = {
          id: key,
          name,
          color,
          tasks: []
        };
      }
      groups[key].tasks.push(task);
    });

    // Sort tasks in each group by completed_at descending
    Object.values(groups).forEach((g) => {
      g.tasks.sort((a, b) => new Date(b.completed_at || 0) - new Date(a.completed_at || 0));
    });

    // Sort subjects: named ones alphabetically, "No subject" last
    return Object.values(groups).sort((a, b) => {
      if (a.id === 'no-subject') return 1;
      if (b.id === 'no-subject') return -1;
      return a.name.localeCompare(b.name);
    });
  }, [tasks, subjects]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 sm:space-y-8">
      {/* Toast notifications */}
      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* PAGE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#131B2E] dark:text-white tracking-tight flex items-center gap-2.5">
            Progress
            <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-[#4F46E5] dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50">
              <Sparkles className="w-3 h-3 text-indigo-500" />
              Analytics
            </span>
          </h1>
          <p className="text-sm text-[#464555] dark:text-slate-400 mt-1">
            Track your study sessions, completion streaks, and task achievements.
          </p>
        </div>

        {/* Controls: Period Selector & Refresh */}
        <div className="flex items-center gap-3">
          {/* Labelled Period Selector */}
          <div
            role="group"
            aria-label="Time period selection"
            className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80"
          >
            <button
              type="button"
              aria-pressed={period === 7}
              onClick={() => setPeriod(7)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                period === 7
                  ? 'bg-white dark:bg-[#1E293B] text-[#4F46E5] dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Last 7 days
            </button>
            <button
              type="button"
              aria-pressed={period === 30}
              onClick={() => setPeriod(30)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                period === 30
                  ? 'bg-white dark:bg-[#1E293B] text-[#4F46E5] dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Last 30 days
            </button>
          </div>

          {/* Refresh button */}
          <button
            type="button"
            onClick={() => setRefreshCount((c) => c + 1)}
            disabled={refreshing || loading}
            title="Refresh progress data"
            aria-label="Refresh progress data"
            className="p-2 rounded-xl bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
          >
            <RotateCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-[#4F46E5]' : ''}`} />
          </button>
        </div>
      </div>

      {/* ERROR STATE WITH RETRY */}
      {error && !loading && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-red-700 dark:text-red-400 text-sm">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => loadProgressData()}
            className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold text-xs transition-colors self-start sm:self-auto cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* SUMMARY CARDS (3 cards: 1 col on mobile, 3 cols on desktop lg) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
        {/* Card 1: Total Focus Time */}
        {loading ? (
          <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm animate-pulse space-y-3">
            <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-700" />
            <div className="w-24 h-4 bg-slate-200 dark:bg-slate-700 rounded" />
            <div className="w-32 h-8 bg-slate-200 dark:bg-slate-700 rounded" />
          </div>
        ) : (
          <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-[#E2E8F0] dark:border-slate-800 p-6 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="w-11 h-11 rounded-xl bg-teal-50 dark:bg-teal-950/50 text-[#14B8A6] flex items-center justify-center border border-teal-100 dark:border-teal-900/40">
                <Clock className="w-5 h-5 stroke-[2.2]" />
              </div>
              <span className="text-[11px] font-semibold text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/50 px-2 py-0.5 rounded-full">
                Last {period}d
              </span>
            </div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Focus Time
            </div>
            <div className="text-3xl font-extrabold text-[#131B2E] dark:text-white mt-1">
              {summaryStats.totalHours} h
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
              {summaryStats.totalMinutes} total focus minutes completed
            </p>
          </div>
        )}

        {/* Card 2: Pomodoros Completed */}
        {loading ? (
          <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm animate-pulse space-y-3">
            <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-700" />
            <div className="w-24 h-4 bg-slate-200 dark:bg-slate-700 rounded" />
            <div className="w-32 h-8 bg-slate-200 dark:bg-slate-700 rounded" />
          </div>
        ) : (
          <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-[#E2E8F0] dark:border-slate-800 p-6 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="w-11 h-11 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-[#4F46E5] flex items-center justify-center border border-indigo-100 dark:border-indigo-900/40">
                <Timer className="w-5 h-5 stroke-[2.2]" />
              </div>
              <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-2 py-0.5 rounded-full">
                Last {period}d
              </span>
            </div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Pomodoros Completed
            </div>
            <div className="text-3xl font-extrabold text-[#131B2E] dark:text-white mt-1">
              {summaryStats.pomodoroCount}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
              Focus intervals successfully logged
            </p>
          </div>
        )}

        {/* Card 3: Tasks Completed */}
        {loading ? (
          <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm animate-pulse space-y-3">
            <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-700" />
            <div className="w-24 h-4 bg-slate-200 dark:bg-slate-700 rounded" />
            <div className="w-32 h-8 bg-slate-200 dark:bg-slate-700 rounded" />
          </div>
        ) : (
          <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-[#E2E8F0] dark:border-slate-800 p-6 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-[#22C55E] flex items-center justify-center border border-emerald-100 dark:border-emerald-900/40">
                <CheckCircle2 className="w-5 h-5 stroke-[2.2]" />
              </div>
              <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full">
                Last {period}d
              </span>
            </div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Tasks Completed
            </div>
            <div className="text-3xl font-extrabold text-[#131B2E] dark:text-white mt-1">
              {summaryStats.taskCount}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
              To-do items checked off inside this period
            </p>
          </div>
        )}
      </div>

      {/* STREAK COUNTER HERO CARD */}
      <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-indigo-500/10 dark:from-amber-950/30 dark:via-orange-950/20 dark:to-indigo-950/30 rounded-xl border border-amber-200/80 dark:border-amber-900/40 p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center shadow-md shadow-orange-500/20 shrink-0">
              <Flame className="w-7 h-7 stroke-[2.3]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                  Study Momentum
                </span>
                {streakStats.studiedToday && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300">
                    Active Today
                  </span>
                )}
              </div>
              <div className="text-2xl sm:text-3xl font-black text-[#131B2E] dark:text-white mt-0.5">
                {streakStats.currentStreak} day streak
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                {streakStats.studiedToday
                  ? "Great job! You've logged focus sessions today to extend your streak."
                  : streakStats.currentStreak > 0
                  ? "Complete at least one pomodoro today to maintain your streak!"
                  : "Start a focus timer today to begin a new study streak!"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6 border-t sm:border-t-0 sm:border-l border-amber-200 dark:border-amber-900/40 pt-3 sm:pt-0 sm:pl-6">
            <div>
              <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <Trophy className="w-3.5 h-3.5 text-amber-500" />
                Longest Streak
              </div>
              <div className="text-xl sm:text-2xl font-black text-[#131B2E] dark:text-white mt-0.5">
                {streakStats.longestStreak} {streakStats.longestStreak === 1 ? 'day' : 'days'}
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">
                In current {period}-day window
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* WEEKLY / PERIOD BAR CHART */}
      {loading ? (
        <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm animate-pulse space-y-4">
          <div className="w-48 h-5 bg-slate-200 dark:bg-slate-700 rounded" />
          <div className="w-full h-56 bg-slate-100 dark:bg-slate-800 rounded-lg" />
        </div>
      ) : (
        <BarChart data={chartData} period={period} />
      )}

      {/* COMPLETED TASKS BY SUBJECT SECTION */}
      <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-[#E2E8F0] dark:border-slate-800 p-5 sm:p-6 shadow-sm transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-[#131B2E] dark:text-white flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-[#22C55E]" />
              Completed Tasks by Subject
            </h2>
            <p className="text-xs text-[#464555] dark:text-slate-400 mt-1">
              All tasks checked off in the last {period} days grouped by their academic subject.
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 self-start sm:self-auto border border-emerald-100 dark:border-emerald-900/40">
            {summaryStats.taskCount} total completed
          </span>
        </div>

        {/* Loading Skeleton */}
        {loading ? (
          <div className="space-y-4 animate-pulse">
            <div className="h-12 bg-slate-100 dark:bg-slate-800 rounded-lg" />
            <div className="h-12 bg-slate-100 dark:bg-slate-800 rounded-lg" />
            <div className="h-12 bg-slate-100 dark:bg-slate-800 rounded-lg" />
          </div>
        ) : completedTasksBySubject.length === 0 ? (
          /* Empty State */
          <div className="text-center py-10 px-4 border border-dashed border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-800/30">
            <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 mx-auto flex items-center justify-center mb-3">
              <CheckSquare className="w-6 h-6 stroke-[1.8]" />
            </div>
            <h3 className="text-sm font-bold text-[#131B2E] dark:text-white">
              No completed tasks in this period yet.
            </h3>
            <p className="text-xs text-[#464555] dark:text-slate-400 mt-1 max-w-sm mx-auto">
              Complete tasks from your checklist on the Dashboard or Tasks screen to see them organized here.
            </p>
            <div className="mt-4">
              <Link
                to="/tasks"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#4F46E5] hover:bg-[#4338CA] text-white text-xs font-semibold shadow-xs transition-colors"
              >
                Go to Tasks
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        ) : (
          /* Grouped Task List by Subject */
          <div className="space-y-6">
            {completedTasksBySubject.map((group) => (
              <div
                key={group.id}
                className="rounded-xl border border-slate-200/90 dark:border-slate-700/80 overflow-hidden bg-slate-50/40 dark:bg-slate-800/40"
              >
                {/* Subject Header Banner */}
                <div className="px-4 py-3 bg-white dark:bg-[#1E293B] border-b border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span
                      style={{ backgroundColor: group.color }}
                      className="w-3 h-3 rounded-full shrink-0 shadow-xs"
                    />
                    <span className="font-bold text-sm text-[#131B2E] dark:text-white">
                      {group.name}
                    </span>
                  </div>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    {group.tasks.length} {group.tasks.length === 1 ? 'task' : 'tasks'}
                  </span>
                </div>

                {/* Subject Tasks List */}
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {group.tasks.map((task) => (
                    <div
                      key={task.id}
                      className="px-4 py-3 flex items-center justify-between gap-3 bg-white/70 dark:bg-[#1E293B]/70 hover:bg-slate-50/80 dark:hover:bg-slate-800/80 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <CheckCircle2 className="w-4 h-4 text-[#22C55E] shrink-0" />
                        <span className="text-xs sm:text-sm font-medium text-[#131B2E] dark:text-slate-200 truncate">
                          {task.title}
                        </span>
                      </div>
                      <div className="shrink-0 flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-[11px] sm:text-xs">
                        <CalendarDays className="w-3.5 h-3.5 text-slate-400" />
                        <span>{formatCompletionDate(task.completed_at)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
