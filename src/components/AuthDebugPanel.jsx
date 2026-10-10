import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Bug, ChevronDown, ChevronUp } from 'lucide-react';

export default function AuthDebugPanel() {
  // Only render in development mode
  if (!import.meta.env.DEV) {
    return null;
  }

  const location = useLocation();
  const { loading, session, user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      aria-label="Auth Debug Panel"
      className="fixed bottom-4 right-4 z-50 bg-slate-900/95 text-white text-xs rounded-xl shadow-2xl border border-slate-700/80 p-3 max-w-xs font-mono backdrop-blur-md"
    >
      <div className="flex items-center justify-between gap-3 mb-1 pb-1 border-b border-slate-700">
        <div className="flex items-center gap-1.5 font-bold text-amber-400">
          <Bug className="w-3.5 h-3.5" />
          <span>[DEV] Auth Inspector</span>
        </div>
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="text-slate-400 hover:text-white p-0.5"
          title={collapsed ? 'Expand debug panel' : 'Collapse debug panel'}
        >
          {collapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {!collapsed && (
        <div className="space-y-1.5 pt-1 text-[11px]">
          <div className="flex justify-between gap-4">
            <span className="text-slate-400">loading:</span>
            <span className={loading ? 'text-amber-400 font-bold' : 'text-emerald-400 font-bold'}>
              {loading ? 'true' : 'false'}
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-slate-400">session:</span>
            <span className={session ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
              {session ? 'exists' : 'null'}
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-slate-400">user email:</span>
            <span className="text-slate-200 truncate max-w-[150px]" title={user?.email || 'None'}>
              {user?.email || 'None'}
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-slate-400">current route:</span>
            <span className="text-indigo-300 font-semibold">{location.pathname}</span>
          </div>
        </div>
      )}
    </aside>
  );
}
