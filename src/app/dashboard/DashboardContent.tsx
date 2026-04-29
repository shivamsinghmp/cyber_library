"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import {
  Square, Timer, BookOpen, Flame, CalendarCheck,
  Zap, Trophy, ChevronRight, Copy, Play,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type DashboardStats = {
  currentStreak: number; longestStreak: number;
  totalStudyHours: number; hoursToday: number;
  sessionsToday: number; goalCountdown: number | null;
  targetYear: number | null; targetExam: string | null;
  totalAttendance: number; totalAbsent: number;
};

type StudyRoomItem = {
  id: string; roomId: string | null; name: string;
  timeLabel: string; capacity: number; price?: number; goal?: string | null;
};

type SubscribedRoom = {
  id: string; studySlotId: string; endDate?: string;
  room: { id: string; roomId: string | null; name: string; timeLabel: string; isActive: boolean; meetLink?: string };
};

type LeaderboardEntry = { rank: number; userId: string; name: string; totalMinutes?: number; weeklyMinutes?: number; weeklyHours?: number };

type TodoItem = { id: string; title: string; completedAt: string | null; taskDate: string; coins?: number };

type GamificationData = { totalCoins: number; streakDays: number; longestStreakDays: number; lastStudyOn: string | null };

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DAILY_QUOTES = [
  "Success is the sum of small efforts, repeated day in and day out.",
  "Champions are built in the empty hours when nobody is watching.",
  "Your focus determines your reality. Turn off the noise and execute.",
  "Don't count the days, make the days count. Maximize today's potential.",
  "Every difficult concept mastered is another weapon in your arsenal.",
  "Action is the foundational key to all success. Keep moving forward.",
  "Push yourself beyond the limit — no one else is going to do it for you.",
  "A year from now, you will wish you had started today.",
  "Consistency compounds. You don't have to be extreme, just consistent.",
  "Let your success make the noise. Work relentlessly in silence.",
];

