import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

// Lets the login page show "your account is pending approval" instead of a
// generic "wrong password" after a failed signIn() attempt. Only called
// post-failure, mirroring the existing check-email-status precedent.
export async function GET(request: Request) {
  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rl = rateLimit(`check-employee:${ip}`, 10, 60);
  if (!rl.success) {
    return NextResponse.json({ exists: false }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email")?.trim().toLowerCase() ?? "";

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return NextResponse.json({ exists: false });
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { role: true, employeeStatus: true, deletedAt: true },
  });

  if (!user || user.deletedAt || user.role !== "EMPLOYEE") {
    return NextResponse.json({ exists: false });
  }

  return NextResponse.json({ exists: true, status: user.employeeStatus });
}
