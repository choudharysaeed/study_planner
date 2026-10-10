import React from 'react';
import { AlertTriangle, KeyRound } from 'lucide-react';

export default function MissingEnvPage() {
  const sampleEnv = `# Required in your root .env file:
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`;

  return (
    <div className="min-h-screen bg-[#FAF8FF] flex items-center justify-center p-6 text-[#131B2E]">
      <div className="max-w-lg w-full bg-white rounded-2xl border border-red-200 shadow-xl p-8">
        <div className="w-14 h-14 mx-auto mb-6 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center shadow-md">
          <AlertTriangle className="w-7 h-7" />
        </div>

        <h1 className="text-2xl font-bold text-center text-[#131B2E] tracking-tight">
          Supabase Credentials Missing
        </h1>
        <p className="text-sm text-[#464555] text-center mt-2 mb-6">
          The Study Planner application requires real Supabase credentials to securely authenticate users and maintain sessions.
        </p>

        <div className="p-4 rounded-xl bg-slate-900 text-slate-100 font-mono text-xs space-y-2 mb-6">
          <div className="flex items-center gap-2 text-amber-400 font-bold border-b border-slate-800 pb-2">
            <KeyRound className="w-4 h-4" />
            <span>Missing Environment Variables:</span>
          </div>
          <pre className="overflow-x-auto text-[11px] text-emerald-400">{sampleEnv}</pre>
        </div>

        <div className="text-xs text-[#464555] space-y-2">
          <p className="font-semibold text-[#131B2E]">How to resolve:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Open your Supabase project dashboard at <strong>supabase.com</strong></li>
            <li>Go to <strong>Project Settings → API</strong></li>
            <li>Copy your <strong>Project URL</strong> and <strong>anon public API key</strong></li>
            <li>Add them to your root <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">.env</code> file</li>
            <li>Restart the development server with <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">npm run dev</code></li>
          </ol>
        </div>
      </div>
    </div>
  );
}