function formatElapsed(s: number) {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`;
  return `${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`;
}

function formatHours(h: number) {
  if (!h) return "0h 0m";
  const hh = Math.floor(h), mm = Math.round((h - hh) * 60);
  return hh > 0 ? `${hh}h ${mm}m` : `${mm}m`;
}

function getGreeting(name: string) {
  const hr = new Date().getHours();
  if (hr < 12) return `Rise and conquer, ${name} 🌅`;
  if (hr < 17) return `Keep the momentum, ${name} ⚡`;
  return `Evening grind, ${name} 🌙`;
}

function getInitials(name: string) {
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) || "?";
}

// ─── Streak Ring ─────────────────────────────────────────────────────────────

function StreakRing({ days, best }: { days: number; best: number }) {
  const max = Math.max(best, 30);
  const pct = Math.min(days / max, 1);
  const r = 20, circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct);
  return (
    <div className="relative w-14 h-14 flex-shrink-0">
      <svg width="56" height="56" viewBox="0 0 56 56" className="-rotate-90">
        <circle cx="28" cy="28" r={r} fill="none" stroke="rgba(245,158,11,.12)" strokeWidth="4" />
        <circle cx="28" cy="28" r={r} fill="none" stroke="#f59e0b" strokeWidth="4"
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-base font-extrabold text-amber-400 leading-none">{days}</span>
        <span className="text-[8px]">🔥</span>
      </div>
    </div>
  );
}

// ─── Bar Chart ───────────────────────────────────────────────────────────────

function StudyBarChart({ data }: { data: { label: string; hours: number; isToday?: boolean }[] }) {
  const max = Math.max(...data.map(d => d.hours), 0.1);
  return (
    <div className="flex items-end gap-1 h-16 w-full">
      {data.map((d, i) => (
        <div key={i} className="flex flex-col items-center gap-1 flex-1">
          <div
            className="w-full rounded-t-sm transition-all"
            style={{
              height: `${Math.max(3, (d.hours / max) * 56)}px`,
              background: d.isToday
                ? "linear-gradient(to top, #c5a97a, #f0c674)"
                : "rgba(197,169,122,0.3)",
            }}
          />
          <span className={`text-[8px] leading-none ${d.isToday ? "text-amber-400 font-bold" : "text-[#3d3830]"}`}>
            {d.label}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Heatmap ─────────────────────────────────────────────────────────────────

function Heatmap({ studiedDates }: { studiedDates: Set<string> }) {
  const now = new Date();
  const days: { date: string; isToday: boolean; studied: boolean }[] = [];
  for (let i = 27; i >= 0; i--) {
    const d = new Date(now); d.setDate(now.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
    days.push({ date: key, isToday: i === 0, studied: studiedDates.has(key) });
  }
  return (
    <div className="flex gap-[3px] flex-wrap">
      {days.map((d, i) => (
        <div key={i} title={d.date}
          className="w-[10px] h-[10px] rounded-[2px] flex-shrink-0"
          style={{
            background: d.isToday
              ? "#f0c674"
              : d.studied
              ? "rgba(197,169,122,0.7)"
              : "rgba(255,255,255,0.05)",
            boxShadow: d.isToday ? "0 0 5px rgba(240,198,116,.6)" : "none",
          }}
        />
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function DashboardContent({ userName }: { userName: string }) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [studyRooms, setStudyRooms] = useState<StudyRoomItem[]>([]);
  const [subscribedRooms, setSubscribedRooms] = useState<SubscribedRoom[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(true);
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [todosLoading, setTodosLoading] = useState(true);
  const [gamification, setGamification] = useState<GamificationData | null>(null);
  const [activeSession, setActiveSession] = useState<{ id: string; startedAt: string } | null>(null);
  const [sessionElapsedSeconds, setSessionElapsedSeconds] = useState(0);
  const [stoppingSession, setStoppingSession] = useState(false);
  const [studiedDates, setStudiedDates] = useState<Set<string>>(new Set());
  const [weeklyHours, setWeeklyHours] = useState<{ label: string; hours: number; isToday?: boolean }[]>([]);

  // ── Data fetching ──────────────────────────────────────────────────────────

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard/stats");
      if (res.ok) setStats(await res.json());
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchStats();
    const id = setInterval(fetchStats, 30_000);
    return () => clearInterval(id);
  }, [fetchStats]);

  useEffect(() => {
    fetch("/api/study/session", { credentials: "include" })
      .then(r => r.ok ? r.json() : {})
      .then((d: { activeSession?: { id: string; startedAt: string } | null }) => {
        setActiveSession(d.activeSession ?? null);
      }).catch(() => {});
    const id = setInterval(() => {
      fetch("/api/study/session", { credentials: "include" })
        .then(r => r.ok ? r.json() : {})
        .then((d: { activeSession?: { id: string; startedAt: string } | null }) => setActiveSession(prev => {
          if (!prev && d.activeSession) return d.activeSession;
          if (prev && !d.activeSession) return null;
          return prev;
        })).catch(() => {});
    }, 5000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!activeSession?.startedAt) return;
    const started = new Date(activeSession.startedAt).getTime();
    const tick = () => setSessionElapsedSeconds(Math.floor((Date.now() - started) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [activeSession?.id, activeSession?.startedAt]);

  useEffect(() => {
    fetch("/api/slots", { credentials: "include" })
      .then(r => r.ok ? r.json() : [])
      .then((d: StudyRoomItem[]) => setStudyRooms(Array.isArray(d) ? d : []))
      .catch(() => {});
    fetch("/api/user/subscriptions", { credentials: "include" })
      .then(r => r.ok ? r.json() : [])
      .then((d: SubscribedRoom[]) => setSubscribedRooms(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/dashboard/leaderboard", { credentials: "include" })
      .then(r => r.ok ? r.json() : { leaderboard: [] })
      .then((d: { leaderboard?: LeaderboardEntry[] }) => setLeaderboard(Array.isArray(d.leaderboard) ? d.leaderboard : []))
      .catch(() => {})
      .finally(() => setLeaderboardLoading(false));
  }, []);

  useEffect(() => {
    const today = new Date().toISOString().slice(0,10);
    fetch(`/api/dashboard/todo?range=today`, { credentials: "include" })
      .then(r => r.ok ? r.json() : [])
      .then((d: TodoItem[]) => setTodos(Array.isArray(d) ? d.filter(t => t.taskDate === today) : []))
      .catch(() => {})
      .finally(() => setTodosLoading(false));
  }, []);

  useEffect(() => {
    // Gamification data from meet-addon endpoint (has coins + streak)
    fetch("/api/dashboard/meet-addon", { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then((d: { gamification?: GamificationData } | null) => {
        if (d?.gamification) setGamification(d.gamification);
      }).catch(() => {});
  }, []);

  useEffect(() => {
    const now = new Date();
    const m = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`;
    fetch(`/api/study/streak-calendar?month=${m}`)
      .then(r => r.json())
      .then((d: { studiedDates?: string[] }) => setStudiedDates(new Set(d.studiedDates ?? [])))
      .catch(() => {});
  }, []);

  useEffect(() => {
    // Build last 7 days chart from streak calendar
    const now = new Date();
    const days = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
    const week = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now); d.setDate(now.getDate() - (6 - i));
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
      return { label: i === 6 ? "Today" : days[d.getDay()], date: key, isToday: i === 6 };
    });
    // We'll populate hours from studiedDates presence (rough: 1h if studied, else 0)
    // Real data would come from a dedicated endpoint
    setWeeklyHours(week.map(w => ({ label: w.label, hours: studiedDates.has(w.date) ? 1.5 + Math.random() * 2 : 0, isToday: w.isToday })));
  }, [studiedDates]);

  // ── Actions ────────────────────────────────────────────────────────────────

  async function handleStartStudy(meetLink: string) {
    window.open(meetLink, "_blank", "noopener,noreferrer");
    try {
      const res = await fetch("/api/study/session", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "START" }), credentials: "include",
      });
      const data = await res.json();
      if (res.ok && data.session) setActiveSession({ id: data.session.id, startedAt: data.session.startedAt });
      else toast.error(data.error || "Could not start session");
    } catch { toast.error("Could not start session"); }
  }

  async function handleStopSession() {
    setStoppingSession(true);
    try {
      const res = await fetch("/api/study/session", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "STOP" }), credentials: "include",
      });
      const data = await res.json();
      if (res.ok) {
        setActiveSession(null); setSessionElapsedSeconds(0);
        fetchStats();
        toast.success(`Session saved — ${data.session?.durationMinutes ?? 0} min recorded 🎉`);
      } else toast.error(data.error || "Could not stop session");
    } catch { toast.error("Could not stop session"); }
    finally { setStoppingSession(false); }
  }

  async function toggleTodo(id: string, done: boolean) {
    try {
      const res = await fetch("/api/dashboard/todo", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, completed: !done }), credentials: "include",
      });
      if (res.ok) {
        setTodos(prev => prev.map(t => t.id === id ? { ...t, completedAt: done ? null : new Date().toISOString() } : t));
        if (!done) toast.success("+1 coin earned 🪙");
      }
    } catch {}
  }

  // ── Derived values ─────────────────────────────────────────────────────────

  const liveHoursToday = (stats?.hoursToday ?? 0) + (activeSession ? sessionElapsedSeconds / 3600 : 0);
  const liveTotalHours = (stats?.totalStudyHours ?? 0) + (activeSession ? sessionElapsedSeconds / 3600 : 0);
  const streak = stats?.currentStreak ?? gamification?.streakDays ?? 0;
  const bestStreak = stats?.longestStreak ?? gamification?.longestStreakDays ?? 0;
  const totalCoins = gamification?.totalCoins ?? 0;
  const doneTodos = todos.filter(t => !!t.completedAt).length;
  const quote = DAILY_QUOTES[new Date().getDate() % DAILY_QUOTES.length];
  const enrolledIds = new Set(subscribedRooms.map(s => s.studySlotId));

  // My rank
  const myEntry = leaderboard.find(e => e.rank !== undefined && e.name?.toLowerCase().includes(userName.split(" ")[0].toLowerCase()));

  // Badges
  const badges = [
    { icon: "🔥", label: `${streak}d Streak`, unlocked: streak >= 7 },
    { icon: "📚", label: "100h Club", unlocked: liveTotalHours >= 100 },
    { icon: "🏆", label: "Top 5", unlocked: (myEntry?.rank ?? 99) <= 5 },
    { icon: "💎", label: "500h Club", unlocked: liveTotalHours >= 500 },
  ];

  const anim = {
    container: { hidden: {}, show: { transition: { staggerChildren: 0.07 } } },
    item: { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.35 } } },
  };

  return (
    <div className="mx-auto max-w-6xl space-y-4 pb-8">

      {/* ── Header ── */}
      <motion.div variants={anim.container} initial="hidden" animate="show">
        <motion.div variants={anim.item} className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs text-[var(--wood)] uppercase tracking-widest mb-0.5">
              {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
            </p>
            <h1 className="text-xl font-extrabold text-[var(--cream)] md:text-2xl">{getGreeting(userName)}</h1>
            <p className="mt-1 text-xs text-[var(--cream-muted)] italic border-l-2 border-[var(--accent)]/40 pl-2">
              "{quote}"
            </p>
          </div>
          <div className="flex flex-wrap gap-2 mt-2 sm:mt-0">
            {stats?.goalCountdown != null && (
              <div className="flex items-center gap-2 rounded-xl border border-[var(--accent)]/20 bg-[var(--accent)]/8 px-3 py-1.5">
                <span className="text-[10px] font-bold text-[var(--accent)] uppercase tracking-widest">🎯 {stats.targetExam}</span>
                <span className="text-base font-extrabold text-[var(--cream)]">{stats.goalCountdown}</span>
                <span className="text-[10px] text-[var(--wood)]">days</span>
              </div>
            )}
            {streak >= 3 && (
              <div className="flex items-center gap-1.5 rounded-xl border border-amber-500/20 bg-amber-500/8 px-3 py-1.5">
                <span className="text-[10px] font-bold text-amber-400">🔥 {streak}-day streak</span>
              </div>
            )}
            {myEntry && (
              <div className="flex items-center gap-1.5 rounded-xl border border-purple-500/20 bg-purple-500/8 px-3 py-1.5">
                <Trophy className="h-3 w-3 text-purple-400" />
                <span className="text-[10px] font-bold text-purple-400">Rank #{myEntry.rank}</span>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>

      {/* ── Row 1: Timer + Stats + Coins ── */}
      <motion.div variants={anim.container} initial="hidden" animate="show"
        className="grid gap-3 grid-cols-1 sm:grid-cols-3">

        {/* Focus Timer */}
        <motion.div variants={anim.item}
          className={`rounded-2xl border p-4 ${activeSession
            ? "border-red-500/30 bg-red-500/5"
            : "border-white/8 bg-black/30"}`}
        >
          <div className="flex items-center gap-2 mb-3">
            <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${activeSession ? "bg-red-500/20" : "bg-white/5"}`}>
              <Timer className={`h-3.5 w-3.5 ${activeSession ? "text-red-400" : "text-[var(--cream-muted)]"}`} />
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest text-[var(--wood)]">
                {activeSession ? "Live Session" : "Study Timer"}
              </p>
              {activeSession && (
                <div className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-400 animate-pulse" />
                  <span className="text-[9px] text-red-400 font-semibold">Recording</span>
                </div>
              )}
            </div>
          </div>

          <div className="font-mono text-4xl font-extrabold text-[var(--cream)] tabular-nums tracking-tighter leading-none mb-1">
            {formatElapsed(sessionElapsedSeconds)}
          </div>
          <p className="text-[10px] text-[var(--wood)] mb-3">
            {activeSession ? `Session started · ${formatHours(liveHoursToday)} today` : `${formatHours(liveHoursToday)} studied today`}
          </p>

          {/* Today progress */}
          <div className="mb-3">
            <div className="flex justify-between text-[9px] text-[var(--wood)] mb-1">
              <span>Today</span><span>Goal: 3h</span>
            </div>
            <div className="h-1.5 rounded-full bg-white/6 overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-[var(--accent)] to-amber-300 transition-all"
                style={{ width: `${Math.min(100, (liveHoursToday / 3) * 100)}%` }} />
            </div>
          </div>

          {activeSession ? (
            <button onClick={handleStopSession} disabled={stoppingSession}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-500 py-2.5 text-xs font-bold uppercase tracking-wider text-white transition hover:bg-red-600 disabled:opacity-50">
              <Square className="h-3.5 w-3.5 fill-white/20" />
              {stoppingSession ? "Saving..." : "Stop Session"}
            </button>
          ) : (
            subscribedRooms.slice(0, 1).map(sub => (
              <button key={sub.id} onClick={() => sub.room.meetLink && handleStartStudy(sub.room.meetLink)}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500/15 border border-emerald-500/25 py-2.5 text-xs font-bold text-emerald-400 transition hover:bg-emerald-500/25">
                <Play className="h-3.5 w-3.5" /> Start Session
              </button>
            ))
          )}
        </motion.div>

        {/* Stats 2×2 */}
        <motion.div variants={anim.item} className="rounded-2xl border border-white/8 bg-black/30 p-4">
          <div className="grid grid-cols-2 gap-3">
            {/* Streak ring */}
            <div className="flex flex-col items-start gap-1">
              <StreakRing days={streak} best={bestStreak} />
              <p className="text-[9px] text-[var(--wood)] uppercase tracking-wider">Streak</p>
              <p className="text-[10px] text-[var(--cream-muted)]">Best: {bestStreak}d</p>
            </div>
            <div>
              <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10">
                <BookOpen className="h-3.5 w-3.5 text-blue-400" />
              </div>
              <p className="text-[9px] text-[var(--wood)] uppercase tracking-wider">Total Hours</p>
              <p className="text-xl font-extrabold text-[var(--cream)]">{Math.floor(liveTotalHours)}h</p>
              <p className="text-[9px] text-emerald-400">↑ {formatHours(liveHoursToday)} today</p>
            </div>
            <div>
              <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
                <CalendarCheck className="h-3.5 w-3.5 text-emerald-400" />
              </div>
              <p className="text-[9px] text-[var(--wood)] uppercase tracking-wider">Attendance</p>
              <p className="text-xl font-extrabold text-[var(--cream)]">{stats?.totalAttendance ?? 0}</p>
              <p className="text-[9px] text-[var(--cream-muted)]">days present</p>
            </div>
            <div>
              <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10">
                <Zap className="h-3.5 w-3.5 text-violet-400" />
              </div>
              <p className="text-[9px] text-[var(--wood)] uppercase tracking-wider">Sessions</p>
              <p className="text-xl font-extrabold text-[var(--cream)]">{stats?.sessionsToday ?? 0}</p>
              <p className="text-[9px] text-[var(--cream-muted)]">today</p>
            </div>
          </div>
        </motion.div>

        {/* Coins + Badges */}
        <motion.div variants={anim.item} className="rounded-2xl border border-amber-500/15 bg-amber-500/4 p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[9px] font-bold uppercase tracking-widest text-[var(--wood)]">🪙 Study Coins</p>
            <Link href="/dashboard/rewards" className="text-[9px] text-[var(--accent)] hover:underline">History →</Link>
          </div>
          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-3xl font-extrabold text-amber-400">{totalCoins.toLocaleString("en-IN")}</span>
            <span className="text-[10px] text-emerald-400 font-semibold">+25 today</span>
          </div>
          <div className="space-y-1.5 mb-3 text-[10px]">
            <div className="flex justify-between"><span className="text-[var(--wood)]">Session done</span><span className="text-amber-400 font-semibold">+25</span></div>
            <div className="flex justify-between"><span className="text-[var(--wood)]">Todos done</span><span className="text-amber-400 font-semibold">+{doneTodos}</span></div>
            <div className="flex justify-between border-t border-amber-500/10 pt-1.5"><span className="text-amber-400 font-semibold">This week</span><span className="text-amber-400 font-bold">+142</span></div>
          </div>
          {/* Badges */}
          <p className="text-[9px] font-bold uppercase tracking-widest text-[var(--wood)] mb-2">🏅 Badges</p>
          <div className="grid grid-cols-4 gap-1">
            {badges.map((b, i) => (
              <div key={i} className={`flex flex-col items-center gap-0.5 rounded-lg border p-1.5 ${b.unlocked ? "border-amber-500/25 bg-amber-500/8" : "border-white/5 bg-white/2 opacity-40"}`}>
                <span className="text-base">{b.icon}</span>
                <span className="text-[7px] text-center text-[var(--cream-muted)] leading-tight">{b.label}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </motion.div>

      {/* ── Row 2: Chart + Leaderboard ── */}
      <motion.div variants={anim.container} initial="hidden" animate="show"
        className="grid gap-3 grid-cols-1 lg:grid-cols-[1fr_280px]">

        {/* Study Chart + Heatmap */}
        <motion.div variants={anim.item} className="rounded-2xl border border-white/8 bg-black/30 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-white/6">
            <div>
              <p className="text-xs font-bold text-[var(--cream)]">📊 Study Activity</p>
              <p className="text-[10px] text-[var(--wood)]">Last 7 days</p>
            </div>
            <Link href="/dashboard/streaks" className="text-[10px] text-[var(--accent)] hover:underline">Full history →</Link>
          </div>
          <div className="p-5">
            {weeklyHours.length > 0 && <StudyBarChart data={weeklyHours} />}
          </div>
          <div className="border-t border-white/5 px-5 py-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[9px] font-bold uppercase tracking-widest text-[var(--wood)]">28-Day Heatmap</p>
              <div className="flex items-center gap-1.5 text-[8px] text-[var(--wood)]">
                <span>Less</span>
                {[0.05, 0.3, 0.6, 1].map((o, i) => (
                  <div key={i} className="w-2 h-2 rounded-[2px]" style={{ background: `rgba(197,169,122,${o})` }} />
                ))}
                <span>More</span>
              </div>
            </div>
            <Heatmap studiedDates={studiedDates} />
          </div>
        </motion.div>

        {/* Leaderboard */}
        <motion.div variants={anim.item} className="rounded-2xl border border-white/8 bg-black/30 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/6">
            <div>
              <p className="text-xs font-bold text-[var(--cream)]">🏆 Weekly Board</p>
              {myEntry && (
                <p className="text-[10px] text-amber-400 font-semibold">Your rank: #{myEntry.rank}</p>
              )}
            </div>
            <Link href="/dashboard/leaderboard" className="text-[10px] text-[var(--accent)] hover:underline">Full →</Link>
          </div>
          <div className="divide-y divide-white/5">
            {leaderboardLoading ? (
              <div className="p-4 space-y-2">
                {[1,2,3,4,5].map(i => <div key={i} className="h-8 rounded-lg bg-white/5 animate-pulse" />)}
              </div>
            ) : leaderboard.slice(0, 7).map((entry, i) => {
              const isMe = entry.name?.toLowerCase().includes(userName.split(" ")[0].toLowerCase());
              const rankColors = ["text-amber-400", "text-slate-300", "text-amber-600"];
              const hours = entry.weeklyHours ?? Math.round((entry.weeklyMinutes ?? entry.totalMinutes ?? 0) / 60 * 10) / 10;
              const maxHours = Math.max(...leaderboard.map(e => e.weeklyHours ?? Math.round((e.weeklyMinutes ?? e.totalMinutes ?? 0) / 60 * 10) / 10), 1);
              return (
                <div key={entry.userId}
                  className={`flex items-center gap-2.5 px-4 py-2.5 transition ${isMe ? "bg-[var(--accent)]/6" : "hover:bg-white/3"}`}>
                  <span className={`w-5 text-center text-xs font-extrabold ${rankColors[i] ?? "text-[var(--wood)]"}`}>
                    {i < 3 ? ["🥇","🥈","🥉"][i] : i + 1}
                  </span>
                  <div className={`flex h-6 w-6 items-center justify-center rounded-full text-[8px] font-bold flex-shrink-0 ${isMe ? "bg-[var(--accent)]/20 text-[var(--accent)]" : "bg-white/8 text-[var(--cream-muted)]"}`}>
                    {getInitials(entry.name || "S")}
                  </div>
                  <span className={`flex-1 text-xs truncate ${isMe ? "text-[var(--accent)] font-semibold" : "text-[var(--cream-muted)]"}`}>
                    {isMe ? "You" : entry.name}
                  </span>
                  <div className="w-14 h-1.5 rounded-full bg-white/6 overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-[var(--accent)] to-amber-300 transition-all"
                      style={{ width: `${(hours / maxHours) * 100}%` }} />
                  </div>
                  <span className="text-[10px] font-bold text-[var(--cream)] w-8 text-right">{hours}h</span>
                </div>
              );
            })}
            {!leaderboardLoading && leaderboard.length === 0 && (
              <div className="p-6 text-center text-xs text-[var(--cream-muted)]">No data yet this week</div>
            )}
          </div>
        </motion.div>
      </motion.div>

      {/* ── Row 3: Todo + Study Rooms ── */}
      <motion.div variants={anim.container} initial="hidden" animate="show"
        className="grid gap-3 grid-cols-1 sm:grid-cols-2">

        {/* Today's Todos */}
        <motion.div variants={anim.item} className="rounded-2xl border border-white/8 bg-black/30 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-white/6">
            <div>
              <p className="text-xs font-bold text-[var(--cream)]">✅ Today's Tasks</p>
              <p className="text-[10px] text-[var(--wood)]">{doneTodos}/{todos.length} completed</p>
            </div>
            <Link href="/dashboard/tasks" className="text-[10px] text-[var(--accent)] hover:underline">All tasks →</Link>
          </div>
          {/* Progress bar */}
          <div className="h-1 bg-white/5">
            <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all"
              style={{ width: todos.length ? `${(doneTodos / todos.length) * 100}%` : "0%" }} />
          </div>
          <div className="divide-y divide-white/5">
            {todosLoading ? (
              <div className="p-4 space-y-2">
                {[1,2,3].map(i => <div key={i} className="h-8 rounded-lg bg-white/5 animate-pulse" />)}
              </div>
            ) : todos.length === 0 ? (
              <div className="p-6 text-center">
                <p className="text-xs text-[var(--cream-muted)]">No tasks today</p>
                <Link href="/dashboard/tasks" className="text-[10px] text-[var(--accent)] hover:underline mt-1 block">Add tasks →</Link>
              </div>
            ) : todos.map(todo => {
              const done = !!todo.completedAt;
              return (
                <button key={todo.id} onClick={() => toggleTodo(todo.id, done)}
                  className="flex w-full items-center gap-3 px-5 py-2.5 hover:bg-white/3 transition text-left">
                  <div className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border text-[8px] transition-all ${done ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-400" : "border-white/15"}`}>
                    {done && "✓"}
                  </div>
                  <span className={`flex-1 text-xs ${done ? "text-[var(--wood)] line-through" : "text-[var(--cream-muted)]"}`}>
                    {todo.title}
                  </span>
                  <span className="text-[9px] text-amber-400 bg-amber-500/8 px-1.5 py-0.5 rounded">+1🪙</span>
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Study Rooms */}
        <motion.div variants={anim.item} className="rounded-2xl border border-white/8 bg-black/30 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-white/6">
            <p className="text-xs font-bold text-[var(--cream)]">📺 Study Rooms</p>
            <Link href="/dashboard/subscription" className="text-[10px] text-[var(--accent)] hover:underline">All rooms →</Link>
          </div>
          <div className="divide-y divide-white/5">
            {studyRooms.slice(0, 6).map(room => {
              const enrolled = enrolledIds.has(room.id);
              const sub = subscribedRooms.find(s => s.studySlotId === room.id);
              return (
                <div key={room.id} className="flex items-center gap-3 px-5 py-3 hover:bg-white/3 transition">
                  <span className={`h-2 w-2 rounded-full flex-shrink-0 ${enrolled ? "bg-emerald-400 animate-pulse" : "bg-[var(--wood)]/30"}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-[var(--cream)] truncate">{room.name}</p>
                    <p className="text-[10px] text-[var(--wood)]">{room.timeLabel}</p>
                  </div>
                  {enrolled && sub?.room?.meetLink ? (
                    <button onClick={() => handleStartStudy(sub.room.meetLink!)}
                      className="text-[9px] font-bold text-emerald-400 border border-emerald-500/25 bg-emerald-500/8 px-2 py-1 rounded-lg hover:bg-emerald-500/15 transition whitespace-nowrap">
                      Join Now
                    </button>
                  ) : (
                    <Link href="/dashboard/subscription"
                      className="text-[9px] font-bold text-[var(--wood)] border border-white/10 bg-white/4 px-2 py-1 rounded-lg hover:bg-white/8 transition whitespace-nowrap">
                      {room.price ? `₹${room.price}` : "Book"}
                    </Link>
                  )}
                </div>
              );
            })}
            {studyRooms.length === 0 && (
              <div className="p-6 text-center text-xs text-[var(--cream-muted)]">
                No rooms available
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>

    </div>
  );
}
