"use client";

import { useEffect, useState } from "react";
import { TrendingUp, Calendar, BookOpen, IndianRupee, Users, Zap } from "lucide-react";

type DayPoint = { date: string; amount: number };
type StudyDayPoint = { date: string; hours: number };
type SlotPoint = { slotId: string; name: string; timeLabel: string; count: number };

type AnalyticsData = {
  revenueByDay: DayPoint[];
  popularSlots: SlotPoint[];
  studyHoursByDay: StudyDayPoint[];
  totalPlatformStudyHours: number;
  todayRevenue: number;
  newStudentsThisWeek: number;
  activeSessionsNow: number;
  pendingFeedback: number;
  totalTransactions: number;
};

function MiniBar({ data, color, maxVal }: { data: number[]; color: string; maxVal: number }) {
  return (
    <div className="flex items-end gap-[2px] h-12">
      {data.map((v, i) => (
        <div
          key={i}
          className={`flex-1 rounded-sm ${color} transition-all`}
          style={{ height: `${Math.max(4, (v / Math.max(maxVal, 1)) * 48)}px`, opacity: 0.4 + (i / data.length) * 0.6 }}
        />
      ))}
    </div>
  );
}

export function AdminAnalyticsChart() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"revenue" | "study">("revenue");

  useEffect(() => {
    fetch("/api/admin/analytics", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : {}))
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/8 bg-black/30 p-6 shadow-xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-4 w-32 rounded bg-white/10 animate-pulse" />
        </div>
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[1,2,3].map(i => <div key={i} className="h-20 rounded-xl bg-white/5 animate-pulse" />)}
        </div>
        <div className="h-32 rounded-xl bg-white/5 animate-pulse" />
      </div>
    );
  }

  const revenueData = data?.revenueByDay?.map(d => d.amount) ?? [];
  const studyData = data?.studyHoursByDay?.map(d => d.hours) ?? [];
  const maxRevenue = Math.max(1, ...revenueData);
  const maxStudy = Math.max(0.1, ...studyData);
  const maxSlot = Math.max(1, ...(data?.popularSlots?.map(s => s.count) ?? [1]));

  const chartData = activeTab === "revenue" ? revenueData : studyData;
  const chartMax = activeTab === "revenue" ? maxRevenue : maxStudy;
  const chartDates = activeTab === "revenue"
    ? (data?.revenueByDay?.map(d => d.date.slice(5)) ?? [])
    : (data?.studyHoursByDay?.map(d => d.date.slice(5)) ?? []);
  const chartLabels = activeTab === "revenue"
    ? revenueData.map(v => `₹${v}`)
    : studyData.map(v => `${v}h`);

  return (
    <div className="rounded-2xl border border-white/8 bg-black/30 shadow-xl overflow-hidden">

      {/* Top KPI row */}
      <div className="grid grid-cols-2 divide-x divide-white/8 border-b border-white/8 sm:grid-cols-4">
        {[
          { label: "Today's Revenue", value: `₹${(data?.todayRevenue ?? 0).toLocaleString("en-IN")}`, icon: IndianRupee, color: "text-amber-400" },
          { label: "New This Week", value: `+${data?.newStudentsThisWeek ?? 0} students`, icon: Users, color: "text-blue-400" },
          { label: "Studying Now", value: `${data?.activeSessionsNow ?? 0} active`, icon: Zap, color: "text-emerald-400" },
          { label: "Total Hours", value: `${Math.round(data?.totalPlatformStudyHours ?? 0)}h`, icon: BookOpen, color: "text-violet-400" },
        ].map((kpi) => (
          <div key={kpi.label} className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <kpi.icon className={`h-3.5 w-3.5 ${kpi.color}`} />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--cream-muted)]">{kpi.label}</span>
            </div>
            <p className="text-base font-extrabold text-[var(--cream)]">{kpi.value}</p>
          </div>
        ))}
      </div>

      <div className="p-6 space-y-6">

        {/* Tab switcher + Chart */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-bold text-[var(--cream)]">14-Day Trend</h3>
            <div className="flex rounded-xl border border-white/10 bg-black/30 p-0.5 text-[11px] font-semibold">
              {(["revenue", "study"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`rounded-[10px] px-3 py-1.5 transition-all ${
                    activeTab === tab
                      ? "bg-[var(--accent)] text-[var(--ink)]"
                      : "text-[var(--cream-muted)] hover:text-[var(--cream)]"
                  }`}
                >
                  {tab === "revenue" ? "Revenue" : "Study Hours"}
                </button>
              ))}
            </div>
          </div>

          {chartData.length === 0 ? (
            <div className="rounded-xl border border-white/8 bg-black/20 py-10 text-center text-xs text-[var(--cream-muted)]">
              No data for last 14 days
            </div>
          ) : (
            <div className="rounded-xl border border-white/8 bg-black/20 p-4">
              <div className="flex items-end justify-between gap-1" style={{ height: "80px" }}>
                {chartData.map((v, i) => (
                  <div key={i} className="group flex flex-1 flex-col items-center justify-end gap-1 h-full">
                    <div className="relative w-full">
                      <div
                        className="absolute bottom-0 left-0 right-0 rounded-t-sm transition-all group-hover:opacity-100"
                        style={{
                          height: `${Math.max(3, (v / chartMax) * 72)}px`,
                          background: activeTab === "revenue"
                            ? "linear-gradient(to top, rgba(245,177,10,0.8), rgba(245,177,10,0.3))"
                            : "linear-gradient(to top, rgba(52,211,153,0.8), rgba(52,211,153,0.3))",
                          opacity: 0.5 + (i / chartData.length) * 0.5,
                        }}
                        title={chartLabels[i]}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-1.5 flex justify-between">
                {chartDates.filter((_, i) => i % 2 === 0).map((d, i) => (
                  <span key={i} className="text-[9px] text-[var(--cream-muted)]/60">{d}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Popular Slots */}
        <div>
          <div className="mb-3 flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5 text-[var(--accent)]" />
            <h3 className="text-sm font-bold text-[var(--cream)]">Popular Slots</h3>
          </div>
          {!data?.popularSlots?.length ? (
            <p className="rounded-xl border border-white/8 bg-black/20 py-6 text-center text-xs text-[var(--cream-muted)]">
              No subscriptions yet
            </p>
          ) : (
            <div className="space-y-2">
              {data.popularSlots.slice(0, 5).map((s, i) => (
                <div key={s.slotId} className="flex items-center gap-3 rounded-xl border border-white/8 bg-black/20 px-3 py-2.5 hover:bg-black/30 transition-colors">
                  <span className="w-5 text-center text-[11px] font-extrabold text-[var(--wood)]">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-[var(--cream)]">{s.name}</p>
                    {s.timeLabel && <p className="text-[10px] text-[var(--cream-muted)]">{s.timeLabel}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-20 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-[var(--accent)] transition-all"
                        style={{ width: `${(s.count / maxSlot) * 100}%` }}
                      />
                    </div>
                    <span className="w-7 text-right text-xs font-bold text-[var(--cream)]">{s.count}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
