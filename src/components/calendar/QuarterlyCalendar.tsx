"use client";

import { format, parseISO, eachDayOfInterval, isWeekend, startOfMonth, endOfMonth } from "date-fns";
import { clsx } from "clsx";
import {
  getQuarterMonths,
  getQuarterLabel,
  buildMemberSummary,
  getLeavesForDay,
} from "@/lib/calendar";
import { LEAVE_TYPE_CONFIG } from "@/types";
import type { LeaveEntry } from "@/types";

interface QuarterlyCalendarProps {
  anchor: Date;
  entries: LeaveEntry[];
}

export function QuarterlyCalendar({ anchor, entries }: QuarterlyCalendarProps) {
  const months = getQuarterMonths(anchor);
  const summary = buildMemberSummary(entries, startOfMonth(months[0]), endOfMonth(months[2]));

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-gray-700">{getQuarterLabel(anchor)}</h2>

      {/* Three mini-month grids side by side */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {months.map(month => (
          <MiniMonth key={month.toISOString()} month={month} entries={entries} />
        ))}
      </div>

      {/* Member summary table */}
      <div className="mt-4 border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-2 font-semibold text-gray-600">Team Member</th>
              <th className="text-left px-4 py-2 font-semibold text-gray-600">Team</th>
              <th className="text-right px-4 py-2 font-semibold text-gray-600">Days Off</th>
              <th className="text-left px-4 py-2 font-semibold text-gray-600">Leave Types</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {summary.map(({ member, days, entries: memberEntries }) => {
              const types = [...new Set(memberEntries.map(e => e.leaveType))];
              return (
                <tr key={member.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-2 flex items-center gap-2">
                    {member.avatarUrl ? (
                      <img src={member.avatarUrl} alt="" className="w-7 h-7 rounded-full" />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 text-xs flex items-center justify-center font-bold">
                        {member.name.charAt(0)}
                      </div>
                    )}
                    <span className="font-medium text-gray-800">{member.name}</span>
                  </td>
                  <td className="px-4 py-2 text-gray-500">{member.team ?? "—"}</td>
                  <td className="px-4 py-2 text-right font-semibold text-gray-800">{days}</td>
                  <td className="px-4 py-2">
                    <div className="flex flex-wrap gap-1">
                      {types.map(t => (
                        <span key={t} className={clsx("px-1.5 py-0.5 rounded text-xs font-medium", LEAVE_TYPE_CONFIG[t].bgColor, LEAVE_TYPE_CONFIG[t].textColor)}>
                          {LEAVE_TYPE_CONFIG[t].label}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              );
            })}
            {summary.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">No absences this quarter.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MiniMonth({ month, entries }: { month: Date; entries: LeaveEntry[] }) {
  const days = eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) });
  const today = format(new Date(), "yyyy-MM-dd");

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="bg-blue-600 text-white text-center py-1.5 text-sm font-semibold">
        {format(month, "MMMM yyyy")}
      </div>
      <div className="grid grid-cols-7 text-center text-[10px] font-semibold text-gray-400 bg-gray-50 border-b border-gray-100 py-1">
        {["S","M","T","W","T","F","S"].map((d, i) => <span key={i}>{d}</span>)}
      </div>
      <div className="grid grid-cols-7 text-center gap-0">
        {/* Leading blanks */}
        {Array.from({ length: days[0].getDay() }).map((_, i) => <span key={`b-${i}`} />)}
        {days.map(day => {
          const dayStr = format(day, "yyyy-MM-dd");
          const leaves = getLeavesForDay(day, entries);
          const isOff = isWeekend(day);
          const isToday = dayStr === today;
          return (
            <div
              key={dayStr}
              title={leaves.map(e => `${e.member.name} (${LEAVE_TYPE_CONFIG[e.leaveType].label})`).join(", ")}
              className={clsx(
                "text-[11px] leading-6 relative",
                isOff && "text-gray-300",
                isToday && "font-bold text-blue-600",
                leaves.length > 0 && !isOff && "font-semibold"
              )}
            >
              {leaves.length > 0 && !isOff && (
                <span className="absolute inset-1 rounded-full bg-blue-200 opacity-60" />
              )}
              <span className="relative z-10">{format(day, "d")}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
