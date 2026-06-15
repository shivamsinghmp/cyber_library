import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

// Synthetic ID used for the env-based superadmin (never stored in DB)
const ENV_SUPERADMIN_ID = "ENV_SUPERADMIN";

export const { handlers, auth, signIn, signOut } = NextAuth({
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

        // Env-based superadmin: stateless JWT only — no DB session created
        if (user.id === ENV_SUPERADMIN_ID) {
          return token;
        }

        // ── 1-device session limit — new login kicks all other sessions ──
        const jti = crypto.randomUUID();
        token.jti = jti;

        // Atomic: delete old sessions then create new one in a transaction
        try {
          await prisma.$transaction([
            prisma.session.deleteMany({ where: { userId: user.id as string } }),
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
                  where: { userId: token.id as string },
                  select: { sessionToken: true, expires: true },
                });
                if (!anyOtherSession) {
                  // No other session — safe to self-heal
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
                  // Another session exists — determine if this is 1-device enforcement
                  // or a race condition from a concurrent login attempt.
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
                console.info(`[auth] Account deleted for ${token.id} — forcing re-login`);
                return {} as typeof token;
              }
            } else {
              return {} as typeof token;
            }
          }
        } catch (err) {
          // DB unreachable during session validation — fail open to avoid
          // spurious logouts when the DB is temporarily unavailable.
          console.error("[auth] Session DB validation failed:", err);
          return token;
        }
      }

      // Refresh role from DB on subsequent requests if missing
      if (token.id && token.id !== ENV_SUPERADMIN_ID && !token.role) {
        const u = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { role: true },
        });
        token.role = (u as { role?: string } | null)?.role ?? "STUDENT";
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
  events: {
    async signIn({ user }) {
      if (!user?.id || user.id === ENV_SUPERADMIN_ID) return;
      try {
        const cookieStore = await cookies();
        const infVid = cookieStore.get("inf_vid")?.value;
        const infRef = cookieStore.get("inf_ref")?.value;

        // 1. Link existing InfluencerLinkClicks to this user by visitorId
        if (infVid) {
          await prisma.influencerLinkClick.updateMany({
            where: { visitorId: infVid, userId: null },
            data: { userId: user.id },
          });
        }

        // 2. Late attribution: if referredByInfluencer is null AND inf_ref cookie exists, set it now
        if (infRef) {
          const dbUser = await prisma.user.findUnique({
            where: { id: user.id },
            select: { referredByInfluencer: true },
          });
          if (dbUser && !dbUser.referredByInfluencer) {
            const influencer = await prisma.user.findFirst({
              where: { referralCode: infRef, role: "INFLUENCER", deletedAt: null },
              select: { id: true },
            });
            if (influencer) {
              await prisma.user.update({
                where: { id: user.id },
                data: { referredByInfluencer: influencer.id },
              });
            }
          }
        }
      } catch (err) {
        console.error("[auth] signIn event influencer linking failed:", err);
      }
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
        const emailRl = rateLimit(`login_email:${email}`, 10, 900);
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
            deletedAt: true, emailVerified: true,
          },
        });

        if (!user?.password || (user as { deletedAt?: Date | null }).deletedAt) return null;

        const ok = await bcrypt.compare(password, user.password);
        if (!ok) return null;

        const role = (user as { role?: string }).role ?? "STUDENT";
        if (requestedRole && role !== requestedRole) return null;

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
