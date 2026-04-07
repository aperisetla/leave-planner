"use client";

import { format } from "date-fns";
import { clsx } from "clsx";
import { buildMonthGrid } from "@/lib/calendar";
import { LeaveBadge } from "./LeaveBadge";
import type { LeaveEntry } from "@/types";

const DAY_HEADERS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface MonthlyCalendarProps {
  anchor: Date;           // any date within the target month
  entries: LeaveEntry[];
  onDayClick?: (date: Date, leaves: LeaveEntry[]) => void;
}

export function MonthlyCalendar({ anchor, entries, onDayClick }: MonthlyCalendarProps) {
  const weeks = buildMonthGrid(anchor, entries);

  return (
    <div className="w-full border border-gray-200 rounded-xl overflow-hidden shadow-sm">
      {/* Day-of-week header */}
      <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
        {DAY_HEADERS.map(d => (
          <div
            key={d}
            className="py-2 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Weeks */}
      <div className="divide-y divide-gray-100">
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 divide-x divide-gray-100 min-h-[96px]">
            {week.days.map((day, di) => (
              <div
                key={di}
                onClick={() => onDayClick?.(day.date, day.leaves)}
                className={clsx(
                  "p-1.5 flex flex-col gap-0.5 cursor-pointer transition-colors",
                  !day.isCurrentMonth && "bg-gray-50",
                  day.isWeekend && day.isCurrentMonth && "bg-blue-50/30",
                  day.isToday && "bg-yellow-50",
                  "hover:bg-blue-50/50"
                )}
              >
                {/* Date number */}
                <span
                  className={clsx(
                    "text-xs font-medium self-end px-1 rounded-full leading-5 w-6 text-center",
                    day.isToday
                      ? "bg-blue-600 text-white"
                      : day.isCurrentMonth
                      ? "text-gray-800"
                      : "text-gray-300"
                  )}
                >
                  {format(day.date, "d")}
                </span>

                {/* Leave badges (first 3) + clickable "+N more" */}
                <div className="flex flex-col gap-0.5 overflow-hidden">
                  {day.leaves.slice(0, 3).map(entry => (
                    <LeaveBadge key={entry.id} entry={entry} compact />
                  ))}
                  {day.leaves.length > 3 && (
                    <button
                      className="text-[10px] text-blue-500 hover:text-blue-700 font-semibold pl-1 text-left underline underline-offset-2"
                      onClick={e => { e.stopPropagation(); onDayClick?.(day.date, day.leaves); }}
                    >
                      +{day.leaves.length - 3} more — see all
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
