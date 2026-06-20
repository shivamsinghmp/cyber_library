import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

export async function GET(request: Request) {
  // Rate-limit per IP to slow user-enumeration scans against this endpoint.
  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rl = rateLimit(`check-email:${ip}`, 10, 60);
  if (!rl.success) {
    return NextResponse.json({ exists: false, verified: false }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email")?.trim().toLowerCase() ?? "";

  // Reject malformed input early without giving any signal.
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return NextResponse.json({ exists: false, verified: false });
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { emailVerified: true, deletedAt: true },
  });

  if (!user || user.deletedAt) {
    return NextResponse.json({ exists: false, verified: false });
  }

  return NextResponse.json({ exists: true, verified: !!user.emailVerified });
}
