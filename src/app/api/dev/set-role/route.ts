import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const ALLOWED_ROLES = ["ADMIN", "EMPLOYEE", "STUDENT", "INFLUENCER", "AUTHOR"] as const;

/**
 * Development-only API to set a user's role (e.g. promote a student to ADMIN for testing).
 * Requires DEV_SET_ROLE_SECRET in .env to match the request body secret.
 * POST body: { email: string, role: "ADMIN"|"EMPLOYEE"|"STUDENT"|"INFLUENCER", secret: string }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, role: rawRole, secret } = body;

    const expectedSecret = process.env.DEV_SET_ROLE_SECRET;
    if (!expectedSecret || secret !== expectedSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid email" },
        { status: 400 }
      );
    }

    const role = String(rawRole).toUpperCase();
    if (!ALLOWED_ROLES.includes(role as (typeof ALLOWED_ROLES)[number])) {
      return NextResponse.json(
        { error: "Invalid role. Use: ADMIN, EMPLOYEE, STUDENT, INFLUENCER" },
        { status: 400 }
      );
    }

    const user = await prisma.user.updateMany({
      where: { email: email.trim() },
      data: { role },
    });

    if (user.count === 0) {
      return NextResponse.json(
        { error: "No user found with that email" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: `Role set to ${role} for ${email}. Log out and log in again for it to take effect.`,
    });
  } catch (e) {
    console.error("POST /api/dev/set-role:", e);
    return NextResponse.json(
      { error: "Failed to set role" },
      { status: 500 }
    );
  }
}
