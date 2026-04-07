/**
 * POST /api/sync  – trigger a JIRA → DB sync
 * GET  /api/sync  – return last 10 sync logs
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { syncJiraLeaves } from "@/lib/jira/sync";

export async function POST() {
  try {
    const result = await syncJiraLeaves();
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Sync failed" },
      { status: 500 }
    );
  }
}

export async function GET() {
  const logs = await prisma.syncLog.findMany({
    orderBy: { triggeredAt: "desc" },
    take: 10,
  });
  return NextResponse.json(logs);
}
