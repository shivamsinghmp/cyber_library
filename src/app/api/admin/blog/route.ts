import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

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
    const role = (session?.user as { role?: string })?.role;
    if (!session?.user || role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const posts = await prisma.blogPost.findMany({
      orderBy: { createdAt: "desc" },
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
    const role = (session?.user as { role?: string })?.role;
    if (!session?.user || role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
        body: data.body,
        metaTitle: data.metaTitle?.trim() || null,
        metaDescription: data.metaDescription?.trim() || null,
        publishedAt: data.publishedAt ? new Date(data.publishedAt) : null,
      },
    });
    return NextResponse.json(post, { status: 201 });
  } catch (e) {
    console.error("POST /api/admin/blog:", e);
    return NextResponse.json({ error: "Failed to create post" }, { status: 500 });
  }
}
