/**
 * PUT  /api/leaves/:id  – update an existing leave entry
 * DELETE /api/leaves/:id – delete a leave entry (manual entries only by default)
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { isAdminRequest, unauthorizedResponse } from "@/lib/adminAuth";

const UpdateLeaveSchema = z.object({
  memberId:  z.string().optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  leaveType: z.enum(["PTO","SICK","PUBLIC_HOLIDAY","PERSONAL","BEREAVEMENT","MATERNITY_PATERNITY","OTHER"]).optional(),
  status:    z.enum(["PENDING","APPROVED","REJECTED","CANCELLED"]).optional(),
  notes:     z.string().nullable().optional(),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!isAdminRequest(req)) return unauthorizedResponse();
  const entry = await prisma.leaveEntry.findUnique({ where: { id: params.id } });
  if (!entry) return NextResponse.json({ error: "Leave entry not found" }, { status: 404 });

  const body = await req.json();
  const parsed = UpdateLeaveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { memberId, startDate, endDate, leaveType, status, notes } = parsed.data;

  // Validate date order
  const resolvedStart = startDate ? new Date(startDate) : entry.startDate;
  const resolvedEnd   = endDate   ? new Date(endDate)   : entry.endDate;
  if (resolvedEnd < resolvedStart) {
    return NextResponse.json({ error: "End date cannot be before start date" }, { status: 400 });
  }

  // Validate member if changing
  if (memberId) {
    const member = await prisma.teamMember.findUnique({ where: { id: memberId } });
    if (!member) return NextResponse.json({ error: "Team member not found" }, { status: 404 });
  }

  const updated = await prisma.leaveEntry.update({
    where: { id: params.id },
    data: {
      ...(memberId   ? { memberId }                : {}),
      ...(startDate  ? { startDate: resolvedStart } : {}),
      ...(endDate    ? { endDate:   resolvedEnd }   : {}),
      ...(leaveType  ? { leaveType }                : {}),
      ...(status     ? { status }                   : {}),
      ...(notes !== undefined ? { notes }           : {}),
    },
    include: {
      member: { select: { id: true, name: true, email: true, avatarUrl: true, team: true, role: true } },
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!isAdminRequest(req)) return unauthorizedResponse();
  const entry = await prisma.leaveEntry.findUnique({ where: { id: params.id } });
  if (!entry) return NextResponse.json({ error: "Leave entry not found" }, { status: 404 });

  await prisma.leaveEntry.delete({ where: { id: params.id } });
  return NextResponse.json({ deleted: true, id: params.id });
}
