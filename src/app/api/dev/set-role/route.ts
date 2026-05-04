import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

/**
 * Development-only endpoint to set a user role for testing.
 * BLOCKED entirely in production — returns 404 if NODE_ENV !== "development".
 * POST body: { email: string, role: "ADMIN"|"EMPLOYEE"|"STUDENT"|"INFLUENCER"|"AUTHOR", secret: string }
 */

const ALLOWED_ROLES = ["ADMIN", "EMPLOYEE", "STUDENT", "INFLUENCER", "AUTHOR"] as const;

export async function POST(request: Request) {
  // Hard block in production — this route must not exist outside development
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }

  try {
    const body = await request.json();
    const { email, role: rawRole, secret } = body;

    const expectedSecret = process.env.DEV_SET_ROLE_SECRET;

    if (!expectedSecret || !secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Timing-safe compare to prevent brute-force
    const expectedBuf = Buffer.from(expectedSecret);
    const secretBuf   = Buffer.from(String(secret));

    if (
      expectedBuf.length !== secretBuf.length ||
      !crypto.timingSafeEqual(expectedBuf, secretBuf)
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Missing or invalid email" }, { status: 400 });
    }

    const role = String(rawRole).toUpperCase();
    if (!ALLOWED_ROLES.includes(role as (typeof ALLOWED_ROLES)[number])) {
      return NextResponse.json(
        { error: `Invalid role. Use: ${ALLOWED_ROLES.join(", ")}` },
        { status: 400 }
      );
    }

    const updated = await prisma.user.updateMany({
      where: { email: email.trim() },
      data: { role },
    });

    if (updated.count === 0) {
      return NextResponse.json({ error: "No user found with that email" }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      message: `Role set to ${role} for ${email}. Log out and back in for changes to take effect.`,
    });
  } catch (e) {
    console.error("POST /api/dev/set-role:", e);
    return NextResponse.json({ error: "Failed to set role" }, { status: 500 });
  }
}
