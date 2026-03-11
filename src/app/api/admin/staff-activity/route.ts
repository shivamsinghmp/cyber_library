import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    const role = (session?.user as { role?: string })?.role;
    if (!session?.user || role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const staff = await prisma.user.findMany({
      where: { role: { in: ["EMPLOYEE", "INFLUENCER"] } },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const staffIds = staff.map((s) => s.id);
    const logs = await prisma.loginLog.findMany({
      where: { userId: { in: staffIds } },
      orderBy: { loginAt: "desc" },
    });

    const now = new Date();
    const activeByUser = new Map<string | null, { loginAt: Date }>();
    const totalMinutesByUser = new Map<string, number>();

    for (const log of logs) {
      const mins =
        log.logoutAt != null
          ? (log.logoutAt.getTime() - log.loginAt.getTime()) / (60 * 1000)
          : (now.getTime() - log.loginAt.getTime()) / (60 * 1000);
      totalMinutesByUser.set(
        log.userId,
        (totalMinutesByUser.get(log.userId) ?? 0) + mins
      );
      if (log.logoutAt == null && !activeByUser.has(log.userId)) {
        activeByUser.set(log.userId, { loginAt: log.loginAt });
      }
    }

    const activeStaff = staff
      .filter((s) => activeByUser.has(s.id))
      .map((s) => {
        const active = activeByUser.get(s.id)!;
        const totalMins = totalMinutesByUser.get(s.id) ?? 0;
        return {
          ...s,
          loginAt: active.loginAt.toISOString(),
          logoutAt: null as string | null,
          totalHours: Math.round((totalMins / 60) * 100) / 100,
        };
      });

    const allStaffWithHours = staff.map((s) => {
      const active = activeByUser.get(s.id);
      const totalMins = totalMinutesByUser.get(s.id) ?? 0;
      return {
        ...s,
        loginAt: active ? active.loginAt.toISOString() : null,
        logoutAt: null as string | null,
        isActive: !!active,
        totalHours: Math.round((totalMins / 60) * 100) / 100,
      };
    });

    return NextResponse.json({
      staff: allStaffWithHours,
      activeStaff,
    });
  } catch (e) {
    console.error("GET /api/admin/staff-activity:", e);
    return NextResponse.json(
      { error: "Something went wrong." },
      { status: 500 }
    );
  }
}
