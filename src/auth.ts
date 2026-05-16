import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/prisma";

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

        // Delete all existing sessions so previous device is logged out
        await prisma.session.deleteMany({ where: { userId: user.id as string } });

        await prisma.session.create({
          data: {
            sessionToken: jti,
            userId: user.id as string,
            expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day
          },
        });
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
            // Session record missing — could be stale (4-device cleanup) or deliberate revocation.
            // Check if the user account still exists and is not deleted.
            // If yes: self-heal by recreating the session record (stale jti case).
            // If no:  force logout (account deleted / revoked).
            if (token.id && token.id !== ENV_SUPERADMIN_ID) {
              const userStillExists = await prisma.user.findUnique({
                where: { id: token.id as string },
                select: { id: true, deletedAt: true },
              });
              if (userStillExists && !userStillExists.deletedAt) {
                // Self-heal: recreate session so subsequent requests work normally
                await prisma.session.create({
                  data: {
                    sessionToken: token.jti as string,
                    userId: token.id as string,
                    expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day
                  },
                }).catch(() => {}); // ignore race-condition duplicates
              } else {
                // Account deleted or soft-deleted — force logout
                console.info(`[auth] Account deleted for ${token.id} — forcing re-login`);
                return {} as typeof token;
              }
            } else {
              return {} as typeof token;
            }
          }
        } catch {
          // DB unreachable — fail open to avoid mass lockout
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
      if (!token || (!token.id && !token.email)) {
        return {} as any;
      }
      if (session.user) {
        (session.user as { id?: string }).id             = token.id as string;
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

        // ── Env-based superadmin (no DB lookup, no bcrypt) ────────────
        const saEmail    = process.env.SUPERADMIN_EMAIL?.trim().toLowerCase();
        const saPassword = process.env.SUPERADMIN_PASSWORD?.trim();

        if (saEmail && saPassword && email === saEmail && password === saPassword) {
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
