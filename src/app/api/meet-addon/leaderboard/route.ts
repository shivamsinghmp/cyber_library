import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMeetAddonCorsHeaders } from "../cors";

type UserRow = {
  id: string;
  name: string | null;
  email: string | null;
  profile: { fullName: string | null } | null;
  studyStreak: { currentDays: number } | null;
  studentId?: string | null;
};


export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: { "Access-Control-Max-Age": "86400" } });
}

export async function GET(request: NextRequest) {
  try {
  const cors = getMeetAddonCorsHeaders(request);
  const roomId = request.nextUrl.searchParams.get("roomId")?.trim();

  const where = roomId ? { room: { roomKey: roomId } } : {};
  const logs = await prisma.studyCoinLog.findMany({
    where,
    select: { userId: true, coins: true },
  });

  const totals = new Map<string, number>();
  for (const row of logs) totals.set(row.userId, (totals.get(row.userId) ?? 0) + row.coins);

  const sorted = Array.from(totals.entries()).sort((a, b) => b[1] - a[1]).slice(0, 20);
  const userIds = sorted.map(([id]) => id);
  const users = await prisma.user.findMany({
    where: { id: { in: userIds }, deletedAt: null },
    select: {
      id: true,
      name: true,
      email: true,
      profile: { select: { fullName: true } },
      studyStreak: { select: { currentDays: true } },
    },
  });
  const userMap = new Map<string, UserRow>(users.map((u) => [u.id, u as UserRow]));

  const leaderboard = sorted.map(([userId, coins], i) => {
    const u = userMap.get(userId);
    const displayName =
      u?.profile?.fullName?.trim() ||
      u?.name?.trim() ||
      (u?.email ? u.email.split("@")[0] : null) ||
      "Student";
    return {
      rank: i + 1,
      userId,
      name: displayName,
      coins,
      streakDays: u?.studyStreak?.currentDays ?? 0,
    };
  });

  return NextResponse.json({ leaderboard }, { headers: cors });
  } catch (e) {
    console.error("[meet-addon/leaderboard] GET error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
