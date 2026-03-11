import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).max(200).transform((s) => s.trim()).optional(),
  slug: z
    .string()
    .min(1)
    .max(120)
    .transform((s) => s.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""))
    .optional(),
  bio: z.string().max(5000).nullable().optional(),
  imageUrl: z.string().url().max(1000).nullable().optional(),
  userId: z.string().nullable().optional(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const role = (session?.user as { role?: string })?.role;
    if (!session?.user || role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { id } = await params;
    const author = await prisma.author.findUnique({
      where: { id },
      include: { _count: { select: { posts: true } }, user: { select: { id: true, name: true, email: true } } },
    });
    if (!author) return NextResponse.json({ error: "Author not found" }, { status: 404 });
    return NextResponse.json(author);
  } catch (e) {
    console.error("GET /api/admin/authors/[id]:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return updateHandler(request, params);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return updateHandler(request, params);
}

async function updateHandler(
  request: Request,
  params: Promise<{ id: string }>
) {
  try {
    const session = await auth();
    const role = (session?.user as { role?: string })?.role;
    if (!session?.user || role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { id } = await params;
    const body = await request.json();
    const parsed = updateSchema.safeParse({
      name: body.name,
      slug: body.slug,
      bio: body.bio ?? null,
      imageUrl: body.imageUrl ?? null,
      userId: body.userId === "" ? null : body.userId ?? undefined,
    });
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const data = parsed.data;
    if (data.slug !== undefined) {
      const existing = await prisma.author.findFirst({
        where: { slug: data.slug, id: { not: id } },
      });
      if (existing) {
        return NextResponse.json(
          { error: "Another author with this slug already exists" },
          { status: 400 }
        );
      }
    }
    if (data.userId !== undefined) {
      const otherAuthorWithUser = await prisma.author.findFirst({
        where: { userId: data.userId, id: { not: id } },
      });
      if (otherAuthorWithUser) {
        return NextResponse.json(
          { error: "That user is already linked to another author" },
          { status: 400 }
        );
      }
    }
    const previousAuthor = await prisma.author.findUnique({
      where: { id },
      select: { userId: true },
    });
    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.slug !== undefined) updateData.slug = data.slug;
    if (data.bio !== undefined) updateData.bio = data.bio?.trim() || null;
    if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl?.trim() || null;
    if (data.userId !== undefined) updateData.userId = data.userId;

    const author = await prisma.author.update({
      where: { id },
      data: updateData as Parameters<typeof prisma.author.update>[0]["data"],
    });

    if (data.userId !== undefined) {
      if (data.userId) {
        await prisma.user.update({
          where: { id: data.userId },
          data: { role: "AUTHOR" },
        });
      }
      if (previousAuthor?.userId && previousAuthor.userId !== data.userId) {
        await prisma.user.update({
          where: { id: previousAuthor.userId },
          data: { role: "STUDENT" },
        });
      }
    }

    return NextResponse.json(author);
  } catch (e) {
    if ((e as { code?: string })?.code === "P2025") {
      return NextResponse.json({ error: "Author not found" }, { status: 404 });
    }
    console.error("PATCH /api/admin/authors/[id]:", e);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const role = (session?.user as { role?: string })?.role;
    if (!session?.user || role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { id } = await params;
    await prisma.author.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if ((e as { code?: string })?.code === "P2025") {
      return NextResponse.json({ error: "Author not found" }, { status: 404 });
    }
    console.error("DELETE /api/admin/authors/[id]:", e);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
