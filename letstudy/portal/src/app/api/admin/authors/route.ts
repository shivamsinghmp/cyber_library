import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/api-helpers";
import { authorSchema } from "@/lib/schemas";

export async function GET() {
  try {
    const auth = await requireSuperAdmin();
    if (auth.error) return auth.error;
    const authors = await prisma.author.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { posts: true } }, user: { select: { id: true, name: true, email: true } } },
    });
    return NextResponse.json(authors);
  } catch (e) {
    console.error("GET /api/admin/authors:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireSuperAdmin();
    if (auth.error) return auth.error;
    const body = await request.json();
    const parsed = authorSchema.safeParse({
      name: body.name,
      slug: body.slug ?? body.name,
      bio: body.bio ?? null,
      imageUrl: body.imageUrl ?? null,
    });
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const data = parsed.data;
    const existing = await prisma.author.findUnique({
      where: { slug: data.slug },
    });
    if (existing) {
      return NextResponse.json(
        { error: "An author with this slug already exists" },
        { status: 400 }
      );
    }
    const author = await prisma.author.create({
      data: {
        name: data.name,
        slug: data.slug,
        bio: data.bio?.trim() || null,
        imageUrl: data.imageUrl?.trim() || null,
      },
    });
    return NextResponse.json(author, { status: 201 });
  } catch (e) {
    console.error("POST /api/admin/authors:", e);
    return NextResponse.json({ error: "Failed to create author" }, { status: 500 });
  }
}
