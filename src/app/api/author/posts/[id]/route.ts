import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { sanitizeCustomCss } from "@/lib/sanitize-html";
import { z } from "zod";

async function getMyAuthorId(): Promise<string | null> {
  const session = await auth();
  const role = (session?.user as { role?: string })?.role;
  const userId = (session?.user as { id?: string })?.id;
  if (!session?.user || role !== "AUTHOR" || !userId) return null;
  const author = await prisma.author.findUnique({
    where: { userId },
    select: { id: true },
  });
  return author?.id ?? null;
}

const updateSchema = z.object({
  slug: z.string().min(1).max(200).transform((s) => s.trim().toLowerCase().replace(/\s+/g, "-")).optional(),
  title: z.string().min(1).max(500).optional(),
  excerpt: z.string().max(2000).nullable().optional(),
  body: z.string().min(1).optional(),
  metaTitle: z.string().max(100).nullable().optional(),
  metaDescription: z.string().max(500).nullable().optional(),
  customCss: z.string().max(15000).nullable().optional(),
  publishedAt: z.string().datetime().nullable().optional(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authorId = await getMyAuthorId();
    if (!authorId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { id } = await params;
    const post = await prisma.blogPost.findFirst({
      where: { id, authorId },
    });
    if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });
    return NextResponse.json(post);
  } catch (e) {
    console.error("GET /api/author/posts/[id]:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authorId = await getMyAuthorId();
    if (!authorId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { id } = await params;
    const post = await prisma.blogPost.findFirst({
      where: { id, authorId },
    });
    if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });

    const body = await request.json();
    const parsed = updateSchema.safeParse({
      ...body,
      publishedAt: body.publishedAt === "" ? null : body.publishedAt || undefined,
    });
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const data = parsed.data;
    if (data.slug !== undefined) {
      const existing = await prisma.blogPost.findFirst({
        where: { slug: data.slug, id: { not: id } },
      });
      if (existing) {
        return NextResponse.json(
          { error: "Another post with this slug already exists" },
          { status: 400 }
        );
      }
    }
    const updateData: Record<string, unknown> = {};
    if (data.slug !== undefined) updateData.slug = data.slug;
    if (data.title !== undefined) updateData.title = data.title;
    if (data.excerpt !== undefined) updateData.excerpt = data.excerpt?.trim() || null;
    if (data.body !== undefined) updateData.body = data.body;
    if (data.metaTitle !== undefined) updateData.metaTitle = data.metaTitle?.trim() || null;
    if (data.metaDescription !== undefined) updateData.metaDescription = data.metaDescription?.trim() || null;
    if (data.customCss !== undefined) updateData.customCss = data.customCss ? sanitizeCustomCss(data.customCss) : null;
    if (data.publishedAt !== undefined) updateData.publishedAt = data.publishedAt ? new Date(data.publishedAt) : null;

    const updated = await prisma.blogPost.update({
      where: { id },
      data: updateData as never,
    });
    return NextResponse.json(updated);
  } catch (e) {
    if ((e as { code?: string })?.code === "P2025") {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }
    console.error("PUT /api/author/posts/[id]:", e);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authorId = await getMyAuthorId();
    if (!authorId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { id } = await params;
    const post = await prisma.blogPost.findFirst({
      where: { id, authorId },
    });
    if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });
    await prisma.blogPost.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if ((e as { code?: string })?.code === "P2025") {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }
    console.error("DELETE /api/author/posts/[id]:", e);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
