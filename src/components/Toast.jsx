import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';

export default function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      onClose();
    }, 3000);
    return () => clearTimeout(timer);
  }, [toast, onClose]);

  if (!toast) return null;

  const isSuccess = toast.type === 'success';

  return (
    <div
      role="alert"
      className="fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-sm transition-all duration-300 animate-in fade-in slide-in-from-top-2 max-w-sm w-full bg-white dark:bg-[#1E293B] border-[#E2E8F0] dark:border-slate-700 text-[#131B2E] dark:text-slate-100"
    >
      <div className="shrink-0">
        {isSuccess ? (
          <CheckCircle2 className="w-5 h-5 text-[#22C55E]" />
        ) : (
          <AlertCircle className="w-5 h-5 text-[#EF4444]" />
        )}
      </div>

      <div className="flex-1 font-medium leading-snug break-words">
        {toast.message}
      </div>

      <button
        type="button"
        onClick={onClose}
        className="shrink-0 p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        aria-label="Close notification"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
