import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  trustHost: true,
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.goal = (user as { goal?: string }).goal;
        token.role = (user as { role?: string }).role ?? "STUDENT";
      }
      if (token.id) {
        if (!token.role) {
          const u = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { role: true },
          });
          token.role = (u as { role?: string } | null)?.role ?? "STUDENT";
        }
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string }).id = token.id as string;
        (session.user as { goal?: string }).goal = token.goal as string | undefined;
        (session.user as { role?: string }).role = token.role as string;
      }
      return session;
    },
  },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        loginAsRole: { label: "Login as role", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const user = await prisma.user.findUnique({
          where: { email: String(credentials.email) },
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            goal: true,
            password: true,
            role: true,
            deletedAt: true,
            emailVerified: true,
          },
        });
        if (!user?.password || (user as { deletedAt?: Date | null }).deletedAt) return null;
        const ok = await bcrypt.compare(
          String(credentials.password),
          user.password
        );
        if (!ok) return null;
        const role = (user as { role?: string }).role ?? "STUDENT";
        const requestedRole = credentials.loginAsRole ? String(credentials.loginAsRole).trim() : null;
        if (requestedRole && role !== requestedRole) return null;
        return {
          id: user.id,
          name: user.name ?? undefined,
          email: user.email,
          image: user.image ?? undefined,
          goal: user.goal ?? undefined,
          role,
        };
      },
    }),
    ...(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
      ? [
          Google({
            clientId: process.env.AUTH_GOOGLE_ID,
            clientSecret: process.env.AUTH_GOOGLE_SECRET,
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),
  ],
});
