/**
 * Server-side admin auth helper.
 * All write API routes (POST/PUT/DELETE) call isAdminRequest() to verify
 * the X-Admin-Password header matches the ADMIN_PASSWORD environment variable.
 */
import { NextRequest, NextResponse } from "next/server";

export function isAdminRequest(req: NextRequest): boolean {
  const provided = req.headers.get("x-admin-password");
  const expected = process.env.ADMIN_PASSWORD;
  // If ADMIN_PASSWORD is not configured, all writes are blocked
  if (!expected || !provided) return false;
  return provided === expected;
}

export function unauthorizedResponse() {
  return NextResponse.json(
    { error: "Admin access required. Please unlock admin mode first." },
    { status: 401 }
  );
}
