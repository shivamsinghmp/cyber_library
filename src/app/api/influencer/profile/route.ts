import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-helpers";
import { z } from "zod";

const profileSchema = z.object({
  bankAccountName: z.string().max(200).optional().nullable(),
  bankAccountNo: z.string().max(50).optional().nullable(),
  bankIfsc: z.string().max(20).optional().nullable(),
  upiId: z.string().max(100).optional().nullable(),
  instagram: z.string().max(200).optional().nullable(),
  youtube: z.string().max(200).optional().nullable(),
  twitter: z.string().max(200).optional().nullable(),
  linkedin: z.string().max(200).optional().nullable(),
  website: z.string().max(300).optional().nullable(),
  niche: z.string().max(100).optional().nullable(),
  followerCount: z.number().int().min(0).optional().nullable(),
});

export async function GET() {
  try {
    const auth = await requireUser();
    if (auth.error) return auth.error;

    if (auth.user.role !== "INFLUENCER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const profile = await prisma.influencerProfile.findUnique({
      where: { userId: auth.user.id },
    });

    return NextResponse.json(profile ?? null);
  } catch (e) {
    console.error("GET /api/influencer/profile:", e);
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const auth = await requireUser();
    if (auth.error) return auth.error;

    if (auth.user.role !== "INFLUENCER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = profileSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = parsed.data;

    const profile = await prisma.influencerProfile.upsert({
      where: { userId: auth.user.id },
      update: data,
      create: { userId: auth.user.id, ...data },
    });

    return NextResponse.json(profile);
  } catch (e) {
    console.error("PUT /api/influencer/profile:", e);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
