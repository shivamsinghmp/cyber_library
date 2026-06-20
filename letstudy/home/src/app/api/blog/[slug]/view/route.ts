import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    // 1 view count per IP per slug per hour — prevents inflation and excessive DB writes
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      ?? request.headers.get("x-real-ip")
      ?? "unknown";
    const rl = rateLimit(`blog:view:${ip}:${slug}`, 1, 3600);
    if (!rl.success) {
      return NextResponse.json({ ok: true }); // silently ignore, don't error
    }

    const post = await prisma.blogPost.update({
      where: { slug },
      data: { views: { increment: 1 } },
      select: { views: true },
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
