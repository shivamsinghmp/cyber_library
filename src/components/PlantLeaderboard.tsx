"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Crown, Flame, Clock, RefreshCw } from "lucide-react";

type Entry = {
  rank: number;
  userId: string;
  name: string;
  totalMinutes: number;
  totalHours: number;
  coins: number;
  streakDays: number;
};

const PERIODS = [
  { value: "today",   label: "Today" },
  { value: "weekly",  label: "This Week" },
  { value: "alltime", label: "All Time" },
] as const;

/** Format minutes → "2h 35m" or "45m" */
function fmtTime(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

const RANK_STYLES = [
  { border: "#F59E0B", bg: "rgba(245,158,11,0.08)", badge: "rgba(245,158,11,0.15)", badgeText: "#D97706", icon: <Crown className="h-5 w-5" /> },
  { border: "#94A3B8", bg: "rgba(148,163,184,0.06)", badge: "rgba(148,163,184,0.15)", badgeText: "#64748B", icon: <Trophy className="h-4 w-4" /> },
  { border: "#F97316", bg: "rgba(249,115,22,0.06)", badge: "rgba(249,115,22,0.12)", badgeText: "#EA580C", icon: <Trophy className="h-4 w-4" /> },
];

export function PlantLeaderboard({ limit = 10 }: { limit?: number }) {
  const [period, setPeriod] = useState<"today" | "weekly" | "alltime">("today");
  const [leaderboard, setLeaderboard] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await fetch(`/api/study/leaderboard?period=${period}&t=${Date.now()}`);
      const data: { leaderboard?: Entry[] } = res.ok ? await res.json() : {};
      const sorted = (Array.isArray(data.leaderboard) ? data.leaderboard : [])
        .sort((a, b) => b.totalMinutes - a.totalMinutes)
        .slice(0, limit)
        .map((e, i) => ({ ...e, rank: i + 1 }));
      setLeaderboard(sorted);
      setLastUpdated(new Date());
    } catch {
      setLeaderboard([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [period, limit]);

  /* fetch on period change */
  useEffect(() => { fetchData(); }, [fetchData]);

  /* auto-refresh every 60s */
  useEffect(() => {
    const id = setInterval(() => fetchData(), 60_000);
    return () => clearInterval(id);
  }, [fetchData]);

  const displayBoard = leaderboard.slice(0, limit);

  return (
    <div className="relative w-full overflow-hidden rounded-[2rem] border bg-white"
      style={{ borderColor: "var(--border)", boxShadow: "var(--shadow-lg)" }}>

      {/* Header */}
      <div className="relative overflow-hidden px-6 pt-6 pb-5"
        style={{ background: "linear-gradient(135deg, #EEF2FF 0%, #F5F3FF 100%)" }}>
        {/* Decorative orb */}
        <div className="pointer-events-none absolute -top-10 -right-10 h-40 w-40 rounded-full blur-[60px]"
          style={{ background: "radial-gradient(circle, rgba(99,102,241,0.15), transparent)" }} />

        <div className="relative z-10 flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl"
              style={{
                background: "linear-gradient(135deg, #6366F1, #8B5CF6)",
                boxShadow: "0 4px 12px rgba(99,102,241,0.40)",
              }}>
              <Trophy className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-extrabold" style={{ color: "var(--foreground)" }}>
                Top Scholars
              </h3>
              <p className="text-[10px] font-semibold" style={{ color: "var(--muted-text)" }}>
                Sorted by most watch time
              </p>
            </div>
          </div>

          {/* Refresh button */}
          <button
            type="button"
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="flex h-8 w-8 items-center justify-center rounded-full border transition-all hover:-translate-y-0.5 disabled:opacity-40"
            style={{ borderColor: "var(--accent-border)", background: "white" }}
            title="Refresh leaderboard"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`}
              style={{ color: "var(--accent)" }} />
          </button>
        </div>

        {/* Period tabs */}
        <div className="flex gap-1.5 rounded-full border p-1"
          style={{ borderColor: "var(--accent-border)", background: "white" }}>
          {PERIODS.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => setPeriod(p.value)}
              className="relative flex-1 rounded-full py-1.5 text-[11px] font-bold transition-colors"
              style={{ color: period === p.value ? "white" : "var(--muted-text)" }}
            >
              {period === p.value && (
                <motion.div
                  layoutId="period-pill"
                  className="absolute inset-0 rounded-full"
                  style={{ background: "linear-gradient(135deg, #6366F1, #8B5CF6)" }}
                  transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                />
              )}
              <span className="relative z-10">{p.label}</span>
            </button>
          ))}
        </div>

        {/* Last updated */}
        {lastUpdated && (
          <p className="mt-2.5 flex items-center gap-1 text-[10px] font-semibold"
            style={{ color: "var(--muted-text)" }}>
            <Clock className="h-3 w-3" />
            Updated {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            {" "}· auto-refreshes every 60s
          </p>
        )}
      </div>

      {/* List */}
      <div className="px-4 py-4 min-h-[200px]">
        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="skeleton h-16 rounded-2xl" />
            ))}
          </div>
        ) : displayBoard.length === 0 ? (
          <div className="flex h-40 flex-col items-center justify-center rounded-2xl border border-dashed gap-2"
            style={{ borderColor: "var(--border)" }}>
            <Clock className="h-8 w-8" style={{ color: "var(--muted-text)" }} />
            <p className="text-sm font-semibold" style={{ color: "var(--muted-text)" }}>
              No study sessions yet — be the first!
            </p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            <div className="space-y-2">
              {displayBoard.map((entry, idx) => {
                const style = RANK_STYLES[idx] ?? null;
                return (
                  <motion.div
                    key={entry.userId}
                    layout
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: idx * 0.04 }}
                    className="flex items-center gap-3 rounded-2xl border px-4 py-3 transition-all hover:-translate-y-0.5"
                    style={{
                      borderColor: style ? style.border + "50" : "var(--border)",
                      background: style ? style.bg : "var(--page-bg)",
                      boxShadow: style ? `0 2px 8px ${style.border}18` : "none",
                    }}
                  >
                    {/* Rank badge */}
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-black text-sm"
                      style={style
                        ? { background: style.badge, color: style.badgeText }
                        : { background: "var(--accent-pale)", color: "var(--accent)" }
                      }>
                      {style ? style.icon : <span>#{entry.rank}</span>}
                    </div>

                    {/* Name + streak */}
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-extrabold" style={{ color: "var(--foreground)" }}>
                        {entry.name}
                      </p>
                      {entry.streakDays > 0 && (
                        <div className="flex items-center gap-1 text-[10px] font-bold text-orange-500">
                          <Flame className="h-3 w-3" />
                          {entry.streakDays} day streak
                        </div>
                      )}
                    </div>

                    {/* Watch time — primary metric */}
                    <div className="shrink-0 text-right">
                      <p className="text-lg font-black" style={{ color: idx === 0 ? "#D97706" : "var(--accent)" }}>
                        {fmtTime(entry.totalMinutes)}
                      </p>
                      <p className="text-[10px] font-semibold" style={{ color: "var(--muted-text)" }}>
                        watch time
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
