import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { invalidateCache } from "@/lib/redis";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let userId = (session.user as { id?: string }).id;
    if (!userId && session.user?.email) {
      const dbUser = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } });
      if (dbUser) userId = dbUser.id;
    }

    if (!userId) {
      return NextResponse.json({ error: "User not found (Token missing ID)" }, { status: 401 });
    }

    const [profile, userRec] = await Promise.all([
      prisma.profile.findUnique({ where: { userId } }),
      prisma.user.findUnique({ where: { id: userId }, select: { role: true, name: true, email: true } }),
    ]);
    const userRole = userRec?.role ?? "STUDENT";
    const fieldDefinitions = await prisma.profileFieldDefinition.findMany({
      where: { role: userRole },
      orderBy: [{ sortOrder: "asc" }, { key: "asc" }],
    });
    const customFields = (profile?.customFields as Record<string, unknown>) ?? null;
    return NextResponse.json({
      ...(profile ?? {}),
      fullName: profile?.fullName || userRec?.name || (userRec?.email ? userRec.email.split('@')[0] : null) || null,
      email: userRec?.email || null,
      customFields,
      fieldDefinitions,
    });
  } catch (e) {
    console.error("GET /api/user/profile:", e);
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let userId = (session.user as { id?: string }).id;
    if (!userId && session.user?.email) {
      const dbUser = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } });
      if (dbUser) userId = dbUser.id;
    }

    if (!userId) {
      return NextResponse.json({ error: "User not found (Token missing ID)" }, { status: 401 });
    }

    const body = await request.json();
    const {
      fullName,
      phone,
      whatsappNumber,
      studyGoal,
      targetExam,
      targetYear,
      primaryPainPoint,
      institution,
      bio,
      profilePicUrl,
      customFields: customFieldsPayload,
    } = body;

    const rawWhatsApp = whatsappNumber != null ? String(whatsappNumber).trim() : null;
    let normalizedWhatsApp: string | null = null;
    if (rawWhatsApp) {
      const digits = rawWhatsApp.replace(/\D/g, "");
      const withCode = digits.length === 10 ? digits : digits.length === 12 && digits.startsWith("91") ? digits.slice(2) : null;
      if (withCode && withCode.length === 10 && /^[6-9]\d{9}$/.test(withCode)) {
        normalizedWhatsApp = withCode;
      } else {
        return NextResponse.json(
          { error: "Please enter a valid 10-digit WhatsApp number (e.g. 9876543210)" },
          { status: 400 }
        );
      }
    }

    const customFieldsUpdate =
      customFieldsPayload !== undefined
        ? (typeof customFieldsPayload === "object" && customFieldsPayload !== null ? customFieldsPayload : {})
        : undefined;

    const profile = await prisma.profile.upsert({
      where: { userId },
      create: {
        userId,
        fullName: fullName ?? null,
        phone: phone ?? null,
        whatsappNumber: normalizedWhatsApp ?? null,
        studyGoal: studyGoal ?? null,
        targetExam: targetExam ?? null,
        targetYear: targetYear ?? null,
        primaryPainPoint: primaryPainPoint ?? null,
        institution: institution ?? null,
        bio: bio ?? null,
        profilePicUrl: profilePicUrl ?? null,
        customFields: customFieldsUpdate ?? undefined,
      },
      update: {
        ...(fullName !== undefined && { fullName: fullName || null }),
        ...(phone !== undefined && { phone: phone || null }),
        ...(whatsappNumber !== undefined && { whatsappNumber: rawWhatsApp ? normalizedWhatsApp ?? null : null }),
        ...(studyGoal !== undefined && { studyGoal: studyGoal || null }),
        ...(targetExam !== undefined && { targetExam: targetExam || null }),
        ...(targetYear !== undefined && { targetYear: targetYear || null }),
        ...(primaryPainPoint !== undefined && { primaryPainPoint: primaryPainPoint || null }),
        ...(institution !== undefined && { institution: institution || null }),
        ...(bio !== undefined && { bio: bio || null }),
        ...(profilePicUrl !== undefined && { profilePicUrl: profilePicUrl || null }),
        ...(customFieldsUpdate !== undefined && { customFields: customFieldsUpdate }),
      },
    });

    const cacheKey = `user:profile:${userId}`;
    await invalidateCache(cacheKey);

    return NextResponse.json(profile);
  } catch (e) {
    console.error("POST /api/user/profile:", e);
    return NextResponse.json({ error: "Failed to save profile" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  return POST(request);
}
