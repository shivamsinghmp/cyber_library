import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/** POST: DEPRECATED - All reward enrollments are now handled securely by the backend /api/razorpay/verify route */
export async function POST(request: Request) {
  return NextResponse.json({ error: "Direct reward enrollment is disabled for security reasons." }, { status: 403 });
}
