"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Leaf, Trophy, Crown, Sprout, Flame } from "lucide-react";

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
  { value: "today", label: "Today" },
  { value: "weekly", label: "This Week" },
  { value: "alltime", label: "All Time" },
] as const;

export function PlantLeaderboard({ limit = 10 }: { limit?: number }) {
  const [period, setPeriod] = useState<"today" | "weekly" | "alltime">("weekly");
  const [leaderboard, setLeaderboard] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/study/leaderboard?period=${period}`)
      .then((r) => (r.ok ? r.json() : {}))
      .then((data: { leaderboard?: Entry[] }) => {
        setLeaderboard(Array.isArray(data.leaderboard) ? data.leaderboard : []);
      })
      .catch(() => setLeaderboard([]))
      .finally(() => setLoading(false));
  }, [period]);

  const displayBoard = leaderboard.slice(0, limit);

  return (
    <div className="relative w-full overflow-hidden rounded-[2.5rem] border border-emerald-500/20 bg-gradient-to-b from-[#0F1F15] to-[#0A120B] p-6 sm:p-10 shadow-[0_30px_60px_rgba(4,20,10,0.8)]">
      {/* Background ambient glows */}
      <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-emerald-500/10 blur-[80px]" />
      <div className="pointer-events-none absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-emerald-800/20 blur-[80px]" />

      <div className="relative z-10 flex flex-col items-center mb-10 text-center">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/30"
        >
          <Leaf className="h-7 w-7" />
        </motion.div>
        
        <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
          Top Scholars
        </h2>
        <p className="mt-2 text-sm font-medium text-emerald-200/60 max-w-sm">
          The ultimate ranking of deep focus and discipline. Climb the global leaderboard.
        </p>

        {/* Period Selector */}
        <div className="mt-8 flex gap-2 rounded-full border border-emerald-500/20 bg-black/40 p-1.5 backdrop-blur-md">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`relative rounded-full px-5 py-2 text-xs font-bold uppercase tracking-wider transition-colors ${
                period === p.value ? "text-[#0F1F15]" : "text-emerald-300/60 hover:text-emerald-200"
              }`}
            >
              {period === p.value && (
                <motion.div
                  layoutId="period-bubble"
                  className="absolute inset-0 rounded-full bg-emerald-400"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              <span className="relative z-10">{p.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="relative z-10 min-h-[300px]">
        {loading ? (
          <div className="flex h-40 flex-col items-center justify-center gap-4">
            <Sprout className="h-8 w-8 animate-bounce text-emerald-500/50" />
            <p className="text-sm font-medium text-emerald-200/50">Cultivating rankings...</p>
          </div>
        ) : displayBoard.length === 0 ? (
          <div className="flex h-40 flex-col items-center justify-center rounded-2xl border border-emerald-500/10 bg-emerald-500/5">
            <p className="text-sm font-medium text-emerald-200/50">No data found for this period. Be the first!</p>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {displayBoard.map((entry, idx) => (
                <motion.div
                  key={entry.userId}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: idx * 0.05 }}
                  className={`group relative flex items-center gap-4 overflow-hidden rounded-2xl border bg-black/40 p-4 backdrop-blur-md transition-colors hover:bg-black/60
                    ${idx === 0 ? "border-amber-500/30 ring-1 ring-amber-500/10" : 
                      idx === 1 ? "border-slate-300/30": 
                      idx === 2 ? "border-orange-500/30" : 
                      "border-emerald-500/10"}`}
                >
                  {/* Internal Glow for Top 3 */}
                  {idx === 0 && <div className="absolute inset-0 bg-amber-500/5" />}
                  
                  {/* Rank Badge */}
                  <div className={`relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl font-black text-lg
                    ${idx === 0 ? "bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/40" : 
                      idx === 1 ? "bg-slate-300/20 text-slate-300 ring-1 ring-slate-300/40" : 
                      idx === 2 ? "bg-orange-500/20 text-orange-400 ring-1 ring-orange-500/40" : 
                      "bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20"}`}
                  >
                    {idx === 0 ? <Crown className="h-6 w-6" /> : 
                     idx === 1 ? <Trophy className="h-5 w-5" /> : 
                     idx === 2 ? <Trophy className="h-5 w-5 opacity-80" /> : 
                     <span>#{entry.rank}</span>}
                  </div>

                  {/* Name & Streak */}
                  <div className="flex-1 min-w-0">
                    <p className={`truncate font-bold tracking-tight ${idx === 0 ? "text-amber-100 text-lg" : "text-emerald-50 text-base"}`}>
                      {entry.name}
                    </p>
                    {entry.streakDays > 0 && (
                      <div className="mt-0.5 flex items-center gap-1 text-[11px] font-bold text-orange-400">
                        <Flame className="h-3 w-3" />
                        {entry.streakDays} Day Streak
                      </div>
                    )}
                  </div>

                  {/* Score */}
                  <div className="shrink-0 text-right">
                    <div className="flex items-baseline justify-end gap-1 font-black">
                      <span className={`text-2xl ${idx === 0 ? "text-amber-400" : "text-emerald-400"}`}>
                        {entry.totalHours}
                      </span>
                      <span className="text-xs text-emerald-200/50">hrs</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
