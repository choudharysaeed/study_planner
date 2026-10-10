import React, { useState } from 'react';
import { AlertTriangle, Copy, Check, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { isSupabaseConfigured } from '../lib/supabaseClient';

export default function EnvConfigBanner() {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  if (isSupabaseConfigured) {
    return null;
  }

  const sampleEnv = `# In your root .env file:
VITE_SUPABASE_URL="https://xyzcompany.supabase.co"
VITE_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."`;

  const copySample = () => {
    navigator.clipboard.writeText(sampleEnv);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-amber-500 text-slate-900 border-b border-amber-600 px-4 py-2 text-xs">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-slate-900" />
          <span className="font-semibold">Supabase Environment Setup Required:</span>
          <span>
            Set <code className="bg-amber-400/80 px-1.5 py-0.5 rounded font-mono font-bold">VITE_SUPABASE_URL</code> and <code className="bg-amber-400/80 px-1.5 py-0.5 rounded font-mono font-bold">VITE_SUPABASE_ANON_KEY</code> in <code className="font-mono font-bold">.env</code> to connect real users.
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setExpanded(!expanded)}
            className="font-semibold underline flex items-center gap-1 hover:text-black cursor-pointer"
          >
            {expanded ? 'Hide instructions' : 'View quick setup guide'}
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="max-w-7xl mx-auto mt-3 pt-3 border-t border-amber-600/40 grid grid-cols-1 md:grid-cols-2 gap-4 pb-2">
          <div className="space-y-1.5">
            <h4 className="font-bold text-slate-950">Quick Setup Instructions:</h4>
            <ol className="list-decimal list-inside space-y-1 text-slate-900/90 leading-relaxed">
              <li>Open your project at <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer" className="underline font-semibold inline-flex items-center gap-0.5">supabase.com <ExternalLink className="w-3 h-3" /></a></li>
              <li>Go to <strong>Project Settings → API</strong></li>
              <li>Copy the <strong>Project URL</strong> and <strong>Project API anon key</strong></li>
              <li>Add them to your root <code className="font-mono bg-amber-400 px-1 rounded">.env</code> file</li>
              <li>Restart dev server with <code className="font-mono bg-amber-400 px-1 rounded">npm run dev</code></li>
            </ol>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-slate-950">Sample .env format:</span>
              <button
                onClick={copySample}
                className="inline-flex items-center gap-1 text-[11px] font-semibold bg-white/80 hover:bg-white px-2 py-0.5 rounded text-slate-900 cursor-pointer"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                {copied ? 'Copied!' : 'Copy snippet'}
              </button>
            </div>
            <pre className="bg-slate-900 text-amber-300 p-2.5 rounded-lg font-mono text-[11px] overflow-x-auto">
              {sampleEnv}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
