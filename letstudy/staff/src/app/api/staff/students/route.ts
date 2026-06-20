import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkStaffModuleApi } from "@/lib/permissions";

/** GET only — staff can look students up for support, not create accounts
 *  (that stays admin-only in portal). */
export async function GET(request: Request) {
  try {
    const auth = await checkStaffModuleApi("STUDENT_MGMT");
    if (auth.error) return auth.error;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim() || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const take = 50;
    const skip = (page - 1) * take;

    const whereClause = {
      role: "STUDENT" as const,
      deletedAt: null as null,
      ...(search
        ? {
            OR: [
              { studentId: { contains: search, mode: "insensitive" as const } },
              { id:        { contains: search, mode: "insensitive" as const } },
              { email:     { contains: search, mode: "insensitive" as const } },
              { name:      { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const [students, total] = await Promise.all([
      prisma.user.findMany({
        where: whereClause,
        select: {
          id: true,
          studentId: true,
          name: true,
          email: true,
          goal: true,
          createdAt: true,
          profile: {
            select: {
              phone: true,
              whatsappNumber: true,
              studyGoal: true,
              targetExam: true,
              totalStudyHours: true,
              coinBalance: true,
              position: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take,
        skip,
      }),
      prisma.user.count({ where: whereClause }),
    ]);

    const hasMore = skip + students.length < total;
    return NextResponse.json({ data: students, total, page, hasMore });
  } catch (e) {
    console.error("GET /api/staff/students:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
