/**
 * GET  /api/leaves  – list leave entries (filterable by month, quarter, member)
 * POST /api/leaves  – create a manual leave entry
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { startOfMonth, endOfMonth, startOfQuarter, endOfQuarter } from "date-fns";
import { isAdminRequest, unauthorizedResponse } from "@/lib/adminAuth";

const dateString = z.string().regex(
  /^\d{4}-\d{2}-\d{2}$/,
  "Date must be in YYYY-MM-DD format"
);

const CreateLeaveSchema = z.object({
  memberId:  z.string().min(1, "Team member is required"),
  startDate: dateString,
  endDate:   dateString,
  leaveType: z.enum(["PTO", "SICK", "PUBLIC_HOLIDAY", "PERSONAL", "BEREAVEMENT", "MATERNITY_PATERNITY", "OTHER"]).default("PTO"),
  status:    z.enum(["PLANNED", "PENDING", "APPROVED", "REJECTED", "CANCELLED"]).default("APPROVED"),
  notes:     z.string().optional(),
}).refine(d => d.endDate >= d.startDate, {
  message: "End date cannot be before start date",
  path: ["endDate"],
});

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const view = searchParams.get("view") ?? "month";       // "month" | "quarter"
  const dateParam = searchParams.get("date") ?? new Date().toISOString();
  const memberId = searchParams.get("memberId");
  const team = searchParams.get("team");

  const anchor = new Date(dateParam);
  // Subtract 6h from `from` to handle IST dates stored as 18:30 UTC (previous UTC day)
  const SIX_HOURS_MS = 6 * 60 * 60 * 1000;
  const from = new Date(
    (view === "quarter" ? startOfQuarter(anchor) : startOfMonth(anchor)).getTime() - SIX_HOURS_MS
  );
  const to   = view === "quarter" ? endOfQuarter(anchor) : endOfMonth(anchor);

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
  if (!isAdminRequest(req)) return unauthorizedResponse();
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
