export type LeaveType =
  | "PTO"
  | "SICK"
  | "PUBLIC_HOLIDAY"
  | "PERSONAL"
  | "BEREAVEMENT"
  | "MATERNITY_PATERNITY"
  | "OTHER";

export type LeaveStatus = "PLANNED" | "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
  team?: string | null;
  role?: string | null;
}

export interface LeaveEntry {
  id: string;
  memberId: string;
  member: TeamMember;
  startDate: string;   // ISO string
  endDate: string;     // ISO string
  leaveType: LeaveType;
  status: LeaveStatus;
  notes?: string | null;
  jiraIssueKey?: string | null;
  jiraIssueUrl?: string | null;
  isManual: boolean;
}

export interface LeavesApiResponse {
  from: string;
  to: string;
  entries: LeaveEntry[];
}

export interface MembersApiResponse {
  members: TeamMember[];
  teams: string[];
}

// ─── Leave type display config ───────────────────────────────────────────────
export const LEAVE_TYPE_CONFIG: Record<
  LeaveType,
  { label: string; color: string; bgColor: string; textColor: string }
> = {
  PTO:                 { label: "PTO / Vacation",      color: "#3b82f6", bgColor: "bg-blue-100",   textColor: "text-blue-800" },
  SICK:                { label: "Sick Leave",           color: "#f59e0b", bgColor: "bg-amber-100",  textColor: "text-amber-800" },
  PUBLIC_HOLIDAY:      { label: "Public Holiday",       color: "#10b981", bgColor: "bg-emerald-100",textColor: "text-emerald-800" },
  PERSONAL:            { label: "Personal",             color: "#8b5cf6", bgColor: "bg-violet-100", textColor: "text-violet-800" },
  BEREAVEMENT:         { label: "Bereavement",          color: "#6b7280", bgColor: "bg-gray-100",   textColor: "text-gray-800" },
  MATERNITY_PATERNITY: { label: "Maternity / Paternity",color: "#ec4899", bgColor: "bg-pink-100",   textColor: "text-pink-800" },
  OTHER:               { label: "Other",                color: "#94a3b8", bgColor: "bg-slate-100",  textColor: "text-slate-800" },
};
