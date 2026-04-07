/**
 * Core JIRA → DB sync engine.
 *
 * Strategy:
 *  1. Build a JQL query using the Ashley-specific "Leave Dates" field (customfield_13530)
 *     plus label fallbacks. Projects filter is optional.
 *  2. Paginate using the new /search/jql endpoint's nextPageToken scheme.
 *  3. Upsert TeamMember records from assignee data.
 *  4. Upsert LeaveEntry records keyed on jiraIssueKey.
 *  5. Write a SyncLog row with the outcome.
 */

import { prisma } from "@/lib/db";
import { mapJiraIssueToLeave, mapJiraStatusToLeaveStatus, mapToLeaveType } from "./mapper";
import type { JiraSyncResult } from "./types";

const PAGE_SIZE = 50; // safer page size for the new endpoint

export async function syncJiraLeaves(): Promise<JiraSyncResult> {
  const start = Date.now();
  const result: JiraSyncResult = { total: 0, synced: 0, created: 0, updated: 0, skipped: 0, errors: [], durationMs: 0 };

  const log = await prisma.syncLog.create({ data: { status: "RUNNING" } });

  try {
    const baseUrl   = process.env.JIRA_BASE_URL!;
    const email     = process.env.JIRA_USER_EMAIL!;
    const token     = process.env.JIRA_API_TOKEN!;
    const auth      = "Basic " + Buffer.from(`${email}:${token}`).toString("base64");
    const headers   = { Authorization: auth, "Content-Type": "application/json", Accept: "application/json" };

    // Build JQL — use JIRA_LEAVE_JQL if set, otherwise fall back to label-based search
    const jqlOverride = process.env.JIRA_LEAVE_JQL ?? "";
    const projects    = (process.env.JIRA_LEAVE_PROJECTS ?? "").split(",").map(p => p.trim()).filter(Boolean);
    const labels      = (process.env.JIRA_LEAVE_LABELS ?? "leave,pto,vacation,absence").split(",").map(l => l.trim()).filter(Boolean);

    let jql: string;
    if (jqlOverride) {
      // If project filter is set, prepend it
      jql = projects.length ? `project IN (${projects.map(p => `"${p}"`).join(",")}) AND (${jqlOverride}) ORDER BY created DESC`
                             : `(${jqlOverride}) ORDER BY created DESC`;
    } else {
      const projectJql = projects.length ? `project IN (${projects.map(p => `"${p}"`).join(",")}) AND ` : "";
      jql = `${projectJql}labels IN (${labels.map(l => `"${l}"`).join(",")}) ORDER BY created DESC`;
    }

    // Ashley custom fields to fetch
    const leaveTypeField  = process.env.JIRA_LEAVE_TYPE_FIELD  ?? "customfield_13530";
    const leaveStartField = process.env.JIRA_LEAVE_START_FIELD ?? "customfield_10015";
    const leaveEndField   = process.env.JIRA_LEAVE_END_FIELD   ?? "customfield_10753";
    const leaveDaysField  = process.env.JIRA_LEAVE_DAYS_FIELD  ?? "customfield_13533";

    const FIELDS = ["summary", "status", "assignee", "duedate", "labels", "description",
                    "project", leaveTypeField, leaveStartField, leaveEndField, leaveDaysField];

    // New /search/jql endpoint uses nextPageToken for pagination (not startAt)
    let nextPageToken: string | undefined = undefined;
    let pageNum = 0;

    do {
      const body: Record<string, unknown> = { jql, fields: FIELDS, maxResults: PAGE_SIZE };
      if (nextPageToken) body.nextPageToken = nextPageToken;

      const res = await fetch(`${baseUrl}/rest/api/3/search/jql`, {
        method: "POST", headers, body: JSON.stringify(body),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`JIRA search failed HTTP ${res.status}: ${text.slice(0, 300)}`);
      }

      const page = await res.json() as { total?: number; issues?: any[]; nextPageToken?: string };
      if (pageNum === 0) result.total = page.total ?? 0;
      nextPageToken = page.nextPageToken;
      pageNum++;

      const issues = (page.issues ?? []) as any[];

      for (const raw of issues) {
        try {
          const issue = mapJiraIssueToLeave(raw, baseUrl);

          if (!issue.startDate || !issue.endDate || !issue.assigneeAccountId) {
            result.skipped++;
            continue;
          }

          // Upsert team member
          const member = await prisma.teamMember.upsert({
            where: { jiraAccountId: issue.assigneeAccountId },
            update: { name: issue.assigneeName ?? "Unknown", avatarUrl: issue.assigneeAvatarUrl },
            create: {
              jiraAccountId: issue.assigneeAccountId,
              name: issue.assigneeName ?? "Unknown",
              email: issue.assigneeEmail ?? `${issue.assigneeAccountId}@jira.local`,
              avatarUrl: issue.assigneeAvatarUrl,
            },
          });

          const leaveStatus = mapJiraStatusToLeaveStatus(issue.status);
          const leaveType   = mapToLeaveType(issue.leaveType, issue.labels);

          const existing = await prisma.leaveEntry.findUnique({ where: { jiraIssueKey: issue.key } });
          if (existing) {
            await prisma.leaveEntry.update({
              where: { id: existing.id },
              data: { startDate: new Date(issue.startDate), endDate: new Date(issue.endDate), leaveType, status: leaveStatus, jiraSummary: issue.summary, lastSyncedAt: new Date() },
            });
            result.updated++;
          } else {
            await prisma.leaveEntry.create({
              data: {
                memberId: member.id, jiraIssueKey: issue.key, jiraIssueUrl: issue.issueUrl,
                jiraSummary: issue.summary, startDate: new Date(issue.startDate), endDate: new Date(issue.endDate),
                leaveType, status: leaveStatus, notes: issue.description, lastSyncedAt: new Date(), isManual: false,
              },
            });
            result.created++;
          }
          result.synced++;
        } catch (e: any) {
          result.errors.push(`${raw?.key}: ${e?.message ?? String(e)}`);
        }
      }

      // Stop if no more pages or issues returned
    } while (nextPageToken && pageNum < 20);

    result.durationMs = Date.now() - start;
    await prisma.syncLog.update({
      where: { id: log.id },
      data: { status: result.errors.length ? "PARTIAL" : "SUCCESS", issuesSynced: result.synced, newEntries: result.created, updatedEntries: result.updated, errors: JSON.stringify(result.errors), durationMs: result.durationMs },
    });
  } catch (e: any) {
    result.errors.push(String(e?.message ?? e));
    await prisma.syncLog.update({ where: { id: log.id }, data: { status: "FAILED", errors: JSON.stringify(result.errors), durationMs: Date.now() - start } });
  }

  return result;
}
