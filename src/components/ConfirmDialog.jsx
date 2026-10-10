import React, { useEffect, useRef } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';

export default function ConfirmDialog({
  isOpen,
  title = 'Confirm Action',
  message,
  confirmText = 'Delete',
  cancelText = 'Cancel',
  onConfirm,
  onClose,
  isLoading = false,
  danger = true,
}) {
  const dialogRef = useRef(null);
  const cancelBtnRef = useRef(null);

  // Close on Escape and handle focus trap
  useEffect(() => {
    if (!isOpen) return;

    // Focus cancel button on open for safety
    const focusTimer = setTimeout(() => {
      cancelBtnRef.current?.focus();
    }, 50);

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isLoading) {
        onClose();
      }

      if (e.key === 'Tab' && dialogRef.current) {
        const focusableElements = dialogRef.current.querySelectorAll(
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
    return () => {
      clearTimeout(focusTimer);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, isLoading, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoading) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-description"
        className="bg-white dark:bg-[#1E293B] rounded-2xl border border-[#E2E8F0] dark:border-slate-800 p-6 max-w-md w-full shadow-2xl transition-colors transform animate-in zoom-in-95 duration-200"
      >
        <div className="flex items-start gap-4">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              danger
                ? 'bg-red-50 dark:bg-red-950/60 text-[#EF4444]'
                : 'bg-amber-50 dark:bg-amber-950/60 text-amber-500'
            }`}
          >
            <AlertTriangle className="w-5 h-5" />
          </div>

          <div className="flex-1 min-w-0">
            <h3
              id="confirm-dialog-title"
              className="text-base sm:text-lg font-bold text-[#131B2E] dark:text-white"
            >
              {title}
            </h3>
            <p
              id="confirm-dialog-description"
              className="text-xs sm:text-sm text-[#464555] dark:text-slate-300 mt-1.5 leading-relaxed"
            >
              {message}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 mt-6 pt-2">
          <button
            ref={cancelBtnRef}
            type="button"
            disabled={isLoading}
            onClick={onClose}
            className="min-h-[44px] px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-[#131B2E] dark:hover:text-white text-xs sm:text-sm font-semibold transition-all focus-visible:ring-2 focus-visible:ring-[#4F46E5] focus-visible:ring-offset-2 disabled:opacity-50 cursor-pointer"
          >
            {cancelText}
          </button>

          <button
            type="button"
            disabled={isLoading}
            onClick={onConfirm}
            className={`min-h-[44px] px-5 py-2.5 rounded-xl text-white text-xs sm:text-sm font-semibold transition-all shadow-md flex items-center justify-center gap-2 focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 cursor-pointer ${
              danger
                ? 'bg-[#EF4444] hover:bg-red-600 focus-visible:ring-[#EF4444] shadow-red-500/20'
                : 'bg-[#4F46E5] hover:bg-[#4338CA] focus-visible:ring-[#4F46E5] shadow-[#4F46E5]/20'
            }`}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <span>{confirmText}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
