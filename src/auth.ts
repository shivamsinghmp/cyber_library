import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { 
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60, // 7 days (reduced from 30)
  },
  trustHost: true,
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.goal = (user as { goal?: string }).goal;
        token.role = (user as { role?: string }).role ?? "STUDENT";
        
        // --- 4 DEVICE LIMIT LOGIC ---
        // 1. Generate a new JWT ID for this specific login session
        const jti = crypto.randomUUID();
        token.jti = jti;

        // 2. Count active sessions for this user
        const activeSessions = await prisma.session.findMany({
          where: { userId: user.id },
          orderBy: { expires: "asc" }, // Oldest expires first
        });

        // 3. If there are already 4 or more sessions, delete the oldest ones so we only have 3 left
        if (activeSessions.length >= 4) {
          const toDelete = activeSessions.slice(0, activeSessions.length - 3);
          const idsToDelete = toDelete.map(s => s.id);
          await prisma.session.deleteMany({
            where: { id: { in: idsToDelete } }
          });
        }

        // 4. Create the new session record in DB to track this specific device
        await prisma.session.create({
          data: {
             sessionToken: jti,
             userId: user.id as string,
             expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          }
        });
      }

      // --- VALIDATE SESSION (If not first login) ---
      if (!user && token.jti) {
         try {
            const dbSession = await prisma.session.findUnique({
               where: { sessionToken: token.jti as string }
            });
            // If the session was deleted, we log a warning but DO NOT revoke the token 
            // to avoid a disparity between middleware.ts and useSession()
            if (!dbSession) {
               console.warn("Session missing in DB for JWT, ignoring to maintain UI state.");
            }
         } catch (e) {
            // DB fail fallback - continue allowing request
         }
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
      if (!token || (!token.id && !token.email)) {
         return {} as any;
      }

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
