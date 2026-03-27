import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";

const CODE_LENGTH = 6;
const EXPIRY_MINUTES = 5;

function randomDigit(): string {
  return String(Math.floor(Math.random() * 10));
}

function generateCode(): string {
  let s = "";
  for (let i = 0; i < CODE_LENGTH; i++) s += randomDigit();
  return s;
}

export async function POST() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as { id?: string }).id;
  if (!userId) return NextResponse.json({ error: "User not found" }, { status: 401 });

  const role = (session.user as { role?: string }).role;
  if (role !== "STUDENT" && role !== "ADMIN") {
    return NextResponse.json({ error: "Only students can get Meet add-on code" }, { status: 403 });
  }
  const limit = checkRateLimit(`meet-link-code:${userId}`, 8, 60_000);
  if (!limit.ok) {
    return NextResponse.json({ error: "Too many code generations. Please wait." }, { status: 429 });
  }

  const expiresAt = new Date(Date.now() + EXPIRY_MINUTES * 60 * 1000);
  let code = generateCode();
  for (let attempt = 0; attempt < 10; attempt++) {
    const existing = await prisma.meetAddonLinkCode.findUnique({ where: { code } });
    if (!existing) break;
    code = generateCode();
  }

  await prisma.meetAddonLinkCode.deleteMany({ where: { userId } });
  await prisma.meetAddonLinkCode.create({
    data: { userId, code, expiresAt },
  });
  console.info("meet-addon-link-code-generated", { userId });

  return NextResponse.json({
    code,
    expiresAt: expiresAt.toISOString(),
    expiresInMinutes: EXPIRY_MINUTES,
  });
}
