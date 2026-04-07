"use client";

import { addMonths, addQuarters, format, subMonths, subQuarters } from "date-fns";
import { ChevronLeft, ChevronRight, RefreshCw, Calendar } from "lucide-react";
import { clsx } from "clsx";

interface CalendarToolbarProps {
  view: "month" | "quarter";
  anchor: Date;
  teams: string[];
  selectedTeam: string;
  isSyncing: boolean;
  onViewChange: (v: "month" | "quarter") => void;
  onAnchorChange: (d: Date) => void;
  onTeamChange: (t: string) => void;
  onSync: () => void;
}

export function CalendarToolbar({
  view, anchor, teams, selectedTeam,
  isSyncing, onViewChange, onAnchorChange, onTeamChange, onSync,
}: CalendarToolbarProps) {
  const label =
    view === "month"
      ? format(anchor, "MMMM yyyy")
      : `Q${Math.ceil((anchor.getMonth() + 1) / 3)} ${format(anchor, "yyyy")}`;

  function prev() {
    onAnchorChange(view === "month" ? subMonths(anchor, 1) : subQuarters(anchor, 1));
  }
  function next() {
    onAnchorChange(view === "month" ? addMonths(anchor, 1) : addQuarters(anchor, 1));
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
      {/* View toggle */}
      <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
        {(["month", "quarter"] as const).map(v => (
          <button
            key={v}
            onClick={() => onViewChange(v)}
            className={clsx(
              "px-4 py-1.5 capitalize font-medium transition-colors",
              view === v
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-600 hover:bg-gray-50"
            )}
          >
            {v}
          </button>
        ))}
      </div>

      {/* Period navigation */}
      <div className="flex items-center gap-2">
        <button onClick={prev} className="p-1.5 rounded hover:bg-gray-100 transition-colors">
          <ChevronLeft size={18} />
        </button>
        <span className="font-semibold text-gray-800 min-w-[160px] text-center">{label}</span>
        <button onClick={next} className="p-1.5 rounded hover:bg-gray-100 transition-colors">
          <ChevronRight size={18} />
        </button>
        <button
          onClick={() => onAnchorChange(new Date())}
          className="px-2 py-1 text-xs font-medium text-blue-600 border border-blue-200 rounded hover:bg-blue-50 transition-colors"
        >
          Today
        </button>
      </div>

      {/* Filters + Sync */}
      <div className="flex items-center gap-2">
        {teams.length > 0 && (
          <select
            value={selectedTeam}
            onChange={e => onTeamChange(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Teams</option>
            {teams.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        )}
        <button
          onClick={onSync}
          disabled={isSyncing}
          className={clsx(
            "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors",
            isSyncing
              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
              : "bg-blue-600 text-white hover:bg-blue-700"
          )}
        >
          <RefreshCw size={14} className={isSyncing ? "animate-spin" : ""} />
          {isSyncing ? "Syncing…" : "Sync JIRA"}
        </button>
      </div>
    </div>
  );
}
