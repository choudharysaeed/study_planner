import React, { useState, useEffect, useCallback } from 'react';
import { 
  Timer as TimerIcon, 
  Sparkles, 
  CheckCircle2, 
  Clock, 
  BookOpen, 
  Zap, 
  Coffee, 
  RotateCw, 
  Layers,
  Calendar
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import PomodoroTimer from '../components/PomodoroTimer';
import Toast from '../components/Toast';

export default function Timer() {
  const { user } = useAuth();

  const [incompleteTasks, setIncompleteTasks] = useState([]);
  const [recentSessions, setRecentSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Load incomplete tasks and recent sessions from Supabase
  const loadTimerData = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);

    try {
      const [tasksRes, sessionsRes] = await Promise.all([
        supabase
          .from('tasks')
          .select('id, title, subject_id, priority, is_completed')
          .eq('user_id', user.id)
          .eq('is_completed', false)
          .order('created_at', { ascending: false }),

        supabase
          .from('pomodoro_sessions')
          .select(`
            id,
            duration_minutes,
            completed_at,
            task_id,
            tasks ( title )
          `)
          .eq('user_id', user.id)
          .order('completed_at', { ascending: false })
          .limit(6)
      ]);

      if (tasksRes.error) throw tasksRes.error;
      if (sessionsRes.error) throw sessionsRes.error;

      setIncompleteTasks(tasksRes.data || []);
      setRecentSessions(sessionsRes.data || []);
    } catch (err) {
      console.error('[timer] Error loading timer data:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadTimerData();
  }, [loadTimerData, refreshKey]);

  const handleSessionSaved = () => {
    setToast({ type: 'success', message: 'Focus session recorded to your study history!' });
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6 sm:space-y-8">
      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* PAGE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#131B2E] dark:text-white tracking-tight flex items-center gap-2.5">
            Focus Timer
            <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-[#4F46E5] dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50">
              <Zap className="w-3 h-3 text-indigo-500 fill-indigo-500" />
              Deep Work
            </span>
          </h1>
          <p className="text-sm text-[#464555] dark:text-slate-400 mt-1">
            Immerse in focused study intervals with the Pomodoro technique. All sessions save automatically.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setRefreshKey((k) => k + 1)}
          title="Refresh task list"
          className="self-start sm:self-auto inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-xs transition-colors cursor-pointer"
        >
          <RotateCw className="w-3.5 h-3.5" />
          <span>Refresh Tasks</span>
        </button>
      </div>

      {/* TWO-COLUMN LAYOUT: MAIN TIMER & SIDEBAR TIPS/RECENTS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
        {/* Left Column: Focused Pomodoro Timer Card */}
        <div className="lg:col-span-7 xl:col-span-8 flex justify-center">
          <div className="w-full max-w-xl">
            <PomodoroTimer
              incompleteTasks={incompleteTasks}
              onSessionSaved={handleSessionSaved}
            />
          </div>
        </div>

        {/* Right Column: Deep Work Strategy & Recent Focus History */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-6">
          {/* Deep Work Strategy Guide Card */}
          <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-[#E2E8F0] dark:border-slate-800 p-5 sm:p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <h2 className="text-sm font-bold text-[#131B2E] dark:text-white uppercase tracking-wider">
                Pomodoro Best Practices
              </h2>
            </div>

            <div className="space-y-3.5 text-xs text-slate-600 dark:text-slate-300">
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold flex items-center justify-center shrink-0 text-[11px]">
                  1
                </span>
                <p>
                  <strong className="text-slate-900 dark:text-white">Choose one task:</strong> Select a pending task from the dropdown so your session is logged directly to it.
                </p>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-md bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 font-bold flex items-center justify-center shrink-0 text-[11px]">
                  2
                </span>
                <p>
                  <strong className="text-slate-900 dark:text-white">Single-task focus:</strong> Silence notifications, close distracting tabs, and work until the harmonic chime sounds.
                </p>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 font-bold flex items-center justify-center shrink-0 text-[11px]">
                  3
                </span>
                <p>
                  <strong className="text-slate-900 dark:text-white">Respect your breaks:</strong> Take short breaks away from your screen. After 4 completed focus rounds, enjoy a long break.
                </p>
              </div>
            </div>
          </div>

          {/* Recent Focus History Card */}
          <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-[#E2E8F0] dark:border-slate-800 p-5 sm:p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-[#131B2E] dark:text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#4F46E5]" />
                Recent Sessions
              </h2>
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                Logged to Supabase
              </span>
            </div>

            {loading ? (
              <div className="space-y-3 animate-pulse">
                <div className="h-10 bg-slate-100 dark:bg-slate-800 rounded-lg" />
                <div className="h-10 bg-slate-100 dark:bg-slate-800 rounded-lg" />
              </div>
            ) : recentSessions.length === 0 ? (
              <div className="text-center py-6 border border-dashed border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-500 dark:text-slate-400">
                No focus sessions recorded yet. Start your first session above!
              </div>
            ) : (
              <div className="space-y-2.5">
                {recentSessions.map((session) => {
                  const date = new Date(session.completed_at);
                  const timeFormatted = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  const dateFormatted = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
                  const taskTitle = session.tasks?.title || 'General Focus';

                  return (
                    <div
                      key={session.id}
                      className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="font-semibold text-slate-900 dark:text-white truncate">
                          {taskTitle}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          {dateFormatted} at {timeFormatted}
                        </div>
                      </div>
                      <span className="shrink-0 px-2 py-0.5 rounded-md font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 text-[11px]">
                        {session.duration_minutes}m
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
