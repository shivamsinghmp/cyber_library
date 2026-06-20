import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { prisma } from "./prisma";
import { rateLimit } from "./rate-limit";

// Synthetic ID used for the env-based superadmin (never stored in DB)
const ENV_SUPERADMIN_ID = "ENV_SUPERADMIN";

// How often the JWT re-checks role/isSuperAdmin against the DB. Matches PERM_TTL
// in permissions.ts so a demotion (role change or isSuperAdmin revoke) is reflected
// within the same ~5-minute window across the whole auth/permission stack, instead
// of the old JWT keeping its login-time role for the full 24h session maxAge.
const ROLE_REFRESH_INTERVAL_MS = 5 * 60 * 1000;

/**
 * Factory, not a singleton — each app (public site, admin-app) calls this
 * with its OWN appPrefix to get its own NextAuth instance. Both validate
 * against the same User table, but each app's session rows are scoped by
 * sessionToken prefix (e.g. "web:<uuid>" vs "admin:<uuid>") so the existing
 * "1-device login" enforcement only evicts THAT app's prior sessions for a
 * user — logging into admin-app no longer silently logs the same admin out
 * of the public site (and vice versa). Cookies are host-scoped by default
 * (no shared cookie domain is configured anywhere), so the two apps' login
 * states are otherwise fully independent — this only fixes the DB-session
 * collision that would happen because both point at the same Session table.
 */
