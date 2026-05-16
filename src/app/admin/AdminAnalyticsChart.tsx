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
    payment: "bg-emerald-100 text-emerald-700",
    signup:  "bg-blue-100 text-blue-700",
    feedback:"bg-amber-100 text-amber-700",
    session: "bg-violet-100 text-violet-700",
  };
  return (
    <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${colors[type] ?? "bg-gray-100 text-gray-600"}`}>
      {initials || "?"}
    </div>
  );
}

function FeedBadge({ type }: { type: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    payment:  { label: "Payment",  cls: "bg-emerald-100 text-emerald-700" },
    signup:   { label: "Signup",   cls: "bg-blue-100 text-blue-700" },
    feedback: { label: "Ticket",   cls: "bg-amber-100 text-amber-700" },
    session:  { label: "Session",  cls: "bg-violet-100 text-violet-700" },
  };
  const t = map[type] ?? { label: type, cls: "bg-gray-100 text-gray-600" };
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

  useEffect(() => {
    const id = setInterval(() => load(true), 60_000);
    return () => clearInterval(id);
  }, [load]);

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-48 rounded-2xl bg-gray-100 animate-pulse" />
        <div className="grid grid-cols-3 gap-3">
          {[1,2,3].map(i => <div key={i} className="h-32 rounded-2xl bg-gray-100 animate-pulse" />)}
        </div>
      </div>
    );
  }

  const chartSeries: Record<Tab, number[]> = {
    revenue: data?.revenueByDay?.map(d => d.amount) ?? [],
    study:   data?.studyHoursByDay?.map(d => d.hours) ?? [],
    signups: data?.signupsByDay?.map(d => d.count) ?? [],
  };
  const chartDates = data?.revenueByDay?.map(d => d.date.slice(5)) ?? [];
  const chartMax = Math.max(1, ...chartSeries[tab]);
  const chartColor: Record<Tab, string> = {
    revenue: "#f59e0b",
    study:   "#10b981",
    signups: "#6366f1",
  };
  const chartLabel = (v: number) =>
    tab === "revenue" ? `₹${v.toLocaleString("en-IN")}` :
    tab === "study"   ? `${v}h` : `${v} signups`;

  return (
    <div className="space-y-4">

      {/* ── KPI Strip ── */}
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
        {[
          { label: "Today's Revenue", value: `₹${(data?.todayRevenue ?? 0).toLocaleString("en-IN")}`, icon: IndianRupee, iconBg: "bg-amber-50",  iconColor: "text-amber-600" },
          { label: "New This Week",   value: `+${data?.newStudentsThisWeek ?? 0}`,                    icon: Users,       iconBg: "bg-blue-50",   iconColor: "text-blue-600" },
          { label: "Live Now",        value: `${data?.activeSessionsNow ?? 0}`,                       icon: Zap,         iconBg: "bg-emerald-50",iconColor: "text-emerald-600" },
          { label: "Total Hours",     value: `${Math.round(data?.totalPlatformStudyHours ?? 0)}h`,   icon: BookOpen,    iconBg: "bg-violet-50", iconColor: "text-violet-600" },
          { label: "Transactions",    value: `${data?.totalTransactions ?? 0}`,                       icon: TrendingUp,  iconBg: "bg-rose-50",   iconColor: "text-rose-600" },
          { label: "Conversion",      value: `${data?.conversionRate ?? 0}%`,                         icon: TrendingUp,  iconBg: "bg-cyan-50",   iconColor: "text-cyan-600" },
        ].map((kpi) => (
          <div key={kpi.label} className="rounded-2xl border border-gray-200 bg-gray-50 p-3">
            <div className={`mb-2 flex h-7 w-7 items-center justify-center rounded-lg ${kpi.iconBg}`}>
              <kpi.icon className={`h-3.5 w-3.5 ${kpi.iconColor}`} />
            </div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">{kpi.label}</p>
            <p className="mt-0.5 text-lg font-extrabold text-gray-900">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* ── Main Grid: Chart + Feed ── */}
      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">

        {/* Chart */}
        <div className="rounded-2xl border border-gray-200 bg-gray-50 overflow-hidden">
          <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3">
            <div className="flex gap-1 rounded-xl border border-gray-200 bg-white p-0.5">
              {(["revenue", "study", "signups"] as Tab[]).map((t) => (
                <button key={t} onClick={() => setTab(t)}
                  className={`rounded-[10px] px-3 py-1 text-[11px] font-bold transition-all ${tab === t ? "bg-indigo-600 text-white shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                >
                  {t === "revenue" ? "Revenue" : t === "study" ? "Study Hrs" : "Sign-ups"}
                </button>
              ))}
            </div>
            <button onClick={() => load(true)} disabled={refreshing}
              className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-[10px] font-semibold text-gray-500 hover:bg-gray-100 transition disabled:opacity-50 shadow-sm"
            >
              <RefreshCw className={`h-3 w-3 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
          <div className="p-5">
            {chartSeries[tab].length === 0 ? (
              <div className="rounded-xl border border-gray-200 bg-white py-10 text-center text-xs text-gray-400">No data</div>
            ) : (
              <>
                <div className="flex items-end gap-1" style={{ height: 96 }}>
                  {chartSeries[tab].map((v, i) => (
                    <div key={i} className="group relative flex flex-1 flex-col items-center justify-end h-full">
                      <div
                        className="absolute bottom-0 left-0 right-0 rounded-t-sm transition-all duration-300"
                        style={{
                          height: `${Math.max(3, (v / chartMax) * 90)}px`,
                          background: chartColor[tab],
                          opacity: 0.4 + (i / chartSeries[tab].length) * 0.6,
                        }}
                        title={chartLabel(v)}
                      />
                    </div>
                  ))}
                </div>
                <div className="mt-2 flex justify-between">
                  {chartDates.filter((_, i) => i % 2 === 0).map((d, i) => (
                    <span key={i} className="text-[9px] text-gray-400">{d}</span>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Slot Occupancy */}
          <div className="border-t border-gray-200 px-5 py-4">
            <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-indigo-600">Slot Occupancy</p>
            <div className="space-y-2">
              {(data?.popularSlots ?? []).slice(0, 5).map((s) => {
                const pct = Math.round((s.occupancy / (s.capacity || 20)) * 100);
                const fill = pct >= 90 ? "#ef4444" : pct >= 60 ? "#f59e0b" : "#10b981";
                return (
                  <div key={s.slotId} className="flex items-center gap-3">
                    <span className="w-24 truncate text-[11px] text-gray-600">{s.timeLabel || s.name}</span>
                    <div className="flex-1 h-1.5 rounded-full bg-gray-200 overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, pct)}%`, background: fill }} />
                    </div>
                    <span className="w-12 text-right text-[10px] font-bold text-gray-700">{s.occupancy}/{s.capacity}</span>
                    {pct >= 90 && <span className="text-[10px] font-bold text-red-500">FULL</span>}
                  </div>
                );
              })}
              {(data?.popularSlots?.length ?? 0) === 0 && (
                <p className="text-xs text-gray-400">No active slots</p>
              )}
            </div>
          </div>
        </div>

        {/* Activity Feed */}
        <div className="rounded-2xl border border-gray-200 bg-gray-50 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-700">Live Activity</p>
            <span className="flex items-center gap-1.5 text-[10px] text-emerald-600 font-semibold">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              live
            </span>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-gray-100" style={{ maxHeight: 340 }}>
            {(data?.feed ?? []).length === 0 ? (
              <div className="p-6 text-center text-xs text-gray-400">No recent activity</div>
            ) : (
              data!.feed.map((item) => (
                <div key={item.id} className="flex items-start gap-3 px-4 py-3 hover:bg-white transition">
                  <FeedAvatar name={item.label} type={item.type} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-semibold text-gray-900 truncate max-w-[100px]">{item.label}</span>
                      <FeedBadge type={item.type} />
                    </div>
                    <p className="text-[11px] text-gray-500 truncate mt-0.5">{item.sub}</p>
                    <p className="text-[10px] text-indigo-500 mt-0.5">{timeAgo(item.time)}</p>
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
