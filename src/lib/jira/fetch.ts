/**
 * Lightweight JIRA REST API fetch helper.
 * Uses the new /rest/api/3/search/jql endpoint (Atlassian deprecated /search in 2024).
 * Reads credentials from process.env (loaded by Next.js from .env.local).
 */

function getAuthHeader(): string {
  const email = process.env.JIRA_USER_EMAIL;
  const token = process.env.JIRA_API_TOKEN;
  if (!email || !token) {
    throw new Error("JIRA_USER_EMAIL and JIRA_API_TOKEN must be set in .env.local");
  }
  return "Basic " + Buffer.from(`${email}:${token}`).toString("base64");
}

function getBaseUrl(): string {
  const url = process.env.JIRA_BASE_URL;
  if (!url) throw new Error("JIRA_BASE_URL must be set in .env.local");
  return url.replace(/\/$/, ""); // strip trailing slash
}

export async function jiraGet<T = unknown>(path: string): Promise<T> {
  const res = await fetch(`${getBaseUrl()}/rest/api/3${path}`, {
    headers: {
      Authorization: getAuthHeader(),
      Accept: "application/json",
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`JIRA GET ${path} → HTTP ${res.status}: ${body.slice(0, 300)}`);
  }
  return res.json() as Promise<T>;
}

export async function jiraPost<T = unknown>(path: string, body: object): Promise<T> {
  const res = await fetch(`${getBaseUrl()}/rest/api/3${path}`, {
    method: "POST",
    headers: {
      Authorization: getAuthHeader(),
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`JIRA POST ${path} → HTTP ${res.status}: ${text.slice(0, 300)}`);
  }
  return res.json() as Promise<T>;
}

/** Search JIRA issues using the new /search/jql endpoint (POST).
 *  NOTE: new endpoint uses nextPageToken, NOT startAt. */
export async function jiraSearchJql(params: {
  jql: string;
  fields: string[];
  maxResults?: number;
  nextPageToken?: string;
}): Promise<{ total?: number; issues: any[]; nextPageToken?: string }> {
  const body: Record<string, unknown> = {
    jql: params.jql,
    fields: params.fields,
    maxResults: params.maxResults ?? 50,
  };
  if (params.nextPageToken) body.nextPageToken = params.nextPageToken;
  return jiraPost("/search/jql", body);
}

/** List all projects accessible to the authenticated account. */
export async function jiraListProjects(): Promise<{ key: string; name: string; projectTypeKey: string }[]> {
  const data = await jiraGet<{ values: any[] }>("/project/search?maxResults=50&orderBy=name");
  return (data.values ?? []).map((p: any) => ({
    key: p.key,
    name: p.name,
    projectTypeKey: p.projectTypeKey,
  }));
}
