"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Trophy, Share2, ChevronLeft, Flame, Clock, Zap } from "lucide-react";
import toast from "react-hot-toast";

type Entry = {
  rank: number;
  userId: string;
  name: string;
  totalMinutes: number;
  totalHours: number;
  coins?: number;
  streakDays?: number;
};

const PERIODS = [
  { value: "today", label: "Today" },
  { value: "weekly", label: "This Week" },
  { value: "alltime", label: "All Time" },
] as const;

function getInitials(name: string) {
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) || "?";
}

function getMedalColor(rank: number) {
  if (rank === 1) return { bg: "bg-amber-500/20", text: "text-amber-300", border: "border-amber-500/30", glow: "shadow-[0_0_20px_rgba(245,158,11,0.2)]" };
  if (rank === 2) return { bg: "bg-slate-400/20", text: "text-slate-300", border: "border-slate-400/30", glow: "" };
  if (rank === 3) return { bg: "bg-amber-700/20", text: "text-amber-600", border: "border-amber-700/30", glow: "" };
  return { bg: "bg-white/5", text: "text-[var(--cream-muted)]", border: "border-white/8", glow: "" };
}

function getMedal(rank: number) {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return rank.toString();
}

export default function LeaderboardPage() {
  const [period, setPeriod] = useState<"today" | "weekly" | "alltime">("weekly");
  const [leaderboard, setLeaderboard] = useState<Entry[]>([]);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [myHours, setMyHours] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Get current user id from session
  useEffect(() => {
    fetch("/api/dashboard/stats", { credentials: "include" })
      .then(r => r.ok ? r.json() : {})
      .then((d: { userId?: string }) => { if (d.userId) setCurrentUserId(d.userId); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/study/leaderboard?period=${period}`, { credentials: "include" })
      .then(r => r.ok ? r.json() : {})
      .then((data: { leaderboard?: Entry[]; myRank?: number; myHours?: number }) => {
        setLeaderboard(Array.isArray(data.leaderboard) ? data.leaderboard : []);
        setMyRank(data.myRank ?? null);
        setMyHours(data.myHours ?? null);
      })
      .catch(() => setLeaderboard([]))
      .finally(() => setLoading(false));
  }, [period]);

  const shareText = myRank != null
    ? `I'm #${myRank} on The Cyber Library leaderboard with ${myHours}h studied! 🏆`
    : "Check out The Cyber Library study leaderboard!";

  function handleShare() {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: "Cyber Library Leaderboard", text: shareText, url })
        .catch(e => { if (e.name !== "AbortError") toast.error("Share failed"); });
    } else {
      navigator.clipboard?.writeText(`${shareText} ${url}`)
        .then(() => toast.success("Copied!"))
        .catch(() => toast.error("Copy failed"));
    }
  }

  const top3 = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3);
  const maxHours = Math.max(...leaderboard.map(e => e.totalHours), 1);

  return (
    <div className="mx-auto max-w-2xl space-y-5 px-4 py-6">
      {/* Back */}
      <Link href="/dashboard" className="flex items-center gap-1 text-sm text-[var(--cream-muted)] hover:text-[var(--accent)] transition-colors">
        <ChevronLeft className="h-4 w-4" /> Back
      </Link>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-[var(--cream)] flex items-center gap-2">
            <Trophy className="h-6 w-6 text-amber-400" /> Study Leaderboard
          </h1>
          <p className="text-xs text-[var(--cream-muted)] mt-0.5">Top studiers by hours</p>
        </div>
        {myRank && (
          <button onClick={handleShare}
            className="flex items-center gap-1.5 rounded-xl bg-[var(--accent)] px-3 py-2 text-xs font-bold text-[var(--ink)] hover:opacity-90 transition">
            <Share2 className="h-3.5 w-3.5" /> Share
          </button>
        )}
      </div>

      {/* Period tabs */}
      <div className="flex gap-2">
        {PERIODS.map(p => (
          <button key={p.value} onClick={() => setPeriod(p.value)}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition ${period === p.value
              ? "bg-[var(--accent)] text-[var(--ink)]"
              : "bg-white/8 text-[var(--cream-muted)] hover:bg-white/12"}`}>
            {p.label}
          </button>
        ))}
      </div>

      {/* My rank card */}
      {myRank != null && (
        <div className="rounded-2xl border border-[var(--accent)]/25 bg-[var(--accent)]/8 px-5 py-4 flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--accent)]/20 border border-[var(--accent)]/30 text-lg font-extrabold text-[var(--accent)]">
            #{myRank}
          </div>
          <div className="flex-1">
            <p className="text-xs text-[var(--cream-muted)]">Your position</p>
            <p className="text-lg font-extrabold text-[var(--cream)]">
              Rank #{myRank} · {myHours}h studied
            </p>
          </div>
          <div className="text-2xl">{myRank <= 3 ? getMedal(myRank) : "🎯"}</div>
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {[1,2,3,4,5].map(i => (
            <div key={i} className="h-16 rounded-2xl bg-white/5 animate-pulse" />
          ))}
        </div>
      ) : leaderboard.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-black/30 px-6 py-14 text-center">
          <Trophy className="h-10 w-10 text-[var(--wood)] mx-auto mb-3" />
          <p className="text-sm font-semibold text-[var(--cream-muted)]">No data yet for this period</p>
          <p className="text-xs text-[var(--wood)] mt-1">Study sessions start karein aur yahan appear karein!</p>
        </div>
      ) : (
        <>
          {/* Top 3 podium */}
          {top3.length > 0 && (
            <div className="grid grid-cols-3 gap-3">
              {/* 2nd place */}
              {top3[1] ? (
                <div className={`flex flex-col items-center rounded-2xl border ${getMedalColor(2).border} ${getMedalColor(2).bg} p-4 pt-3`}>
                  <div className="text-2xl mb-2">🥈</div>
                  <div className={`w-10 h-10 rounded-full border ${getMedalColor(2).border} flex items-center justify-center text-xs font-extrabold ${getMedalColor(2).text} mb-2`}>
                    {getInitials(top3[1].name)}
                  </div>
                  <p className="text-[11px] font-bold text-[var(--cream)] text-center truncate w-full">{top3[1].name}</p>
                  <p className="text-sm font-extrabold text-slate-300 mt-1">{top3[1].totalHours}h</p>
                  {top3[1].streakDays ? <p className="text-[9px] text-amber-400 mt-0.5">🔥{top3[1].streakDays}d</p> : null}
                </div>
              ) : <div />}

              {/* 1st place - center, taller */}
              {top3[0] && (
                <div className={`flex flex-col items-center rounded-2xl border ${getMedalColor(1).border} ${getMedalColor(1).bg} ${getMedalColor(1).glow} p-4 pt-2 -mt-3`}>
                  <div className="text-3xl mb-2">🥇</div>
                  <div className={`w-12 h-12 rounded-full border-2 ${getMedalColor(1).border} flex items-center justify-center text-sm font-extrabold ${getMedalColor(1).text} mb-2`}>
                    {getInitials(top3[0].name)}
                  </div>
                  <p className="text-[11px] font-bold text-[var(--cream)] text-center truncate w-full">{top3[0].name}</p>
                  <p className="text-base font-extrabold text-amber-300 mt-1">{top3[0].totalHours}h</p>
                  {top3[0].streakDays ? <p className="text-[9px] text-amber-400 mt-0.5">🔥{top3[0].streakDays}d</p> : null}
                  {top3[0].coins ? <p className="text-[9px] text-amber-500 mt-0.5">🪙{top3[0].coins}</p> : null}
                </div>
              )}

              {/* 3rd place */}
              {top3[2] ? (
                <div className={`flex flex-col items-center rounded-2xl border ${getMedalColor(3).border} ${getMedalColor(3).bg} p-4 pt-3`}>
                  <div className="text-2xl mb-2">🥉</div>
                  <div className={`w-10 h-10 rounded-full border ${getMedalColor(3).border} flex items-center justify-center text-xs font-extrabold ${getMedalColor(3).text} mb-2`}>
                    {getInitials(top3[2].name)}
                  </div>
                  <p className="text-[11px] font-bold text-[var(--cream)] text-center truncate w-full">{top3[2].name}</p>
                  <p className="text-sm font-extrabold text-amber-600 mt-1">{top3[2].totalHours}h</p>
                  {top3[2].streakDays ? <p className="text-[9px] text-amber-400 mt-0.5">🔥{top3[2].streakDays}d</p> : null}
                </div>
              ) : <div />}
            </div>
          )}

          {/* Rest of leaderboard */}
          {rest.length > 0 && (
            <ul className="space-y-2">
              {rest.map(entry => {
                const isMe = entry.userId === currentUserId;
                const colors = getMedalColor(entry.rank);
                const barPct = Math.round((entry.totalHours / maxHours) * 100);
                return (
                  <li key={entry.userId}
                    className={`relative flex items-center gap-3 rounded-2xl border px-4 py-3 overflow-hidden transition ${isMe
                      ? "border-[var(--accent)]/30 bg-[var(--accent)]/8"
                      : "border-white/8 bg-black/20 hover:bg-black/30"}`}>
                    {/* Progress bar background */}
                    <div className="absolute inset-0 opacity-10">
                      <div className="h-full bg-[var(--accent)] transition-all" style={{ width: `${barPct}%` }} />
                    </div>

                    {/* Rank */}
                    <span className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-extrabold ${colors.bg} ${colors.border} ${colors.text}`}>
                      {getMedal(entry.rank)}
                    </span>

                    {/* Avatar */}
                    <div className={`relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${isMe ? "border-[var(--accent)]/40 bg-[var(--accent)]/15 text-[var(--accent)]" : "border-white/10 bg-white/5 text-[var(--cream-muted)]"}`}>
                      {getInitials(entry.name)}
                    </div>

                    {/* Info */}
                    <div className="relative z-10 flex-1 min-w-0">
                      <p className={`text-sm font-bold truncate ${isMe ? "text-[var(--accent)]" : "text-[var(--cream)]"}`}>
                        {entry.name} {isMe && <span className="text-[10px] font-normal opacity-60">(you)</span>}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {entry.streakDays ? (
                          <span className="flex items-center gap-0.5 text-[10px] text-amber-400">
                            <Flame className="h-3 w-3" />{entry.streakDays}d
                          </span>
                        ) : null}
                        {entry.coins ? (
                          <span className="flex items-center gap-0.5 text-[10px] text-amber-500">
                            <Zap className="h-3 w-3" />{entry.coins}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    {/* Hours */}
                    <div className="relative z-10 flex items-center gap-1 shrink-0">
                      <Clock className="h-3.5 w-3.5 text-[var(--wood)]" />
                      <span className={`text-base font-extrabold ${isMe ? "text-[var(--accent)]" : "text-[var(--cream)]"}`}>
                        {entry.totalHours}h
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
