/**
 * JIRA REST API v3 client
 *
 * Authentication: Personal Access Token (PAT) – Basic Auth with base64
 * encoded "email:token". This is the recommended approach for Atlassian
 * Cloud internal tools.
 *
 * To generate a PAT:
 *   1. Go to https://id.atlassian.com/manage-profile/security/api-tokens
 *   2. Create a token and store it in .env.local as JIRA_API_TOKEN
 *
 * For OAuth 2.0 (3-legged, user-delegated), replace the Authorization header
 * with a Bearer token obtained via Atlassian OAuth 2.0 flow.
 */

import { Version3Client } from "jira.js";

let _client: Version3Client | null = null;

export function getJiraClient(): Version3Client {
  if (_client) return _client;

  const baseUrl = process.env.JIRA_BASE_URL;
  const email = process.env.JIRA_USER_EMAIL;
  const token = process.env.JIRA_API_TOKEN;

  if (!baseUrl || !email || !token) {
    throw new Error(
      "Missing JIRA env vars. Set JIRA_BASE_URL, JIRA_USER_EMAIL, and JIRA_API_TOKEN in .env.local"
    );
  }

  _client = new Version3Client({
    host: baseUrl,
    authentication: {
      basic: { email, apiToken: token },
    },
  });

  return _client;
}
