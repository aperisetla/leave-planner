"use client";

import { LEAVE_TYPE_CONFIG } from "@/types";
import type { LeaveEntry } from "@/types";
import { clsx } from "clsx";

interface LeaveBadgeProps {
  entry: LeaveEntry;
  showName?: boolean;
  compact?: boolean;
}

export function LeaveBadge({ entry, showName = true, compact = false }: LeaveBadgeProps) {
  const cfg = LEAVE_TYPE_CONFIG[entry.leaveType];

  const statusBorder =
    entry.status === "PLANNED"  ? "border border-dashed border-current opacity-70" :
    entry.status === "PENDING"  ? "border border-dotted border-current opacity-80" :
    "";

  return (
    <div
      className={clsx(
        "rounded px-1.5 py-0.5 text-xs font-medium truncate w-full",
        cfg.bgColor,
        cfg.textColor,
        statusBorder,
        compact ? "text-[10px] py-0" : ""
      )}
      title={`${entry.member.name} – ${cfg.label}${entry.status !== "APPROVED" ? ` (${entry.status.charAt(0) + entry.status.slice(1).toLowerCase()})` : ""}${entry.notes ? `: ${entry.notes}` : ""}`}
    >
      {showName && (
        <span className="font-semibold">{entry.member.name.split(" ")[0]}</span>
      )}
      {!compact && (
        <span className="ml-1 opacity-75">{cfg.label}</span>
      )}
      {entry.jiraIssueKey && (
        <a
          href={entry.jiraIssueUrl ?? "#"}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-1 underline opacity-60 hover:opacity-100"
          onClick={e => e.stopPropagation()}
        >
          {entry.jiraIssueKey}
        </a>
      )}
    </div>
  );
}
