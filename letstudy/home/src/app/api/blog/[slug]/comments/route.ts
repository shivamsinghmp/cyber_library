import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { rateLimit } from "@/lib/rate-limit";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    
    const post = await prisma.blogPost.findUnique({
      where: { slug },
      select: { id: true }
    });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const comments = await prisma.blogComment.findMany({
      where: { postId: post.id },
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { name: true, image: true, role: true } }
      }
    });

    return NextResponse.json(comments);
  } catch (e) {
    console.error(`GET /api/blog/[slug]/comments error:`, e);
    return NextResponse.json({ error: "Failed to fetch comments" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 10 comments per user per hour — prevents comment spam
    const rl = rateLimit(`comment:${session.user.id}`, 10, 3600);
    if (!rl.success) {
      return NextResponse.json({ error: "Too many comments. Please try again later." }, { status: 429 });
    }

    const { slug } = await params;
    const body = await request.json();

    if (!body.content || typeof body.content !== "string" || body.content.trim().length === 0) {
      return NextResponse.json({ error: "Comment content is required" }, { status: 400 });
    }

    // Comments are plain text only. Strip every HTML tag and decode common entities
    // to prevent stored XSS regardless of how the frontend renders them.
    const cleanContent = body.content
      .replace(/<[^>]*>/g, "")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .replace(/&#x?[0-9a-f]+;/gi, "")
      .trim()
      .slice(0, 2000);

    if (cleanContent.length === 0) {
      return NextResponse.json({ error: "Comment content is required" }, { status: 400 });
    }

    const post = await prisma.blogPost.findUnique({
      where: { slug: slug },
      select: { id: true }
    });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const comment = await prisma.blogComment.create({
      data: {
        postId: post.id,
        userId: session.user.id,
        content: cleanContent
      },
      include: {
        user: { select: { name: true, image: true, role: true } }
      }
    });

    return NextResponse.json(comment, { status: 201 });
  } catch (e) {
    console.error(`POST /api/blog/[slug]/comments error:`, e);
    return NextResponse.json({ error: "Failed to create comment" }, { status: 500 });
  }
}
