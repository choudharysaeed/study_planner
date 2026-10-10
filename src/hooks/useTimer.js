import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Custom hook for high-precision timestamp-based timer.
 * Prevents timer drift and tab-background throttling by calculating
 * remaining time from (targetEndTime - Date.now()).
 *
 * @param {Object} options
 * @param {number} options.initialDurationMs - Initial duration in milliseconds
 * @param {Function} options.onComplete - Callback when timer hits 0
 */
export function useTimer({ initialDurationMs, onComplete }) {
  const [totalDurationMs, setTotalDurationMs] = useState(initialDurationMs);
  const [remainingMs, setRemainingMs] = useState(initialDurationMs);
  const [status, setStatus] = useState('idle'); // 'idle' | 'running' | 'paused'

  // Ref to hold the calculated target end timestamp
  const endTimeRef = useRef(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  // Keep totalDurationMs in sync if initialDurationMs changes while idle
  useEffect(() => {
    if (status === 'idle') {
      setTotalDurationMs(initialDurationMs);
      setRemainingMs(initialDurationMs);
    }
  }, [initialDurationMs, status]);

  // Main countdown effect using timestamp calculation
  useEffect(() => {
    if (status !== 'running') return;

    const tick = () => {
      if (!endTimeRef.current) return;
      const now = Date.now();
      const left = Math.max(0, endTimeRef.current - now);
      setRemainingMs(left);

      if (left <= 0) {
        setStatus('idle');
        endTimeRef.current = null;
        if (onCompleteRef.current) {
          onCompleteRef.current();
        }
      }
    };

    // Run tick immediately and set interval for smooth UI re-renders (100ms)
    tick();
    const intervalId = setInterval(tick, 100);

    return () => {
      clearInterval(intervalId);
    };
  }, [status]);

  // Handle visibility change (tab switching)
  // When user returns to tab, immediately sync remaining time from target timestamp
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && status === 'running' && endTimeRef.current) {
        const now = Date.now();
        const left = Math.max(0, endTimeRef.current - now);
        setRemainingMs(left);

        if (left <= 0) {
          setStatus('idle');
          endTimeRef.current = null;
          if (onCompleteRef.current) {
            onCompleteRef.current();
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [status]);

  // Start timer
  const start = useCallback(() => {
    const end = Date.now() + remainingMs;
    endTimeRef.current = end;
    setStatus('running');
  }, [remainingMs]);

  // Pause timer (preserves remaining milliseconds)
  const pause = useCallback(() => {
    if (endTimeRef.current) {
      const left = Math.max(0, endTimeRef.current - Date.now());
      setRemainingMs(left);
    }
    endTimeRef.current = null;
    setStatus('paused');
  }, []);

  // Resume timer from paused remaining time
  const resume = useCallback(() => {
    endTimeRef.current = Date.now() + remainingMs;
    setStatus('running');
  }, [remainingMs]);

  // Reset timer back to current full duration
  const reset = useCallback((newDurationMs) => {
    endTimeRef.current = null;
    setStatus('idle');
    const nextTotal = typeof newDurationMs === 'number' ? newDurationMs : totalDurationMs;
    setTotalDurationMs(nextTotal);
    setRemainingMs(nextTotal);
  }, [totalDurationMs]);

  // Explicitly set duration (only effective when idle)
  const setDuration = useCallback((newDurationMs) => {
    if (status !== 'idle') return;
    setTotalDurationMs(newDurationMs);
    setRemainingMs(newDurationMs);
  }, [status]);

  return {
    status,
    isRunning: status === 'running',
    isPaused: status === 'paused',
    isIdle: status === 'idle',
    remainingMs,
    totalDurationMs,
    start,
    pause,
    resume,
    reset,
    setDuration,
  };
}
