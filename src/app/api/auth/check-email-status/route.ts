import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email")?.trim().toLowerCase() ?? "";

  if (!email) {
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
