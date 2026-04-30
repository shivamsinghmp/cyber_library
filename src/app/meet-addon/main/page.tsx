"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2, MonitorPlay, Target, Zap, Clock, Check,
  Maximize2, Minimize2, LogOut, X,
} from "lucide-react";

// ─── Token helpers ────────────────────────────────────────────────────────────
function getToken(): string | null {
  try { return localStorage.getItem("vl_meet_addon_token"); } catch { return null; }
}
function getName(): string {
  try { return localStorage.getItem("vl_meet_addon_name") ?? ""; } catch { return ""; }
}

// ─── Live Clock ───────────────────────────────────────────────────────────────
function LiveClock() {
  const [time, setTime] = useState("");
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true }));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="w-full flex justify-center mb-6">
      <div className="text-center">
        <div className="text-5xl font-black tabular-nums tracking-tight text-[var(--cream)] drop-shadow-[0_0_20px_rgba(var(--accent-rgb),0.3)]">
          {time}
        </div>
        <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-[var(--wood)] mt-1">
          {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
        </div>
      </div>
    </div>
  );
}

function formatTime(s: number) {
  const m = Math.floor(s / 60).toString().padStart(2, "0");
  const sec = (s % 60).toString().padStart(2, "0");
  return `${m}:${sec}`;
}

