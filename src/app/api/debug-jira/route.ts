/**
 * Temporary JIRA diagnostic route – DELETE after setup is complete.
 * GET /api/debug-jira
 */
import { NextResponse } from "next/server";

export async function GET() {
  const baseUrl = process.env.JIRA_BASE_URL?.replace(/\/$/, "");
  const email   = process.env.JIRA_USER_EMAIL;
  const token   = process.env.JIRA_API_TOKEN;

  if (!baseUrl || !email || !token) {
    return NextResponse.json({ error: "Missing env vars", baseUrl: !!baseUrl, email: !!email, token: !!token }, { status: 500 });
  }

  const auth = "Basic " + Buffer.from(`${email}:${token}`).toString("base64");
  const headers = { Authorization: auth, Accept: "application/json", "Content-Type": "application/json" };
  const results: Record<string, unknown> = {
    config: { baseUrl, email, tokenPrefix: token.slice(0, 8) + "…" },
  };

  // 1. Check identity
  try {
    const r = await fetch(`${baseUrl}/rest/api/3/myself`, { headers });
    if (r.ok) {
      const me = await r.json() as Record<string, unknown>;
      results.auth = { ok: true, displayName: me.displayName, accountEmail: me.emailAddress };
    } else {
      results.auth = { ok: false, status: r.status, body: await r.text() };
    }
  } catch (e: any) { results.auth = { ok: false, error: e.message }; }

  // 2. List projects
  try {
    const r = await fetch(`${baseUrl}/rest/api/3/project/search?maxResults=50&orderBy=name`, { headers });
    if (r.ok) {
      const data = await r.json() as { values: Array<{ key: string; name: string; projectTypeKey: string }> };
      results.projects = (data.values ?? []).map((p) => `[${p.key}] ${p.name} (${p.projectTypeKey})`);
    } else {
      results.projects = { status: r.status, body: await r.text() };
    }
  } catch (e: any) { results.projects = { error: e.message }; }

  // 3. Search for leave issues — use customfield_13530 (Leave Dates) which is Ashley-specific
  const LEAVE_FIELDS = ["summary", "issuetype", "status", "assignee", "labels", "project",
    "duedate", "customfield_10015", "customfield_13530", "customfield_13533", "customfield_10753"];

  // Search by the dedicated leave field (not empty) — most targeted query
  const searches = [
    { label: "Leave Dates field populated", jql: "\"Leave Dates\" is not EMPTY ORDER BY created DESC" },
    { label: "Summary ~ leave/pto/OOO",    jql: "(summary ~ \"leave\" OR summary ~ \"pto\" OR summary ~ \"OOO\" OR summary ~ \"time off\") ORDER BY created DESC" },
    { label: "Labels = leave or pto",      jql: "labels in (leave, pto, \"time-off\", absence, vacation) ORDER BY created DESC" },
  ];

  results.leaveSearch = {};
  for (const s of searches) {
    try {
      // New /search/jql POST endpoint — uses nextPageToken, NOT startAt
      const r = await fetch(`${baseUrl}/rest/api/3/search/jql`, {
        method: "POST", headers,
        body: JSON.stringify({ jql: s.jql, fields: LEAVE_FIELDS, maxResults: 5 }),
      });
      if (r.ok) {
        const data = await r.json() as { total: number; issues: any[] };
        (results.leaveSearch as any)[s.label] = {
          total: data.total,
          sample: (data.issues ?? []).slice(0, 3).map((i: any) => ({
            key: i.key,
            project: i.fields?.project?.key,
            type: i.fields?.issuetype?.name,
            summary: i.fields?.summary?.slice(0, 65),
            assignee: i.fields?.assignee?.displayName,
            labels: i.fields?.labels,
            duedate: i.fields?.duedate,
            leaveDates: i.fields?.customfield_13530,
            leaveDaysCount: i.fields?.customfield_13533,
            startDate: i.fields?.customfield_10015,
            endDate: i.fields?.customfield_10753,
          })),
        };
      } else {
        (results.leaveSearch as any)[s.label] = { status: r.status, body: (await r.text()).slice(0, 200) };
      }
    } catch (e: any) { (results.leaveSearch as any)[s.label] = { error: e.message }; }
  }

  // 4. Date-related fields
  try {
    const r = await fetch(`${baseUrl}/rest/api/3/field`, { headers });
    if (r.ok) {
      const fields = await r.json() as Array<{ id: string; name: string; schema?: { type: string } }>;
      results.dateFields = fields
        .filter(f =>
          f.schema?.type === "date" || f.schema?.type === "datetime" ||
          (f.name ?? "").toLowerCase().match(/start|end|leave|pto|vacation|due|date/)
        )
        .map(f => `${f.id} | "${f.name}" | ${f.schema?.type}`);
    } else {
      results.dateFields = { status: r.status };
    }
  } catch (e: any) { results.dateFields = { error: e.message }; }

  return NextResponse.json(results, { status: 200 });
}
