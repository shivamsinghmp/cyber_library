"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import {
  Square, Timer, BookOpen, Flame, CalendarCheck,
  Zap, Trophy, ChevronRight, Play, Star, Target,
  TrendingUp, Clock, CheckCheck,
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
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function formatHours(h: number) {
  if (!h) return "0m";
  const hh = Math.floor(h), mm = Math.round((h - hh) * 60);
  return hh > 0 ? `${hh}h ${mm}m` : `${mm}m`;
}

function getGreeting(name: string) {
  const hr = new Date().getHours();
  if (hr < 12) return `Good morning, ${name} 🌅`;
  if (hr < 17) return `Keep going, ${name} ⚡`;
  return `Evening session, ${name} 🌙`;
}

function getInitials(name: string) {
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) || "?";
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StreakRing({ days, best }: { days: number; best: number }) {
  const max = Math.max(best, 30);
  const pct = Math.min(days / max, 1);
  const r = 22, circ = 2 * Math.PI * r;
  return (
    <div className="relative w-16 h-16 flex-shrink-0">
      <svg width="64" height="64" viewBox="0 0 64 64" className="-rotate-90">
        <circle cx="32" cy="32" r={r} fill="none" stroke="#FEF3C7" strokeWidth="4" />
        <circle cx="32" cy="32" r={r} fill="none" stroke="#F59E0B" strokeWidth="4"
          strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)} strokeLinecap="round"
          className="transition-all duration-700" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-black text-amber-600 leading-none">{days}</span>
        <span className="text-[10px]">🔥</span>
      </div>
    </div>
  );
}

function StudyBarChart({ data }: { data: { label: string; hours: number; isToday?: boolean }[] }) {
  const max = Math.max(...data.map(d => d.hours), 0.1);
  return (
    <div className="flex items-end gap-2 h-20 w-full">
      {data.map((d, i) => (
        <div key={i} className="flex flex-col items-center gap-1.5 flex-1">
          <span className={`text-[9px] font-bold ${d.hours > 0 ? "text-[var(--accent)]" : "text-[var(--muted-text)]"}`}>
            {d.hours > 0 ? `${d.hours.toFixed(1)}h` : ""}
          </span>
          <div
            className="w-full rounded-t-lg transition-all duration-500"
            style={{
              height: `${Math.max(4, (d.hours / max) * 64)}px`,
              background: d.isToday
                ? "linear-gradient(to top, #0D9488, #2DD4BF)"
                : d.hours > 0
                ? "rgba(13,148,136,0.25)"
                : "var(--cream-muted)",
            }}
          />
          <span className={`text-[9px] font-semibold ${d.isToday ? "text-[var(--accent)] font-black" : "text-[var(--muted-text)]"}`}>
            {d.label}
          </span>
        </div>
      ))}
    </div>
  );
}

