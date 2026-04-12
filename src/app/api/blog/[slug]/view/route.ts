import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    
    // Increment the views counter for this blog post
    const post = await prisma.blogPost.update({
      where: { slug: slug },
      data: { views: { increment: 1 } },
      select: { views: true }
    });

    return NextResponse.json({ views: post.views });
  } catch (e) {
    if ((e as { code?: string })?.code === "P2025") {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }
    console.error(`POST /api/blog/[slug]/view error:`, e);
    return NextResponse.json({ error: "Failed to update views" }, { status: 500 });
  }
}
