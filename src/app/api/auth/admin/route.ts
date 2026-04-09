/**
 * POST /api/auth/admin
 * Verifies the submitted password against ADMIN_PASSWORD env var.
 * Returns { ok: true } on success, 401 on failure.
 * A 500ms delay is added on failure to slow brute-force attempts.
 */
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { password } = await req.json();

  const expected = process.env.ADMIN_PASSWORD;

  if (!expected) {
    return NextResponse.json(
      { ok: false, error: "Admin access is not configured on this server." },
      { status: 503 }
    );
  }

  if (!password || password !== expected) {
    // Slow down brute-force attempts
    await new Promise(r => setTimeout(r, 500));
    return NextResponse.json(
      { ok: false, error: "Incorrect password. Please try again." },
      { status: 401 }
    );
  }

  return NextResponse.json({ ok: true });
}
