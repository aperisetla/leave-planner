/**
 * GET  /api/leaves  – list leave entries (filterable by month, quarter, member)
 * POST /api/leaves  – create a manual leave entry
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { startOfMonth, endOfMonth, startOfQuarter, endOfQuarter } from "date-fns";

const CreateLeaveSchema = z.object({
  memberId: z.string(),
  startDate: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  endDate: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  leaveType: z.enum(["PTO", "SICK", "PUBLIC_HOLIDAY", "PERSONAL", "BEREAVEMENT", "MATERNITY_PATERNITY", "OTHER"]).default("PTO"),
  status: z.enum(["PENDING", "APPROVED", "REJECTED", "CANCELLED"]).default("APPROVED"),
  notes: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const view = searchParams.get("view") ?? "month";       // "month" | "quarter"
  const dateParam = searchParams.get("date") ?? new Date().toISOString();
  const memberId = searchParams.get("memberId");
  const team = searchParams.get("team");

  const anchor = new Date(dateParam);
  const from = view === "quarter" ? startOfQuarter(anchor) : startOfMonth(anchor);
  const to   = view === "quarter" ? endOfQuarter(anchor)   : endOfMonth(anchor);

  const entries = await prisma.leaveEntry.findMany({
    where: {
      startDate: { lte: to },
      endDate:   { gte: from },
      ...(memberId ? { memberId } : {}),
      member: team ? { team } : undefined,
      status: { not: "CANCELLED" },
    },
    include: {
      member: { select: { id: true, name: true, email: true, avatarUrl: true, team: true, role: true } },
    },
    orderBy: [{ startDate: "asc" }, { member: { name: "asc" } }],
  });

  return NextResponse.json({ from, to, entries });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = CreateLeaveSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { memberId, startDate, endDate, leaveType, status, notes } = parsed.data;

  // Validate member exists
  const member = await prisma.teamMember.findUnique({ where: { id: memberId } });
  if (!member) {
    return NextResponse.json({ error: "Team member not found" }, { status: 404 });
  }

  const entry = await prisma.leaveEntry.create({
    data: {
      memberId,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      leaveType: leaveType as any,
      status: status as any,
      notes,
      isManual: true,
    },
    include: { member: true },
  });

  return NextResponse.json(entry, { status: 201 });
}
