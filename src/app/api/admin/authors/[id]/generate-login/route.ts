import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
function randomPassword(length: number): string {
  let s = "";
  const bytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) s += CHARS[bytes[i]! % CHARS.length];
  return s;
}

/** POST: Create author login with admin-provided email + password, or auto-generate, or regenerate password. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const role = (session?.user as { role?: string })?.role;
    if (!session?.user || role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { id: authorId } = await params;
    const author = await prisma.author.findUnique({
      where: { id: authorId },
      include: { user: { select: { id: true, email: true } } },
    });
    if (!author) {
      return NextResponse.json({ error: "Author not found" }, { status: 404 });
    }

    const body = (await request.json().catch(() => ({}))) as {
      email?: string;
      password?: string;
      regeneratePassword?: boolean;
      newPassword?: string;
    };
    const adminEmail = typeof body.email === "string" ? body.email.trim() : "";
    const adminPassword = typeof body.password === "string" ? body.password : "";
    const regenerateOnly = Boolean(body.regeneratePassword);
    const newPassword = typeof body.newPassword === "string" ? body.newPassword.trim() : "";

    if (author.userId && author.user) {
      if (regenerateOnly || newPassword) {
        const pwd = newPassword || randomPassword(12);
        if (newPassword && pwd.length < 8) {
          return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
        }
        const hashed = await bcrypt.hash(pwd, 12);
        await prisma.user.update({
          where: { id: author.user.id },
          data: { password: hashed },
        });
        return NextResponse.json({
          email: author.user.email,
          password: pwd,
          userId: author.user.id,
          message: "Password updated. Share with the author if needed.",
        });
      }
      return NextResponse.json(
        { error: "Author already has login. Use newPassword to set a new password." },
        { status: 400 }
      );
    }

    if (adminEmail && adminPassword) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(adminEmail)) {
        return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
      }
      if (adminPassword.length < 8) {
        return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
      }
      const existing = await prisma.user.findUnique({ where: { email: adminEmail } });
      if (existing) {
        return NextResponse.json({ error: "This email is already registered. Use another or link existing user." }, { status: 400 });
      }
      const hashedPassword = await bcrypt.hash(adminPassword, 12);
      const user = await prisma.user.create({
        data: {
          email: adminEmail,
          name: author.name,
          password: hashedPassword,
          role: "AUTHOR",
          emailVerified: new Date(),
        },
      });
      await prisma.author.update({
        where: { id: authorId },
        data: { userId: user.id },
      });
      return NextResponse.json({
        email: user.email,
        userId: user.id,
        message: "Login account created. Author can log in and fill their profile.",
      });
    }

    const uniqueEmail = `author-${author.id}@authors.local`;
    const existing = await prisma.user.findUnique({ where: { email: uniqueEmail } });
    if (existing) {
      const password = randomPassword(12);
      const hashed = await bcrypt.hash(password, 12);
      await prisma.user.update({
        where: { id: existing.id },
        data: { password: hashed, role: "AUTHOR", name: author.name },
      });
      await prisma.author.update({
        where: { id: authorId },
        data: { userId: existing.id },
      });
      return NextResponse.json({
        email: uniqueEmail,
        password,
        userId: existing.id,
        message: "Login credentials generated. Share with the author.",
      });
    }

    const password = randomPassword(12);
    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        email: uniqueEmail,
        name: author.name,
        password: hashedPassword,
        role: "AUTHOR",
        emailVerified: new Date(),
      },
    });
    await prisma.author.update({
      where: { id: authorId },
      data: { userId: user.id },
    });

    return NextResponse.json({
      email: user.email,
      password,
      userId: user.id,
      message: "Login credentials generated. Share with the author.",
    });
  } catch (e) {
    console.error("POST /api/admin/authors/[id]/generate-login:", e);
    return NextResponse.json({ error: "Failed to generate login" }, { status: 500 });
  }
}
