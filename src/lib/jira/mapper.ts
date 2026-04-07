/**
 * Maps raw JIRA issue API response → JiraLeaveIssue (our internal shape).
 *
 * JIRA stores dates differently per project configuration:
 *  - Standard: issue.fields.duedate, issue.fields.created
 *  - Custom: customfield_XXXXX  (configure via JIRA_LEAVE_TYPE_FIELD in .env)
 *
 * How to find your custom field IDs:
 *   curl -u email:token https://yourcompany.atlassian.net/rest/api/3/field
 */

import type { JiraLeaveIssue } from "./types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapJiraIssueToLeave(issue: any, baseUrl: string): JiraLeaveIssue {
  const fields = issue.fields ?? {};
  const leaveTypeField = process.env.JIRA_LEAVE_TYPE_FIELD ?? "customfield_10020";

  // Read env-configured field IDs (Ashley-specific discovered fields)
  const startField  = process.env.JIRA_LEAVE_START_FIELD ?? "customfield_10015";
  const endField    = process.env.JIRA_LEAVE_END_FIELD   ?? "customfield_10753";

  // "Leave Dates" (customfield_13530) is a string field in Ashley JIRA that
  // may store a date range like "2026-04-10 to 2026-04-14" or a single date.
  const leaveDatesRaw: string | undefined = fields[leaveTypeField];
  let parsedStart: string | undefined;
  let parsedEnd: string | undefined;

  if (leaveDatesRaw && typeof leaveDatesRaw === "string") {
    // Try "YYYY-MM-DD to YYYY-MM-DD" format
    const rangeMatch = leaveDatesRaw.match(/(\d{4}-\d{2}-\d{2})\s*(?:to|-)\s*(\d{4}-\d{2}-\d{2})/);
    if (rangeMatch) {
      parsedStart = rangeMatch[1];
      parsedEnd   = rangeMatch[2];
    } else {
      // Single date — treat as a 1-day leave
      const singleMatch = leaveDatesRaw.match(/(\d{4}-\d{2}-\d{2})/);
      if (singleMatch) { parsedStart = singleMatch[1]; parsedEnd = singleMatch[1]; }
    }
  }

  // Fall back to standard start/end date fields
  const startDate: string | undefined =
    parsedStart ??
    fields[startField] ??
    fields.customfield_10015 ??
    fields.startDate ??
    undefined;

  const endDate: string | undefined =
    parsedEnd ??
    (fields[endField] ? String(fields[endField]).slice(0, 10) : undefined) ??
    fields.duedate ??
    fields.customfield_10753?.slice?.(0, 10) ??
    undefined;

  const assignee = fields.assignee;

  return {
    id: issue.id,
    key: issue.key,
    self: issue.self,
    summary: fields.summary ?? "",
    status: fields.status?.name ?? "Unknown",
    assigneeAccountId: assignee?.accountId,
    assigneeName: assignee?.displayName,
    assigneeEmail: assignee?.emailAddress,
    assigneeAvatarUrl: assignee?.avatarUrls?.["48x48"],
    startDate,
    endDate,
    leaveType: fields[leaveTypeField]?.value ?? fields[leaveTypeField] ?? undefined,
    description:
      fields.description?.content
        ?.map((block: any) =>
          block.content?.map((c: any) => c.text ?? "").join("") ?? ""
        )
        .join("\n") ?? undefined,
    labels: fields.labels ?? [],
    issueUrl: `${baseUrl}/browse/${issue.key}`,
  };
}

/**
 * Converts a JIRA status name to our internal LeaveStatus enum string.
 */
export function mapJiraStatusToLeaveStatus(jiraStatus: string): string {
  const lower = jiraStatus.toLowerCase();
  if (lower.includes("approv") || lower === "done" || lower === "closed") return "APPROVED";
  if (lower.includes("reject") || lower === "declined") return "REJECTED";
  if (lower.includes("cancel")) return "CANCELLED";
  return "PENDING";
}

/**
 * Maps JIRA labels / custom field values to our LeaveType enum.
 */
export function mapToLeaveType(raw: string | undefined, labels: string[]): string {
  const combined = [raw ?? "", ...labels].join(" ").toLowerCase();
  if (combined.includes("sick") || combined.includes("medical")) return "SICK";
  if (combined.includes("holiday") || combined.includes("public")) return "PUBLIC_HOLIDAY";
  if (combined.includes("bereavement")) return "BEREAVEMENT";
  if (combined.includes("maternity") || combined.includes("paternity") || combined.includes("parental"))
    return "MATERNITY_PATERNITY";
  if (combined.includes("personal")) return "PERSONAL";
  if (combined.includes("pto") || combined.includes("vacation") || combined.includes("annual"))
    return "PTO";
  return "OTHER";
}
