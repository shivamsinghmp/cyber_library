"use client";

import { useEffect, useState, useCallback } from "react";
import { IndianRupee, Users, Zap, BookOpen, TrendingUp, RefreshCw } from "lucide-react";

type DayPoint = { date: string; amount: number };
type StudyPoint = { date: string; hours: number };
type SignupPoint = { date: string; count: number };
type SlotPoint = { slotId: string; name: string; timeLabel: string; capacity: number; occupancy: number; count: number };
type FeedItem = { id: string; type: string; label: string; sub: string; time: string };

type AnalyticsData = {
  revenueByDay: DayPoint[];
  studyHoursByDay: StudyPoint[];
  signupsByDay: SignupPoint[];
  popularSlots: SlotPoint[];
  feed: FeedItem[];
  totalPlatformStudyHours: number;
  todayRevenue: number;
  newStudentsThisWeek: number;
  activeSessionsNow: number;
  pendingFeedback: number;
  totalTransactions: number;
  conversionRate: number;
  totalVisitors: number;
};

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

function FeedAvatar({ name, type }: { name: string; type: string }) {
  const initials = name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
  const colors: Record<string, string> = {
    payment: "bg-emerald-500/20 text-emerald-400",
    signup: "bg-blue-500/20 text-blue-400",
    feedback: "bg-amber-500/20 text-amber-400",
    session: "bg-violet-500/20 text-violet-400",
  };
  return (
    <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${colors[type] ?? "bg-white/10 text-white"}`}>
      {initials || "?"}
    </div>
  );
}

function FeedBadge({ type }: { type: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    payment: { label: "Payment", cls: "bg-emerald-500/15 text-emerald-400" },
    signup: { label: "Signup", cls: "bg-blue-500/15 text-blue-400" },
    feedback: { label: "Ticket", cls: "bg-amber-500/15 text-amber-400" },
    session: { label: "Session", cls: "bg-violet-500/15 text-violet-400" },
  };
  const t = map[type] ?? { label: type, cls: "bg-white/10 text-white" };
  return <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${t.cls}`}>{t.label}</span>;
}

type Tab = "revenue" | "study" | "signups";

