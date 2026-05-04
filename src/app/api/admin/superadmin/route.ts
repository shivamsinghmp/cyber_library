import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { z } from "zod";

/**
 * Manage isSuperAdmin flag — only callable by another superadmin.
 * GET  — list all superadmins
 * POST — grant/revoke superadmin status
 */

async function requireSuperAdminDb() {
  const session = await auth();
  const userId = (session?.user as { id?: string })?.id;
  if (!userId) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isSuperAdmin: true, role: true },
  });
  if (!user?.isSuperAdmin) {
    return { error: NextResponse.json({ error: "Forbidden — superadmin only" }, { status: 403 }) };
  }
  return { userId };
}

export async function GET() {
  const auth = await requireSuperAdminDb();
  if (auth.error) return auth.error;

  const admins = await prisma.user.findMany({
    where: { isSuperAdmin: true },
    select: { id: true, email: true, name: true, createdAt: true },
  });
  return NextResponse.json(admins);
}

const bodySchema = z.object({
  email: z.string().email(),
  grant: z.boolean(),
});

export async function POST(request: Request) {
  const check = await requireSuperAdminDb();
  if (check.error) return check.error;

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const { email, grant } = parsed.data;

  const target = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });

  // Prevent self-revoke (safety check)
  if (!grant && target.id === check.userId) {
    return NextResponse.json({ error: "Cannot revoke your own superadmin status" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: target.id },
    data: { isSuperAdmin: grant },
  });

  return NextResponse.json({
    ok: true,
    message: `${email} superadmin status: ${grant ? "GRANTED" : "REVOKED"}`,
  });
}
