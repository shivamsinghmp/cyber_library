import { prisma } from "@/lib/prisma";

/** Minimum Meet add-on presence per UTC day to count toward `StudyStreak` (seconds). */
export const MEET_ADDON_STREAK_MIN_SECONDS = 10 * 60;

export function todayDateUtc(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/** Same rules as first daily-task completion: updates `StudyStreak` for this UTC day. */
export async function applyStudyStreakForQualifyingDay(userId: string): Promise<void> {
  const now = todayDateUtc();
  const streak = await prisma.studyStreak.findUnique({ where: { userId } });
  if (!streak) {
    await prisma.studyStreak.create({
      data: { userId, currentDays: 1, longestDays: 1, lastStudyOn: now },
    });
    return;
  }
  const last = streak.lastStudyOn ? new Date(streak.lastStudyOn) : null;
  const yesterday = new Date(now);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const sameDay = last && last.toISOString().slice(0, 10) === now.toISOString().slice(0, 10);
  const nextDay = last && last.toISOString().slice(0, 10) === yesterday.toISOString().slice(0, 10);
  const currentDays = sameDay ? streak.currentDays : nextDay ? streak.currentDays + 1 : 1;
  await prisma.studyStreak.update({
    where: { userId },
    data: {
      currentDays,
      longestDays: Math.max(streak.longestDays, currentDays),
      lastStudyOn: now,
    },
  });
}

/** Total seconds the user had the Meet add-on session open today (UTC), from `MeetPresenceSession` rows. */
export async function getTodayMeetPresenceSecondsTotal(userId: string): Promise<number> {
  const dayStart = todayDateUtc();
  const dayEnd = new Date(dayStart);
  dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);
  const now = new Date();

  const sessions = await prisma.meetPresenceSession.findMany({
    where: {
      userId,
      startedAt: { lt: dayEnd },
      OR: [{ endedAt: null }, { endedAt: { gte: dayStart } }],
    },
    select: { startedAt: true, endedAt: true },
  });

  let total = 0;
  for (const s of sessions) {
    const end = s.endedAt ?? now;
    const segStart = Math.max(s.startedAt.getTime(), dayStart.getTime());
    const segEnd = Math.min(end.getTime(), dayEnd.getTime());
    if (segEnd > segStart) {
      total += (segEnd - segStart) / 1000;
    }
  }
  return Math.floor(total);
}

/**
 * If today's Meet presence ≥ threshold and streak not yet credited for this UTC day, apply streak.
 */
export async function maybeApplyStudyStreakFromMeetPresence(userId: string): Promise<void> {
  const total = await getTodayMeetPresenceSecondsTotal(userId);
  if (total < MEET_ADDON_STREAK_MIN_SECONDS) return;

  const now = todayDateUtc();
  const todayStr = now.toISOString().slice(0, 10);
  const streak = await prisma.studyStreak.findUnique({
    where: { userId },
    select: { lastStudyOn: true },
  });
  const lastStr = streak?.lastStudyOn ? new Date(streak.lastStudyOn).toISOString().slice(0, 10) : null;
  if (lastStr === todayStr) {
    return;
  }

  await applyStudyStreakForQualifyingDay(userId);
}
