"use client";

import { useState, useEffect, useCallback } from "react";
import { Flame, Trophy } from "lucide-react";

type Profile = {
  fullName: string | null;
  studyGoal: string | null;
  currentStreak: number;
  lastStudyDate: string | null;
  longestStreak: number;
  totalPoints: number;
};

function getLast7Days(): Date[] {
  const days: Date[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    days.push(d);
  }
  return days;
}

function toDateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function ProfileStreakCard({
  userName,
  userGoal,
}: {
  userName: string;
  userGoal: string;
}) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [prevStreak, setPrevStreak] = useState<number | null>(null);
  const [loggingStudy, setLoggingStudy] = useState(false);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch("/api/user/profile");
      if (!res.ok) return;
      const data = await res.json();
      setProfile(data);
      setPrevStreak((p) => (p === null ? data?.currentStreak ?? 0 : p));
    } catch {
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    if (profile && prevStreak !== null && profile.currentStreak > prevStreak) {
      setPrevStreak(profile.currentStreak);
    }
  }, [profile?.currentStreak, prevStreak]);

  async function handleLogStudy() {
    setLoggingStudy(true);
    try {
      const res = await fetch("/api/study/check-streak", { method: "POST" });
      if (!res.ok) return;
      await fetchProfile();
    } finally {
      setLoggingStudy(false);
    }
  }

  const name = profile?.fullName?.trim() || userName;
  const goal = profile?.studyGoal?.trim() || userGoal;
  const streak = profile?.currentStreak ?? 0;
  const longest = profile?.longestStreak ?? 0;
  const lastStudy = profile?.lastStudyDate
    ? toDateOnly(new Date(profile.lastStudyDate))
    : null;
  const weekDays = getLast7Days();

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-black/30 p-6 animate-pulse">
        <div className="h-6 w-48 rounded bg-white/10" />
        <div className="mt-2 h-4 w-32 rounded bg-white/10" />
        <div className="mt-4 h-10 w-36 rounded-xl bg-white/10" />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 p-6 shadow-xl md:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-[var(--cream)] md:text-2xl">
            {name}
          </h2>
          <p className="mt-1 text-sm text-[var(--cream-muted)]">
            Goal: <span className="font-medium text-[var(--cream)]">{goal}</span>
          </p>
        </div>

        <div
          key={streak}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 transition-all duration-300 ${
            streak > 0
              ? "bg-amber-500/20 text-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.15)]"
              : "bg-white/5 text-[var(--cream-muted)]"
          }`}
          style={{
            animation: streak > 0 ? "streakPop 0.4s ease-out" : undefined,
          }}
        >
          <Flame
            className={`h-5 w-5 shrink-0 ${
              streak > 0 ? "text-amber-400" : "text-[var(--cream-muted)]"
            }`}
          />
          <span className="tabular-nums font-bold tracking-tight">
            {streak} Day Streak
          </span>
        </div>
      </div>

      {longest > 0 && (
        <div className="mt-4 flex items-center gap-2 text-xs text-[var(--cream-muted)]">
          <Trophy className="h-4 w-4 text-amber-500/80" />
          <span>Best streak: {longest} days</span>
          {profile?.totalPoints != null && profile.totalPoints > 0 && (
            <span className="ml-2">· {profile.totalPoints} pts</span>
          )}
        </div>
      )}

      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex-1">
          <p className="mb-2 text-xs font-medium text-[var(--cream-muted)]">
            This week
          </p>
          <div className="flex gap-2">
          {weekDays.map((day) => {
            const dateStr = toDateOnly(day);
            const studied = lastStudy === dateStr;
            const isToday = dateStr === toDateOnly(new Date());
            return (
              <div
                key={dateStr}
                className="flex flex-1 flex-col items-center gap-1"
              >
                <div
                  className={`h-8 w-8 rounded-full border-2 transition-all duration-300 sm:h-9 sm:w-9 ${
                    studied
                      ? "border-amber-400/60 bg-amber-500/30"
                      : "border-white/10 bg-white/5"
                  } ${isToday ? "ring-2 ring-[var(--accent)]/50" : ""}`}
                  title={dateStr}
                />
                <span className="text-[10px] text-[var(--cream-muted)]">
                  {day.toLocaleDateString("en-US", { weekday: "narrow" })}
                </span>
              </div>
            );
          })}
          </div>
        </div>
        <button
          type="button"
          onClick={handleLogStudy}
          disabled={loggingStudy}
          className="mt-2 shrink-0 rounded-xl border border-[var(--accent)]/50 bg-[var(--accent)]/10 px-4 py-2 text-sm font-medium text-[var(--cream)] transition hover:bg-[var(--accent)]/20 disabled:opacity-50 sm:mt-0"
        >
          {loggingStudy ? "Updating…" : "I studied today"}
        </button>
      </div>
    </div>
  );
}