export function createAuth(appPrefix: string) {
  const tokenPrefix = `${appPrefix}:`;

  return NextAuth({
    adapter: PrismaAdapter(prisma),
    session: {
      strategy: "jwt",
      maxAge: 24 * 60 * 60, // 1 day — daily auto-logout
    },
    trustHost: true,
    secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
    pages: {
      signIn: "/login",
    },
    callbacks: {
      async jwt({ token, user }) {
        if (user) {
          token.id   = user.id;
          token.goal = (user as { goal?: string }).goal;
          token.role = (user as { role?: string }).role ?? "STUDENT";
          token.isSuperAdmin = !!(user as { isSuperAdmin?: boolean }).isSuperAdmin;
          token.roleCheckedAt = Date.now();

          // Env-based superadmin: stateless JWT only — no DB session created
          if (user.id === ENV_SUPERADMIN_ID) {
            return token;
          }

          // ── 1-device session limit (scoped per-app via tokenPrefix) ──
          // New login on THIS app kicks all other sessions THIS APP created
          // for the user — it does not touch the other app's sessions.
          const jti = tokenPrefix + crypto.randomUUID();
          token.jti = jti;

          // Atomic: delete old sessions (this app only) then create new one in a transaction
          try {
            await prisma.$transaction([
              prisma.session.deleteMany({
                where: { userId: user.id as string, sessionToken: { startsWith: tokenPrefix } },
              }),
              prisma.session.create({
                data: {
                  sessionToken: jti,
                  userId: user.id as string,
                  expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
                },
              }),
            ]);
          } catch {
            // Concurrent login race — non-fatal, self-heal will run on next request
          }
        }

        // Fallback: ensure token.id is populated from token.sub (NextAuth default)
        if (!token.id && token.sub) {
          token.id = token.sub;
        }

        // Env superadmin: JWT is self-validating, skip DB check
        if (!user && token.id === ENV_SUPERADMIN_ID) {
          return token;
        }

        // ── Validate DB session (force-revocation support) ────────────
        if (!user && token.jti) {
          try {
            const dbSession = await prisma.session.findUnique({
              where: { sessionToken: token.jti as string },
            });
            if (!dbSession) {
              if (token.id && token.id !== ENV_SUPERADMIN_ID) {
                const userStillExists = await prisma.user.findUnique({
                  where: { id: token.id as string },
                  select: { id: true, deletedAt: true },
                });
                if (userStillExists && !userStillExists.deletedAt) {
                  const anyOtherSession = await prisma.session.findFirst({
                    where: { userId: token.id as string, sessionToken: { startsWith: tokenPrefix } },
                    select: { sessionToken: true, expires: true },
                  });
                  if (!anyOtherSession) {
                    // No other session (in THIS app) — safe to self-heal
                    await prisma.session.upsert({
                      where: { sessionToken: token.jti as string },
                      update: {},
                      create: {
                        sessionToken: token.jti as string,
                        userId: token.id as string,
                        expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
                      },
                    }).catch(() => {});
                  } else {
                    // Another session exists in THIS app — determine if this is 1-device
                    // enforcement or a race condition from a concurrent login attempt.
                    // Compare JWT iat with the other session's approximate creation time
                    // (expires - 24h). If our JWT was issued before the other session
                    // was created (minus a 3-min grace window), we're the stale device.
                    const iatMs = ((token.iat as number) ?? 0) * 1000;
                    const otherCreatedAt = anyOtherSession.expires.getTime() - 24 * 60 * 60 * 1000;
                    if (iatMs < otherCreatedAt - 3 * 60 * 1000) {
                      // Our JWT is clearly older — 1-device enforcement: force re-login
                      return {} as typeof token;
                    }
                    // Within the 3-min window: concurrent login race condition.
                    // Adopt the existing DB session to our jti so both requests succeed.
                    await prisma.session.update({
                      where: { sessionToken: anyOtherSession.sessionToken },
                      data: { sessionToken: token.jti as string },
                    }).catch(() => {});
                  }
                } else {
                  // Account deleted or soft-deleted — force logout
                  console.info(`[auth:${appPrefix}] Account deleted for ${token.id} — forcing re-login`);
                  return {} as typeof token;
                }
              } else {
                return {} as typeof token;
              }
            }
          } catch (err) {
            // DB unreachable during session validation — fail open to avoid
            // spurious logouts when the DB is temporarily unavailable.
            console.error(`[auth:${appPrefix}] Session DB validation failed:`, err);
            return token;
          }
        }

        // Periodically refresh role/isSuperAdmin from the DB — without this, a
        // demotion (role change or isSuperAdmin revoke) would have no effect until
        // the JWT's 24h maxAge naturally expires, since the JWT's claims otherwise
        // never get re-checked once set at login.
        if (token.id && token.id !== ENV_SUPERADMIN_ID) {
          const checkedAt = (token.roleCheckedAt as number) ?? 0;
          if (Date.now() - checkedAt > ROLE_REFRESH_INTERVAL_MS) {
            const u = await prisma.user.findUnique({
              where: { id: token.id as string },
              select: { role: true, isSuperAdmin: true },
            });
            if (u) {
              token.role = u.role ?? "STUDENT";
              token.isSuperAdmin = !!u.isSuperAdmin;
            }
            token.roleCheckedAt = Date.now();
          }
        }

        return token;
      },

      session({ session, token }) {
        if (!token || (!token.id && !token.sub && !token.email)) {
          return {} as any;
        }
        if (session.user) {
          // Use token.id first, fall back to token.sub (NextAuth default for user id)
          const userId = (token.id ?? token.sub) as string | undefined;
          (session.user as { id?: string }).id             = userId;
          (session.user as { goal?: string }).goal         = token.goal as string | undefined;
          (session.user as { role?: string }).role         = token.role as string;
          (session.user as { isSuperAdmin?: boolean }).isSuperAdmin = !!token.isSuperAdmin;
        }
        return session;
      },
    },
    providers: [
      Credentials({
        name: "Credentials",
        credentials: {
          email:       { label: "Email",         type: "email" },
          password:    { label: "Password",      type: "password" },
          loginAsRole: { label: "Login as role", type: "text" },
        },
        async authorize(credentials) {
          if (!credentials?.email || !credentials?.password) return null;

          const email    = String(credentials.email).trim().toLowerCase();
          const password = String(credentials.password);
          const requestedRole = credentials.loginAsRole
            ? String(credentials.loginAsRole).trim()
            : null;

          // Per-email rate limit: 10 attempts / 15 min — fallback when Upstash not configured.
          // (Middleware handles per-IP limit via Upstash when available.)
          const emailRl = rateLimit(`login_email:${appPrefix}:${email}`, 10, 900);
          if (!emailRl.success) return null;

          // ── Env-based superadmin (no DB lookup, no bcrypt) ────────────
          const saEmail    = process.env.SUPERADMIN_EMAIL?.trim().toLowerCase();
          const saPassword = process.env.SUPERADMIN_PASSWORD?.trim();

          // Use timingSafeEqual to prevent timing-based enumeration of the superadmin email/password.
          const emailMatch = saEmail
            ? (() => { try { return crypto.timingSafeEqual(Buffer.from(email), Buffer.from(saEmail)); } catch { return false; } })()
            : false;
          const passwordMatch = saPassword
            ? (() => { try { return crypto.timingSafeEqual(Buffer.from(password), Buffer.from(saPassword)); } catch { return false; } })()
            : false;
          if (saEmail && saPassword && emailMatch && passwordMatch) {
            // Only allow ADMIN role selection for the superadmin
            if (requestedRole && requestedRole !== "ADMIN") return null;
            return {
              id:          ENV_SUPERADMIN_ID,
              email:       saEmail,
              name:        "Super Admin",
              role:        "ADMIN",
              isSuperAdmin: true,
            } as any;
          }

          // ── Normal DB-based login ─────────────────────────────────────
          const user = await prisma.user.findUnique({
            where: { email },
            select: {
              id: true, name: true, email: true, image: true,
              goal: true, password: true, role: true,
              deletedAt: true, emailVerified: true, employeeStatus: true,
            },
          });

          if (!user?.password || (user as { deletedAt?: Date | null }).deletedAt) return null;

          const ok = await bcrypt.compare(password, user.password);
          if (!ok) return null;

          const role = (user as { role?: string }).role ?? "STUDENT";
          if (requestedRole && role !== requestedRole) return null;

          // Self-registered staff can't log in until an admin approves the account
          // (staff.lstudy.in signup flow) — admin-created EMPLOYEE accounts default
          // to APPROVED so this never affects the existing /admin/staff flow.
          if (role === "EMPLOYEE" && (user as { employeeStatus?: string }).employeeStatus !== "APPROVED") {
            return null;
          }

          return {
            id:    user.id,
            name:  user.name ?? undefined,
            email: user.email,
            image: user.image ?? undefined,
            goal:  user.goal ?? undefined,
            role,
          };
        },
      }),
    ],
  });
}
