import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/api-helpers";

/** GET: All students who have a WhatsApp/phone number registered */
export async function GET(request: Request) {
  try {
    const auth = await requireSuperAdmin();
    if (auth.error) return auth.error;

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim() ?? "";

    const profiles = await prisma.profile.findMany({
      where: {
        OR: [
          { whatsappNumber: { not: null } },
          { phone: { not: null } },
        ],
        ...(q ? {
          AND: {
            OR: [
              { fullName:       { contains: q, mode: "insensitive" } },
              { whatsappNumber: { contains: q, mode: "insensitive" } },
              { phone:          { contains: q, mode: "insensitive" } },
              { user: { email:  { contains: q, mode: "insensitive" } } },
            ],
          },
        } : {}),
      },
      select: {
        fullName:       true,
        whatsappNumber: true,
        phone:          true,
        profilePicUrl:  true,
        user: { select: { id: true, email: true, image: true } },
      },
      orderBy: { fullName: "asc" },
      take: 300,
    });

    const students = profiles.map((p) => ({
      userId:         p.user.id,
      name:           p.fullName,
      email:          p.user.email,
      image:          p.profilePicUrl ?? p.user.image,
      phoneNumber:    p.whatsappNumber ?? p.phone ?? "",
    })).filter((s) => s.phoneNumber);

    return NextResponse.json(students);
  } catch (e) {
    console.error("GET /api/admin/whatsapp/students:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
