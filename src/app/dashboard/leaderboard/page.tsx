"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Trophy, Share2, ChevronLeft } from "lucide-react";
import toast from "react-hot-toast";

type Entry = {
  rank: number;
  userId: string;
  name: string;
  totalMinutes: number;
  totalHours: number;
};

const PERIODS = [
  { value: "today", label: "Today" },
  { value: "weekly", label: "This week" },
  { value: "alltime", label: "All time" },
] as const;

export default function LeaderboardPage() {
  const [period, setPeriod] = useState<"today" | "weekly" | "alltime">("weekly");
  const [leaderboard, setLeaderboard] = useState<Entry[]>([]);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [myHours, setMyHours] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [shareCardVisible, setShareCardVisible] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/study/leaderboard?period=${period}`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : {}))
      .then((data: { leaderboard?: Entry[]; myRank?: number; myHours?: number }) => {
        setLeaderboard(Array.isArray(data.leaderboard) ? data.leaderboard : []);
        setMyRank(data.myRank ?? null);
        setMyHours(data.myHours ?? null);
      })
      .catch(() => setLeaderboard([]))
      .finally(() => setLoading(false));
  }, [period]);

  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/dashboard/leaderboard` : "";
  const shareText = myRank != null && myHours != null
    ? `I'm #${myRank} on the The Cyber Library study leaderboard with ${myHours}h! Join the race: ${shareUrl}`
    : `Check out the The Cyber Library study leaderboard: ${shareUrl}`;

  function handleShare() {
    if (typeof navigator !== "undefined" && navigator.share) {
      navigator
        .share({
          title: "The Cyber Library Leaderboard",
          text: shareText,
          url: shareUrl,
        })
        .then(() => toast.success("Shared!"))
        .catch((err) => {
          if (err.name !== "AbortError") toast.error("Share failed");
        });
    } else {
      navigator.clipboard?.writeText(shareText).then(
        () => toast.success("Copied to clipboard!"),
        () => toast.error("Copy failed")
      );
    }
  }

  function copyShareUrl() {
    navigator.clipboard?.writeText(shareUrl).then(
      () => toast.success("Link copied!"),
      () => toast.error("Copy failed")
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-6">
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard"
          className="flex items-center gap-1 text-sm font-medium text-[var(--cream-muted)] hover:text-[var(--accent)]"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to dashboard
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-[var(--cream)] flex items-center gap-2">
          <Trophy className="h-7 w-7 text-amber-400" />
          Study Leaderboard
        </h1>
        <p className="mt-1 text-sm text-[var(--cream-muted)]">
          Top studiers by hours — today, this week, or all time
        </p>
      </div>

      <div className="flex gap-2">
        {PERIODS.map((p) => (
          <button
            key={p.value}
            type="button"
            onClick={() => setPeriod(p.value)}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
              period === p.value
                ? "bg-[var(--accent)] text-[var(--ink)]"
                : "bg-white/10 text-[var(--cream-muted)] hover:bg-white/15"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {(myRank != null || myHours != null) && (
        <div className="rounded-2xl border border-[var(--accent)]/30 bg-[var(--accent)]/10 p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-[var(--cream-muted)]">Your rank</p>
            <p className="text-xl font-bold text-[var(--cream)]">
              {myRank != null ? `#${myRank}` : "—"} {myHours != null && `• ${myHours}h`}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShareCardVisible(!shareCardVisible)}
              className="rounded-xl bg-white/10 px-3 py-2 text-sm font-medium text-[var(--cream)] hover:bg-white/20"
            >
              Share card
            </button>
            <button
              type="button"
              onClick={handleShare}
              className="flex items-center gap-2 rounded-xl bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-[var(--ink)] hover:opacity-90"
            >
              <Share2 className="h-4 w-4" />
              Share my rank
            </button>
          </div>
        </div>
      )}

      {shareCardVisible && (myRank != null || myHours != null) && (
        <div className="rounded-2xl border-2 border-white/20 bg-gradient-to-br from-[var(--accent)]/20 to-black/50 p-6 text-center">
          <p className="text-xs uppercase tracking-wider text-[var(--cream-muted)]">The Cyber Library</p>
          <p className="mt-2 text-3xl font-bold text-[var(--cream)]">Study Leaderboard</p>
          <p className="mt-4 text-5xl font-black text-[var(--accent)]">
            #{myRank ?? "—"}
          </p>
          <p className="mt-1 text-lg text-[var(--cream-muted)]">{myHours ?? 0} hours studied</p>
          <p className="mt-4 text-xs text-[var(--cream-muted)]">Screenshot & share on Instagram</p>
        </div>
      )}

      {loading ? (
        <p className="rounded-2xl border border-white/10 bg-black/30 px-6 py-10 text-center text-sm text-[var(--cream-muted)]">
          Loading…
        </p>
      ) : leaderboard.length === 0 ? (
        <p className="rounded-2xl border border-white/10 bg-black/30 px-6 py-10 text-center text-sm text-[var(--cream-muted)]">
          No data for this period. Start studying to appear here!
        </p>
      ) : (
        <ul className="space-y-2">
          {leaderboard.map((entry) => (
            <li
              key={entry.userId}
              className="flex items-center gap-4 rounded-xl border border-white/10 bg-black/30 px-4 py-3"
            >
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                  entry.rank === 1 ? "bg-amber-500/30 text-amber-300" :
                  entry.rank === 2 ? "bg-white/20 text-[var(--cream)]" :
                  entry.rank === 3 ? "bg-amber-700/30 text-amber-200" :
                  "bg-white/10 text-[var(--cream-muted)]"
                }`}
              >
                {entry.rank}
              </span>
              <span className="min-w-0 flex-1 truncate font-medium text-[var(--cream)]">
                {entry.name}
              </span>
              <span className="shrink-0 text-lg font-bold text-[var(--accent)]">
                {entry.totalHours}h
              </span>
            </li>
          ))}
        </ul>
      )}

      <p className="text-center text-xs text-[var(--cream-muted)]">
        <button type="button" onClick={copyShareUrl} className="text-[var(--accent)] hover:underline">
          Copy leaderboard link
        </button>
      </p>
    </div>
  );
}
