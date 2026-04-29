import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { requireSuperAdmin } from "@/lib/api-helpers";

const updateSchema = z.object({
  name: z.string().optional(),
  email: z.string().email("Invalid email").optional(),
  role: z.enum(["EMPLOYEE", "INFLUENCER"]).optional(),
  newPassword: z.string().min(8, "Password at least 8 characters").optional(),
});

/** GET: Get one staff/influencer (admin) */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireSuperAdmin();
    if (auth.error) return auth.error;
    const { user } = auth;
    const { id } = await params;
    const user = await prisma.user.findFirst({
      where: { id, role: { in: ["EMPLOYEE", "INFLUENCER"] } },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });
    if (!user) return NextResponse.json({ error: "Staff not found" }, { status: 404 });
    return NextResponse.json(user);
  } catch (e) {
    console.error("GET /api/admin/staff/[id]:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

/** PUT: Update staff/influencer (admin) */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireSuperAdmin();
    if (auth.error) return auth.error;
    const { user } = auth;
    const { id } = await params;
    const existing = await prisma.user.findFirst({
      where: { id, role: { in: ["EMPLOYEE", "INFLUENCER"] } },
    });
    if (!existing) return NextResponse.json({ error: "Staff not found" }, { status: 404 });

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const data: { name?: string; email?: string; role?: string; password?: string } = {};
    if (parsed.data.name !== undefined) data.name = parsed.data.name;
    if (parsed.data.email !== undefined) data.email = parsed.data.email;
    if (parsed.data.role !== undefined) data.role = parsed.data.role;
    if (parsed.data.newPassword) {
      data.password = await bcrypt.hash(parsed.data.newPassword, 12);
    }

    if (data.email && data.email !== existing.email) {
      const taken = await prisma.user.findUnique({ where: { email: data.email } });
      if (taken) {
        return NextResponse.json(
          { error: { email: ["An account with this email already exists."] } },
          { status: 409 }
        );
      }
    }

    const updated = await prisma.user.update({
      where: { id },
      data,
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });
    return NextResponse.json(updated);
  } catch (e) {
    console.error("PUT /api/admin/staff/[id]:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

/** DELETE: Remove staff/influencer (admin). Cannot delete self or ADMIN. */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const currentUserId = (session?.user as { id?: string })?.id;
    if ((session?.user as { role?: string })?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { id } = await params;
    if (id === currentUserId) {
      return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 });
    }
    const existing = await prisma.user.findFirst({
      where: { id, role: { in: ["EMPLOYEE", "INFLUENCER"] } },
    });
    if (!existing) return NextResponse.json({ error: "Staff not found" }, { status: 404 });

    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("DELETE /api/admin/staff/[id]:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
