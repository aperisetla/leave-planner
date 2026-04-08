"use client";

import { useEffect } from "react";
import { format } from "date-fns";
import { X, Users, CalendarOff, Pencil, Trash2 } from "lucide-react";
import { clsx } from "clsx";
import { LEAVE_TYPE_CONFIG } from "@/types";
import type { LeaveEntry, LeaveType } from "@/types";

interface DayDetailPanelProps {
  date: Date | null;
  leaves: LeaveEntry[];
  onClose: () => void;
  onEdit?: (entry: LeaveEntry) => void;
  onDelete?: (entry: LeaveEntry) => void;
}

export function DayDetailPanel({ date, leaves, onClose, onEdit, onDelete }: DayDetailPanelProps) {
  // Close on Escape
  useEffect(() => {
    if (!date) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [date, onClose]);

  if (!date) return null;

  // Group ALL leaves by type (including PUBLIC_HOLIDAY)
  const byType = leaves.reduce<Partial<Record<LeaveType, LeaveEntry[]>>>((acc, e) => {
    (acc[e.leaveType] ??= []).push(e);
    return acc;
  }, {});

  const holidays = byType["PUBLIC_HOLIDAY"] ?? [];

  const isWeekend = date.getDay() === 0 || date.getDay() === 6;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-over panel */}
      <aside className="fixed top-0 right-0 z-50 h-full w-full max-w-sm bg-white shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-gray-100 bg-gray-50">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
              {format(date, "EEEE")}
            </p>
            <h2 className="text-2xl font-bold text-gray-900 leading-tight">
              {format(date, "d MMMM yyyy")}
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {leaves.length === 0
                ? "No absences"
                : `${leaves.length} absence${leaves.length !== 1 ? "s" : ""}`}
              {isWeekend && (
                <span className="ml-2 text-xs text-amber-600 font-medium">(Weekend)</span>
              )}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-colors mt-1"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

          {leaves.length === 0 && (
            <div className="flex flex-col items-center justify-center h-40 text-gray-300 gap-2">
              <CalendarOff size={32} />
              <p className="text-sm">Everyone is in today.</p>
            </div>
          )}

          {/* Public holiday banner (summary only) */}
          {holidays.length > 0 && (
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 flex items-center gap-3">
              <span className="text-2xl">🎉</span>
              <div>
                <p className="font-semibold text-emerald-800 text-sm">Public Holiday</p>
                <p className="text-xs text-emerald-600">
                  {holidays.length} team member{holidays.length !== 1 ? "s" : ""} on holiday
                  {holidays[0].notes ? ` · ${holidays[0].notes}` : ""}
                </p>
              </div>
            </div>
          )}

          {/* All leave types grouped — PUBLIC_HOLIDAY first, then others alphabetically */}
          {(Object.entries(byType) as [LeaveType, LeaveEntry[]][])
            .sort(([a], [b]) => (a === "PUBLIC_HOLIDAY" ? -1 : b === "PUBLIC_HOLIDAY" ? 1 : a.localeCompare(b)))
            .map(([type, entries]) => {
            const cfg = LEAVE_TYPE_CONFIG[type];
            return (
              <section key={type}>
                <div className="flex items-center gap-2 mb-2">
                  <span className={clsx("w-2.5 h-2.5 rounded-full inline-block", cfg.bgColor.replace("bg-", "bg-"))} style={{ backgroundColor: cfg.color }} />
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    {cfg.label}
                  </h3>
                  <span className="text-xs text-gray-400">({entries.length})</span>
                </div>
                <ul className="space-y-1.5">
                  {entries.map(entry => (
                    <li
                      key={entry.id}
                      className={clsx(
                        "flex items-center gap-2 rounded-lg px-3 py-2",
                        cfg.bgColor, "border border-transparent group"
                      )}
                    >
                      {/* Avatar + name */}
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <div className="w-7 h-7 rounded-full bg-white/70 flex items-center justify-center text-xs font-bold shrink-0" style={{ color: cfg.color }}>
                          {entry.member.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className={clsx("text-sm font-semibold truncate", cfg.textColor)}>
                            {entry.member.name}
                          </p>
                          {entry.notes && (
                            <p className="text-[10px] text-gray-500 truncate">{entry.notes}</p>
                          )}
                        </div>
                      </div>

                      {/* Status badge */}
                      <span className={clsx(
                        "text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0",
                        entry.status === "APPROVED" ? "bg-white/60 text-green-700" :
                        entry.status === "PENDING"  ? "bg-white/60 text-amber-700" :
                        "bg-white/60 text-gray-500"
                      )}>
                        {entry.status}
                      </span>

                      {/* Edit / Delete — visible on hover */}
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        {onEdit && (
                          <button
                            onClick={() => onEdit(entry)}
                            title="Edit this entry"
                            className="p-1 rounded hover:bg-white/50 text-gray-500 hover:text-blue-600 transition-colors"
                          >
                            <Pencil size={12} />
                          </button>
                        )}
                        {onDelete && (
                          <button
                            onClick={() => {
                              if (confirm(`Delete leave for ${entry.member.name}? This cannot be undone.`)) {
                                onDelete(entry);
                              }
                            }}
                            title="Delete this entry"
                            className="p-1 rounded hover:bg-white/50 text-gray-500 hover:text-red-600 transition-colors"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50">
          <p className="text-xs text-gray-400 flex items-center gap-1">
            <Users size={11} />
            {leaves.length > 0
              ? `${leaves.length} out of 28 team members absent`
              : "All 28 team members available"}
          </p>
        </div>
      </aside>
    </>
  );
}
