import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** List published blog posts (for public /blog page) */
export async function GET() {
  try {
    const posts = await prisma.blogPost.findMany({
      where: { publishedAt: { not: null } },
      orderBy: { publishedAt: "desc" },
      select: {
        id: true,
        slug: true,
        title: true,
        excerpt: true,
        publishedAt: true,
      },
    });
    return NextResponse.json(posts);
  } catch (e) {
    console.error("GET /api/blog:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
