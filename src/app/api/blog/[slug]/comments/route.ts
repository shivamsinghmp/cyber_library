import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

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

    const { slug } = await params;
    const body = await request.json();

    if (!body.content || typeof body.content !== "string" || body.content.trim().length === 0) {
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
        content: body.content.trim()
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
