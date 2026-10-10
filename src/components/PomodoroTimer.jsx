import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  SkipForward, 
  CheckCircle2, 
  Clock, 
  Coffee, 
  Sparkles, 
  Bell, 
  BellOff, 
  Sliders, 
  ChevronDown, 
  AlertCircle, 
  RefreshCw,
  Volume2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { useTimer } from '../hooks/useTimer';

// Mode configurations
const MODES = {
  focus: {
    id: 'focus',
    label: 'Focus',
    color: '#4F46E5', // Indigo
    ringColorClass: 'stroke-[#4F46E5]',
    badgeBg: 'bg-indigo-50 dark:bg-indigo-950/60 text-[#4F46E5] dark:text-indigo-400 border-indigo-200 dark:border-indigo-800',
    icon: Clock,
    defaultMinutes: 25,
    presets: [15, 25, 45, 60],
  },
  shortBreak: {
    id: 'shortBreak',
    label: 'Short Break',
    color: '#14B8A6', // Teal
    ringColorClass: 'stroke-[#14B8A6]',
    badgeBg: 'bg-teal-50 dark:bg-teal-950/60 text-[#14B8A6] dark:text-teal-400 border-teal-200 dark:border-teal-800',
    icon: Coffee,
    defaultMinutes: 5,
    presets: [5, 10, 15],
  },
  longBreak: {
    id: 'longBreak',
    label: 'Long Break',
    color: '#22C55E', // Success Green
    ringColorClass: 'stroke-[#22C55E]',
    badgeBg: 'bg-emerald-50 dark:bg-emerald-950/60 text-[#22C55E] dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
    icon: Sparkles,
    defaultMinutes: 15,
    presets: [15, 20, 30],
  },
};

/**
 * Synthesizes a clean, pleasant melodic 2-tone chime using Web Audio API.
 * Does not depend on external mp3 files or network assets.
 */
function playChimeSound() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const now = ctx.currentTime;

    // First Tone: D5 (587.33 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now);
    gain1.gain.setValueAtTime(0.25, now);
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.6);

    // Second Tone: A5 (880.00 Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880.0, now + 0.22);
    gain2.gain.setValueAtTime(0.3, now + 0.22);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.95);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.22);
    osc2.stop(now + 0.95);
  } catch (err) {
    console.warn('[PomodoroTimer] Web Audio chime could not play:', err);
  }
}

/**
 * Format milliseconds into MM:SS format.
 */
