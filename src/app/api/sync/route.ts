/**
 * POST /api/sync  – trigger a JIRA → DB sync
 * GET  /api/sync  – return last 10 sync logs
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { syncJiraLeaves } from "@/lib/jira/sync";
import { isAdminRequest, unauthorizedResponse } from "@/lib/adminAuth";

export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) return unauthorizedResponse();
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
