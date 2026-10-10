import React, { useState } from 'react';
import { Calendar, Info } from 'lucide-react';

/**
 * BarChart component for Pomodoro focus sessions per day.
 * Renders pure React + Tailwind SVG / flex bars with height scaled to max.
 * Accessible with tab focus, aria-labels, interactive tooltips, and horizontal scrolling for 30-day views.
 */
export default function BarChart({ data = [], period = 7 }) {
  const [hoveredIndex, setHoveredIndex] = useState(null);

  const maxCount = Math.max(...data.map((d) => d.count), 0);
  const allZero = maxCount === 0;

  // Grid line values
  const yAxisMax = allZero ? 4 : Math.max(maxCount, 3);
  const yTicks = [
    yAxisMax,
    Math.round(yAxisMax * 0.66),
    Math.round(yAxisMax * 0.33),
    0
  ];
  // Remove duplicates in yTicks
  const uniqueYTicks = [...new Set(yTicks)];

  return (
    <div className="bg-white dark:bg-[#1E293B] rounded-xl border border-[#E2E8F0] dark:border-slate-800 p-5 sm:p-6 shadow-sm transition-colors">
      {/* Chart Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-bold text-[#131B2E] dark:text-white">
              Daily Pomodoro Activity
            </h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold border border-indigo-100 dark:border-indigo-900/40">
              Last {period} days
            </span>
          </div>
          <p className="text-xs text-[#464555] dark:text-slate-400 mt-1">
            Focus sessions recorded per day. Hover or focus any bar for session details.
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs font-medium text-slate-600 dark:text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#4F46E5] inline-block shadow-xs" />
            <span>Today</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#14B8A6] inline-block shadow-xs" />
            <span>Active Day</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-slate-200 dark:bg-slate-700 inline-block" />
            <span>Rest Day</span>
          </div>
        </div>
      </div>

      {/* Chart Canvas Area */}
      <div className="relative">
        {/* Empty state notice if all bars are 0 */}
        {allZero && (
          <div className="mb-4 flex items-center gap-2.5 p-3.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/50 text-amber-800 dark:text-amber-300 text-xs sm:text-sm">
            <Info className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <div>
              <span className="font-semibold">No focus sessions in this period yet.</span>
              <span className="ml-1 opacity-90">Start a timer session to build your study chart!</span>
            </div>
          </div>
        )}

        {/* Scrollable container for 30-day view or narrow screens */}
        <div className="overflow-x-auto overflow-y-visible pt-10 pb-2 -mx-2 px-2 scrollbar-thin">
          <div
            className={`flex items-end gap-1.5 sm:gap-3 ${
              period === 30 ? 'min-w-[620px]' : 'min-w-[300px]'
            } h-56 relative`}
          >
            {/* Background Grid Lines */}
            <div className="absolute inset-0 pointer-events-none flex flex-col justify-between border-b border-slate-200 dark:border-slate-700/80">
              {uniqueYTicks.map((tick, idx) => (
                <div
                  key={`grid-${tick}-${idx}`}
                  className="w-full flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 text-[10px] text-slate-400 dark:text-slate-500 font-mono"
                >
                  <span className="pr-1">{tick}</span>
                  <div className="flex-1 h-px bg-slate-100 dark:bg-slate-800/80 mx-2" />
                </div>
              ))}
            </div>

            {/* Bars */}
            {data.map((bar, idx) => {
              const heightPercent = allZero
                ? 0
                : Math.max(0, Math.round((bar.count / yAxisMax) * 100));

              const isHovered = hoveredIndex === idx;

              return (
                <div
                  key={bar.dateKey}
                  className="relative flex-1 h-full flex flex-col items-center justify-end z-10 group"
                >
                  {/* Tooltip Popup */}
                  {isHovered && (
                    <div
                      role="tooltip"
                      className="absolute bottom-[calc(100%+8px)] z-30 flex flex-col items-center pointer-events-none animate-in fade-in zoom-in-95 duration-150"
                    >
                      <div className="bg-slate-900/95 dark:bg-slate-800/95 text-white backdrop-blur-md px-3 py-1.5 rounded-lg shadow-xl border border-slate-700 text-center whitespace-nowrap min-w-[110px]">
                        <div className="text-[11px] font-semibold flex items-center justify-center gap-1">
                          <span>{bar.fullDateLabel}</span>
                          {bar.isToday && (
                            <span className="text-[9px] px-1 py-0.2 bg-indigo-500 rounded text-white font-medium">
                              Today
                            </span>
                          )}
                        </div>
                        <div className="text-xs font-bold text-indigo-300 dark:text-indigo-200 mt-0.5">
                          {bar.count} {bar.count === 1 ? 'pomodoro' : 'pomodoros'}
                        </div>
                        {bar.count > 0 && (
                          <div className="text-[10px] text-slate-300 dark:text-slate-400 mt-0.5">
                            ~{(bar.count * 25) / 60 >= 1 
                              ? `${((bar.count * 25) / 60).toFixed(1)} hrs` 
                              : `${bar.count * 25} mins`}
                          </div>
                        )}
                      </div>
                      {/* Tooltip triangle tail */}
                      <div className="w-2 h-2 bg-slate-900 dark:bg-slate-800 border-r border-b border-slate-700 rotate-45 -mt-1" />
                    </div>
                  )}

                  {/* The Interactive Bar */}
                  <button
                    type="button"
                    tabIndex={0}
                    aria-label={bar.ariaLabel}
                    onMouseEnter={() => setHoveredIndex(idx)}
                    onMouseLeave={() => setHoveredIndex(null)}
                    onFocus={() => setHoveredIndex(idx)}
                    onBlur={() => setHoveredIndex(null)}
                    className="w-full flex flex-col justify-end items-center h-full focus:outline-hidden cursor-pointer"
                  >
                    <div
                      style={{
                        height: bar.count > 0 ? `${Math.max(8, heightPercent)}%` : '6px'
                      }}
                      className={`w-full max-w-[36px] transition-all duration-300 ease-out rounded-t-md sm:rounded-t-lg ${
                        bar.isToday
                          ? 'bg-[#4F46E5] hover:bg-[#4338CA] dark:bg-indigo-500 dark:hover:bg-indigo-400 shadow-md ring-2 ring-indigo-300 dark:ring-indigo-700/50'
                          : bar.count > 0
                          ? 'bg-[#14B8A6] hover:bg-[#0D9488] dark:bg-teal-500 dark:hover:bg-teal-400'
                          : 'bg-slate-200 dark:bg-slate-700/60 hover:bg-slate-300 dark:hover:bg-slate-600'
                      }`}
                    />
                  </button>

                  {/* X-Axis Date Label */}
                  <div className="mt-2 text-center w-full">
                    <span
                      className={`text-[10px] sm:text-xs block truncate transition-colors ${
                        bar.isToday
                          ? 'font-bold text-[#4F46E5] dark:text-indigo-400'
                          : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {bar.label}
                    </span>
                    {bar.isToday && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#4F46E5] dark:bg-indigo-400 mx-auto mt-0.5 block" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