function formatTime(ms) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export default function PomodoroTimer({ 
  onSessionSaved, 
  incompleteTasks: propTasks = [] 
}) {
  const { user } = useAuth();

  // Mode and duration settings
  const [mode, setMode] = useState('focus');
  const [focusMinutes, setFocusMinutes] = useState(25);
  const [shortBreakMinutes, setShortBreakMinutes] = useState(5);
  const [longBreakMinutes, setLongBreakMinutes] = useState(15);
  const [customInput, setCustomInput] = useState('');
  const [customInputError, setCustomInputError] = useState('');
  const [showSettings, setShowSettings] = useState(false);

  // Cycle tracking: completed focus sessions in current cycle (0-4)
  const [completedFocusCount, setCompletedFocusCount] = useState(0);

  // Auto-start breaks toggle
  const [autoStartBreaks, setAutoStartBreaks] = useState(() => {
    return localStorage.getItem('study_planner_autostart_breaks') === 'true';
  });

  // Task linking
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [availableTasks, setAvailableTasks] = useState(propTasks);

  // Notification permissions
  const [notificationPermission, setNotificationPermission] = useState(() => {
    return typeof window !== 'undefined' && 'Notification' in window 
      ? Notification.permission 
      : 'unsupported';
  });

  // UI Feedback / Alerts
  const [timerAlert, setTimerAlert] = useState(null); // { type: 'success' | 'error', message: '' }
  const [failedSessionData, setFailedSessionData] = useState(null);
  const [isRetryingSave, setIsRetryingSave] = useState(false);

  // Screen-reader polite accessibility announcement (updated every 10s or on mode change)
  const [ariaAnnouncement, setAriaAnnouncement] = useState('Pomodoro timer ready. 25 minutes.');

  // Current active mode duration in milliseconds
  const currentDurationMs = useMemo(() => {
    if (mode === 'focus') return focusMinutes * 60 * 1000;
    if (mode === 'shortBreak') return shortBreakMinutes * 60 * 1000;
    return longBreakMinutes * 60 * 1000;
  }, [mode, focusMinutes, shortBreakMinutes, longBreakMinutes]);

  // Forward declaration ref for mode transition
  const handleSessionCompleteRef = useRef(null);

  // Precision countdown timer engine
  const {
    status,
    isRunning,
    isPaused,
    isIdle,
    remainingMs,
    totalDurationMs,
    start,
    pause,
    resume,
    reset,
    setDuration,
  } = useTimer({
    initialDurationMs: currentDurationMs,
    onComplete: () => {
      if (handleSessionCompleteRef.current) {
        handleSessionCompleteRef.current();
      }
    },
  });

  // Save auto-start preference
  const toggleAutoStartBreaks = () => {
    setAutoStartBreaks((prev) => {
      const next = !prev;
      localStorage.setItem('study_planner_autostart_breaks', String(next));
      return next;
    });
  };

  // Sync available tasks: use propTasks or query Supabase directly
  useEffect(() => {
    if (propTasks && propTasks.length > 0) {
      setAvailableTasks(propTasks);
    } else if (user?.id) {
      // Query incomplete tasks from Supabase
      supabase
        .from('tasks')
        .select('id, title, priority, due_date')
        .eq('user_id', user.id)
        .eq('is_completed', false)
        .order('due_date', { ascending: true })
        .then(({ data, error }) => {
          if (!error && data) {
            setAvailableTasks(data);
          }
        });
    }
  }, [propTasks, user?.id]);

  // Persist completed focus session to Supabase
  const saveSessionToSupabase = useCallback(async (sessionDuration) => {
    if (!user?.id) {
      console.warn('[stats] Cannot save session: user is not authenticated');
      return;
    }

    const taskId = selectedTaskId || null;
    const durationNum = Number(sessionDuration);
    const completedAtISO = new Date().toISOString();

    console.log('[stats] Preparing pomodoro session insert:', {
      user_id: user.id,
      task_id: taskId,
      duration_minutes: durationNum,
      completed_at: completedAtISO,
    });

    try {
      /**
       * Supabase Query:
       * Inserts a completed Pomodoro session into the pomodoro_sessions table.
       * Includes user_id (RLS compliance), linked task_id (if assigned),
       * duration_minutes (actual session length as a Number), and completed_at timestamp.
       */
      const { data, error } = await supabase
        .from('pomodoro_sessions')
        .insert({
          user_id: user.id,
          task_id: taskId,
          duration_minutes: durationNum,
          completed_at: completedAtISO,
        });

      console.log('[stats] Session insert result:', { data, error });

      if (error) {
        console.error('[stats] Error inserting pomodoro session:', error);
        // Retain failed session data in state for retry
        setFailedSessionData({
          user_id: user.id,
          task_id: taskId,
          duration_minutes: durationNum,
          completed_at: completedAtISO,
        });
        setTimerAlert({
          type: 'error',
          message: `Failed to save session: ${error.message || 'Database error'}`,
        });
        return;
      }

      setFailedSessionData(null);
      setTimerAlert({
        type: 'success',
        message: 'Pomodoro session recorded successfully!',
      });

      // Refresh Dashboard summary cards
      if (typeof onSessionSaved === 'function') {
        console.log('[stats] Calling onSessionSaved callback from PomodoroTimer');
        onSessionSaved();
      } else {
        console.warn('[stats] onSessionSaved prop is not a function:', onSessionSaved);
      }
    } catch (err) {
      console.error('[stats] Exception inserting session:', err);
      // Retain failed session data in state for retry
      setFailedSessionData({
        user_id: user.id,
        task_id: taskId,
        duration_minutes: durationNum,
        completed_at: completedAtISO,
      });
      setTimerAlert({
        type: 'error',
        message: `Failed to save session: ${err.message || 'Network error'}`,
      });
    }
  }, [user?.id, selectedTaskId, onSessionSaved]);

  // Manual retry handler if initial insert failed
  const handleRetrySave = async () => {
    if (!failedSessionData) return;
    setIsRetryingSave(true);
    console.log('[stats] Retrying pomodoro session insert:', failedSessionData);
    try {
      const { data, error } = await supabase
        .from('pomodoro_sessions')
        .insert({
          user_id: failedSessionData.user_id,
          task_id: failedSessionData.task_id || null,
          duration_minutes: Number(failedSessionData.duration_minutes),
          completed_at: failedSessionData.completed_at || new Date().toISOString(),
        });

      console.log('[stats] Retry session insert result:', { data, error });

      if (error) throw error;

      setFailedSessionData(null);
      setTimerAlert({
        type: 'success',
        message: 'Session saved successfully on retry!',
      });
      if (typeof onSessionSaved === 'function') {
        console.log('[stats] Calling onSessionSaved after retry');
        onSessionSaved();
      }
    } catch (err) {
      console.error('[stats] Retry save failed:', err);
      setTimerAlert({
        type: 'error',
        message: `Retry failed: ${err.message || 'Database error'}`,
      });
    } finally {
      setIsRetryingSave(false);
    }
  };

  // Request browser Notification permission
  const handleRequestNotificationPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const result = await Notification.requestPermission();
        setNotificationPermission(result);
        if (result === 'granted') {
          setTimerAlert({
            type: 'success',
            message: 'Browser notifications enabled for session alerts.',
          });
        }
      } catch (err) {
        console.warn('Could not request notification permission:', err);
      }
    }
  };

  // Send desktop notification if permission is granted
  const triggerBrowserNotification = (title, body) => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        try {
          new Notification(title, {
            body,
            icon: '/favicon.ico',
          });
        } catch (e) {
          console.warn('Desktop notification dispatch failed:', e);
        }
      }
    }
  };

  // Completion logic when timer hits 0
  const handleSessionComplete = useCallback(async () => {
    // 1. Play Web Audio chime
    playChimeSound();

    if (mode === 'focus') {
      // Completed Focus Session
      triggerBrowserNotification(
        'Focus Session Completed! 🍅',
        'Outstanding work! Take a break and recharge.'
      );

      // Save to Supabase and await before advancing or notifying
      await saveSessionToSupabase(focusMinutes);

      const nextFocusCount = completedFocusCount + 1;
      setCompletedFocusCount(nextFocusCount);

      // Determine next mode: Long break after 4 focus intervals
      if (nextFocusCount % 4 === 0) {
        setMode('longBreak');
        const nextDuration = longBreakMinutes * 60 * 1000;
        reset(nextDuration);
        if (autoStartBreaks) {
          setTimeout(() => start(), 300);
        }
      } else {
        setMode('shortBreak');
        const nextDuration = shortBreakMinutes * 60 * 1000;
        reset(nextDuration);
        if (autoStartBreaks) {
          setTimeout(() => start(), 300);
        }
      }
    } else {
      // Completed Break Session (short or long)
      triggerBrowserNotification(
        'Break is Over! ⚡',
        'Ready to start your next study interval?'
      );

      setTimerAlert({
        type: 'success',
        message: `${MODES[mode].label} ended. Ready for the next focus sprint!`,
      });

      // Switch back to Focus mode
      setMode('focus');
      const nextDuration = focusMinutes * 60 * 1000;
      reset(nextDuration);

      // If finished long break, reset cycle count
      if (mode === 'longBreak') {
        setCompletedFocusCount(0);
      }

      if (autoStartBreaks) {
        setTimeout(() => start(), 300);
      }
    }
  }, [
    mode, 
    focusMinutes, 
    shortBreakMinutes, 
    longBreakMinutes, 
    completedFocusCount, 
    autoStartBreaks, 
    reset, 
    start, 
    saveSessionToSupabase
  ]);

  handleSessionCompleteRef.current = handleSessionComplete;

  // Change modes manually
  const handleSwitchMode = (nextModeId) => {
    if (!isIdle) {
      // Reset timer if running or paused before changing mode
      reset(MODES[nextModeId].defaultMinutes * 60 * 1000);
    }
    setMode(nextModeId);
    let mins = focusMinutes;
    if (nextModeId === 'shortBreak') mins = shortBreakMinutes;
    if (nextModeId === 'longBreak') mins = longBreakMinutes;
    reset(mins * 60 * 1000);
  };

  // Skip current mode to next mode
  const handleSkipMode = () => {
    if (mode === 'focus') {
      const nextCount = completedFocusCount + 1;
      setCompletedFocusCount(nextCount);
      const nextMode = nextCount % 4 === 0 ? 'longBreak' : 'shortBreak';
      handleSwitchMode(nextMode);
    } else {
      handleSwitchMode('focus');
    }
  };

  // Change focus duration preset
  const handleSelectPreset = (mins) => {
    if (!isIdle) return;
    setCustomInput('');
    setCustomInputError('');
    if (mode === 'focus') {
      setFocusMinutes(mins);
      reset(mins * 60 * 1000);
    } else if (mode === 'shortBreak') {
      setShortBreakMinutes(mins);
      reset(mins * 60 * 1000);
    } else {
      setLongBreakMinutes(mins);
      reset(mins * 60 * 1000);
    }
  };

  // Handle custom minutes input submission
  const handleApplyCustomMinutes = (e) => {
    e.preventDefault();
    if (!isIdle) return;
    const val = parseInt(customInput, 10);
    if (isNaN(val) || val < 1 || val > 180) {
      setCustomInputError('Please enter minutes between 1 and 180.');
      return;
    }
    setCustomInputError('');
    if (mode === 'focus') {
      setFocusMinutes(val);
      reset(val * 60 * 1000);
    } else if (mode === 'shortBreak') {
      setShortBreakMinutes(val);
      reset(val * 60 * 1000);
    } else {
      setLongBreakMinutes(val);
      reset(val * 60 * 1000);
    }
    setShowSettings(false);
  };

  // Update browser tab title while running
  useEffect(() => {
    if (isRunning) {
      const timeStr = formatTime(remainingMs);
      const modeLabel = MODES[mode].label;
      document.title = `${timeStr} · ${modeLabel}`;
    } else {
      document.title = 'Study Planner - Student Academic Workspace';
    }

    return () => {
      document.title = 'Study Planner - Student Academic Workspace';
    };
  }, [isRunning, remainingMs, mode]);

  // Update screen-reader live region only every 10 seconds or when mode changes (WCAG compliance)
  useEffect(() => {
    const totalSecs = Math.ceil(remainingMs / 1000);
    if (totalSecs % 10 === 0 || totalSecs === 0 || isIdle) {
      const mins = Math.floor(totalSecs / 60);
      const secs = totalSecs % 60;
      setAriaAnnouncement(
        `${MODES[mode].label}: ${mins} minutes ${secs} seconds remaining.`
      );
    }
  }, [remainingMs, mode, isIdle]);

  // Calculate SVG circular progress ring geometry
  // Size: 260px, center: 130px, radius: 105px
  const size = 260;
  const strokeWidth = 10;
  const center = size / 2;
  const radius = 105;
  const circumference = 2 * Math.PI * radius; // ≈ 659.734

  // The ring empties CLOCKWISE, starting from 12 o'clock (the top), as time passes
  // At 100% time left: progress = 1, strokeDashoffset = 0 (completely full)
  // As time decreases to 0%: strokeDashoffset reaches -circumference (completely empty)
  // Because transform="rotate(-90)", negative offset shifts the dash pattern forward clockwise,
  // making the empty gap open from 12 o'clock and progress clockwise!
  const progressRatio = totalDurationMs > 0 ? remainingMs / totalDurationMs : 0;
  const clampedProgress = Math.max(0, Math.min(1, progressRatio));
  const strokeDashoffset = -circumference * (1 - clampedProgress);

  // Selected task metadata lookup
  const selectedTaskObj = useMemo(() => {
    return availableTasks.find((t) => t.id === selectedTaskId);
  }, [availableTasks, selectedTaskId]);

  // Session cycle display (1 to 4)
  const currentCycleNumber = (completedFocusCount % 4) + 1;
  const isSuggestingLongBreak = completedFocusCount > 0 && completedFocusCount % 4 === 0 && mode === 'longBreak';

  return (
    <div 
      className="bg-white dark:bg-[#1E293B] rounded-2xl border border-[#E2E8F0] dark:border-slate-800 p-5 sm:p-6 shadow-sm transition-colors relative"
      aria-label="Pomodoro Study Timer"
    >
      {/* Screen reader live updates (polite: announced every 10s, not every second) */}
      <div className="sr-only" aria-live="polite">
        {ariaAnnouncement}
      </div>

      {/* Card Header: Title & Quick Settings Button */}
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <div 
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors shadow-sm"
            style={{ 
              backgroundColor: `${MODES[mode].color}15`, 
              color: MODES[mode].color 
            }}
          >
            {React.createElement(MODES[mode].icon, { className: 'w-4 h-4' })}
          </div>
          <div>
            <h2 className="text-base font-bold text-[#131B2E] dark:text-white leading-tight">
              Study Timer
            </h2>
            <p className="text-[11px] text-[#777587] dark:text-slate-400 font-medium">
              Interval rhythm & focus engine
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Audio test/active indicator */}
          <div 
            title="Audio chime enabled on completion" 
            className="p-1.5 rounded-lg text-slate-400 dark:text-slate-500"
          >
            <Volume2 className="w-4 h-4" />
          </div>

          {/* Browser Notification Permission Toggle */}
          {notificationPermission !== 'granted' && (
            <button
              type="button"
              onClick={handleRequestNotificationPermission}
              className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="Enable browser notifications"
              title="Enable browser alerts"
            >
              <Bell className="w-4 h-4" />
            </button>
          )}

          {/* Settings panel toggle */}
          <button
            type="button"
            onClick={() => setShowSettings((prev) => !prev)}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              showSettings 
                ? 'bg-[#4F46E5]/10 text-[#4F46E5] dark:text-indigo-400' 
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            aria-label="Toggle timer settings"
            title="Timer Settings"
          >
            <Sliders className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Mode Navigation Tabs */}
      <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-900 mb-5">
        {Object.values(MODES).map((m) => {
          const isActive = mode === m.id;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => handleSwitchMode(m.id)}
              className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer text-center truncate ${
                isActive
                  ? 'bg-white dark:bg-[#1E293B] text-[#131B2E] dark:text-white shadow-sm'
                  : 'text-[#777587] dark:text-slate-400 hover:text-[#131B2E] dark:hover:text-white'
              }`}
              aria-label={`Switch to ${m.label} mode`}
            >
              {m.label}
            </button>
          );
        })}
      </div>

      {/* Cycle Session Counter & Long Break Suggestion */}
      <div className="flex items-center justify-between px-1 mb-2">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold text-[#464555] dark:text-slate-300">
            Session {currentCycleNumber} of 4
          </span>
          <div className="flex items-center gap-1 ml-1">
            {[1, 2, 3, 4].map((step) => {
              const filled = step <= (completedFocusCount % 4);
              return (
                <span
                  key={step}
                  className={`w-2 h-2 rounded-full transition-all ${
                    filled
                      ? 'bg-[#4F46E5] scale-110'
                      : 'bg-slate-200 dark:bg-slate-700'
                  }`}
                />
              );
            })}
          </div>
        </div>

        {/* Mode Status Pill */}
        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${MODES[mode].badgeBg}`}>
          {MODES[mode].label}
        </span>
      </div>

      {/* Suggestion banner after 4 focus sessions */}
      {isSuggestingLongBreak && (
        <div className="mb-4 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
          <Sparkles className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <p className="font-medium">
            Awesome streak! You completed 4 focus cycles. Enjoy this 15-min Long Break!
          </p>
        </div>
      )}

      {/* Circular Progress Ring with Center Display */}
      <div className="relative flex items-center justify-center my-3">
        <svg 
          width={size} 
          height={size} 
          viewBox={`0 0 ${size} ${size}`} 
          className="max-w-full drop-shadow-sm"
        >
          {/* Background Track Circle */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-slate-100 dark:text-slate-800/80 transition-colors"
          />

          {/* Animated Progress Ring (Empties clockwise starting from 12 o'clock) */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={MODES[mode].color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            transform={`rotate(-90 ${center} ${center})`}
            style={{
              transition: isRunning ? 'stroke-dashoffset 0.25s linear' : 'stroke-dashoffset 0.3s ease',
            }}
          />
        </svg>

        {/* Center Time Display */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
          {/* Large Time in MM:SS */}
          <span 
            className="text-4xl sm:text-5xl font-extrabold tracking-tight font-mono text-[#131B2E] dark:text-white"
            aria-hidden="true"
          >
            {formatTime(remainingMs)}
          </span>

          {/* Status Label */}
          <span className="text-xs font-semibold text-[#777587] dark:text-slate-400 mt-1 uppercase tracking-wider">
            {isRunning ? 'Running' : isPaused ? 'Paused' : 'Ready'}
          </span>
        </div>
      </div>

      {/* Optional Linked Task Display (Below Circle) */}
      <div className="mt-2 mb-4 text-center px-2">
        {selectedTaskObj ? (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-medium text-[#131B2E] dark:text-white max-w-full truncate">
            <span className="w-2 h-2 rounded-full bg-[#4F46E5] shrink-0" />
            <span className="text-[#777587] dark:text-slate-400 font-normal">Task:</span>
            <span className="truncate">{selectedTaskObj.title}</span>
          </div>
        ) : (
          <p className="text-[11px] text-[#777587] dark:text-slate-500 italic">
            General focus session (no task linked)
          </p>
        )}
      </div>

      {/* Main Controls: Start/Pause/Resume, Reset, Skip */}
      <div className="flex items-center justify-center gap-3 mb-4">
        {/* Reset Button */}
        <button
          type="button"
          onClick={() => reset()}
          className="min-h-[44px] min-w-[44px] p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-[#131B2E] dark:hover:text-white transition-all shadow-sm flex items-center justify-center focus-visible:ring-2 focus-visible:ring-[#4F46E5] focus-visible:ring-offset-2 cursor-pointer"
          aria-label="Reset timer to beginning"
          title="Reset timer"
        >
          <RotateCcw className="w-5 h-5" />
        </button>

        {/* Primary Action Button (Start / Pause / Resume) */}
        {isIdle && (
          <button
            type="button"
            onClick={start}
            className="min-h-[44px] flex-1 max-w-[160px] py-2.5 px-5 rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] text-white font-semibold text-sm shadow-md shadow-[#4F46E5]/25 hover:shadow-lg transition-all flex items-center justify-center gap-2 focus-visible:ring-2 focus-visible:ring-[#4F46E5] focus-visible:ring-offset-2 cursor-pointer"
            aria-label={`Start ${MODES[mode].label} timer`}
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Start</span>
          </button>
        )}

        {isRunning && (
          <button
            type="button"
            onClick={pause}
            className="min-h-[44px] flex-1 max-w-[160px] py-2.5 px-5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold text-sm shadow-md shadow-amber-500/25 hover:shadow-lg transition-all flex items-center justify-center gap-2 focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 cursor-pointer"
            aria-label="Pause timer"
          >
            <Pause className="w-4 h-4 fill-current" />
            <span>Pause</span>
          </button>
        )}

        {isPaused && (
          <button
            type="button"
            onClick={resume}
            className="min-h-[44px] flex-1 max-w-[160px] py-2.5 px-5 rounded-xl bg-[#22C55E] hover:bg-emerald-600 text-white font-semibold text-sm shadow-md shadow-[#22C55E]/25 hover:shadow-lg transition-all flex items-center justify-center gap-2 focus-visible:ring-2 focus-visible:ring-[#22C55E] focus-visible:ring-offset-2 cursor-pointer"
            aria-label="Resume timer"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Resume</span>
          </button>
        )}

        {/* Skip to Next Mode Button */}
        <button
          type="button"
          onClick={handleSkipMode}
          className="min-h-[44px] min-w-[44px] p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-[#131B2E] dark:hover:text-white transition-all shadow-sm flex items-center justify-center focus-visible:ring-2 focus-visible:ring-[#4F46E5] focus-visible:ring-offset-2 cursor-pointer"
          aria-label="Skip to next session mode"
          title="Skip session"
        >
          <SkipForward className="w-5 h-5" />
        </button>
      </div>

      {/* Preset Duration Buttons (Only editable when timer is idle) */}
      <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="font-semibold text-[#464555] dark:text-slate-300">
            {MODES[mode].label} Presets
          </span>
          {!isIdle && (
            <span className="text-[11px] text-slate-400 dark:text-slate-500 italic">
              Locked while timer runs
            </span>
          )}
        </div>

        <div className="grid grid-cols-4 gap-1.5">
          {MODES[mode].presets.map((mins) => {
            const currentActiveMins = 
              mode === 'focus' ? focusMinutes :
              mode === 'shortBreak' ? shortBreakMinutes : longBreakMinutes;
            const isPresetActive = currentActiveMins === mins;

            return (
              <button
                key={mins}
                type="button"
                disabled={!isIdle}
                onClick={() => handleSelectPreset(mins)}
                className={`py-1.5 rounded-lg text-xs font-semibold transition-all min-h-[36px] flex items-center justify-center cursor-pointer ${
                  isPresetActive
                    ? 'bg-[#4F46E5] text-white shadow-sm'
                    : 'bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/60'
                } disabled:opacity-40 disabled:cursor-not-allowed`}
                aria-label={`Set duration to ${mins} minutes`}
              >
                {mins}m
              </button>
            );
          })}
        </div>
      </div>

      {/* Task Link Dropdown (Optional task association) */}
      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
        <label 
          htmlFor="linkedTaskSelect"
          className="block text-xs font-semibold text-[#464555] dark:text-slate-300 mb-1.5"
        >
          Link to Task (Optional)
        </label>
        <div className="relative">
          <select
            id="linkedTaskSelect"
            value={selectedTaskId}
            onChange={(e) => setSelectedTaskId(e.target.value)}
            className="w-full pl-3 pr-8 py-2 bg-slate-50 dark:bg-slate-900 border border-[#CBD5E1] dark:border-slate-700 rounded-xl text-xs text-[#131B2E] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5] appearance-none"
          >
            <option value="">No linked task (General focus)</option>
            {availableTasks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </select>
          <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* Collapsible Settings Drawer (Custom Minutes, Auto-start Breaks, Notifications) */}
      {showSettings && (
        <div className="mt-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-4 animate-in fade-in duration-150">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
            <span className="text-xs font-bold text-[#131B2E] dark:text-white uppercase tracking-wider">
              Timer Preferences
            </span>
            <button
              type="button"
              onClick={() => setShowSettings(false)}
              className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-medium"
            >
              Done
            </button>
          </div>

          {/* Custom Duration Input Form */}
          <div>
            <label className="block text-xs font-semibold text-[#131B2E] dark:text-slate-300 mb-1">
              Custom Duration for {MODES[mode].label} (1 - 180 min)
            </label>
            <form onSubmit={handleApplyCustomMinutes} className="flex gap-2">
              <input
                type="number"
                min="1"
                max="180"
                disabled={!isIdle}
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                placeholder="e.g. 50"
                className="flex-1 px-3 py-1.5 bg-white dark:bg-slate-900 border border-[#CBD5E1] dark:border-slate-700 rounded-lg text-xs text-[#131B2E] dark:text-white focus:outline-none focus:border-[#4F46E5] disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!isIdle || !customInput}
                className="px-3 py-1.5 rounded-lg bg-[#4F46E5] text-white text-xs font-semibold hover:bg-[#4338CA] transition-colors disabled:opacity-50 cursor-pointer"
              >
                Apply
              </button>
            </form>
            {customInputError && (
              <p className="text-[11px] text-red-600 dark:text-red-400 mt-1">
                {customInputError}
              </p>
            )}
            {!isIdle && (
              <p className="text-[10px] text-slate-400 mt-1">
                Stop or reset timer to adjust custom duration.
              </p>
            )}
          </div>

          {/* Auto-start breaks toggle */}
          <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-200 dark:border-slate-700">
            <div>
              <p className="text-xs font-semibold text-[#131B2E] dark:text-slate-200">
                Auto-start breaks
              </p>
              <p className="text-[10px] text-[#777587] dark:text-slate-400">
                Automatically start the break countdown when a session ends
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={autoStartBreaks}
                onChange={toggleAutoStartBreaks}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#4F46E5]"></div>
            </label>
          </div>

          {/* Desktop Notification Setting */}
          <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-200 dark:border-slate-700">
            <div>
              <p className="text-xs font-semibold text-[#131B2E] dark:text-slate-200">
                Desktop notifications
              </p>
              <p className="text-[10px] text-[#777587] dark:text-slate-400">
                {notificationPermission === 'granted'
                  ? 'Notifications active for background alerts'
                  : 'Receive system alerts when tab is in background'}
              </p>
            </div>
            {notificationPermission === 'granted' ? (
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950">
                Active
              </span>
            ) : (
              <button
                type="button"
                onClick={handleRequestNotificationPermission}
                className="px-2.5 py-1 rounded bg-[#4F46E5] text-white text-xs font-medium hover:bg-[#4338CA] transition-colors cursor-pointer"
              >
                Allow
              </button>
            )}
          </div>
        </div>
      )}

      {/* Retry Banner if Supabase Save Failed */}
      {failedSessionData && (
        <div className="mt-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-900 dark:text-red-200 text-xs flex items-center justify-between gap-2 animate-in fade-in">
          <div className="flex items-center gap-2 min-w-0">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span className="truncate">Session save failed. Data preserved.</span>
          </div>
          <button
            type="button"
            disabled={isRetryingSave}
            onClick={handleRetrySave}
            className="px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold text-xs transition-colors shrink-0 flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw className={`w-3 h-3 ${isRetryingSave ? 'animate-spin' : ''}`} />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* Internal Alert Message */}
      {timerAlert && (
        <div 
          className={`mt-4 p-2.5 rounded-xl border text-xs flex items-center justify-between gap-2 animate-in fade-in ${
            timerAlert.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
              : 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {timerAlert.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{timerAlert.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setTimerAlert(null)}
            className="text-[11px] font-bold opacity-60 hover:opacity-100"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
