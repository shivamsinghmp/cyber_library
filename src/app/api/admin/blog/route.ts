import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import DOMPurify from "isomorphic-dompurify";
import { logAdminAction } from "@/lib/audit-logger";
import { rateLimit } from "@/lib/rate-limit";

async function checkAdminContentAccess(session: any) {
  if (!session?.user) return false;
  if (session.user.role === "ADMIN") return true;
  if (session.user.role === "EMPLOYEE") {
    const p = await prisma.employeePermission.findUnique({ where: { userId: session.user.id }});
    return p?.modules.includes("CONTENT");
  }
  return false;
}

const createSchema = z.object({
  slug: z.string().min(1).max(200).transform((s) => s.trim().toLowerCase().replace(/\s+/g, "-")),
  title: z.string().min(1).max(500),
  excerpt: z.string().max(2000).nullable().optional(),
  body: z.string().min(1),
  metaTitle: z.string().max(100).nullable().optional(),
  metaDescription: z.string().max(500).nullable().optional(),
  publishedAt: z.union([z.string().datetime(), z.null()]).optional(),
});

export async function GET() {
  try {
    const session = await auth();
    const hasAccess = await checkAdminContentAccess(session);
    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const posts = await prisma.blogPost.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { comments: true }
        }
      }
    });
    return NextResponse.json(posts);
  } catch (e) {
    console.error("GET /api/admin/blog:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    const hasAccess = await checkAdminContentAccess(session);
    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const rl = rateLimit(`admin_blog_${session?.user?.id}`, 5, 60); // 5 creates per minute max
    if (!rl.success) {
      return NextResponse.json({ error: "Too many creations! Please slow down." }, { status: 429 });
    }

    const body = await request.json();
    const parsed = createSchema.safeParse({
      ...body,
      publishedAt: body.publishedAt || null,
    });
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const data = parsed.data;
    const existing = await prisma.blogPost.findUnique({
      where: { slug: data.slug },
    });
    if (existing) {
      return NextResponse.json(
        { error: "A post with this slug already exists" },
        { status: 400 }
      );
    }
    const post = await prisma.blogPost.create({
      data: {
        slug: data.slug,
        title: data.title,
        excerpt: data.excerpt?.trim() || null,
        body: DOMPurify.sanitize(data.body), // SANITIZED!
        metaTitle: data.metaTitle?.trim() || null,
        metaDescription: data.metaDescription?.trim() || null,
        publishedAt: data.publishedAt ? new Date(data.publishedAt) : null,
      },
    });

    await logAdminAction(
      session?.user?.id || "UNKNOWN",
      "CREATE",
      "BLOG",
      `Created blog post '${post.title}' (${post.slug})`,
      request.headers.get("x-forwarded-for") || undefined
    );

    return NextResponse.json(post, { status: 201 });
  } catch (e) {
    console.error("POST /api/admin/blog:", e);
    return NextResponse.json({ error: "Failed to create post" }, { status: 500 });
  }
}
