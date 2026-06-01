"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Target, Zap, Clock, Check, Maximize2, Minimize2,
  Flame, Coins, CalendarDays, Coffee, RotateCcw,
  CheckCircle2, Circle, TrendingUp, Music2, Sparkles,
} from "lucide-react";
import { SpotifyPlayer } from "../panel/components/SpotifyPlayer";
import { AIChatBot }    from "../panel/components/AIChatBot";
import { PlanLockedScreen } from "../panel/components/PlanLockedScreen";

function getToken(): string | null {
  try { return localStorage.getItem("vl_meet_addon_token"); } catch { return null; }
}
function getName(): string {
  try { return localStorage.getItem("vl_meet_addon_name") ?? ""; } catch { return ""; }
}

// ── Live Clock ────────────────────────────────────────────────────────────────
function LiveClock() {
  const [time, setTime] = useState({ h: "--", m: "--", s: "--", date: "" });
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const parts = now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).split(":");
      setTime({
        h: parts[0] ?? "--", m: parts[1] ?? "--", s: parts[2] ?? "--",
        date: now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" }),
      });
    };
    tick(); const id = setInterval(tick, 1000); return () => clearInterval(id);
  }, []);
  return (
    <div className="text-center">
      <div className="flex items-end justify-center gap-1">
        <span className="text-[5.5rem] font-black tabular-nums leading-none tracking-tighter text-[#0F172A]">{time.h}</span>
        <span className="text-[4rem] font-black leading-none mb-2 text-[#6366F1] animate-pulse">:</span>
        <span className="text-[5.5rem] font-black tabular-nums leading-none tracking-tighter text-[#0F172A]">{time.m}</span>
        <span className="text-[2.5rem] font-black tabular-nums leading-none text-[#94A3B8] mb-1 ml-1">{time.s}</span>
      </div>
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#94A3B8] mt-1">{time.date}</p>
    </div>
  );
}