// ─── Main Stage Page ──────────────────────────────────────────────────────────
export default function MeetAddonMainStagePage() {
  const [token] = useState<string | null>(() => getToken());
  const [studentName, setStudentName] = useState<string>(() => getName());
  const [zenMode, setZenMode] = useState(false);

  // Timer
  const [timerMode, setTimerMode] = useState<"focus" | "break">("focus");
  const [timerDuration, setTimerDuration] = useState(25 * 60);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Tasks
  const [tasks, setTasks] = useState<{ id: string; title: string; completedAt: string | null; isPromise?: boolean }[]>([]);
  const [dailyPromise, setDailyPromise] = useState<{ id: string; title: string; completedAt: string | null } | null>(null);

  // Poll
  const [currentPoll, setCurrentPoll] = useState<{ id: string; question: string; options: string[]; expiresAt?: string } | null>(null);
  const [pollSeconds, setPollSeconds] = useState(0);
  const [pollSubmitting, setPollSubmitting] = useState(false);

  // Coins
  const [totalCoins, setTotalCoins] = useState(0);
  const [streakDays, setStreakDays] = useState(0);

  // Slot
  const [resolvedSlot, setResolvedSlot] = useState<{ slotId: string; slotName: string; timeLabel: string } | null>(null);
  const [slotTodaySeconds, setSlotTodaySeconds] = useState(0);
  const [slotLiveSeconds, setSlotLiveSeconds] = useState(0);

  const formatDuration = (seconds: number) => {
    if (seconds <= 0) return "0m";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  // ── Fetch data ──────────────────────────────────────────────────────────────
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
        setTasks(d.tasks ?? []);
        const promise = (d.tasks ?? []).find((t: { isPromise?: boolean }) => t.isPromise);
        setDailyPromise(promise ?? null);
        setTotalCoins(d.totalCoins ?? 0);
        setStreakDays(d.streakDays ?? 0);
      }
      if (pollRes.ok) {
        const polls = await pollRes.json();
        const active = Array.isArray(polls) ? polls.find((p: { isActive: boolean; expiresAt?: string }) =>
          p.isActive && (!p.expiresAt || new Date(p.expiresAt) > new Date())
        ) : null;
        setCurrentPoll(active ?? null);
        if (active?.expiresAt) {
          setPollSeconds(Math.max(0, Math.floor((new Date(active.expiresAt).getTime() - Date.now()) / 1000)));
        }
      }
    } catch {}
  }, [token]);

  // Fetch student name if not in localStorage
  useEffect(() => {
    if (!token || studentName) return;
    fetch("/api/meet-addon/me", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then((d: { name?: string } | null) => {
        if (d?.name) { setStudentName(d.name); localStorage.setItem("vl_meet_addon_name", d.name); }
      }).catch(() => {});
  }, [token, studentName]);

  useEffect(() => { fetchData(); const id = setInterval(fetchData, 30000); return () => clearInterval(id); }, [fetchData]);

  // Meet SDK init
  useEffect(() => {
    async function initMeet() {
      if (typeof window !== "undefined" && window.self === window.top) return;
      try {
        const { meet } = await import("@googleworkspace/meet-addons/meet.addons");
        await meet.addon.createAddonSession({ cloudProjectNumber: "273461550329" });
      } catch {}
    }
    initMeet();
  }, []);

  // Timer
  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => setTimeLeft(t => { if (t <= 1) { setIsRunning(false); return 0; } return t - 1; }), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isRunning]);

  // Poll countdown
  useEffect(() => {
    if (!currentPoll || pollSeconds <= 0) return;
    const id = setInterval(() => setPollSeconds(s => { if (s <= 1) { setCurrentPoll(null); return 0; } return s - 1; }), 1000);
    return () => clearInterval(id);
  }, [currentPoll, pollSeconds]);

  // Slot time live counter
  useEffect(() => {
    if (!resolvedSlot?.slotId || !token) return;
    fetch(`/api/meet-addon/presence?roomKey=${encodeURIComponent(resolvedSlot.slotId)}`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(r => r.ok ? r.json() : null).then((d: { todaySeconds?: number } | null) => {
      if (d) setSlotTodaySeconds(d.todaySeconds ?? 0);
    }).catch(() => {});
    const tick = setInterval(() => setSlotLiveSeconds(s => s + 1), 1000);
    return () => clearInterval(tick);
  }, [resolvedSlot?.slotId, token]);

  const handlePollSubmit = async (pollId: string, answer: string) => {
    if (!token || pollSubmitting) return;
    setPollSubmitting(true);
    try {
      await fetch("/api/meet-addon/poll-response", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ pollId, answer }),
      });
      setCurrentPoll(null);
    } catch {} finally { setPollSubmitting(false); }
  };

  const toggleTask = async (id: string, done: boolean) => {
    if (!token) return;
    await fetch("/api/meet-addon/today-task", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ markComplete: !done, taskId: id }),
    }).catch(() => {});
    fetchData();
  };

  const setDuration = (minutes: number) => {
    setIsRunning(false);
    setTimerDuration(minutes * 60);
    setTimeLeft(minutes * 60);
  };

  if (!token) {
    return (
      <div className="min-h-[100dvh] bg-[#050505] flex items-center justify-center">
        <p className="text-[var(--cream-muted)] text-sm">Please open this from the side panel first.</p>
      </div>
    );
  }

  const doneTasks = tasks.filter(t => !!t.completedAt).length;
  const pct = Math.round((timeLeft / timerDuration) * 100);

  return (
    <div className={`min-h-[100dvh] transition-colors duration-700 flex flex-col items-center justify-start ${zenMode ? "bg-black pt-16" : "bg-[#050505] pt-20 pb-4"} px-4 relative overflow-y-auto`}>

      {/* Poll overlay */}
      <AnimatePresence>
        {currentPoll && pollSeconds > 0 && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
            className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 backdrop-blur-3xl p-6">
            <div className="relative w-full max-w-lg bg-black/50 border border-[var(--accent)]/50 rounded-[2rem] p-8 shadow-[0_0_80px_rgba(var(--accent-rgb),0.5)] overflow-hidden">
              <div className="absolute top-0 left-0 h-1 bg-[var(--accent)] transition-all" style={{ width: `${(pollSeconds / 60) * 100}%` }} />
              <div className="text-center mb-6">
                <Zap className="w-10 h-10 text-[var(--accent)] mx-auto mb-3" />
                <p className="text-3xl font-extrabold text-white">{currentPoll.question}</p>
                <div className="mt-3 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-500/20 border border-red-500/40 text-red-400 font-mono font-bold text-sm">
                  <Clock className="w-4 h-4" /> {formatTime(pollSeconds)}
                </div>
              </div>
              <div className="grid gap-3">
                {currentPoll.options.map((opt, i) => (
                  <button key={i} onClick={() => handlePollSubmit(currentPoll.id, opt)} disabled={pollSubmitting}
                    className="w-full bg-white/5 hover:bg-[var(--accent)] border border-white/10 hover:border-[var(--accent)] text-[var(--cream)] hover:text-black font-bold px-6 py-4 rounded-xl transition-all disabled:opacity-50">
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mesh background */}
      {!zenMode && <div className="pointer-events-none absolute inset-0 opacity-30 mix-blend-screen animate-[mesh] bg-[radial-gradient(circle_at_50%_0%,_var(--accent)_0%,_transparent_50%)]" />}

      {/* Header controls */}
      <div className="fixed top-4 right-4 z-[9000] flex flex-col gap-3">
        <button onClick={() => setZenMode(!zenMode)} title="Toggle Zen Mode"
          className={`p-2.5 rounded-full border transition-all shadow-lg ${zenMode ? "bg-[var(--accent)] text-black border-[var(--accent)]" : "border-white/10 bg-white/5 hover:bg-white/10 text-[var(--cream)]"}`}>
          {zenMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>

      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        className={`w-full z-10 flex flex-col ${zenMode ? "max-w-lg items-center justify-center min-h-[60vh]" : "max-w-4xl"}`}>

        {/* Daily Promise */}
        {!zenMode && dailyPromise && (
          <div className="w-full flex justify-center mb-8">
            <div className="relative bg-gradient-to-r from-[var(--accent)]/10 via-white/5 to-[var(--accent)]/10 border border-[var(--accent)]/40 px-8 py-4 rounded-full flex items-center gap-5 shadow-[0_0_30px_rgba(var(--accent-rgb),0.3)] backdrop-blur-2xl">
              <div className="absolute -inset-x-20 top-0 h-[1px] bg-gradient-to-r from-transparent via-[var(--accent)] to-transparent opacity-80" />
              <Target className="w-6 h-6 text-[var(--accent)] animate-pulse flex-shrink-0" />
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-[var(--accent)]">The Daily Promise 🎯</span>
                <span className={`text-lg font-extrabold text-white ${dailyPromise.completedAt ? "line-through opacity-50" : ""}`}>{dailyPromise.title}</span>
              </div>
              {!dailyPromise.completedAt && (
                <button onClick={() => toggleTask(dailyPromise.id, false)}
                  className="w-10 h-10 rounded-full border-2 border-[var(--accent)] bg-[var(--accent)]/10 flex items-center justify-center text-[var(--accent)] hover:bg-[var(--accent)] hover:text-black transition-all">
                  <Check className="w-5 h-5" strokeWidth={3} />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Clock */}
        {!zenMode && <LiveClock />}

        {/* Student name + slot badge */}
        {!zenMode && (
          <div className="w-full flex flex-wrap justify-center gap-3 mb-6">
            {studentName && (
              <div className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-[var(--accent)]/8 border border-[var(--accent)]/20">
                <div className="w-7 h-7 rounded-full bg-[var(--accent)]/20 border border-[var(--accent)]/30 flex items-center justify-center text-xs font-extrabold text-[var(--accent)]">
                  {studentName.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm font-bold text-[var(--cream)]">{studentName}</span>
              </div>
            )}
            {resolvedSlot && (
              <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-emerald-500/8 border border-emerald-500/20">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-bold text-emerald-400">{resolvedSlot.slotName}</span>
                  {resolvedSlot.timeLabel && <span className="text-[9px] text-emerald-400/50">{resolvedSlot.timeLabel}</span>}
                </div>
                <span className="text-sm font-extrabold text-emerald-300 tabular-nums ml-2">
                  {formatDuration(slotTodaySeconds + slotLiveSeconds)}
                </span>
              </div>
            )}
            <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-amber-500/8 border border-amber-500/20">
              <span className="text-sm">🪙</span>
              <span className="text-sm font-extrabold text-amber-400">{totalCoins}</span>
            </div>
            {streakDays > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-orange-500/8 border border-orange-500/20">
                <span className="text-sm">🔥</span>
                <span className="text-sm font-extrabold text-orange-400">{streakDays}d</span>
              </div>
            )}
          </div>
        )}

        {/* Timer */}
        <div className="relative rounded-[2rem] border border-white/10 bg-white/[0.03] backdrop-blur-xl p-6 mb-4 w-full">
          <div className="relative z-10">
            {/* Mode selector */}
            <div className="flex gap-2 mb-5">
              {(["focus", "break"] as const).map(mode => (
                <button key={mode} onClick={() => { setTimerMode(mode); setDuration(mode === "focus" ? 25 : 5); }}
                  className={`flex-1 py-2 rounded-xl text-[11px] font-extrabold uppercase tracking-widest transition-all ${timerMode === mode
                    ? mode === "focus" ? "bg-[var(--accent)] text-black shadow-[0_0_20px_rgba(var(--accent-rgb),0.4)]"
                    : "bg-blue-500 text-white shadow-[0_0_20px_rgba(59,130,246,0.4)]"
                    : "bg-white/5 text-gray-500 hover:bg-white/10"}`}>
                  {mode === "focus" ? "🎯 Focus" : "☕ Break"}
                </button>
              ))}
            </div>

            {/* Timer display */}
            <div className="relative flex items-center justify-center mb-5">
              <svg className="-rotate-90 absolute" width="160" height="160" viewBox="0 0 160 160">
                <circle cx="80" cy="80" r="70" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
                <circle cx="80" cy="80" r="70" fill="none"
                  stroke={timerMode === "focus" ? "var(--accent)" : "#3b82f6"} strokeWidth="8"
                  strokeLinecap="round" strokeDasharray={`${2 * Math.PI * 70}`}
                  strokeDashoffset={`${2 * Math.PI * 70 * (1 - pct / 100)}`}
                  style={{ transition: "stroke-dashoffset 1s linear" }} />
              </svg>
              <div className="relative z-10 text-center">
                <div className={`text-5xl font-black tabular-nums tracking-tight ${isRunning ? "text-white" : "text-gray-400"}`}>
                  {formatTime(timeLeft)}
                </div>
                <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-gray-600 mt-1">
                  {timerMode === "focus" ? "Focus" : "Break"}
                </div>
              </div>
            </div>

            {/* Presets */}
            <div className="flex flex-wrap gap-1.5 mb-4 justify-center">
              {[25, 45, 60, 90].map(m => (
                <button key={m} onClick={() => setDuration(m)}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all ${timerDuration === m * 60 && !isRunning
                    ? "bg-[var(--accent)]/20 text-[var(--accent)] border border-[var(--accent)]/40"
                    : "bg-white/5 border border-white/10 text-gray-500 hover:bg-white/10 hover:text-gray-300"}`}>
                  {m}m
                </button>
              ))}
              <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl px-2">
                <button onClick={() => { const c = Math.floor(timerDuration/60); if(c>1) setDuration(c-1); }}
                  className="w-6 h-6 text-gray-400 hover:text-white font-bold text-base flex items-center justify-center">−</button>
                <input type="number" min="1" max="999" value={Math.floor(timerDuration/60)}
                  onChange={e => { const v = parseInt(e.target.value); if(!isNaN(v) && v >= 1) setDuration(v); }}
                  className="w-10 bg-transparent text-center text-[11px] font-bold text-white focus:outline-none appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                <button onClick={() => { const c = Math.floor(timerDuration/60); if(c<999) setDuration(c+1); }}
                  className="w-6 h-6 text-gray-400 hover:text-white font-bold text-base flex items-center justify-center">+</button>
                <span className="text-[9px] text-gray-600 pr-1">m</span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex gap-2">
              <button onClick={() => setIsRunning(!isRunning)}
                className={`flex-1 py-3 rounded-2xl font-extrabold uppercase tracking-wider text-sm transition-all ${isRunning
                  ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 hover:bg-yellow-500/30"
                  : timerMode === "focus"
                    ? "bg-[var(--accent)] text-black shadow-[0_0_20px_rgba(var(--accent-rgb),0.4)] hover:scale-[1.02]"
                    : "bg-blue-500 text-white shadow-[0_0_20px_rgba(59,130,246,0.4)] hover:scale-[1.02]"}`}>
                {isRunning ? "⏸ Pause" : "▶ Start"}
              </button>
              <button onClick={() => { setIsRunning(false); setTimeLeft(timerDuration); }}
                className="px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10 hover:text-white transition-all font-bold text-sm">
                ↺
              </button>
            </div>
          </div>
        </div>

        {/* Tasks */}
        {!zenMode && (
          <div className="relative rounded-[2rem] border border-white/10 bg-white/[0.03] backdrop-blur-xl p-6 w-full">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--wood)]">Today&apos;s Tasks</span>
              <span className="text-[10px] font-bold text-emerald-400">{doneTasks}/{tasks.filter(t => !t.isPromise).length}</span>
            </div>
            {tasks.length === 0 ? (
              <p className="text-center text-xs text-gray-600 py-4">No tasks for today</p>
            ) : (
              <div className="space-y-2">
                {tasks.filter(t => !t.isPromise).map(task => (
                  <button key={task.id} onClick={() => toggleTask(task.id, !!task.completedAt)}
                    className="w-full flex items-center gap-3 py-2.5 px-1 hover:bg-white/3 rounded-xl transition-all text-left">
                    <div className={`w-5 h-5 rounded-md border flex-shrink-0 flex items-center justify-center transition-all ${task.completedAt
                      ? "bg-emerald-500/20 border-emerald-500/50" : "border-white/15"}`}>
                      {task.completedAt && <Check className="w-3 h-3 text-emerald-400" strokeWidth={3} />}
                    </div>
                    <span className={`text-sm flex-1 ${task.completedAt ? "line-through text-gray-600" : "text-[var(--cream-muted)]"}`}>
                      {task.title}
                    </span>
                    <span className="text-[9px] text-amber-400 bg-amber-500/8 border border-amber-500/12 px-1.5 py-0.5 rounded">+1🪙</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

      </motion.div>
    </div>
  );
}
