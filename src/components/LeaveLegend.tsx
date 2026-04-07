"use client";

import { LEAVE_TYPE_CONFIG } from "@/types";
import { clsx } from "clsx";

export function LeaveLegend() {
  return (
    <div className="flex flex-wrap gap-3 text-xs">
      {(Object.entries(LEAVE_TYPE_CONFIG) as [string, typeof LEAVE_TYPE_CONFIG[keyof typeof LEAVE_TYPE_CONFIG]][]).map(([key, cfg]) => (
        <div key={key} className="flex items-center gap-1.5">
          <span className={clsx("w-3 h-3 rounded-sm inline-block", cfg.bgColor)} />
          <span className="text-gray-600">{cfg.label}</span>
        </div>
      ))}
    </div>
  );
}
