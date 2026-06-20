"use client";

import { useState, useEffect } from "react";
import { Trophy, Share2, Flame, Clock, Zap, Medal, TrendingUp } from "lucide-react";
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
  { value: "today",   label: "Today" },
  { value: "weekly",  label: "This Week" },
  { value: "alltime", label: "All Time" },
] as const;

function getInitials(name: string) {
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) || "?";
}

function fmtMin(minutes: number) {
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  return `${minutes}m`;
}

const PODIUM = [
  { rank: 2, idx: 1, medal: "🥈", height: "h-20", bg: "bg-slate-50 border-slate-200", text: "text-slate-600", avatar: "bg-slate-100 border-slate-300 text-slate-600" },
  { rank: 1, idx: 0, medal: "🥇", height: "h-28", bg: "bg-amber-50 border-amber-300", text: "text-amber-700", avatar: "bg-amber-100 border-amber-400 text-amber-700", glow: true },
  { rank: 3, idx: 2, medal: "🥉", height: "h-14", bg: "bg-orange-50 border-orange-200", text: "text-orange-600", avatar: "bg-orange-100 border-orange-300 text-orange-600" },
];

export function LeaderboardClient() {
  const [period, setPeriod] = useState<"today" | "weekly" | "alltime">("weekly");
  const [leaderboard, setLeaderboard] = useState<Entry[]>([]);
  const [myRank, setMyRank]     = useState<number | null>(null);
  const [myHours, setMyHours]   = useState<number | null>(null);
  const [loading, setLoading]   = useState(true);
  // home.lstudy.in has no session of its own (cookies aren't shared across
  // subdomains), so there's never a "me" to highlight here — left at null.
  const currentUserId: string | null = null;

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

  function handleShare() {
    const text = myRank != null
      ? `I'm #${myRank} on the Let's Study leaderboard with ${fmtMin(myHours ?? 0)} studied! 🏆 lstudy.in/leaderboard`
      : "Check out the Let's Study study leaderboard! lstudy.in/leaderboard";
    const url = typeof window !== "undefined" ? window.location.href : "https://lstudy.in/leaderboard";
    if (navigator.share) {
      navigator.share({ title: "Let's Study Leaderboard", text, url }).catch(e => {
        if (e.name !== "AbortError") toast.error("Share failed");
      });
    } else {
      navigator.clipboard?.writeText(text)
        .then(() => toast.success("Copied to clipboard!"))
        .catch(() => toast.error("Copy failed"));
    }
  }

  const top3 = leaderboard.slice(0, 3);
  const rest  = leaderboard.slice(3);
  const maxMin = Math.max(...leaderboard.map(e => e.totalMinutes), 1);

  return (
    <div className="mx-auto max-w-3xl space-y-5 pb-16 px-4 sm:px-0">

      {/* Period tabs */}
      <div className="bg-white rounded-2xl border border-[var(--border)] shadow-[var(--shadow-sm)] p-1.5 flex gap-1">
        {PERIODS.map(p => (
          <button
            key={p.value}
            onClick={() => setPeriod(p.value)}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
              period === p.value
                ? "bg-[var(--accent)] text-white shadow-sm"
                : "text-[var(--muted-text)] hover:bg-[var(--page-bg)]"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* My rank card — only shown when logged in and ranked */}
      {myRank != null && (
        <div className="bg-[var(--accent-pale)] border border-[var(--accent-border)] rounded-2xl px-5 py-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-[var(--accent)]/20 border-2 border-[var(--accent)]/30 flex items-center justify-center text-lg font-black text-[var(--accent)]">
            #{myRank}
          </div>
          <div className="flex-1">
            <p className="text-xs text-[var(--muted-text)]">Your current position</p>
            <p className="text-base font-black text-[var(--foreground)]">
              Rank #{myRank} · {fmtMin(myHours ?? 0)} studied
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">{myRank <= 3 ? ["🥇", "🥈", "🥉"][myRank - 1] : "🎯"}</span>
            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[var(--accent)] text-white text-xs font-bold hover:bg-[var(--accent-hover)] transition-all shadow-[var(--shadow-brand)]"
            >
              <Share2 className="w-3.5 h-3.5" />
              Share
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-2xl border border-[var(--border)] shadow-[var(--shadow-sm)] p-12 flex justify-center">
          <div className="space-y-3 w-full">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-14 rounded-xl bg-[var(--page-bg)] animate-pulse" />
            ))}
          </div>
        </div>
      ) : leaderboard.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[var(--border)] shadow-[var(--shadow-sm)] px-6 py-20 text-center">
          <Trophy className="w-12 h-12 text-amber-300 mx-auto mb-4" />
          <p className="text-base font-bold text-[var(--foreground)]">No data yet for this period</p>
          <p className="text-sm text-[var(--muted-text)] mt-2">Start study sessions and claim your spot!</p>
        </div>
      ) : (
        <div className="space-y-5">

          {/* Podium */}
          {top3.length >= 1 && (
            <div className="bg-white rounded-2xl border border-[var(--border)] shadow-[var(--shadow-sm)] p-6">
              <div className="flex items-center gap-2 mb-6">
                <Medal className="w-4 h-4 text-amber-500" />
                <h2 className="text-sm font-bold text-[var(--foreground)]">Top 3 Scholars</h2>
              </div>
              <div className="flex items-end justify-center gap-3 h-60">
                {PODIUM.map(({ rank, idx, medal, height, bg, text, avatar, glow }) => {
                  const entry = top3[idx];
                  if (!entry) return <div key={rank} className="flex-1" />;
                  const isMe = entry.userId === currentUserId;
                  return (
                    <div key={rank} className="flex-1 flex flex-col items-center gap-2">
                      <span className="text-3xl">{medal}</span>
                      <div className={`w-14 h-14 rounded-full border-2 ${isMe ? "border-[var(--accent)] bg-[var(--accent-pale)] text-[var(--accent)]" : avatar} flex items-center justify-center text-sm font-extrabold`}>
                        {getInitials(entry.name)}
                      </div>
                      <p className="text-xs font-bold text-[var(--foreground)] text-center truncate w-full px-1">
                        {entry.name} {isMe && <span className="text-[var(--accent)]">(you)</span>}
                      </p>
                      {entry.streakDays ? (
                        <p className="text-[11px] text-amber-500">🔥 {entry.streakDays}d streak</p>
                      ) : null}
                      <div className={`w-full ${height} rounded-t-2xl border ${bg} flex flex-col items-center justify-start pt-3 gap-1 ${glow ? "shadow-[0_-6px_20px_rgba(245,158,11,0.2)]" : ""}`}>
                        <span className={`text-base font-black ${text}`}>{fmtMin(entry.totalMinutes)}</span>
                        {entry.coins ? <span className="text-[10px] text-[var(--accent)] flex items-center gap-0.5"><Zap className="w-3 h-3" />{entry.coins}</span> : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Rankings 4–10 */}
          {rest.length > 0 && (
            <div className="bg-white rounded-2xl border border-[var(--border)] shadow-[var(--shadow-sm)] p-5">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-4 h-4 text-[var(--accent)]" />
                <h2 className="text-sm font-bold text-[var(--foreground)]">Full Rankings</h2>
              </div>
              <ul className="space-y-2">
                {rest.map(entry => {
                  const isMe = entry.userId === currentUserId;
                  const barPct = Math.round((entry.totalMinutes / maxMin) * 100);
                  return (
                    <li
                      key={entry.userId}
                      className={`relative flex items-center gap-3 rounded-xl border px-4 py-3 overflow-hidden transition-all ${
                        isMe
                          ? "border-[var(--accent-border)] bg-[var(--accent-pale)]"
                          : "border-[var(--border)] bg-white hover:bg-[var(--page-bg)]"
                      }`}
                    >
                      <div className="absolute inset-0 opacity-[0.06] pointer-events-none">
                        <div className="h-full bg-[var(--accent)]" style={{ width: `${barPct}%` }} />
                      </div>
                      <span className={`relative z-10 w-8 h-8 shrink-0 flex items-center justify-center rounded-full text-xs font-black ${
                        isMe ? "bg-[var(--accent)] text-white" : "bg-[var(--page-bg)] border border-[var(--border)] text-[var(--muted-text)]"
                      }`}>
                        {entry.rank}
                      </span>
                      <div className={`relative z-10 w-9 h-9 shrink-0 rounded-full border-2 flex items-center justify-center text-xs font-bold ${
                        isMe ? "border-[var(--accent)]/40 bg-[var(--accent)]/10 text-[var(--accent)]" : "border-[var(--border)] bg-[var(--page-bg)] text-[var(--muted-text)]"
                      }`}>
                        {getInitials(entry.name)}
                      </div>
                      <div className="relative z-10 flex-1 min-w-0">
                        <p className={`text-sm font-bold truncate ${isMe ? "text-[var(--accent)]" : "text-[var(--foreground)]"}`}>
                          {entry.name} {isMe && <span className="text-[10px] font-normal text-[var(--muted-text)]">(you)</span>}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {entry.streakDays ? (
                            <span className="text-[10px] text-amber-500 flex items-center gap-0.5">
                              <Flame className="w-3 h-3" />{entry.streakDays}d
                            </span>
                          ) : null}
                          {entry.coins ? (
                            <span className="text-[10px] text-[var(--accent)] flex items-center gap-0.5">
                              <Zap className="w-3 h-3" />{entry.coins} coins
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <div className="relative z-10 flex items-center gap-1 shrink-0">
                        <Clock className="w-3.5 h-3.5 text-[var(--muted-text)]" />
                        <span className={`text-base font-black ${isMe ? "text-[var(--accent)]" : "text-[var(--foreground)]"}`}>
                          {fmtMin(entry.totalMinutes)}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