export function AdminAnalyticsChart() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<Tab>("revenue");

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const res = await fetch("/api/admin/analytics", { credentials: "include" });
      if (res.ok) setData(await res.json());
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Auto-refresh every 60s
  useEffect(() => {
    const id = setInterval(() => load(true), 60_000);
    return () => clearInterval(id);
  }, [load]);

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-48 rounded-2xl bg-white/5 animate-pulse" />
        <div className="grid grid-cols-3 gap-3">
          {[1,2,3].map(i => <div key={i} className="h-32 rounded-2xl bg-white/5 animate-pulse" />)}
        </div>
      </div>
    );
  }

  const chartSeries: Record<Tab, number[]> = {
    revenue: data?.revenueByDay?.map(d => d.amount) ?? [],
    study: data?.studyHoursByDay?.map(d => d.hours) ?? [],
    signups: data?.signupsByDay?.map(d => d.count) ?? [],
  };
  const chartDates = data?.revenueByDay?.map(d => d.date.slice(5)) ?? [];
  const chartMax = Math.max(1, ...chartSeries[tab]);
  const chartColor: Record<Tab, string> = {
    revenue: "#f59e0b",
    study: "#34d399",
    signups: "#60a5fa",
  };
  const chartLabel = (v: number) =>
    tab === "revenue" ? `₹${v.toLocaleString("en-IN")}` :
    tab === "study" ? `${v}h` : `${v} signups`;

  const maxSlot = Math.max(1, ...(data?.popularSlots?.map(s => s.count) ?? [1]));

  return (
    <div className="space-y-4">

      {/* ── KPI Strip ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
        {[
          { label: "Today's Revenue", value: `₹${(data?.todayRevenue ?? 0).toLocaleString("en-IN")}`, icon: IndianRupee, color: "text-amber-400", bg: "bg-amber-500/10" },
          { label: "New This Week", value: `+${data?.newStudentsThisWeek ?? 0}`, icon: Users, color: "text-blue-400", bg: "bg-blue-500/10" },
          { label: "Live Now", value: `${data?.activeSessionsNow ?? 0}`, icon: Zap, color: "text-emerald-400", bg: "bg-emerald-500/10" },
          { label: "Total Hours", value: `${Math.round(data?.totalPlatformStudyHours ?? 0)}h`, icon: BookOpen, color: "text-violet-400", bg: "bg-violet-500/10" },
          { label: "Transactions", value: `${data?.totalTransactions ?? 0}`, icon: TrendingUp, color: "text-rose-400", bg: "bg-rose-500/10" },
          { label: "Conversion", value: `${data?.conversionRate ?? 0}%`, icon: TrendingUp, color: "text-cyan-400", bg: "bg-cyan-500/10" },
        ].map((kpi) => (
          <div key={kpi.label} className="rounded-2xl border border-white/8 bg-black/30 p-3">
            <div className={`mb-2 flex h-7 w-7 items-center justify-center rounded-lg ${kpi.bg}`}>
              <kpi.icon className={`h-3.5 w-3.5 ${kpi.color}`} />
            </div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--cream-muted)]">{kpi.label}</p>
            <p className="mt-0.5 text-lg font-extrabold text-[var(--cream)]">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* ── Main Grid: Chart + Feed ─────────────────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">

        {/* Chart */}
        <div className="rounded-2xl border border-white/8 bg-black/30 overflow-hidden">
          <div className="flex items-center justify-between border-b border-white/6 px-5 py-3">
            <div className="flex gap-1 rounded-xl border border-white/10 bg-black/20 p-0.5">
              {(["revenue", "study", "signups"] as Tab[]).map((t) => (
                <button key={t} onClick={() => setTab(t)}
                  className={`rounded-[10px] px-3 py-1 text-[11px] font-bold transition-all ${tab === t ? "bg-[var(--accent)] text-[var(--ink)]" : "text-[var(--cream-muted)] hover:text-[var(--cream)]"}`}
                >
                  {t === "revenue" ? "Revenue" : t === "study" ? "Study Hrs" : "Sign-ups"}
                </button>
              ))}
            </div>
            <button onClick={() => load(true)} disabled={refreshing}
              className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-black/20 px-3 py-1.5 text-[10px] font-semibold text-[var(--cream-muted)] hover:bg-black/40 transition disabled:opacity-50"
            >
              <RefreshCw className={`h-3 w-3 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
          <div className="p-5">
            {chartSeries[tab].length === 0 ? (
              <div className="rounded-xl border border-white/8 bg-black/20 py-10 text-center text-xs text-[var(--cream-muted)]">No data</div>
            ) : (
              <>
                <div className="flex items-end gap-1" style={{ height: 96 }}>
                  {chartSeries[tab].map((v, i) => (
                    <div key={i} className="group relative flex flex-1 flex-col items-center justify-end h-full">
                      <div
                        className="absolute bottom-0 left-0 right-0 rounded-t-sm transition-all duration-300 group-hover:opacity-100"
                        style={{
                          height: `${Math.max(3, (v / chartMax) * 90)}px`,
                          background: chartColor[tab],
                          opacity: 0.35 + (i / chartSeries[tab].length) * 0.65,
                        }}
                        title={chartLabel(v)}
                      />
                    </div>
                  ))}
                </div>
                <div className="mt-2 flex justify-between">
                  {chartDates.filter((_, i) => i % 2 === 0).map((d, i) => (
                    <span key={i} className="text-[9px] text-[var(--cream-muted)]/50">{d}</span>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Slot Occupancy */}
          <div className="border-t border-white/6 px-5 py-4">
            <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-[var(--wood)]">Slot Occupancy</p>
            <div className="space-y-2">
              {(data?.popularSlots ?? []).slice(0, 5).map((s) => {
                const pct = Math.round((s.occupancy / (s.capacity || 20)) * 100);
                const fill = pct >= 90 ? "#f87171" : pct >= 60 ? "#fbbf24" : "#34d399";
                return (
                  <div key={s.slotId} className="flex items-center gap-3">
                    <span className="w-24 truncate text-[11px] text-[var(--cream-muted)]">{s.timeLabel || s.name}</span>
                    <div className="flex-1 h-1.5 rounded-full bg-white/8 overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, pct)}%`, background: fill }} />
                    </div>
                    <span className="w-12 text-right text-[10px] font-bold text-[var(--cream)]">{s.occupancy}/{s.capacity}</span>
                    {pct >= 90 && <span className="text-[10px] font-bold text-red-400">FULL</span>}
                  </div>
                );
              })}
              {(data?.popularSlots?.length ?? 0) === 0 && (
                <p className="text-xs text-[var(--cream-muted)]">No active slots</p>
              )}
            </div>
          </div>
        </div>

        {/* Activity Feed */}
        <div className="rounded-2xl border border-white/8 bg-black/30 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between border-b border-white/6 px-4 py-3">
            <p className="text-xs font-bold uppercase tracking-widest text-[var(--cream)]">Live Activity</p>
            <span className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-semibold">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              live
            </span>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-white/5" style={{ maxHeight: 340 }}>
            {(data?.feed ?? []).length === 0 ? (
              <div className="p-6 text-center text-xs text-[var(--cream-muted)]">No recent activity</div>
            ) : (
              data!.feed.map((item) => (
                <div key={item.id} className="flex items-start gap-3 px-4 py-3 hover:bg-white/3 transition">
                  <FeedAvatar name={item.label} type={item.type} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-semibold text-[var(--cream)] truncate max-w-[100px]">{item.label}</span>
                      <FeedBadge type={item.type} />
                    </div>
                    <p className="text-[11px] text-[var(--cream-muted)] truncate mt-0.5">{item.sub}</p>
                    <p className="text-[10px] text-[var(--wood)] mt-0.5">{timeAgo(item.time)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