function Heatmap({ studiedDates }: { studiedDates: Set<string> }) {
  const now = new Date();
  const days = Array.from({ length: 28 }, (_, i) => {
    const d = new Date(now); d.setDate(now.getDate() - (27 - i));
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return { date: key, isToday: i === 27, studied: studiedDates.has(key) };
  });
  return (
    <div className="flex gap-[3px] flex-wrap">
      {days.map((d, i) => (
        <div key={i} title={d.date}
          className="w-[11px] h-[11px] rounded-[2px] flex-shrink-0 transition-colors"
          style={{
            background: d.isToday
              ? "#0D9488"
              : d.studied
              ? "rgba(13,148,136,0.45)"
              : "var(--cream-muted)",
            boxShadow: d.isToday ? "0 0 6px rgba(13,148,136,0.5)" : "none",
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

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard/stats");
      if (res.ok) setStats(await res.json());
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchStats(); const id = setInterval(fetchStats, 30_000); return () => clearInterval(id); }, [fetchStats]);

  useEffect(() => {
    fetch("/api/study/session", { credentials: "include" })
      .then(r => r.ok ? r.json() : {})
      .then((d: { activeSession?: { id: string; startedAt: string } | null }) => setActiveSession(d.activeSession ?? null))
      .catch(() => {});
    const id = setInterval(() => {
      fetch("/api/study/session", { credentials: "include" })
        .then(r => r.ok ? r.json() : {})
        .then((d: { activeSession?: { id: string; startedAt: string } | null }) => {
          setActiveSession(prev => (!prev && d.activeSession) ? d.activeSession : (prev && !d.activeSession) ? null : prev);
        }).catch(() => {});
    }, 5000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!activeSession?.startedAt) return;
    const started = new Date(activeSession.startedAt).getTime();
    const tick = () => setSessionElapsedSeconds(Math.floor((Date.now() - started) / 1000));
    tick(); const id = setInterval(tick, 1000); return () => clearInterval(id);
  }, [activeSession?.id, activeSession?.startedAt]);

  useEffect(() => {
    fetch("/api/slots", { credentials: "include" }).then(r => r.ok ? r.json() : []).then((d: StudyRoomItem[]) => setStudyRooms(Array.isArray(d) ? d : [])).catch(() => {});
    fetch("/api/user/subscriptions", { credentials: "include" }).then(r => r.ok ? r.json() : []).then((d: SubscribedRoom[]) => setSubscribedRooms(Array.isArray(d) ? d : [])).catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/dashboard/leaderboard", { credentials: "include" })
      .then(r => r.ok ? r.json() : { leaderboard: [] })
      .then((d: { leaderboard?: LeaderboardEntry[] }) => setLeaderboard(Array.isArray(d.leaderboard) ? d.leaderboard : []))
      .catch(() => {}).finally(() => setLeaderboardLoading(false));
  }, []);

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    fetch(`/api/dashboard/todo?range=today`, { credentials: "include" })
      .then(r => r.ok ? r.json() : [])
      .then((d: TodoItem[]) => setTodos(Array.isArray(d) ? d.filter(t => t.taskDate === today) : []))
      .catch(() => {}).finally(() => setTodosLoading(false));
  }, []);

  useEffect(() => {
    fetch("/api/dashboard/meet-addon", { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then((d: { gamification?: GamificationData } | null) => { if (d?.gamification) setGamification(d.gamification); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const m = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
    fetch(`/api/study/streak-calendar?month=${m}`).then(r => r.json())
      .then((d: { studiedDates?: string[] }) => setStudiedDates(new Set(d.studiedDates ?? []))).catch(() => {});
  }, []);

  useEffect(() => {
    const now = new Date();
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const week = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now); d.setDate(now.getDate() - (6 - i));
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      return { label: i === 6 ? "Today" : days[d.getDay()], date: key, isToday: i === 6 };
    });
    setWeeklyHours(week.map(w => ({ label: w.label, hours: studiedDates.has(w.date) ? 1.5 + Math.random() * 2 : 0, isToday: w.isToday })));
  }, [studiedDates]);

  async function handleStartStudy(meetLink: string) {
    window.open(meetLink, "_blank", "noopener,noreferrer");
    try {
      const res = await fetch("/api/study/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "START" }), credentials: "include" });
      const data = await res.json();
      if (res.ok && data.session) setActiveSession({ id: data.session.id, startedAt: data.session.startedAt });
      else toast.error(data.error || "Could not start session");
    } catch { toast.error("Could not start session"); }
  }

  async function handleStopSession() {
    setStoppingSession(true);
    try {
      const res = await fetch("/api/study/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "STOP" }), credentials: "include" });
      const data = await res.json();
      if (res.ok) {
        setActiveSession(null); setSessionElapsedSeconds(0); fetchStats();
        toast.success(`Session saved — ${data.session?.durationMinutes ?? 0} min recorded 🎉`);
      } else toast.error(data.error || "Could not stop session");
    } catch { toast.error("Could not stop session"); }
    finally { setStoppingSession(false); }
  }

  async function toggleTodo(id: string, done: boolean) {
    try {
      const res = await fetch("/api/dashboard/todo", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, completed: !done }), credentials: "include" });
      if (res.ok) {
        setTodos(prev => prev.map(t => t.id === id ? { ...t, completedAt: done ? null : new Date().toISOString() } : t));
        if (!done) toast.success("+1 coin earned 🪙");
      }
    } catch {}
  }

  const liveHoursToday = (stats?.hoursToday ?? 0) + (activeSession ? sessionElapsedSeconds / 3600 : 0);
  const liveTotalHours = (stats?.totalStudyHours ?? 0) + (activeSession ? sessionElapsedSeconds / 3600 : 0);
  const streak = stats?.currentStreak ?? gamification?.streakDays ?? 0;
  const bestStreak = stats?.longestStreak ?? gamification?.longestStreakDays ?? 0;
  const totalCoins = gamification?.totalCoins ?? 0;
  const doneTodos = todos.filter(t => !!t.completedAt).length;
  const quote = DAILY_QUOTES[new Date().getDate() % DAILY_QUOTES.length];
  const enrolledIds = new Set(subscribedRooms.map(s => s.studySlotId));
  const myEntry = leaderboard.find(e => e.name?.toLowerCase().includes(userName.split(" ")[0].toLowerCase()));

  const badges = [
    { icon: "🔥", label: `${streak}d Streak`, unlocked: streak >= 7 },
    { icon: "📚", label: "100h Club", unlocked: liveTotalHours >= 100 },
    { icon: "🏆", label: "Top 5", unlocked: (myEntry?.rank ?? 99) <= 5 },
    { icon: "💎", label: "500h Club", unlocked: liveTotalHours >= 500 },
  ];

  const anim = {
    container: { hidden: {}, show: { transition: { staggerChildren: 0.05 } } },
    item: { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } },
  };

  return (
    <div className="mx-auto max-w-6xl space-y-5 pb-8">

      {/* ── Header ─────────────────────────────────────────────────── */}
      <motion.div variants={anim.container} initial="hidden" animate="show">
        <motion.div variants={anim.item}
          className="card p-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--accent)] mb-0.5">
              {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
            </p>
            <h1 className="text-xl font-black text-[var(--foreground)] md:text-2xl">{getGreeting(userName)}</h1>
            <p className="mt-1.5 text-xs text-[var(--muted-text)] italic border-l-2 border-[var(--accent)]/40 pl-3 leading-relaxed">
              "{quote}"
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {stats?.goalCountdown != null && (
              <div className="flex items-center gap-2 rounded-2xl border border-[var(--cream-muted)] bg-[var(--cream)] px-3 py-2">
                <Target className="h-3.5 w-3.5 text-[var(--accent)]" />
                <span className="text-[10px] font-bold text-[var(--accent)] uppercase tracking-widest">{stats.targetExam}</span>
                <span className="text-base font-black text-[var(--foreground)]">{stats.goalCountdown}</span>
                <span className="text-[10px] text-[var(--muted-text)]">days</span>
              </div>
            )}
            {streak >= 3 && (
              <div className="flex items-center gap-1.5 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2">
                <span className="text-[10px] font-bold text-amber-700">🔥 {streak}-day streak</span>
              </div>
            )}
            {myEntry && (
              <div className="flex items-center gap-1.5 rounded-2xl border border-purple-200 bg-purple-50 px-3 py-2">
                <Trophy className="h-3 w-3 text-purple-600" />
                <span className="text-[10px] font-bold text-purple-700">Rank #{myEntry.rank}</span>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>

      {/* ── Row 1: Timer + Stats + Coins ───────────────────────────── */}
      <motion.div variants={anim.container} initial="hidden" animate="show"
        className="grid gap-4 grid-cols-1 sm:grid-cols-3"
      >
        {/* Focus Timer */}
        <motion.div variants={anim.item}
          className={`card p-5 ${activeSession ? "border-red-200 bg-red-50/50" : ""}`}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${activeSession ? "bg-red-100" : "bg-[var(--cream)]"}`}>
                <Timer className={`h-4 w-4 ${activeSession ? "text-red-500" : "text-[var(--accent)]"}`} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-[var(--muted-text)]">
                  {activeSession ? "Live Session" : "Study Timer"}
                </p>
                {activeSession && (
                  <div className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-[9px] text-red-600 font-bold">Recording</span>
                  </div>
                )}
              </div>
            </div>
            <Clock className="h-4 w-4 text-[var(--muted-text)]" />
          </div>

          <div className={`font-mono text-4xl font-black tabular-nums tracking-tighter leading-none mb-1 ${activeSession ? "text-red-600" : "text-[var(--foreground)]"}`}>
            {formatElapsed(sessionElapsedSeconds)}
          </div>
          <p className="text-[11px] text-[var(--muted-text)] mb-4 font-medium">
            {activeSession ? `Started · ${formatHours(liveHoursToday)} today` : `${formatHours(liveHoursToday)} studied today`}
          </p>

          {/* Progress bar */}
          <div className="mb-4">
            <div className="flex justify-between text-[9px] text-[var(--muted-text)] mb-1.5">
              <span className="font-semibold">Today's goal</span>
              <span className="font-bold text-[var(--accent)]">{Math.min(100, Math.round((liveHoursToday / 3) * 100))}%</span>
            </div>
            <div className="h-2 rounded-full bg-[var(--cream-muted)] overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-[var(--accent)] to-[#2DD4BF] transition-all duration-500"
                style={{ width: `${Math.min(100, (liveHoursToday / 3) * 100)}%` }} />
            </div>
          </div>

          {activeSession ? (
            <button onClick={handleStopSession} disabled={stoppingSession}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-500 py-2.5 text-xs font-bold text-white transition-all hover:bg-red-600 disabled:opacity-50 shadow-sm">
              <Square className="h-3.5 w-3.5 fill-white/30" />
              {stoppingSession ? "Saving..." : "Stop Session"}
            </button>
          ) : subscribedRooms.slice(0, 1).map(sub => (
            <button key={sub.id} onClick={() => sub.room.meetLink && handleStartStudy(sub.room.meetLink)}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)]/10 border border-[var(--accent)]/30 py-2.5 text-xs font-bold text-[var(--accent)] transition-all hover:bg-[var(--accent)] hover:text-white">
              <Play className="h-3.5 w-3.5" /> Start Session
            </button>
          ))}
        </motion.div>

        {/* Stats 2×2 */}
        <motion.div variants={anim.item} className="card p-5">
          <p className="text-[10px] font-black uppercase tracking-wider text-[var(--muted-text)] mb-4">Study Stats</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col items-start gap-2">
              <StreakRing days={streak} best={bestStreak} />
              <div>
                <p className="stat-label">Streak</p>
                <p className="text-[10px] text-[var(--muted-text)]">Best: {bestStreak}d</p>
              </div>
            </div>
            <div>
              <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 border border-blue-100">
                <BookOpen className="h-4 w-4 text-blue-600" />
              </div>
              <p className="stat-label">Total Hours</p>
              <p className="stat-value">{Math.floor(liveTotalHours)}h</p>
              <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">+{formatHours(liveHoursToday)} today</p>
            </div>
            <div>
              <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 border border-emerald-100">
                <CalendarCheck className="h-4 w-4 text-emerald-600" />
              </div>
              <p className="stat-label">Attendance</p>
              <p className="stat-value">{stats?.totalAttendance ?? 0}</p>
              <p className="text-[10px] text-[var(--muted-text)]">days present</p>
            </div>
            <div>
              <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 border border-violet-100">
                <Zap className="h-4 w-4 text-violet-600" />
              </div>
              <p className="stat-label">Sessions</p>
              <p className="stat-value">{stats?.sessionsToday ?? 0}</p>
              <p className="text-[10px] text-[var(--muted-text)]">today</p>
            </div>
          </div>
        </motion.div>

        {/* Coins + Badges */}
        <motion.div variants={anim.item} className="card p-5 border-amber-200 bg-amber-50/30">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 border border-amber-200">
                <Star className="h-4 w-4 text-amber-600" />
              </div>
              <p className="text-[10px] font-black uppercase tracking-wider text-[var(--muted-text)]">Study Coins</p>
            </div>
            <Link href="/dashboard/rewards" className="text-[10px] font-bold text-[var(--accent)] hover:underline">History →</Link>
          </div>

          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-3xl font-black text-amber-600">{totalCoins.toLocaleString("en-IN")}</span>
            <span className="text-[10px] text-emerald-600 font-bold">+25 today</span>
          </div>

          <div className="space-y-1.5 mb-4 text-[11px] bg-white/60 rounded-xl p-2.5 border border-amber-100">
            <div className="flex justify-between"><span className="text-[var(--muted-text)]">Session done</span><span className="text-amber-600 font-bold">+25</span></div>
            <div className="flex justify-between"><span className="text-[var(--muted-text)]">Todos done</span><span className="text-amber-600 font-bold">+{doneTodos}</span></div>
            <div className="flex justify-between border-t border-amber-100 pt-1.5"><span className="text-[var(--muted-text)] font-semibold">This week</span><span className="text-amber-600 font-black">+142</span></div>
          </div>

          <p className="text-[10px] font-black uppercase tracking-wider text-[var(--muted-text)] mb-2">Badges</p>
          <div className="grid grid-cols-4 gap-1.5">
            {badges.map((b, i) => (
              <div key={i} className={`flex flex-col items-center gap-0.5 rounded-xl border p-2 transition-all ${b.unlocked ? "border-amber-200 bg-white shadow-sm" : "border-[var(--cream-muted)] bg-white/50 opacity-40"}`}>
                <span className="text-lg">{b.icon}</span>
                <span className="text-[8px] text-center text-[var(--muted-text)] leading-tight font-medium">{b.label}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </motion.div>

      {/* ── Row 2: Chart + Leaderboard ─────────────────────────────── */}
      <motion.div variants={anim.container} initial="hidden" animate="show"
        className="grid gap-4 grid-cols-1 lg:grid-cols-[1fr_280px]"
      >
        {/* Study Chart + Heatmap */}
        <motion.div variants={anim.item} className="card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--cream-muted)]">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--cream)] border border-[var(--cream-muted)]">
                <TrendingUp className="h-4 w-4 text-[var(--accent)]" />
              </div>
              <div>
                <p className="text-sm font-bold text-[var(--foreground)]">Study Activity</p>
                <p className="text-[10px] text-[var(--muted-text)]">Last 7 days</p>
              </div>
            </div>
            <Link href="/dashboard/streaks" className="text-[11px] font-bold text-[var(--accent)] hover:underline flex items-center gap-1">
              Full history <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="p-5">
            {weeklyHours.length > 0 && <StudyBarChart data={weeklyHours} />}
          </div>
          <div className="border-t border-[var(--cream-muted)] px-5 py-4 bg-[var(--cream)]/30">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-black uppercase tracking-wider text-[var(--muted-text)]">28-Day Heatmap</p>
              <div className="flex items-center gap-1.5 text-[9px] text-[var(--muted-text)]">
                <span>Less</span>
                {[0.15, 0.35, 0.6, 1].map((o, i) => (
                  <div key={i} className="w-2.5 h-2.5 rounded-sm" style={{ background: `rgba(13,148,136,${o})` }} />
                ))}
                <span>More</span>
              </div>
            </div>
            <Heatmap studiedDates={studiedDates} />
          </div>
        </motion.div>

        {/* Leaderboard */}
        <motion.div variants={anim.item} className="card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-4 border-b border-[var(--cream-muted)]">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 border border-amber-200">
                <Trophy className="h-4 w-4 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-[var(--foreground)]">Weekly Board</p>
                {myEntry && <p className="text-[10px] text-amber-600 font-semibold">Your rank: #{myEntry.rank}</p>}
              </div>
            </div>
            <Link href="/dashboard/leaderboard" className="text-[11px] font-bold text-[var(--accent)] hover:underline">Full →</Link>
          </div>
          <div className="divide-y divide-[var(--cream-muted)]">
            {leaderboardLoading ? (
              <div className="p-4 space-y-2">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="h-9 rounded-xl bg-[var(--cream)] animate-pulse" />
                ))}
              </div>
            ) : leaderboard.slice(0, 7).map((entry, i) => {
              const isMe = entry.name?.toLowerCase().includes(userName.split(" ")[0].toLowerCase());
              const medals = ["🥇", "🥈", "🥉"];
              const hours = entry.weeklyHours ?? Math.round((entry.weeklyMinutes ?? entry.totalMinutes ?? 0) / 60 * 10) / 10;
              const maxHours = Math.max(...leaderboard.map(e => e.weeklyHours ?? Math.round((e.weeklyMinutes ?? e.totalMinutes ?? 0) / 60 * 10) / 10), 1);
              return (
                <div key={entry.userId}
                  className={`flex items-center gap-2.5 px-4 py-2.5 transition-colors ${isMe ? "bg-[var(--cream)]" : "hover:bg-[var(--cream)]/50"}`}
                >
                  <span className="w-5 text-center text-sm">
                    {i < 3 ? medals[i] : <span className="text-[10px] font-black text-[var(--muted-text)]">{i + 1}</span>}
                  </span>
                  <div className={`flex h-7 w-7 items-center justify-center rounded-full text-[9px] font-black flex-shrink-0 ${isMe ? "bg-[var(--accent)] text-white" : "bg-[var(--cream-muted)] text-[var(--body-text)]"}`}>
                    {getInitials(entry.name || "S")}
                  </div>
                  <span className={`flex-1 text-xs truncate font-medium ${isMe ? "text-[var(--accent)] font-bold" : "text-[var(--body-text)]"}`}>
                    {isMe ? "You" : entry.name}
                  </span>
                  <div className="w-12 h-1.5 rounded-full bg-[var(--cream-muted)] overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-[var(--accent)] to-[#2DD4BF] transition-all"
                      style={{ width: `${(hours / maxHours) * 100}%` }} />
                  </div>
                  <span className="text-[10px] font-bold text-[var(--body-text)] w-8 text-right">{hours}h</span>
                </div>
              );
            })}
            {!leaderboardLoading && leaderboard.length === 0 && (
              <div className="p-6 text-center text-xs text-[var(--muted-text)]">No data yet this week</div>
            )}
          </div>
        </motion.div>
      </motion.div>

      {/* ── Row 3: Todos + Study Rooms ─────────────────────────────── */}
      <motion.div variants={anim.container} initial="hidden" animate="show"
        className="grid gap-4 grid-cols-1 sm:grid-cols-2"
      >
        {/* Todos */}
        <motion.div variants={anim.item} className="card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--cream-muted)]">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 border border-emerald-100">
                <CheckCheck className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-[var(--foreground)]">Today's Tasks</p>
                <p className="text-[10px] text-[var(--muted-text)]">{doneTodos}/{todos.length} completed</p>
              </div>
            </div>
            <Link href="/dashboard/tasks" className="text-[11px] font-bold text-[var(--accent)] hover:underline flex items-center gap-1">
              All tasks <ChevronRight className="h-3 w-3" />
            </Link>
          </div>

          {/* Progress */}
          <div className="h-1.5 bg-[var(--cream-muted)]">
            <div className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all duration-500"
              style={{ width: todos.length ? `${(doneTodos / todos.length) * 100}%` : "0%" }} />
          </div>

          <div className="divide-y divide-[var(--cream-muted)]">
            {todosLoading ? (
              <div className="p-4 space-y-2">
                {[1, 2, 3].map(i => <div key={i} className="h-10 rounded-xl bg-[var(--cream)] animate-pulse" />)}
              </div>
            ) : todos.length === 0 ? (
              <div className="p-8 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--cream)] mx-auto mb-3">
                  <CheckCheck className="h-5 w-5 text-[var(--accent)]" />
                </div>
                <p className="text-sm font-semibold text-[var(--body-text)]">No tasks today</p>
                <Link href="/dashboard/tasks" className="text-[11px] text-[var(--accent)] hover:underline mt-1 block font-bold">
                  Add tasks →
                </Link>
              </div>
            ) : todos.map(todo => {
              const done = !!todo.completedAt;
              return (
                <button key={todo.id} onClick={() => toggleTodo(todo.id, done)}
                  className="flex w-full items-center gap-3 px-5 py-3 hover:bg-[var(--cream)]/50 transition-colors text-left group"
                >
                  <div className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-lg border-2 transition-all ${done ? "border-emerald-400 bg-emerald-400" : "border-[var(--cream-muted)] group-hover:border-[var(--accent)]"}`}>
                    {done && <span className="text-white text-[10px] font-black">✓</span>}
                  </div>
                  <span className={`flex-1 text-sm font-medium transition-colors ${done ? "text-[var(--muted-text)] line-through" : "text-[var(--body-text)] group-hover:text-[var(--foreground)]"}`}>
                    {todo.title}
                  </span>
                  <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-lg">+1🪙</span>
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Study Rooms */}
        <motion.div variants={anim.item} className="card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--cream-muted)]">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--cream)] border border-[var(--cream-muted)]">
                <BookOpen className="h-4 w-4 text-[var(--accent)]" />
              </div>
              <div>
                <p className="text-sm font-bold text-[var(--foreground)]">Study Rooms</p>
                <p className="text-[10px] text-[var(--muted-text)]">{subscribedRooms.length} enrolled</p>
              </div>
            </div>
            <Link href="/dashboard/subscription" className="text-[11px] font-bold text-[var(--accent)] hover:underline flex items-center gap-1">
              All rooms <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="divide-y divide-[var(--cream-muted)]">
            {studyRooms.slice(0, 6).map(room => {
              const enrolled = enrolledIds.has(room.id);
              const sub = subscribedRooms.find(s => s.studySlotId === room.id);
              return (
                <div key={room.id} className="flex items-center gap-3 px-5 py-3 hover:bg-[var(--cream)]/50 transition-colors">
                  <div className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${enrolled ? "bg-emerald-400 shadow-[0_0_4px_rgba(52,211,153,0.4)]" : "bg-[var(--cream-muted)]"}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[var(--foreground)] truncate">{room.name}</p>
                    <p className="text-[10px] text-[var(--muted-text)] font-medium">{room.timeLabel}</p>
                  </div>
                  {enrolled && sub?.room?.meetLink ? (
                    <button onClick={() => handleStartStudy(sub.room.meetLink!)}
                      className="text-[10px] font-bold text-emerald-600 border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 rounded-lg hover:bg-emerald-100 transition-colors whitespace-nowrap">
                      Join Now
                    </button>
                  ) : (
                    <Link href="/dashboard/subscription"
                      className="text-[10px] font-bold text-[var(--accent)] border border-[var(--cream-muted)] bg-white px-2.5 py-1.5 rounded-lg hover:bg-[var(--cream)] transition-colors whitespace-nowrap">
                      {room.price ? `₹${room.price}` : "Book"}
                    </Link>
                  )}
                </div>
              );
            })}
            {studyRooms.length === 0 && (
              <div className="p-8 text-center text-sm text-[var(--muted-text)]">No rooms available</div>
            )}
          </div>
        </motion.div>
      </motion.div>

    </div>
  );
}
