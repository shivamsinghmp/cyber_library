"use client";

import { useEffect, useState } from "react";
import { TrendingUp, Calendar, BookOpen } from "lucide-react";

type DayPoint = { date: string; amount: number };
type StudyDayPoint = { date: string; hours: number };
type SlotPoint = { slotId: string; name: string; timeLabel: string; count: number };

export function AdminAnalyticsChart() {
  const [revenueByDay, setRevenueByDay] = useState<DayPoint[]>([]);
  const [popularSlots, setPopularSlots] = useState<SlotPoint[]>([]);
  const [studyHoursByDay, setStudyHoursByDay] = useState<StudyDayPoint[]>([]);
  const [totalPlatformStudyHours, setTotalPlatformStudyHours] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/analytics", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : {}))
      .then((data: {
        revenueByDay?: DayPoint[];
        popularSlots?: SlotPoint[];
        studyHoursByDay?: StudyDayPoint[];
        totalPlatformStudyHours?: number;
      }) => {
        setRevenueByDay(Array.isArray(data.revenueByDay) ? data.revenueByDay : []);
        setPopularSlots(Array.isArray(data.popularSlots) ? data.popularSlots : []);
        setStudyHoursByDay(Array.isArray(data.studyHoursByDay) ? data.studyHoursByDay : []);
        setTotalPlatformStudyHours(Number(data.totalPlatformStudyHours) || 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const maxRevenue = Math.max(1, ...revenueByDay.map((d) => d.amount));
  const maxSlotCount = Math.max(1, ...popularSlots.map((s) => s.count));
  const maxStudyHours = Math.max(0.1, ...studyHoursByDay.map((d) => d.hours));

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-black/30 p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-[var(--cream)]">Revenue & Engagement</h2>
        <p className="mt-4 rounded-xl border border-white/10 bg-black/20 px-4 py-8 text-center text-sm text-[var(--cream-muted)]">
          Loading chart…
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 p-6 shadow-xl">
      <h2 className="mb-1 text-lg font-semibold text-[var(--cream)]">
        Revenue & Engagement
      </h2>
      <p className="mb-6 text-xs text-[var(--cream-muted)]">
        Last 14 days revenue trend and popular slots
      </p>

      <div className="grid gap-8 md:grid-cols-2">
        <div>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-[var(--cream)]">
            <TrendingUp className="h-4 w-4 text-amber-400" />
            Revenue by day
          </h3>
          {revenueByDay.length === 0 ? (
            <p className="rounded-xl border border-white/10 bg-black/20 px-4 py-6 text-center text-xs text-[var(--cream-muted)]">
              No revenue data in the last 14 days
            </p>
          ) : (
            <div className="flex items-end justify-between gap-1 rounded-xl border border-white/10 bg-black/20 p-3">
              {revenueByDay.map((d) => (
                <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
                  <div
                    className="w-full min-h-[4px] rounded-t bg-amber-500/60 transition-all"
                    style={{
                      height: `${Math.max(4, (d.amount / maxRevenue) * 80)}px`,
                    }}
                    title={`₹${d.amount}`}
                  />
                  <span className="text-[10px] text-[var(--cream-muted)]">
                    {d.date.slice(5)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-[var(--cream)]">
            <Calendar className="h-4 w-4 text-[var(--accent)]" />
            Popular slots (subscriptions)
          </h3>
          {popularSlots.length === 0 ? (
            <p className="rounded-xl border border-white/10 bg-black/20 px-4 py-6 text-center text-xs text-[var(--cream-muted)]">
              No subscriptions yet
            </p>
          ) : (
            <ul className="space-y-2">
              {popularSlots.map((s) => (
                <li
                  key={s.slotId}
                  className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[var(--cream)]">{s.name}</p>
                    {s.timeLabel && (
                      <p className="text-[10px] text-[var(--cream-muted)]">{s.timeLabel}</p>
                    )}
                  </div>
                  <div className="shrink-0 w-24">
                    <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-[var(--accent)]"
                        style={{ width: `${(s.count / maxSlotCount) * 100}%` }}
                      />
                    </div>
                  </div>
                  <span className="w-8 text-right text-xs font-semibold text-[var(--cream)]">
                    {s.count}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="mt-8">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-[var(--cream)]">
          <BookOpen className="h-4 w-4 text-emerald-400" />
          Platform study hours (last 14 days)
        </h3>
        <div className="mb-2 text-2xl font-bold text-[var(--cream)]">
          {totalPlatformStudyHours}h total
        </div>
        {studyHoursByDay.length === 0 ? (
          <p className="rounded-xl border border-white/10 bg-black/20 px-4 py-6 text-center text-xs text-[var(--cream-muted)]">
            No study sessions in the last 14 days
          </p>
        ) : (
          <div className="flex items-end justify-between gap-1 rounded-xl border border-white/10 bg-black/20 p-3">
            {studyHoursByDay.map((d) => (
              <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className="w-full min-h-[4px] rounded-t bg-emerald-500/60 transition-all"
                  style={{
                    height: `${Math.max(4, (d.hours / maxStudyHours) * 80)}px`,
                  }}
                  title={`${d.hours}h`}
                />
                <span className="text-[10px] text-[var(--cream-muted)]">
                  {d.date.slice(5)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
