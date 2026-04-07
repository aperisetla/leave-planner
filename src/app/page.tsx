"use client";

import { useState, useCallback } from "react";
import { Plus } from "lucide-react";
import { CalendarToolbar } from "@/components/CalendarToolbar";
import { MonthlyCalendar } from "@/components/calendar/MonthlyCalendar";
import { QuarterlyCalendar } from "@/components/calendar/QuarterlyCalendar";
import { LeaveLegend } from "@/components/LeaveLegend";
import { AddLeaveModal } from "@/components/AddLeaveModal";
import { DayDetailPanel } from "@/components/DayDetailPanel";
import { useLeaves, useMembers } from "@/hooks/useLeaves";
import type { LeaveEntry } from "@/types";

export default function DashboardPage() {
  const [view, setView]               = useState<"month" | "quarter">("month");
  const [anchor, setAnchor]           = useState(() => new Date());
  const [selectedTeam, setSelectedTeam] = useState("");
  const [isSyncing, setIsSyncing]     = useState(false);
  const [isAddLeaveOpen, setIsAddLeaveOpen] = useState(false);
  const [editEntry, setEditEntry]     = useState<LeaveEntry | undefined>(undefined);
  const [dayDetail, setDayDetail]     = useState<{ date: Date; leaves: LeaveEntry[] } | null>(null);

  const { entries, isLoading, refresh } = useLeaves(view, anchor, selectedTeam || undefined);
  const { teams } = useMembers();

  const handleSync = useCallback(async () => {
    setIsSyncing(true);
    try {
      const res = await fetch("/api/sync", { method: "POST" });
      const result = await res.json();
      if (result.error) throw new Error(result.error);
      await refresh();
      alert(`✅ Synced ${result.synced} issues (${result.created} new, ${result.updated} updated)`);
    } catch (e: any) {
      alert(`❌ Sync failed: ${e.message}`);
    } finally {
      setIsSyncing(false);
    }
  }, [refresh]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* App header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            {process.env.NEXT_PUBLIC_APP_NAME ?? "Team Leave Planner"}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            AFI India · 28 members · Track absences &amp; sync from JIRA
          </p>
        </div>
        <button
          onClick={() => setIsAddLeaveOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl shadow-sm hover:bg-blue-700 active:bg-blue-800 transition-colors"
        >
          <Plus size={16} />
          Add Leave
        </button>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <CalendarToolbar
          view={view}
          anchor={anchor}
          teams={teams}
          selectedTeam={selectedTeam}
          isSyncing={isSyncing}
          onViewChange={setView}
          onAnchorChange={setAnchor}
          onTeamChange={setSelectedTeam}
          onSync={handleSync}
        />

        {/* Legend */}
        <div className="mb-4">
          <LeaveLegend />
        </div>

        {/* Calendar views */}
        {isLoading ? (
          <div className="flex items-center justify-center h-64 text-gray-400">
            Loading leaves…
          </div>
        ) : view === "month" ? (
          <MonthlyCalendar
            anchor={anchor}
            entries={entries}
            onDayClick={(date, leaves) => setDayDetail({ date, leaves })}
          />
        ) : (
          <QuarterlyCalendar anchor={anchor} entries={entries} />
        )}

        {/* Stats footer */}
        {!isLoading && entries.length > 0 && (
          <p className="mt-4 text-xs text-gray-400 text-right">
            {entries.length} absence{entries.length !== 1 ? "s" : ""} in this period
          </p>
        )}
      </main>

      {/* Add / Edit Leave Modal */}
      <AddLeaveModal
        isOpen={isAddLeaveOpen || !!editEntry}
        editEntry={editEntry}
        onClose={() => { setIsAddLeaveOpen(false); setEditEntry(undefined); }}
        onSuccess={() => {
          refresh();
          setIsAddLeaveOpen(false);
          setEditEntry(undefined);
        }}
      />

      {/* Day Detail Slide-over */}
      <DayDetailPanel
        date={dayDetail?.date ?? null}
        leaves={dayDetail?.leaves ?? []}
        onClose={() => setDayDetail(null)}
        onEdit={entry => {
          setDayDetail(null);          // close the panel
          setEditEntry(entry);         // open edit modal
        }}
        onDelete={async entry => {
          try {
            const res = await fetch(`/api/leaves/${entry.id}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Delete failed");
            await refresh();
            // Update the panel's leave list so it reflects the deletion immediately
            setDayDetail(prev => prev
              ? { ...prev, leaves: prev.leaves.filter(l => l.id !== entry.id) }
              : null
            );
          } catch {
            alert("❌ Could not delete this entry. Please try again.");
          }
        }}
      />
    </div>
  );
}
