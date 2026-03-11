import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** Get one published post by slug (for public /blog/[slug] page) */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const post = await prisma.blogPost.findFirst({
      where: { slug, publishedAt: { not: null } },
    });
    if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(post);
  } catch (e) {
    console.error("GET /api/blog/[slug]:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
