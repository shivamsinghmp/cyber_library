import { NextResponse } from "next/server";
import { prisma } from "./prisma";

// ─── Types ────────────────────────────────────────────────────────────────────

export type AuthUser = {
  id: string;
  role: string;
  email?: string | null;
};

type AuthResult =
  | { user: AuthUser; error?: never }
  | { user?: never; error: NextResponse };

type AuthFn = () => Promise<{ user?: { id?: string; email?: string | null; role?: string } } | null>;

// ─── Auth Helpers ─────────────────────────────────────────────────────────────
// Factory, not direct exports — `auth()` is app-specific (each app calls
// packages/shared/auth's createAuth() with its own prefix), so these helpers
// are bound to whichever auth instance the calling app passes in. Each app
// has a tiny local src/lib/api-helpers.ts that does:
//   export const { requireUser, requireAdmin, requireSuperAdmin } = createApiHelpers(auth);
//
// NOTE: requireModule() (student feature-gating, used by the public app's
// student dashboard) intentionally does NOT live here — it depends on
// ./student-modules, which is a public-site-only concept with no relevance
// to the isolated admin app. The public app keeps its own local addition for it.

export function createApiHelpers(auth: AuthFn) {
  /** Any logged-in user. Returns { user } or { error: 401 response }. */
  async function requireUser(): Promise<AuthResult> {
    const session = await auth();
    let id = session?.user?.id;

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

    const role = session.user.role ?? "STUDENT";
    return { user: { id, role, email: session.user.email } };
  }

  /** Admin OR Employee. Returns { user } or { error: 403 response }. */
  async function requireAdmin(): Promise<AuthResult> {
    const session = await auth();
    const role = session?.user?.role;
    const id = session?.user?.id;

    if (!session?.user || !id || (role !== "ADMIN" && role !== "EMPLOYEE")) {
      return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
    }
    return { user: { id, role, email: session.user.email } };
  }

  /** Admin only (not Employee). */
  async function requireSuperAdmin(): Promise<AuthResult> {
    const session = await auth();
    const role = session?.user?.role;
    const id = session?.user?.id;

    if (!session?.user || !id || role !== "ADMIN") {
      return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
    }
    return { user: { id, role, email: session.user.email } };
  }

  return { requireUser, requireAdmin, requireSuperAdmin };
}

// ─── Response Helpers (no auth dependency — plain exports) ────────────────────

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
