import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/public-stats
 * Public endpoint — no auth required.
 * Returns real platform stats for homepage display.
 * Cached for 5 minutes via Next.js revalidation.
 */
export const revalidate = 300; // 5 min cache

export async function GET() {
  try {
    const [totalStudents, totalSessionsAgg, activeNow] = await Promise.all([
      // Total verified students (not deleted)
      prisma.user.count({
        where: { deletedAt: null, role: "STUDENT" },
      }),

      // Total study minutes across all sessions
      prisma.studySession.aggregate({
        _sum: { durationMinutes: true },
        where: { durationMinutes: { not: null } },
      }),

      // Active right now = study session started in last 30 min with no end
      prisma.studySession.count({
        where: {
          startedAt: { gte: new Date(Date.now() - 30 * 60 * 1000) },
          endedAt: null,
        },
      }),
    ]);

    const totalMinutes = totalSessionsAgg._sum.durationMinutes ?? 0;
    const totalHours = Math.floor(totalMinutes / 60);

    return NextResponse.json({
      totalStudents,
      totalHours,
      activeNow,
    });
  } catch (e) {
    console.error("GET /api/public-stats:", e);
    // Return safe fallback — never break the homepage
    return NextResponse.json({
      totalStudents: 0,
      totalHours: 0,
      activeNow: 0,
    });
  }
}
