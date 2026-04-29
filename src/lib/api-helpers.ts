import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// ─── Types ────────────────────────────────────────────────────────────────────

export type AuthUser = {
  id: string;
  role: string;
  email?: string | null;
};

type AuthResult =
  | { user: AuthUser; error?: never }
  | { user?: never; error: NextResponse };

// ─── Auth Helpers ─────────────────────────────────────────────────────────────

/** Any logged-in user. Returns { user } or { error: 401 response }. */
export async function requireUser(): Promise<AuthResult> {
  const session = await auth();
  let id = (session?.user as { id?: string })?.id;

  // Fallback: look up by email (Google OAuth users sometimes lack id in session)
  if (!id && session?.user?.email) {
    const dbUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });
    if (dbUser) id = dbUser.id;
  }

  if (!session?.user || !id) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const role = (session.user as { role?: string })?.role ?? "STUDENT";
  return { user: { id, role, email: session.user.email } };
}

/** Admin OR Employee. Returns { user } or { error: 403 response }. */
export async function requireAdmin(): Promise<AuthResult> {
  const session = await auth();
  const role = (session?.user as { role?: string })?.role;
  const id = (session?.user as { id?: string })?.id;

  if (!session?.user || !id || (role !== "ADMIN" && role !== "EMPLOYEE")) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { user: { id, role, email: session.user.email } };
}

/** Admin only (not Employee). */
export async function requireSuperAdmin(): Promise<AuthResult> {
  const session = await auth();
  const role = (session?.user as { role?: string })?.role;
  const id = (session?.user as { id?: string })?.id;

  if (!session?.user || !id || role !== "ADMIN") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { user: { id, role, email: session.user.email } };
}

// ─── Response Helpers ─────────────────────────────────────────────────────────

/** Standard 500 error with console.error. */
export function serverError(label: string, e: unknown): NextResponse {
  console.error(`${label}:`, e);
  return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
}

/** 400 Bad Request */
export function badRequest(message: string): NextResponse {
  return NextResponse.json({ error: message }, { status: 400 });
}

/** 404 Not Found */
export function notFound(message = "Not found"): NextResponse {
  return NextResponse.json({ error: message }, { status: 404 });
}

/** Zod parse error → 400 */
export function zodError(errors: Record<string, string[] | undefined>): NextResponse {
  return NextResponse.json({ error: errors }, { status: 400 });
}
