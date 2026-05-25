import type { NextAuthConfig } from "next-auth";

// Lightweight NextAuth config for Edge middleware — no Prisma, no Node.js-only libs.
// The full config (with Prisma adapter, bcrypt, etc.) lives in auth.ts.
export const authConfig = {
  pages: { signIn: "/login" },
  session: { strategy: "jwt" as const },
  providers: [],
  trustHost: true,
  callbacks: {
    jwt({ token }) { return token; },
    session({ session, token }) {
      if (session.user && token) {
        (session.user as { id?: string }).id = token.id as string;
        (session.user as { role?: string }).role = token.role as string;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
