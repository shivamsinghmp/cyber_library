import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import DOMPurify from "isomorphic-dompurify";
import { logAdminAction } from "@/lib/audit-logger";
import { rateLimit } from "@/lib/rate-limit";
import { invalidateCache } from "@/lib/redis";
import { checkStaffModuleApi } from "@/lib/permissions";

/** Call after any blog post create/update/delete to keep caches fresh.
 *  Only the Redis key is meaningful here — revalidatePath only affects this
 *  app's own router cache, and staff.lstudy.in doesn't serve /blog itself. */
async function invalidateBlogCaches() {
  await invalidateCache("public:recent-blogs");
}

const createSchema = z.object({
  slug: z.string().min(1).max(200).transform((s) => s.trim().toLowerCase().replace(/\s+/g, "-")),
  title: z.string().min(1).max(500),
  excerpt: z.string().max(2000).nullable().optional(),
  body: z.string().min(1),
  coverImage: z.string().max(1000).nullable().optional(),
  metaTitle: z.string().max(100).nullable().optional(),
  metaDescription: z.string().max(500).nullable().optional(),
  publishedAt: z.union([z.string().datetime(), z.null()]).optional(),
});

export async function GET() {
  try {
    const auth = await checkStaffModuleApi("CONTENT");
    if (auth.error) return auth.error;

    const posts = await prisma.blogPost.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true, slug: true, title: true, excerpt: true,
        coverImage: true, publishedAt: true, createdAt: true,
        metaTitle: true, metaDescription: true, views: true,
        _count: { select: { comments: true } },
      },
    });
    return NextResponse.json(posts);
  } catch (e) {
    console.error("GET /api/staff/blog:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await checkStaffModuleApi("CONTENT");
    if (auth.error) return auth.error;
    const { user } = auth;

    const rl = rateLimit(`staff_blog_${user.id}`, 5, 60); // 5 creates per minute max
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
        body: DOMPurify.sanitize(data.body),
        coverImage: data.coverImage?.trim() || null,
        metaTitle: data.metaTitle?.trim() || null,
        metaDescription: data.metaDescription?.trim() || null,
        publishedAt: data.publishedAt ? new Date(data.publishedAt) : null,
      },
    });

    await Promise.all([
      logAdminAction(
        user.id,
        "CREATE",
        "BLOG",
        `Created blog post '${post.title}' (${post.slug})`,
        request.headers.get("x-forwarded-for") || undefined
      ),
      invalidateBlogCaches(),
    ]);

    return NextResponse.json(post, { status: 201 });
  } catch (e) {
    console.error("POST /api/staff/blog:", e);
    return NextResponse.json({ error: "Failed to create post" }, { status: 500 });
  }
}
