import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import DOMPurify from "isomorphic-dompurify";
import { logAdminAction } from "@/lib/audit-logger";
import { rateLimit } from "@/lib/rate-limit";
import { invalidateCache } from "@/lib/redis";
import { checkStaffModuleApi } from "@/lib/permissions";

async function invalidateBlogCaches() {
  await invalidateCache("public:recent-blogs");
}

const updateSchema = z.object({
  slug: z.string().min(1).max(200).transform((s) => s.trim().toLowerCase().replace(/\s+/g, "-")).optional(),
  title: z.string().min(1).max(500).optional(),
  excerpt: z.string().max(2000).nullable().optional(),
  body: z.string().min(1).optional(),
  coverImage: z.string().max(1000).nullable().optional(),
  metaTitle: z.string().max(100).nullable().optional(),
  metaDescription: z.string().max(500).nullable().optional(),
  publishedAt: z.string().datetime().nullable().optional(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await checkStaffModuleApi("CONTENT");
    if (auth.error) return auth.error;

    const { id } = await params;
    const post = await prisma.blogPost.findUnique({ where: { id } });
    if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });
    return NextResponse.json(post);
  } catch (e) {
    console.error("GET /api/staff/blog/[id]:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await checkStaffModuleApi("CONTENT");
    if (auth.error) return auth.error;
    const { user } = auth;

    const rl = rateLimit(`staff_blog_${user.id}`, 10, 60); // Max 10 edits per minute
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
    if (data.body !== undefined) updateData.body = DOMPurify.sanitize(data.body);
    if (data.coverImage !== undefined) updateData.coverImage = data.coverImage?.trim() || null;
    if (data.metaTitle !== undefined) updateData.metaTitle = data.metaTitle?.trim() || null;
    if (data.metaDescription !== undefined) updateData.metaDescription = data.metaDescription?.trim() || null;
    if (data.publishedAt !== undefined) updateData.publishedAt = data.publishedAt ? new Date(data.publishedAt) : null;

    const post = await prisma.blogPost.update({
      where: { id },
      data: updateData as never,
    });

    await Promise.all([
      logAdminAction(
        user.id,
        "UPDATE",
        "BLOG",
        `Updated blog post '${post.title}'`,
        request.headers.get("x-forwarded-for") || undefined
      ),
      invalidateBlogCaches(),
    ]);

    return NextResponse.json(post);
  } catch (e) {
    if ((e as { code?: string })?.code === "P2025") {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }
    console.error("PUT /api/staff/blog/[id]:", e);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await checkStaffModuleApi("CONTENT");
    if (auth.error) return auth.error;
    const { user } = auth;

    const rl = rateLimit(`staff_blog_${user.id}`, 10, 60);
    if (!rl.success) {
      return NextResponse.json({ error: "Too many actions (Rate Limit). Please wait." }, { status: 429 });
    }

    const { id } = await params;
    const existing = await prisma.blogPost.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    await prisma.blogPost.delete({ where: { id } });

    await Promise.all([
      logAdminAction(
        user.id,
        "DELETE",
        "BLOG",
        `Deleted blog post '${existing.title}'`,
        request.headers.get("x-forwarded-for") || undefined
      ),
      invalidateBlogCaches(),
    ]);

    return NextResponse.json({ ok: true });
  } catch (e) {
    if ((e as { code?: string })?.code === "P2025") {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }
    console.error("DELETE /api/staff/blog/[id]:", e);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
