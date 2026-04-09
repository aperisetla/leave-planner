"use client";

import { useState } from "react";
import { format, eachDayOfInterval, isWeekend, startOfMonth, endOfMonth } from "date-fns";
import { ChevronDown, ChevronUp } from "lucide-react";
import { clsx } from "clsx";
import {
  getQuarterMonths,
  getQuarterLabel,
  buildMemberSummary,
  getLeavesForDay,
} from "@/lib/calendar";
import { LEAVE_TYPE_CONFIG } from "@/types";
import type { LeaveEntry, LeaveType, LeaveStatus } from "@/types";

/** Convert an ISO UTC string → readable IST date, e.g. "Apr 23" */
function fmtIST(iso: string): string {
  const d = new Date(new Date(iso).getTime() + 5.5 * 60 * 60 * 1000);
  return format(d, "MMM d");
}

/** "Apr 1" or "Apr 1 – Apr 5" */
function fmtRange(start: string, end: string): string {
  const s = fmtIST(start);
  const e = fmtIST(end);
  return s === e ? s : `${s} – ${e}`;
}

const STATUS_STYLE: Record<LeaveStatus, string> = {
  PLANNED:   "bg-blue-50   text-blue-700",
  PENDING:   "bg-amber-50  text-amber-700",
  APPROVED:  "bg-green-50  text-green-700",
  REJECTED:  "bg-red-50    text-red-600",
  CANCELLED: "bg-gray-100  text-gray-500",
};

interface QuarterlyCalendarProps {
  anchor: Date;
  entries: LeaveEntry[];
}

export function QuarterlyCalendar({ anchor, entries }: QuarterlyCalendarProps) {
  const months  = getQuarterMonths(anchor);
  const summary = buildMemberSummary(entries, startOfMonth(months[0]), endOfMonth(months[2]));
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggle = (id: string) => setExpandedId(prev => prev === id ? null : id);

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
              const types      = Array.from(new Set(memberEntries.map((e: LeaveEntry) => e.leaveType))) as LeaveType[];
              const isExpanded = expandedId === member.id;
              const sorted     = [...memberEntries].sort((a, b) =>
                (a.startDate as string).localeCompare(b.startDate as string)
              );
              return (
                <>
                  {/* Summary row — click anywhere to expand */}
                  <tr
                    key={member.id}
                    onClick={() => toggle(member.id)}
                    className="hover:bg-blue-50 transition-colors cursor-pointer select-none"
                  >
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        {member.avatarUrl ? (
                          <img src={member.avatarUrl} alt="" className="w-7 h-7 rounded-full shrink-0" />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 text-xs flex items-center justify-center font-bold shrink-0">
                            {member.name.charAt(0)}
                          </div>
                        )}
                        <span className="font-medium text-gray-800">{member.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-gray-500">{member.team ?? "—"}</td>
                    {/* Days Off — highlighted as a clickable hint */}
                    <td className="px-4 py-2.5 text-right">
                      <span className="inline-flex items-center gap-1 font-semibold text-blue-600">
                        {days}
                        {isExpanded
                          ? <ChevronUp size={13} className="opacity-60" />
                          : <ChevronDown size={13} className="opacity-60" />}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex flex-wrap gap-1">
                        {types.map(t => (
                          <span key={t} className={clsx("px-1.5 py-0.5 rounded text-xs font-medium", LEAVE_TYPE_CONFIG[t].bgColor, LEAVE_TYPE_CONFIG[t].textColor)}>
                            {LEAVE_TYPE_CONFIG[t].label}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>

                  {/* Expanded detail rows */}
                  {isExpanded && (
                    <tr key={`${member.id}-detail`}>
                      <td colSpan={4} className="px-0 py-0 bg-blue-50/60 border-t border-blue-100">
                        <div className="px-6 py-3 space-y-1.5">
                          {sorted.map(entry => {
                            const cfg = LEAVE_TYPE_CONFIG[entry.leaveType];
                            return (
                              <div key={entry.id} className="flex items-center gap-3 text-sm flex-wrap">
                                {/* Date range */}
                                <span className="w-32 shrink-0 text-gray-600 font-medium tabular-nums">
                                  {fmtRange(entry.startDate as string, entry.endDate as string)}
                                </span>
                                {/* Leave type */}
                                <span className={clsx("px-2 py-0.5 rounded text-xs font-semibold", cfg.bgColor, cfg.textColor)}>
                                  {cfg.label}
                                </span>
                                {/* Status */}
                                <span className={clsx("px-2 py-0.5 rounded text-xs font-semibold", STATUS_STYLE[entry.status as LeaveStatus] ?? "bg-gray-100 text-gray-500")}>
                                  {entry.status.charAt(0) + entry.status.slice(1).toLowerCase()}
                                </span>
                                {/* Notes */}
                                {entry.notes && (
                                  <span className="text-gray-400 text-xs truncate max-w-xs">{entry.notes}</span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
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
  // Only weekdays (Mon–Fri)
  const days = eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) })
    .filter(d => !isWeekend(d));
  const today = format(new Date(), "yyyy-MM-dd");

  // Leading blanks: Mon=0, Tue=1, Wed=2, Thu=3, Fri=4
  const leadingBlanks = days.length > 0 ? (days[0].getDay() - 1 + 7) % 7 : 0;

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="bg-blue-600 text-white text-center py-1.5 text-sm font-semibold">
        {format(month, "MMMM yyyy")}
      </div>
      <div className="grid grid-cols-5 text-center text-[10px] font-semibold text-gray-400 bg-gray-50 border-b border-gray-100 py-1">
        {["M","T","W","T","F"].map((d, i) => <span key={i}>{d}</span>)}
      </div>
      <div className="grid grid-cols-5 text-center gap-0">
        {/* Leading blanks */}
        {Array.from({ length: leadingBlanks }).map((_, i) => <span key={`b-${i}`} />)}
        {days.map(day => {
          const dayStr = format(day, "yyyy-MM-dd");
          const leaves = getLeavesForDay(day, entries);
          const isOff = isWeekend(day);
          const isToday = dayStr === today;
          return (
            <div
              key={dayStr}
              title={leaves.map((e: LeaveEntry) => `${e.member.name} (${LEAVE_TYPE_CONFIG[e.leaveType].label})`).join(", ")}
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
