import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-helpers";

/**
 * GET /api/admin/student-view/search?id=VL-2026-03-47291
 * Search student by their studentId, email, or database id.
 */
export async function GET(request: Request) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("id")?.trim() ?? "";
    if (!q) return NextResponse.json({ error: "Student ID required hai" }, { status: 400 });

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { studentId: { equals: q, mode: "insensitive" } },
          { email:     { equals: q, mode: "insensitive" } },
          { id:        q },
        ],
      },
      select: {
        id:         true,
        name:       true,
        email:      true,
        studentId:  true,
        role:       true,
        createdAt:  true,
        trialUsed:  true,
        profile: {
          select: {
            fullName:    true,
            phone:       true,
            coinBalance: true,
            currentStreak: true,
            longestStreak: true,
            totalStudyHours: true,
          },
        },
        userSubscriptions: {
          where:   { status: "ACTIVE", endDate: { gt: new Date() } },
          orderBy: { endDate: "desc" },
          take:    1,
          select:  { planType: true, endDate: true, amountPaid: true },
        },
        referrals: { select: { id: true } },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Student nahi mila", searched: q }, { status: 404 });
    }

    // Fetch admin's display name for log
    const adminProfile = await prisma.user.findUnique({
      where: { id: auth.user.id },
      select: { name: true, profile: { select: { fullName: true } } },
    });
    const adminName = adminProfile?.profile?.fullName ?? adminProfile?.name ?? auth.user.email?.split("@")[0] ?? "Admin";

    // Log search action
    const now = new Date();
    await prisma.adminStudentAccessLog.create({
      data: {
        adminId:        auth.user.id,
        adminName,
        adminIp:        request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? null,
        studentId:      user.id,
        studentUniqueId: user.studentId ?? undefined,
        studentName:    user.profile?.fullName ?? user.name ?? undefined,
        pageAccessed:   "/admin/student-view/search",
        action:         "search",
        accessedAt:     now,
      },
    });

    const activeSub = user.userSubscriptions[0] ?? null;
    const now2 = new Date();
    const subDaysLeft = activeSub
      ? Math.max(0, Math.ceil((new Date(activeSub.endDate).getTime() - now2.getTime()) / 86400000))
      : 0;

    return NextResponse.json({
      student: {
        id:           user.id,
        studentId:    user.studentId,
        name:         user.profile?.fullName ?? user.name ?? "—",
        email:        user.email,
        phone:        user.profile?.phone ?? null,
        role:         user.role,
        createdAt:    user.createdAt,
        trialUsed:    user.trialUsed,
        coinBalance:  user.profile?.coinBalance ?? 0,
        currentStreak: user.profile?.currentStreak ?? 0,
        longestStreak: user.profile?.longestStreak ?? 0,
        totalStudyHours: user.profile?.totalStudyHours ?? 0,
        referralCount: user.referrals.length,
        subscription: activeSub
          ? { planType: activeSub.planType, endDate: activeSub.endDate, daysLeft: subDaysLeft }
          : null,
      },
    });
  } catch (e) {
    console.error("GET /api/admin/student-view/search:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