function formatTime(s: number) {
  return `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;
}
function formatDuration(s: number) {
  if (s <= 0) return "0m";
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

// ── Circular Timer ────────────────────────────────────────────────────────────
function CircularTimer({ pct, mode, isRunning, timeLeft }:
  { pct: number; mode: "focus" | "break"; isRunning: boolean; timeLeft: number }) {
  const R = 110; const C = 2 * Math.PI * R;
  const offset = C * (1 - pct / 100);
  const id = mode === "focus" ? "timerGradFocus" : "timerGradBreak";
  return (
    <div className="relative flex items-center justify-center" style={{ width: 280, height: 280 }}>
      {isRunning && (
        <div className="absolute inset-0 rounded-full animate-pulse"
          style={{ boxShadow: mode === "focus" ? "0 0 60px rgba(99,102,241,0.25), 0 0 120px rgba(139,92,246,0.12)" : "0 0 60px rgba(6,182,212,0.2)", borderRadius: "50%" }} />
      )}
      <svg width="280" height="280" viewBox="0 0 280 280" className="-rotate-90">
        <defs>
          <linearGradient id="timerGradFocus" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6366F1" />
            <stop offset="50%" stopColor="#8B5CF6" />
            <stop offset="100%" stopColor="#06B6D4" />
          </linearGradient>
          <linearGradient id="timerGradBreak" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#06B6D4" />
            <stop offset="100%" stopColor="#8B5CF6" />
          </linearGradient>
        </defs>
        {/* Track */}
        <circle cx="140" cy="140" r={R} fill="none" stroke="#EEF2FF" strokeWidth="12" />
        {/* Tick marks */}
        {Array.from({ length: 60 }).map((_, i) => {
          const angle = (i / 60) * 360;
          const rad = (angle * Math.PI) / 180;
          const isMajor = i % 5 === 0;
          const r1 = R + 8, r2 = r1 + (isMajor ? 10 : 5);
          const x1 = 140 + r1 * Math.cos(rad), y1 = 140 + r1 * Math.sin(rad);
          const x2 = 140 + r2 * Math.cos(rad), y2 = 140 + r2 * Math.sin(rad);
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
            stroke={isMajor ? "#C7D2FE" : "#E0E7FF"} strokeWidth={isMajor ? 2 : 1} />;
        })}
        {/* Progress */}
        <circle cx="140" cy="140" r={R} fill="none" stroke={`url(#${id})`} strokeWidth="12"
          strokeLinecap="round" strokeDasharray={C} strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1s linear" }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-6xl font-black tabular-nums tracking-tight"
          style={{
            background: "linear-gradient(135deg, #6366F1, #8B5CF6, #06B6D4)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}>
          {formatTime(timeLeft)}
        </span>
        <span className={`text-xs font-bold uppercase tracking-widest mt-2 ${mode === "focus" ? "text-[#6366F1]" : "text-[#06B6D4]"}`}>
          {mode === "focus" ? "🎯 Deep Focus" : "☕ Rest"}
        </span>
      </div>
    </div>
  );
}

// ── Progress Bar ──────────────────────────────────────────────────────────────
function ProgressBar({ pct }: { pct: number }) {
  return (
    <div className="w-full h-2 rounded-full bg-[#EEF2FF] overflow-hidden mt-3">
      <div className="h-full rounded-full transition-all duration-1000"
        style={{ width: `${pct}%`, background: "linear-gradient(135deg, #6366F1, #8B5CF6, #06B6D4)", boxShadow: "0 0 8px rgba(99,102,241,0.4)" }} />
    </div>
  );
}

// ── Card wrapper ──────────────────────────────────────────────────────────────
function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-2xl border border-[#C7D2FE] shadow-[0_4px_24px_rgba(99,102,241,0.08)] ${className}`}>
      {children}
    </div>
  );
}

// ── Main Stage ────────────────────────────────────────────────────────────────
export default function MeetAddonMainStagePage() {
  const [token, setToken] = useState<string | null>(null);
  const [studentName, setStudentName] = useState<string>("");
  const [mounted, setMounted] = useState(false);
  const [zenMode, setZenMode] = useState(false);
  const [planAccess, setPlanAccess] = useState<{ allowed: boolean; state: string; daysLeft?: number } | null>(null);
  const [planLoading, setPlanLoading] = useState(false);

  const [spotifyOpen, setSpotifyOpen] = useState(false);
  const [chatOpen,    setChatOpen]    = useState(false);
  const [timerMode, setTimerMode] = useState<"focus" | "break">("focus");
  const [timerDuration, setTimerDuration] = useState(25 * 60);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [tasks, setTasks] = useState<{ id: string; title: string; completedAt: string | null; priority?: number }[]>([]);
  const [dailyPromise, setDailyPromise] = useState<{ id: string; title: string; completedAt: string | null } | null>(null);
  const [currentPoll, setCurrentPoll] = useState<{ id: string; question: string; options: string[]; expiresAt?: string } | null>(null);
  const [pollSeconds, setPollSeconds] = useState(0);
  const [pollSubmitting, setPollSubmitting] = useState(false);
  const [totalCoins, setTotalCoins] = useState(0);
  const [streakDays, setStreakDays] = useState(0);
  const [resolvedSlot, setResolvedSlot] = useState<{ slotId: string; slotName: string; timeLabel: string } | null>(null);
  const [slotTodaySeconds, setSlotTodaySeconds] = useState(0);
  const [slotLiveSeconds, setSlotLiveSeconds] = useState(0);
  const [completedSessions, setCompletedSessions] = useState(0);

  const fetchData = useCallback(async () => {
    if (!token) return;
    const headers = { Authorization: `Bearer ${token}` };
    try {
      const [dashRes, pollRes] = await Promise.all([
        fetch("/api/meet-addon/today-task", { headers }),
        fetch("/api/meet-addon/polls", { headers }),
      ]);
      if (dashRes.ok) {
        const d = await dashRes.json();
        const allTasks = d.tasks ?? [];
        setDailyPromise(allTasks.find((t: any) => t.priority === 0) ?? null);
        setTasks(allTasks.filter((t: any) => t.priority !== 0));
        setTotalCoins(d.totalPoints ?? 0);
        setStreakDays(d.streakDays ?? 0);
      }
      if (pollRes.ok) {
        const polls = await pollRes.json();
        const active = Array.isArray(polls) ? polls.find((p: any) =>
          p.isActive && (!p.expiresAt || new Date(p.expiresAt) > new Date()) && !p.alreadyAnswered
        ) : null;
        setCurrentPoll(active ?? null);
        if (active?.expiresAt) setPollSeconds(Math.max(0, Math.floor((new Date(active.expiresAt).getTime() - Date.now()) / 1000)));
      }
    } catch {}
  }, [token]);

  // Bootstrap from localStorage — client only
  useEffect(() => {
    setMounted(true);
    const t = getToken(); const n = getName();
    if (t) setToken(t);
    if (n) setStudentName(n);
  }, []);

  useEffect(() => {
    if (!token) { setPlanAccess(null); return; }
    setPlanLoading(true);
    fetch("/api/meet-addon/me", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then((d: { name?: string; planAccess?: { allowed: boolean; state: string; daysLeft?: number } } | null) => {
        if (!d) { setPlanAccess({ allowed: false, state: "no_plan" }); return; }
        if (d.name) { setStudentName(d.name); localStorage.setItem("vl_meet_addon_name", d.name); }
        setPlanAccess(d.planAccess ?? { allowed: false, state: "no_plan" });
      })
      .catch(() => setPlanAccess({ allowed: false, state: "no_plan" }))
      .finally(() => setPlanLoading(false));
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!planAccess?.allowed) return;
    fetchData();
    const id = setInterval(fetchData, 30000);
    return () => clearInterval(id);
  }, [fetchData, planAccess?.allowed]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    async function initMeet() {
      if (typeof window !== "undefined" && window.self === window.top) return;
      try { const { meet } = await import("@googleworkspace/meet-addons/meet.addons"); await meet.addon.createAddonSession({ cloudProjectNumber: "273461550329" }); } catch {}
    }
    initMeet();
  }, []);

  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => setTimeLeft(t => {
        if (t <= 1) { setIsRunning(false); setCompletedSessions(s => s + 1); return 0; }
        return t - 1;
      }), 1000);
    } else { if (timerRef.current) clearInterval(timerRef.current); }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isRunning]);

  useEffect(() => {
    if (!currentPoll || pollSeconds <= 0) return;
    const id = setInterval(() => setPollSeconds(s => { if (s <= 1) { setCurrentPoll(null); return 0; } return s - 1; }), 1000);
    return () => clearInterval(id);
  }, [currentPoll, pollSeconds]);

  useEffect(() => {
    if (!resolvedSlot?.slotId || !token) return;
    const tick = setInterval(() => setSlotLiveSeconds(s => s + 1), 1000);
    return () => clearInterval(tick);
  }, [resolvedSlot?.slotId, token]);

  const handlePollSubmit = async (pollId: string, answer: string) => {
    if (!token || pollSubmitting) return;
    setPollSubmitting(true);
    try {
      await fetch("/api/meet-addon/poll-response", {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ pollId, answer }),
      });
      setCurrentPoll(null);
    } catch {} finally { setPollSubmitting(false); }
  };

  const toggleTask = async (id: string, done: boolean) => {
    if (!token) return;
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completedAt: done ? null : new Date().toISOString() } : t));
    await fetch("/api/meet-addon/today-task", {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ markComplete: !done, taskId: id }),
    }).catch(() => {});
  };

  const setDuration = (minutes: number) => { setIsRunning(false); setTimerDuration(minutes * 60); setTimeLeft(minutes * 60); };
  const toggleMode = (mode: "focus" | "break") => { setTimerMode(mode); setDuration(mode === "focus" ? 25 : 5); };

  const pct = timerDuration > 0 ? Math.round((timeLeft / timerDuration) * 100) : 0;
  const doneTasks = tasks.filter(t => !!t.completedAt).length;
  const taskPct = tasks.length > 0 ? Math.round((doneTasks / tasks.length) * 100) : 0;

  // Prevent SSR/client mismatch
  if (!mounted) return <div className="min-h-[100dvh]" style={{ background: "var(--page-bg)" }} />;

  if (!token) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center gap-4" style={{ background: "var(--page-bg)" }}>
        <div className="w-16 h-16 rounded-2xl bg-[#EEF2FF] border border-[#C7D2FE] flex items-center justify-center">
          <Target className="w-8 h-8 text-[#6366F1]" />
        </div>
        <p className="text-[#64748B] text-sm">Open the side panel first to authenticate.</p>
      </div>
    );
  }

  if (planLoading || !planAccess) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center" style={{ background: "var(--page-bg)" }}>
        <div className="w-8 h-8 rounded-full border-4 border-[#C7D2FE] border-t-[#6366F1] animate-spin" />
      </div>
    );
  }

  if (!planAccess.allowed) {
    return <PlanLockedScreen state={planAccess.state} daysLeft={planAccess.daysLeft} />;
  }

  return (
    <div className={`min-h-[100dvh] flex flex-col overflow-hidden relative`} style={{ background: "var(--page-bg)" }}>

      {/* ── Home-page style background ── */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* Dot grid */}
        <div className="absolute inset-0"
          style={{ backgroundImage: "radial-gradient(circle, #6366F122 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
        {/* Violet orb top-right */}
        <div className="absolute -top-48 right-0 h-[600px] w-[600px] rounded-full blur-[140px]"
          style={{ background: "radial-gradient(circle, rgba(139,92,246,0.18) 0%, rgba(99,102,241,0.08) 60%, transparent 100%)" }} />
        {/* Cyan orb bottom-left */}
        <div className="absolute bottom-0 -left-32 h-[400px] w-[400px] rounded-full blur-[120px]"
          style={{ background: "radial-gradient(circle, rgba(6,182,212,0.14) 0%, transparent 70%)" }} />
        {/* Indigo orb bottom-right */}
        <div className="absolute bottom-20 right-20 h-[300px] w-[300px] rounded-full blur-[100px]"
          style={{ background: "radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)" }} />
      </div>

      {/* ── Poll Overlay ── */}
      <AnimatePresence>
        {currentPoll && pollSeconds > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[99999] flex items-center justify-center backdrop-blur-xl p-8"
            style={{ background: "rgba(238,242,255,0.85)" }}>
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
              className="relative w-full max-w-xl bg-white rounded-3xl border border-[#C7D2FE] p-8 overflow-hidden shadow-[0_20px_60px_rgba(99,102,241,0.2)]">
              {/* Progress bar */}
              <div className="absolute top-0 inset-x-0 h-1 rounded-t-3xl overflow-hidden">
                <div className="h-full transition-all duration-1000"
                  style={{ width: `${(pollSeconds / 60) * 100}%`, background: "linear-gradient(135deg, #6366F1, #8B5CF6, #06B6D4)" }} />
              </div>
              <div className="text-center mb-8 pt-2">
                <div className="w-16 h-16 rounded-2xl bg-[#EEF2FF] border border-[#C7D2FE] flex items-center justify-center mx-auto mb-4">
                  <Zap className="w-8 h-8 text-[#6366F1]" />
                </div>
                <p className="text-xs font-black uppercase tracking-[0.3em] text-[#6366F1] mb-3">Live Quiz!</p>
                <p className="text-2xl font-extrabold text-[#0F172A] leading-tight">{currentPoll.question}</p>
                <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-rose-50 border border-rose-200 text-rose-600 font-mono font-bold text-sm">
                  <Clock className="w-4 h-4" /> {formatTime(pollSeconds)}
                </div>
              </div>
              <div className="grid gap-3">
                {currentPoll.options.map((opt, i) => (
                  <button key={i} onClick={() => handlePollSubmit(currentPoll.id, opt)} disabled={pollSubmitting}
                    className="w-full bg-[#F8FAFF] hover:bg-[#EEF2FF] border border-[#C7D2FE] hover:border-[#6366F1] text-[#0F172A] font-bold px-6 py-4 rounded-2xl transition-all disabled:opacity-40 text-left">
                    {opt}
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Header Bar ── */}
      <div className="relative z-10 flex items-center justify-between px-6 py-3.5 border-b border-[#E2E8F0] bg-white/80 backdrop-blur-sm flex-shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#EEF2FF] border border-[#C7D2FE] flex items-center justify-center">
              <span className="text-base">📚</span>
            </div>
            <span className="text-xs font-black uppercase tracking-widest text-[#6366F1]">Let's Study</span>
          </div>
          {studentName && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#EEF2FF] border border-[#C7D2FE]">
              <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black text-white"
                style={{ background: "linear-gradient(135deg, #6366F1, #8B5CF6)" }}>
                {studentName.charAt(0).toUpperCase()}
              </div>
              <span className="text-xs font-bold text-[#334155]">{studentName}</span>
            </div>
          )}
        </div>

        {/* Stats pills */}
        <div className="flex items-center gap-2">
          {resolvedSlot && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-bold text-emerald-600">{resolvedSlot.slotName}</span>
              <span className="text-xs text-emerald-500 font-mono">{formatDuration(slotTodaySeconds + slotLiveSeconds)}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200">
            <Coins className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-xs font-bold text-amber-600 tabular-nums">{totalCoins}</span>
          </div>
          {streakDays > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-50 border border-orange-200">
              <Flame className="w-3.5 h-3.5 text-orange-500" />
              <span className="text-xs font-bold text-orange-600">{streakDays}d</span>
            </div>
          )}
          {completedSessions > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#EEF2FF] border border-[#C7D2FE]">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#6366F1]" />
              <span className="text-xs font-bold text-[#6366F1]">{completedSessions} done</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setSpotifyOpen((o) => !o)}
            title="Study Music (YouTube + Spotify)"
            className="p-2 rounded-xl border transition-all"
            style={spotifyOpen
              ? { borderColor: "#a855f7", background: "#a855f7", color: "#fff" }
              : { borderColor: "rgba(168,85,247,0.3)", background: "rgba(168,85,247,0.08)", color: "#a855f7" }}
          >
            <Music2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setChatOpen((o) => !o)}
            title="StudyMate AI"
            className="p-2 rounded-xl border transition-all"
            style={chatOpen
              ? { borderColor: "#6366F1", background: "#6366F1", color: "#fff" }
              : { borderColor: "rgba(99,102,241,0.3)", background: "rgba(99,102,241,0.08)", color: "#6366F1" }}
          >
            <Sparkles className="w-4 h-4" />
          </button>
          <button onClick={() => setZenMode(!zenMode)}
            className="p-2 rounded-xl border border-[#C7D2FE] bg-[#EEF2FF] text-[#6366F1] hover:bg-[#6366F1] hover:text-white transition-all">
            {zenMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* ── Trial Banner ── */}
      {!zenMode && planAccess?.state === "trial" && (
        <div className="relative z-10 mx-6 mt-3 flex items-center justify-between gap-4 px-5 py-2.5 rounded-xl bg-amber-50 border border-amber-200 flex-shrink-0">
          <span className="text-xs font-semibold text-amber-700">
            ⚠️ Free trial chal raha hai —{" "}
            <strong>{planAccess.daysLeft} din bache hain.</strong>{" "}
            Add-on poora unlock rakhne ke liye plan lein.
          </span>
          <a
            href="/pricing"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] font-black uppercase tracking-wider text-white px-3 py-1.5 rounded-lg shrink-0"
            style={{ background: "linear-gradient(135deg, #F59E0B, #D97706)" }}
          >
            Plan Lein →
          </a>
        </div>
      )}

      {/* ── Daily Promise ── */}
      <AnimatePresence>
        {!zenMode && dailyPromise && (
          <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
            className="relative z-10 mx-6 mt-4 flex-shrink-0">
            <div className="bg-white rounded-2xl border border-[#C7D2FE] shadow-[0_4px_20px_rgba(99,102,241,0.1)] px-6 py-3.5 flex items-center justify-between overflow-hidden">
              <div className="absolute inset-x-0 top-0 h-0.5"
                style={{ background: "linear-gradient(135deg, #6366F1, #8B5CF6, #06B6D4)" }} />
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#EEF2FF] border border-[#C7D2FE] flex items-center justify-center flex-shrink-0">
                  <Target className="w-4 h-4 text-[#6366F1]" />
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.35em] text-[#6366F1]">Daily Promise 🎯</p>
                  <p className={`text-base font-extrabold text-[#0F172A] ${dailyPromise.completedAt ? "line-through opacity-40" : ""}`}>{dailyPromise.title}</p>
                </div>
              </div>
              {!dailyPromise.completedAt ? (
                <button onClick={() => toggleTask(dailyPromise.id, false)}
                  className="w-9 h-9 rounded-full border-2 border-[#6366F1] bg-[#EEF2FF] flex items-center justify-center text-[#6366F1] hover:text-white transition-all"
                  style={{ background: undefined }}
                  onMouseEnter={e => (e.currentTarget.style.background = "linear-gradient(135deg, #6366F1, #8B5CF6)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "#EEF2FF")}>
                  <Check className="w-4 h-4" strokeWidth={3} />
                </button>
              ) : (
                <span className="flex items-center gap-1.5 text-emerald-600 text-sm font-bold">
                  <CheckCircle2 className="w-4 h-4" /> Done!
                </span>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 3-Column Main ── */}
      <div className={`relative z-10 flex-1 grid ${zenMode ? "place-items-center" : "grid-cols-[1fr_300px_1fr]"} gap-5 p-5 min-h-0`}>

        {/* ── LEFT: Clock + Tasks ── */}
        {!zenMode && (
          <div className="flex flex-col gap-4 min-h-0">

            {/* Clock */}
            <Card className="px-6 py-6 flex flex-col items-center">
              <p className="text-[9px] font-black uppercase tracking-[0.3em] text-[#94A3B8] mb-4">Live Time</p>
              <LiveClock />
            </Card>

            {/* Tasks */}
            <Card className="flex-1 p-5 flex flex-col min-h-0">
              <div className="flex items-center justify-between mb-1 flex-shrink-0">
                <p className="text-[9px] font-black uppercase tracking-[0.3em] text-[#94A3B8]">Today's Tasks</p>
                <span className="text-[10px] font-bold text-emerald-600">{doneTasks}/{tasks.length}</span>
              </div>
              {/* Progress bar */}
              <div className="w-full h-1.5 rounded-full bg-[#EEF2FF] mb-4 overflow-hidden flex-shrink-0">
                <div className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${taskPct}%`, background: "linear-gradient(135deg, #10B981, #06B6D4)", boxShadow: "0 0 6px rgba(16,185,129,0.4)" }} />
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 pr-0.5">
                {tasks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full gap-2 py-8">
                    <CheckCircle2 className="w-8 h-8 text-[#C7D2FE]" />
                    <p className="text-xs text-[#94A3B8] font-medium">No tasks for today</p>
                    <p className="text-[10px] text-[#CBD5E1]">Add tasks from the side panel</p>
                  </div>
                ) : (
                  tasks.map((task, i) => {
                    const done = !!task.completedAt;
                    return (
                      <motion.button key={task.id}
                        initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                        onClick={() => toggleTask(task.id, done)}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left group ${done
                          ? "border-[#E2E8F0] bg-[#F8FAFF] opacity-60"
                          : "border-[#C7D2FE] bg-[#F8FAFF] hover:border-[#6366F1] hover:bg-[#EEF2FF]"}`}>
                        <div className={`w-6 h-6 rounded-lg border-2 flex-shrink-0 flex items-center justify-center transition-all ${done ? "bg-emerald-500 border-emerald-500" : "border-[#C7D2FE] group-hover:border-[#6366F1]"}`}>
                          {done ? <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} /> : <Circle className="w-3 h-3 text-[#C7D2FE]" />}
                        </div>
                        <span className={`text-sm flex-1 font-medium leading-snug ${done ? "line-through text-[#94A3B8]" : "text-[#334155] group-hover:text-[#0F172A]"}`}>{task.title}</span>
                        {!done && <span className="text-[9px] text-amber-500 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded font-bold">+🪙</span>}
                      </motion.button>
                    );
                  })
                )}
              </div>

              {tasks.length > 0 && taskPct === 100 && (
                <div className="mt-3 flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-50 border border-emerald-200 flex-shrink-0">
                  <span className="text-lg">🎉</span>
                  <span className="text-sm font-bold text-emerald-600">All tasks done!</span>
                </div>
              )}
            </Card>
          </div>
        )}

        {/* ── CENTER: Timer ── */}
        <div className={`flex flex-col items-center gap-4 ${zenMode ? "max-w-xs" : ""}`}>

          {/* Mode tabs */}
          <div className="flex gap-1.5 p-1 rounded-2xl bg-white border border-[#C7D2FE] w-full shadow-[0_2px_8px_rgba(99,102,241,0.08)]">
            {(["focus", "break"] as const).map(mode => (
              <button key={mode} onClick={() => toggleMode(mode)}
                className={`flex-1 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${timerMode === mode
                  ? "text-white shadow-[0_4px_12px_rgba(99,102,241,0.3)]"
                  : "text-[#94A3B8] hover:text-[#6366F1]"}`}
                style={timerMode === mode ? { background: "linear-gradient(135deg, #6366F1, #8B5CF6)" } : {}}>
                {mode === "focus" ? <><Flame className="w-3.5 h-3.5" />Focus</> : <><Coffee className="w-3.5 h-3.5" />Break</>}
              </button>
            ))}
          </div>

          {/* Timer ring */}
          <CircularTimer pct={pct} mode={timerMode} isRunning={isRunning} timeLeft={timeLeft} />

          {/* Progress bar */}
          <ProgressBar pct={pct} />

          {/* Presets */}
          <div className="flex flex-wrap gap-1.5 justify-center w-full">
            {(timerMode === "focus" ? [15, 25, 45, 60] : [5, 10, 15, 20]).map(m => (
              <button key={m} onClick={() => setDuration(m)}
                className={`px-3.5 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all border ${timerDuration === m * 60 && !isRunning
                  ? "text-white border-transparent shadow-[0_4px_12px_rgba(99,102,241,0.25)]"
                  : "border-[#C7D2FE] text-[#94A3B8] bg-white hover:border-[#6366F1] hover:text-[#6366F1]"}`}
                style={timerDuration === m * 60 && !isRunning ? { background: "linear-gradient(135deg, #6366F1, #8B5CF6)" } : {}}>
                {m}m
              </button>
            ))}
            <div className="flex items-center gap-0.5 bg-white border border-[#C7D2FE] rounded-xl px-2">
              <button onClick={() => { const c = Math.floor(timerDuration / 60); if (c > 1) setDuration(c - 1); }}
                className="w-6 h-7 text-[#94A3B8] hover:text-[#6366F1] font-bold flex items-center justify-center text-sm">−</button>
              <input type="number" min="1" max="999" value={Math.floor(timerDuration / 60)}
                onChange={e => { const v = parseInt(e.target.value); if (!isNaN(v) && v >= 1) setDuration(v); }}
                className="w-9 bg-transparent text-center text-[11px] font-bold text-[#334155] focus:text-[#6366F1] focus:outline-none appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
              <button onClick={() => { const c = Math.floor(timerDuration / 60); if (c < 999) setDuration(c + 1); }}
                className="w-6 h-7 text-[#94A3B8] hover:text-[#6366F1] font-bold flex items-center justify-center text-sm">+</button>
              <span className="text-[9px] text-[#94A3B8] pr-1 font-bold">m</span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex gap-2 w-full">
            <button onClick={() => setIsRunning(!isRunning)}
              className={`flex-1 py-4 rounded-2xl font-black text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${isRunning
                ? "bg-rose-50 border-2 border-rose-300 text-rose-600 hover:bg-rose-100"
                : "text-white shadow-[0_8px_24px_rgba(99,102,241,0.3)] hover:shadow-[0_12px_32px_rgba(99,102,241,0.45)] hover:scale-[1.02]"}`}
              style={!isRunning ? { background: "linear-gradient(135deg, #6366F1, #8B5CF6)" } : {}}>
              {isRunning ? "⏸ Pause" : timerMode === "focus" ? "▶ Start Focus" : "▶ Start Break"}
            </button>
            <button onClick={() => { setIsRunning(false); setTimeLeft(timerDuration); }}
              className="w-14 rounded-2xl bg-white border border-[#C7D2FE] text-[#94A3B8] hover:text-[#6366F1] hover:border-[#6366F1] flex items-center justify-center transition-all">
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {completedSessions > 0 && (
            <div className="flex items-center gap-2 text-xs text-[#6366F1] font-bold">
              <CheckCircle2 className="w-3.5 h-3.5" />{completedSessions} session{completedSessions > 1 ? "s" : ""} done today
            </div>
          )}
        </div>

        {/* ── RIGHT: Stats ── */}
        {!zenMode && (
          <div className="flex flex-col gap-4">

            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: Coins,       label: "Study Coins",  value: totalCoins,   cls: "text-amber-500",   bg: "bg-amber-50 border-amber-200" },
                { icon: Flame,       label: "Day Streak",   value: `${streakDays}d`, cls: "text-orange-500", bg: "bg-orange-50 border-orange-200" },
                { icon: CheckCircle2,label: "Tasks Done",   value: `${doneTasks}/${tasks.length}`, cls: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200" },
                { icon: CalendarDays,label: "Session",      value: formatDuration(slotTodaySeconds + slotLiveSeconds), cls: "text-[#6366F1]", bg: "bg-[#EEF2FF] border-[#C7D2FE]" },
              ].map(({ icon: Icon, label, value, cls, bg }) => (
                <Card key={label} className={`${bg} p-4 flex flex-col gap-2 !bg-opacity-100`}>
                  <Icon className={`w-5 h-5 ${cls}`} />
                  <p className={`text-2xl font-black tabular-nums ${cls}`}>{value}</p>
                  <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider">{label}</p>
                </Card>
              ))}
            </div>

            {/* Task completion ring */}
            <Card className="p-5 flex flex-col items-center gap-3">
              <p className="text-[9px] font-black uppercase tracking-[0.3em] text-[#94A3B8] self-start">Task Completion</p>
              <div className="relative flex items-center justify-center" style={{ width: 100, height: 100 }}>
                <svg width="100" height="100" viewBox="0 0 100 100" className="-rotate-90">
                  <defs>
                    <linearGradient id="taskRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#10B981" /><stop offset="100%" stopColor="#06B6D4" />
                    </linearGradient>
                  </defs>
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#EEF2FF" strokeWidth="8" />
                  <circle cx="50" cy="50" r="40" fill="none" stroke="url(#taskRingGrad)" strokeWidth="8"
                    strokeLinecap="round" strokeDasharray={`${2 * Math.PI * 40}`}
                    strokeDashoffset={`${2 * Math.PI * 40 * (1 - taskPct / 100)}`}
                    style={{ transition: "stroke-dashoffset 0.5s ease" }} />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xl font-black text-emerald-600">{taskPct}%</span>
                </div>
              </div>
              <p className="text-xs font-semibold text-[#64748B]">{doneTasks} of {tasks.length} done</p>
            </Card>

            {/* Focus tip */}
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4 text-[#6366F1]" />
                <p className="text-[9px] font-black uppercase tracking-[0.3em] text-[#94A3B8]">Focus Tip</p>
              </div>
              <p className="text-xs text-[#64748B] leading-relaxed">
                {isRunning
                  ? timerMode === "focus"
                    ? "🎯 Deep work session chal raha hai. Phone door rakho, ek kaam karo."
                    : "☕ Brain ko rest do. Pani piyo, aankhein band karo."
                  : "▶ Timer start karo aur ek kaam pe focus karo. Baaki baad mein."}
              </p>
            </Card>

            {resolvedSlot && (
              <Card className="p-5 bg-emerald-50 border-emerald-200">
                <p className="text-[9px] font-black uppercase tracking-[0.3em] text-emerald-400 mb-2">Active Slot</p>
                <p className="text-sm font-bold text-emerald-700">{resolvedSlot.slotName}</p>
                {resolvedSlot.timeLabel && <p className="text-[10px] text-emerald-500 mt-0.5">{resolvedSlot.timeLabel}</p>}
                <p className="text-2xl font-black text-emerald-600 mt-2 tabular-nums">{formatDuration(slotTodaySeconds + slotLiveSeconds)}</p>
              </Card>
            )}
          </div>
        )}
      </div>

      <SpotifyPlayer isOpen={spotifyOpen} onClose={() => setSpotifyOpen(false)} onOpen={() => setSpotifyOpen(true)} />
      <AIChatBot isOpen={chatOpen} onClose={() => setChatOpen(false)} />

      {/* ── Bottom bar ── */}
      {!zenMode && (
        <div className="relative z-10 flex items-center justify-between px-6 py-2 border-t border-[#E2E8F0] bg-white/70 flex-shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] text-[#94A3B8] font-bold uppercase tracking-wider">Live • Let's Study Focus Session</span>
          </div>
          <span className="text-[10px] text-[#CBD5E1] font-mono">cyberlib.in</span>
        </div>
      )}
    </div>
  );
}
