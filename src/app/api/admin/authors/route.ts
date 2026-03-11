import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1).max(200).transform((s) => s.trim()),
  slug: z
    .string()
    .min(1)
    .max(120)
    .transform((s) => s.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")),
  bio: z.string().max(5000).nullable().optional(),
  imageUrl: z.string().url().max(1000).nullable().optional(),
});

export async function GET() {
  try {
    const session = await auth();
    const role = (session?.user as { role?: string })?.role;
    if (!session?.user || role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
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
    const session = await auth();
    const role = (session?.user as { role?: string })?.role;
    if (!session?.user || role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const body = await request.json();
    const parsed = createSchema.safeParse({
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
