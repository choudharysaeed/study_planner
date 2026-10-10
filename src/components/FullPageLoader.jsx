import React from 'react';
import { BookOpen } from 'lucide-react';

export default function FullPageLoader({ message = 'Securing student workspace...' }) {
  return (
    <div className="min-h-screen bg-[#FAF8FF] flex flex-col items-center justify-center p-4">
      <div className="flex flex-col items-center max-w-sm text-center">
        {/* Brand Icon with Pulsing Halo */}
        <div className="relative mb-6">
          <div className="absolute -inset-3 bg-[#4F46E5]/20 rounded-2xl blur-lg animate-pulse" />
          <div className="relative w-16 h-16 bg-gradient-to-tr from-[#3525CD] to-[#4F46E5] rounded-2xl flex items-center justify-center text-white shadow-xl shadow-[#4F46E5]/25">
            <BookOpen className="w-8 h-8 stroke-[2.2]" />
          </div>
        </div>

        {/* Spinner */}
        <div className="w-8 h-8 border-3 border-[#4F46E5]/20 border-t-[#4F46E5] rounded-full animate-spin mb-4" />

        <h3 className="text-lg font-semibold text-[#131B2E] tracking-tight">Study Planner</h3>
        <p className="text-sm text-[#464555] mt-1">{message}</p>
      </div>
    </div>
  );
}
