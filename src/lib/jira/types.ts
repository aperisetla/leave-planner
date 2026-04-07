/**
 * Typed shape of JIRA issue fields relevant to leave planning.
 * Extend this as your JIRA instance adds custom fields.
 */
export interface JiraLeaveIssue {
  id: string;
  key: string;                   // e.g. "LEAVE-42"
  self: string;                  // API URL
  summary: string;
  status: string;                // e.g. "Approved", "Pending"
  assigneeAccountId?: string;
  assigneeName?: string;
  assigneeEmail?: string;
  assigneeAvatarUrl?: string;
  startDate?: string;            // ISO date string "YYYY-MM-DD"
  endDate?: string;              // ISO date string "YYYY-MM-DD"
  leaveType?: string;            // from custom field
  description?: string;
  labels: string[];
  issueUrl: string;
}

export interface JiraSyncResult {
  total: number;
  synced: number;
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
  durationMs: number;
}
