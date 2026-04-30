import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import DOMPurify from "isomorphic-dompurify";
import { logAdminAction } from "@/lib/audit-logger";
import { rateLimit } from "@/lib/rate-limit";

async function checkAdminContentAccess(session: { user?: { role?: string; id?: string } | null } | null) {
  if (!session?.user) return false;
  if (session.user.role === "ADMIN") return true;
  if (session.user.role === "EMPLOYEE") {
    const p = await prisma.employeePermission.findUnique({ where: { userId: session.user.id }});
    return p?.modules.includes("CONTENT");
  }
  return false;
}

const updateSchema = z.object({
  slug: z.string().min(1).max(200).transform((s) => s.trim().toLowerCase().replace(/\s+/g, "-")).optional(),
  title: z.string().min(1).max(500).optional(),
  excerpt: z.string().max(2000).nullable().optional(),
  body: z.string().min(1).optional(),
  metaTitle: z.string().max(100).nullable().optional(),
  metaDescription: z.string().max(500).nullable().optional(),
  publishedAt: z.string().datetime().nullable().optional(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const hasAccess = await checkAdminContentAccess(session);
    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { id } = await params;
    const post = await prisma.blogPost.findUnique({ where: { id } });
    if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });
    return NextResponse.json(post);
  } catch (e) {
    console.error("GET /api/admin/blog/[id]:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const hasAccess = await checkAdminContentAccess(session);
    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const rl = rateLimit(`admin_blog_${session?.user?.id}`, 10, 60); // Max 10 edits per minute per admin account
    if (!rl.success) {
      return NextResponse.json({ error: "Too many actions (Rate Limit). Please wait." }, { status: 429 });
    }

    const { id } = await params;
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
    if (data.slug) {
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
    if (data.body !== undefined) updateData.body = DOMPurify.sanitize(data.body); // SANITIZED!
    if (data.metaTitle !== undefined) updateData.metaTitle = data.metaTitle?.trim() || null;
    if (data.metaDescription !== undefined) updateData.metaDescription = data.metaDescription?.trim() || null;
    if (data.publishedAt !== undefined) updateData.publishedAt = data.publishedAt ? new Date(data.publishedAt) : null;

    const post = await prisma.blogPost.update({
      where: { id },
      data: updateData as never,
    });

    await logAdminAction(
      session?.user?.id || "UNKNOWN",
      "UPDATE",
      "BLOG",
      `Updated blog post '${post.title}'`,
      request.headers.get("x-forwarded-for") || undefined
    );

    return NextResponse.json(post);
  } catch (e) {
    if ((e as { code?: string })?.code === "P2025") {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }
    console.error("PUT /api/admin/blog/[id]:", e);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const hasAccess = await checkAdminContentAccess(session);
    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const rl = rateLimit(`admin_blog_${session?.user?.id}`, 10, 60);
    if (!rl.success) {
      return NextResponse.json({ error: "Too many actions (Rate Limit). Please wait." }, { status: 429 });
    }

    const { id } = await params;
    const existing = await prisma.blogPost.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }
    
    await prisma.blogPost.delete({ where: { id } });

    await logAdminAction(
      session?.user?.id || "UNKNOWN",
      "DELETE",
      "BLOG",
      `Deleted blog post '${existing.title}'`,
      _request.headers.get("x-forwarded-for") || undefined
    );

    return NextResponse.json({ ok: true });
  } catch (e) {
    if ((e as { code?: string })?.code === "P2025") {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }
    console.error("DELETE /api/admin/blog/[id]:", e);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
