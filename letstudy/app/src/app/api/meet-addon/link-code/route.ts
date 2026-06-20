import { NextResponse } from "next/server";
import { randomInt } from "crypto";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { canAccessModule } from "@/lib/student-modules";

const CODE_LENGTH = 6;
const EXPIRY_MINUTES = 5;

function generateCode(): string {
  let s = "";
  for (let i = 0; i < CODE_LENGTH; i++) s += String(randomInt(0, 10));
  return s;
}

export async function POST() {
  try {
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
  if (!await canAccessModule(userId, "meet-addon")) {
    return NextResponse.json({ error: "Meet Add-on is not available for your account." }, { status: 403 });
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
  } catch (e) {
    console.error("[meet-addon/link-code] POST error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
