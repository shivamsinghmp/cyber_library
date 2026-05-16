import { NextResponse } from "next/server";

// EmailAccount (SMTP) removed — Resend API is used exclusively.
// Returning empty array for backward compat.
export async function GET() {
  return NextResponse.json([]);
}
