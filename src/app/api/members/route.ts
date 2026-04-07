/**
 * GET  /api/members       – list all active team members
 * POST /api/members       – create a manual team member
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

const CreateMemberSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  team: z.string().optional(),
  role: z.string().optional(),
  avatarUrl: z.string().url().optional(),
});

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const team = searchParams.get("team");

  const members = await prisma.teamMember.findMany({
    where: { isActive: true, ...(team ? { team } : {}) },
    orderBy: [{ team: "asc" }, { name: "asc" }],
  });

  // Return distinct teams for filter dropdowns
  const teams = Array.from(new Set(members.map(m => m.team).filter(Boolean)));

  return NextResponse.json({ members, teams });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = CreateMemberSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const member = await prisma.teamMember.create({ data: parsed.data });
  return NextResponse.json(member, { status: 201 });
}
