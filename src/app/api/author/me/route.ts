import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).max(200).transform((s) => s.trim()).optional(),
  slug: z
    .string()
    .min(1)
    .max(120)
    .transform((s) => s.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""))
    .optional(),
  bio: z.string().max(5000).nullable().optional(),
  imageUrl: z.string().url().max(1000).nullable().optional(),
});

/** GET: Current user's author profile (AUTHOR role only). */
export async function GET() {
  try {
    const session = await auth();
    const role = (session?.user as { role?: string })?.role;
    const userId = (session?.user as { id?: string })?.id;
    if (!session?.user || role !== "AUTHOR" || !userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const [author, fieldDefinitions] = await Promise.all([
      prisma.author.findUnique({
        where: { userId },
        include: { _count: { select: { posts: true } } },
      }),
      prisma.profileFieldDefinition.findMany({
        where: { role: "AUTHOR" },
        orderBy: [{ sortOrder: "asc" }, { key: "asc" }],
      }),
    ]);
    if (!author) {
      return NextResponse.json(
        { error: "No author profile linked to this account. Contact admin." },
        { status: 404 }
      );
    }
    return NextResponse.json({
      ...author,
      customFields: (author.customFields as Record<string, unknown>) ?? null,
      fieldDefinitions,
    });
  } catch (e) {
    console.error("GET /api/author/me:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

/** PATCH: Update current author's own profile (name, slug, bio, imageUrl). */
export async function PATCH(request: Request) {
  try {
    const session = await auth();
    const role = (session?.user as { role?: string })?.role;
    const userId = (session?.user as { id?: string })?.id;
    if (!session?.user || role !== "AUTHOR" || !userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const author = await prisma.author.findUnique({
      where: { userId },
    });
    if (!author) {
      return NextResponse.json({ error: "No author profile linked" }, { status: 404 });
    }
    const body = await request.json().catch(() => ({}));
    const parsed = updateSchema.safeParse({
      name: body.name,
      slug: body.slug,
      bio: body.bio ?? null,
      imageUrl: body.imageUrl ?? null,
    });
    const customFieldsPayload = body.customFields;
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const data = parsed.data;
    if (data.slug !== undefined) {
      const existing = await prisma.author.findFirst({
        where: { slug: data.slug, id: { not: author.id } },
      });
      if (existing) {
        return NextResponse.json(
          { error: "This slug is already used by another author" },
          { status: 400 }
        );
      }
    }
    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.slug !== undefined) updateData.slug = data.slug;
    if (data.bio !== undefined) updateData.bio = data.bio?.trim() || null;
    if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl?.trim() || null;
    if (customFieldsPayload !== undefined) {
      updateData.customFields =
        typeof customFieldsPayload === "object" && customFieldsPayload !== null ? customFieldsPayload : {};
    }

    const updated = await prisma.author.update({
      where: { id: author.id },
      data: updateData as never,
    });
    return NextResponse.json(updated);
  } catch (e) {
    console.error("PATCH /api/author/me:", e);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
