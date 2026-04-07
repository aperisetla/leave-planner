/**
 * JIRA Discovery Script
 * Uses jira.js (confirmed working) for project listing + auth verification,
 * and the new /search/jql POST endpoint for issue search.
 *
 * tsx injects .env.local automatically — no manual dotenv call needed.
 * Run: npx tsx scripts/discover-jira.ts
 */
import { Version3Client } from "jira.js";

const BASE_URL = process.env.JIRA_BASE_URL ?? "";
const EMAIL    = process.env.JIRA_USER_EMAIL ?? "";
const TOKEN    = process.env.JIRA_API_TOKEN ?? "";

if (!BASE_URL || !EMAIL || !TOKEN) {
  console.error("❌ Missing env vars. Make sure tsx injected .env.local");
  console.error(`  BASE_URL=${BASE_URL ? "✅" : "❌"}, EMAIL=${EMAIL ? "✅" : "❌"}, TOKEN=${TOKEN ? "✅" : "❌"}`);
  process.exit(1);
}

// jira.js client for auth + project listing (confirmed working)
const client = new Version3Client({
  host: BASE_URL,
  authentication: { basic: { email: EMAIL, apiToken: TOKEN } },
});

// Direct fetch for the new search/jql endpoint
async function searchJql(jql: string, fields: string[], maxResults = 5) {
  const auth = "Basic " + Buffer.from(`${EMAIL}:${TOKEN}`).toString("base64");
  const res = await fetch(`${BASE_URL}/rest/api/3/search/jql`, {
    method: "POST",
    headers: { Authorization: auth, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ jql, fields, maxResults, startAt: 0 }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`HTTP ${res.status}: ${txt.slice(0, 200)}`);
  }
  return res.json() as Promise<{ total: number; issues: any[] }>;
}

async function main() {
  console.log(`\n🔍 Connecting to ${BASE_URL} as ${EMAIL}\n`);

  // ── 1. Verify identity via jira.js ─────────────────────────────────────
  try {
    const me = await client.myself.getCurrentUser();
    console.log(`✅ Authenticated as: ${(me as any).displayName} (${(me as any).emailAddress})\n`);
  } catch (e: any) {
    console.error(`❌ Auth check failed: ${e.message}`);
    console.error("  Verify JIRA_USER_EMAIL and JIRA_API_TOKEN in .env.local");
    process.exit(1);
  }

  // ── 2. List all accessible projects ────────────────────────────────────
  console.log("📁 Accessible projects:\n");
  try {
    const result = await client.projects.searchProjects({ maxResults: 50, orderBy: "name" });
    const projects = (result as any).values ?? result ?? [];
    if ((projects as any[]).length === 0) {
      console.log("  ⚠️  No projects visible. Check project permissions.");
    }
    for (const p of projects as any[]) {
      console.log(`  [${p.key}] "${p.name}" (${p.projectTypeKey})`);
    }
  } catch (e: any) { console.error("  ❌ Project list failed:", e.message); }

  // ── 3. Search for leave-related issues (new endpoint) ──────────────────
  console.log("\n🎫 Searching for leave / OOO / PTO issues:\n");
  const keywords = ["leave", "pto", "vacation", "OOO", "absence", "time off"];
  const FIELDS = ["summary", "issuetype", "status", "assignee", "labels",
                  "duedate", "customfield_10015", "customfield_10014", "customfield_10016", "project"];

  for (const kw of keywords) {
    try {
      const data = await searchJql(`summary ~ "${kw}" ORDER BY created DESC`, FIELDS, 3);
      if ((data.total ?? 0) > 0) {
        console.log(`  ✅ "${kw}" → ${data.total} issues:`);
        for (const i of data.issues ?? []) {
          const f = i.fields;
          console.log(`    [${i.key}] proj=${f.project?.key} type=${f.issuetype?.name} | "${f.summary?.slice(0,55)}" | ${f.status?.name} | ${f.assignee?.displayName ?? "none"} | labels=[${(f.labels ?? []).join(",")}] | due=${f.duedate ?? "—"} | cf10015=${f.customfield_10015 ?? "—"}`);
        }
      }
    } catch (e: any) { console.log(`  ⚠️  "${kw}": ${(e.message ?? "").slice(0,100)}`); }
  }

  // ── 4. Date / leave related fields ─────────────────────────────────────
  console.log("\n🔧 Date & leave-related JIRA fields:\n");
  try {
    const fields: any[] = await client.issueFields.getFields() as any[];
    const relevant = fields.filter(f =>
      f.schema?.type === "date" || f.schema?.type === "datetime" ||
      (f.name ?? "").toLowerCase().match(/start|end|leave|pto|vacation|absence|due|date/)
    );
    for (const f of relevant) {
      console.log(`  ${String(f.id).padEnd(25)} | "${f.name}" | ${f.schema?.type ?? "?"}`);
    }
  } catch (e: any) { console.error("  ❌ Field list failed:", e.message); }

  console.log("\n✅ Discovery complete.\n");
}

main().catch(console.error);
