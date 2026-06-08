"use client";

import { useState, useEffect, useRef } from "react";
import {
  Plus, CheckCircle, Clock, Flame, X, RotateCcw,
  CalendarClock, Loader2, LogOut, Pencil, MonitorPlay,
  Droplets, Maximize2, Minimize2, Coffee, BrainCircuit,
  Trash2, Send, Target, Check, Zap, Music2, Sparkles,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { LoginCard } from "./components/LoginCard";
import { SpotifyPlayer } from "./components/SpotifyPlayer";
import { AIChatBot }    from "./components/AIChatBot";
import { PlanLockedScreen } from "./components/PlanLockedScreen";

const TOKEN_KEY = "vl_meet_addon_token";
const TIMER_STORAGE_KEY = "vl_meet_timer_state";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}
function saveToken(token: string) { localStorage.setItem(TOKEN_KEY, token); }
function clearToken() { localStorage.removeItem(TOKEN_KEY); }

// ── LiveClock ──────────────────────────────────────────────────────────────────
function LiveClock() {
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    setMounted(true);
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!mounted) return <div className="h-[88px]" />;

  return (
    <div className="w-full max-w-md mx-auto mb-6 text-center bg-white border border-[#C7D2FE] rounded-2xl px-6 py-4 shadow-[0_4px_16px_rgba(99,102,241,0.1)]">
      <span className="text-4xl font-mono font-black tracking-widest text-[#0F172A]">
        {now.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
      </span>
      <div className="flex items-center justify-center gap-1.5 mt-1.5">
        <CalendarClock className="w-3 h-3 text-[#6366F1]" />
        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#334155]">
          {now.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
        </span>
      </div>
    </div>
  );
}

// ── Main Panel ────────────────────────────────────────────────────────────────
export default function MeetAddonPanelPage() {
  const videoRef = useRef<HTMLVideoElement>(null);

  const startPiPMonitor = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getDisplayMedia({ video: { displaySurface: "browser" }, audio: false });
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play();
        mediaStream.getVideoTracks()[0].onended = () => {
          if (document.pictureInPictureElement) document.exitPictureInPicture().catch(console.error);
        };
        await videoRef.current.requestPictureInPicture();
      }
    } catch (err) {
      console.error("PiP failed:", err);
      alert("Floating Monitor requires screen share permissions.");
    }
  };

  const [token, setTokenState] = useState<string | null>(null);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [taskPriority, setTaskPriority] = useState("medium");
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);

  const [timerMode, setTimerMode] = useState<"focus" | "break">("focus");
  const [timerDuration, setTimerDuration] = useState(25 * 60);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);

  const [zenMode, setZenMode] = useState(false);
  const [spotifyOpen, setSpotifyOpen] = useState(false);
  const [musicPlaying, setMusicPlaying] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);
  const [waterGlasses, setWaterGlasses] = useState(0);
  const [mainStageLoading, setMainStageLoading] = useState(false);
  const [studentName, setStudentName] = useState<string>("");
  const [isMainStageOpen, setIsMainStageOpen] = useState(false);
  const [resolvedSlot, setResolvedSlot] = useState<{ slotId: string; slotName: string; timeLabel: string } | null>(null);
  const [slotResolving, setSlotResolving] = useState(false);
  const [slotTodaySeconds, setSlotTodaySeconds] = useState(0);
  const [slotLiveSeconds, setSlotLiveSeconds] = useState(0);

  const [planAccess, setPlanAccess] = useState<{ allowed: boolean; state: string; daysLeft?: number } | null>(null);
  const [planLoading, setPlanLoading] = useState(false);

  const [brainDumps, setBrainDumps] = useState<{ id: string; title?: string; text: string }[]>([]);
  const [dumpTitle, setDumpTitle] = useState("");
  const [dumpInput, setDumpInput] = useState("");
  const [showDumps, setShowDumps] = useState(false);

  const [meetClient, setMeetClient] = useState<any>(null);
  useEffect(() => {
    let sessionCreated = false;
    async function initMeetAddon() {
      if (typeof window !== "undefined" && window.self === window.top) return;
      try {
        const { meet } = await import("@googleworkspace/meet-addons/meet.addons");
        if (!sessionCreated) {
          sessionCreated = true;
          const addonSession = await meet.addon.createAddonSession({ cloudProjectNumber: "273461550329" });
          const sidePanelClient = await addonSession.createSidePanelClient();
          setMeetClient(sidePanelClient);
          try {
            const meetingInfo = await sidePanelClient.getMeetingInfo();
            const meetingId = (meetingInfo as any)?.meetingId ?? (meetingInfo as any)?.callId ?? "";
            if (meetingId) {
              setSlotResolving(true);
              const storedToken = getToken();
              const res = await fetch(`/api/meet-addon/resolve-slot?meetingId=${encodeURIComponent(meetingId)}`,
                { headers: storedToken ? { Authorization: `Bearer ${storedToken}` } : {} });
              if (res.ok) {
                const data = await res.json();
                if (data.slotId) {
                  setResolvedSlot({ slotId: data.slotId, slotName: data.slotName, timeLabel: data.timeLabel });
                  const tok = getToken();
                  if (tok) {
                    fetch("/api/meet-addon/presence", {
                      method: "POST",
                      headers: { "Content-Type": "application/json", Authorization: `Bearer ${tok}` },
                      body: JSON.stringify({ event: "join", roomKey: data.slotId }),
                    }).catch(() => {});
                    // Fetch today's presence time for this slot
                    fetch(`/api/meet-addon/presence?roomKey=${encodeURIComponent(data.slotId)}`, {
                      headers: { Authorization: `Bearer ${tok}` },
                    })
                      .then(r => r.ok ? r.json() : null)
                      .then((d: { todaySeconds?: number } | null) => {
                        if (d?.todaySeconds != null) setSlotTodaySeconds(d.todaySeconds);
                      })
                      .catch(() => {});
                  }
                }
              }
              setSlotResolving(false);
            }
          } catch { setSlotResolving(false); }
        }
      } catch (err) { console.error("Meet Addon SDK failed:", err); }
    }
    initMeetAddon();
  }, []);

  // Fetch plan access whenever token changes
  useEffect(() => {
    if (!token) { setPlanAccess(null); return; }
    setPlanLoading(true);
    fetch("/api/meet-addon/me", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then((d: { name?: string; planAccess?: { allowed: boolean; state: string; daysLeft?: number } } | null) => {
        if (!d) { setPlanAccess({ allowed: false, state: "no_plan" }); return; }
        if (d.name && !studentName) {
          setStudentName(d.name);
          localStorage.setItem("vl_meet_addon_name", d.name);
        }
        setPlanAccess(d.planAccess ?? { allowed: false, state: "no_plan" });
      })
      .catch(() => setPlanAccess({ allowed: false, state: "no_plan" }))
      .finally(() => setPlanLoading(false));
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setTokenState(getToken());
    const savedName = localStorage.getItem("vl_meet_addon_name");
    if (savedName) setStudentName(savedName);
    const saved = localStorage.getItem(TIMER_STORAGE_KEY);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (data.isRunning && data.endTime) {
          const remaining = Math.max(0, Math.floor((data.endTime - Date.now()) / 1000));
          setTimerDuration(data.duration || 25 * 60);
          if (remaining > 0) { setTimeLeft(remaining); setIsRunning(true); }
          else { setTimeLeft(data.duration || 25 * 60); setIsRunning(false); }
        } else {
          setTimerDuration(data.duration || 25 * 60);
          setTimeLeft(data.pausedTimeLeft ?? data.duration ?? (25 * 60));
          setIsRunning(false);
        }
      } catch (e) { console.error("Timer corrupt", e); }
    }
  }, []);

  async function openMainStage() {
    setMainStageLoading(true);
    try {
      if (isMainStageOpen) {
        if (typeof window !== "undefined" && window.self !== window.top && meetClient) {
          if (typeof meetClient.unloadActivity === "function") await meetClient.unloadActivity();
          else if (typeof meetClient.clearActivity === "function") await meetClient.clearActivity();
          else if (typeof meetClient.endActivity === "function") await meetClient.endActivity();
        }
        setIsMainStageOpen(false);
      } else {
        if (typeof window !== "undefined" && window.self !== window.top && meetClient) {
          await meetClient.startActivity({ mainStageUrl: "https://cyberlib.in/meet-addon/main" });
          setIsMainStageOpen(true);
        } else {
          window.open("/meet-addon/main", "_blank");
        }
      }
    } catch {
      if (!isMainStageOpen) window.open("/meet-addon/main", "_blank");
    } finally { setMainStageLoading(false); }
  }

  function handleLogout() { clearToken(); setTokenState(null); }

  type Subtask = { id: string; title: string; completedAt: string | null; sortOrder: number };
  type Task    = { id: string; title: string; description: string | null; priority: number; completedAt: string | null; subtasks: Subtask[] };

  const [tasks, setTasks] = useState<Task[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [totalPoints, setTotalPoints] = useState(0);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [subtaskInputs, setSubtaskInputs] = useState<Record<string, string>>({});

  const fetchTasks = async () => {
    if (!token) return;
    try {
      const res = await fetch("/api/meet-addon/today-task", { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks || []);
        if (data.coinBalance !== undefined) setTotalPoints(data.coinBalance);
        else if (data.totalPoints !== undefined) setTotalPoints(data.totalPoints);
      } else if (res.status === 401) { handleLogout(); }
    } catch (e) { console.error(e); }
    finally { setTasksLoading(false); }
  };

  useEffect(() => { if (token && planAccess?.allowed) fetchTasks(); }, [token, planAccess?.allowed]); // eslint-disable-line react-hooks/exhaustive-deps

  const [activePolls, setActivePolls] = useState<any[]>([]);
  const [pollSubmitting, setPollSubmitting] = useState(false);
  const [pollSeconds, setPollSeconds] = useState(0);

  const fetchPolls = async () => {
    if (!token) return;
    try {
      const res = await fetch("/api/meet-addon/polls", { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) { const data = await res.json(); setActivePolls(data.filter((p: any) => !p.alreadyAnswered)); }
    } catch {}
  };

  useEffect(() => {
    if (!token || !planAccess?.allowed) return;
    fetchPolls();
    const id = setInterval(fetchPolls, 10000);
    return () => clearInterval(id);
  }, [token, planAccess?.allowed]); // eslint-disable-line react-hooks/exhaustive-deps

  const currentPoll = activePolls[0] || null;

  useEffect(() => {
    if (!currentPoll?.expiresAt) return;
    const target = new Date(currentPoll.expiresAt).getTime();
    const tick = () => { const left = Math.max(0, Math.floor((target - Date.now()) / 1000)); setPollSeconds(left); if (left === 0) fetchPolls(); };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [currentPoll]);

  const handlePollSubmit = async (pollId: string, answer: string) => {
    if (!token) return;
    setPollSubmitting(true);
    try {
      const res = await fetch("/api/meet-addon/poll-response", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ pollId, answer }),
      });
      if (res.ok) setActivePolls(prev => prev.filter(p => p.id !== pollId));
    } finally { setPollSubmitting(false); }
  };

  const dailyPromise = tasks.find(t => t.priority === 0);
  const [promiseInput, setPromiseInput] = useState("");
  const [promiseLoading, setPromiseLoading] = useState(false);

  const handleSetPromise = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promiseInput.trim() || !token) return;
    setPromiseLoading(true);
    try {
      const res = await fetch("/api/meet-addon/today-task", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: promiseInput, priority: 0 }),
      });
      if (res.ok) fetchTasks();
    } finally { setPromiseLoading(false); }
  };

  useEffect(() => {
    if (!token) return;
    const sendStatus = (override?: string) => {
      const status = override || (isRunning ? (timerMode === "focus" ? "🟢 In Deep Focus" : "☕ Taking a Break") : "Offline");
      fetch("/api/user/live-status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status }),
      }).catch(() => {});
    };
    sendStatus();
    const handleUnload = () => sendStatus("Offline");
    window.addEventListener("beforeunload", handleUnload);
    return () => window.removeEventListener("beforeunload", handleUnload);
  }, [isRunning, timerMode, token]);

  const handleCreateTask = async () => {
    if (!taskTitle.trim() || !token) return;
    setShowTaskForm(false);
    const PriorityMap: Record<string, number> = { high: 1, medium: 2, normal: 3 };
    const p = PriorityMap[taskPriority] || 2;
    if (editingTaskId) {
      const targetId = editingTaskId;
      setTasks(prev => prev.map(t => t.id === targetId ? { ...t, title: taskTitle, description: taskDesc || null, priority: p } : t).sort((a, b) => a.priority - b.priority));
      setEditingTaskId(null); setTaskTitle(""); setTaskDesc(""); setTaskPriority("medium");
      try {
        const res = await fetch("/api/meet-addon/today-task", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ taskId: targetId, title: taskTitle, description: taskDesc, priority: p }),
        });
        if (res.status === 401) { handleLogout(); return; }
        if (!res.ok) fetchTasks();
      } catch { fetchTasks(); }
      return;
    }
    // Check 5-task limit (excluding daily promise)
    const regularTasks = tasks.filter(t => t.priority !== 0);
    if (p !== 0 && regularTasks.length >= 5) {
      toast.error("Maximum 5 tasks per day allowed 🚫");
      return;
    }
    const tempId = `temp-${Date.now()}`;
    const newTask: Task = { id: tempId, title: taskTitle, description: taskDesc || null, priority: p, completedAt: null, subtasks: [] };
    setTasks(prev => [...prev, newTask].sort((a, b) => a.priority - b.priority));
    setTaskTitle(""); setTaskDesc(""); setTaskPriority("medium");
    try {
      const res = await fetch("/api/meet-addon/today-task", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: newTask.title, description: newTask.description, priority: newTask.priority }),
      });
      if (res.ok) { const saved = await res.json(); setTasks(prev => prev.map(t => t.id === tempId ? saved : t).sort((a, b) => a.priority - b.priority)); }
      else if (res.status === 401) { handleLogout(); }
      else { setTasks(prev => prev.filter(t => t.id !== tempId)); fetchTasks(); }
    } catch { fetchTasks(); }
  };

  const handleAddSubtask = async (taskId: string) => {
    if (!token) return;
    const title = (subtaskInputs[taskId] ?? "").trim();
    if (!title) return;
    setSubtaskInputs(prev => ({ ...prev, [taskId]: "" }));
    try {
      const res = await fetch("/api/meet-addon/today-task", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ subtask: true, taskId, title }),
      });
      if (res.ok) {
        const saved = await res.json();
        setTasks(prev => prev.map(t =>
          t.id === taskId ? { ...t, subtasks: [...(t.subtasks ?? []), saved] } : t
        ));
      } else if (res.status === 400) {
        const d = await res.json();
        toast.error(d.error || "Cannot add subtask");
      }
    } catch {}
  };

  const handleToggleSubtask = async (taskId: string, subtaskId: string) => {
    if (!token) return;
    setTasks(prev => prev.map(t =>
      t.id !== taskId ? t : {
        ...t,
        subtasks: t.subtasks.map(s =>
          s.id === subtaskId
            ? { ...s, completedAt: s.completedAt ? null : new Date().toISOString() }
            : s
        ),
      }
    ));
    try {
      await fetch("/api/meet-addon/today-task", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ subtask: true, markComplete: true, subtaskId }),
      });
    } catch { fetchTasks(); }
  };

  const handleCompleteTask = async (taskId: string) => {
    if (!token) return;
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, completedAt: new Date().toISOString() } : t));
    try {
      await fetch("/api/meet-addon/today-task", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ markComplete: true, taskId }),
      });
    } catch { fetchTasks(); }
  };

  const saveTimerSession = async (planned: number, completed: number, isFinished: boolean) => {
    if (!token || completed <= 0) return;
    try {
      await fetch("/api/meet-addon/pomodoro-session", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ roomKey: resolvedSlot?.slotId ?? "local-room", plannedSeconds: planned, completedSeconds: completed, completedFully: isFinished }),
      });
    } catch (e) { console.error("Timer sync failed", e); }
  };

  // Live slot-time counter — ticks every second after slot is resolved
  useEffect(() => {
    if (!resolvedSlot) return;
    setSlotLiveSeconds(0);
    const id = setInterval(() => setSlotLiveSeconds(prev => prev + 1), 1000);
    return () => clearInterval(id);
  }, [resolvedSlot?.slotId]);

  useEffect(() => {
    if (!isRunning || !token) return;
    const sendPresence = (eventType: "ping" | "end") => {
      fetch("/api/meet-addon/presence", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ event: eventType, roomKey: resolvedSlot?.slotId ?? "local-room" }),
      }).catch(console.error);
    };
    sendPresence("ping");
    const presenceInterval = setInterval(() => sendPresence("ping"), 30000);
    return () => { clearInterval(presenceInterval); sendPresence("end"); };
  }, [isRunning, token]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        const saved = localStorage.getItem(TIMER_STORAGE_KEY);
        let driftSet = false;
        if (saved) { try { const data = JSON.parse(saved); if (data.endTime) { setTimeLeft(Math.max(0, Math.floor((data.endTime - Date.now()) / 1000))); driftSet = true; } } catch {} }
        if (!driftSet) setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (isRunning && timeLeft === 0) {
      setIsRunning(false);
      saveTimerSession(timerDuration, timerDuration, true);
      localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify({ isRunning: false, duration: timerDuration, pausedTimeLeft: timerDuration }));
    }
    return () => clearInterval(interval);
  }, [isRunning, timeLeft, timerDuration, token]);

  const toggleTimer = () => {
    if (isRunning) {
      saveTimerSession(timerDuration, timerDuration - timeLeft, false);
      setTimerDuration(timeLeft); setIsRunning(false);
      localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify({ isRunning: false, duration: timeLeft, pausedTimeLeft: timeLeft }));
    } else {
      setIsRunning(true);
      localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify({ isRunning: true, duration: timerDuration, endTime: Date.now() + timeLeft * 1000 }));
    }
  };
  const resetTimer = () => {
    if (isRunning) saveTimerSession(timerDuration, timerDuration - timeLeft, false);
    setIsRunning(false); setTimeLeft(timerDuration);
    localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify({ isRunning: false, duration: timerDuration, pausedTimeLeft: timerDuration }));
  };
  const setDuration = (minutes: number) => {
    if (isRunning) saveTimerSession(timerDuration, timerDuration - timeLeft, false);
    setIsRunning(false); setTimerDuration(minutes * 60); setTimeLeft(minutes * 60);
    localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify({ isRunning: false, duration: minutes * 60, pausedTimeLeft: minutes * 60 }));
  };
  const handleSetTimerMode = (mode: "focus" | "break") => {
    if (timerMode === mode) return;
    if (isRunning) saveTimerSession(timerDuration, timerDuration - timeLeft, false);
    setIsRunning(false); setTimerMode(mode);
    const newMins = mode === "focus" ? 25 : 5;
    setTimerDuration(newMins * 60); setTimeLeft(newMins * 60);
    localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify({ isRunning: false, duration: newMins * 60, pausedTimeLeft: newMins * 60 }));
  };

  const handleAddBrainDump = () => {
    if (!dumpInput.trim() && !dumpTitle.trim()) return;
    setBrainDumps(prev => [{ id: Date.now().toString(), title: dumpTitle.trim() || undefined, text: dumpInput.trim() }, ...prev]);
    setDumpInput(""); setDumpTitle("");
  };

  const formatTime = (seconds: number) => `${Math.floor(seconds / 60).toString().padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
  const formatDuration = (seconds: number) => {
    if (seconds <= 0) return "0m";
    const h = Math.floor(seconds / 3600), m = Math.floor((seconds % 3600) / 60), s = seconds % 60;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  // ── LOGIN GATE ──────────────────────────────────────────────────────────────
  if (!token) {
    return <LoginCard onLogin={(t) => { saveToken(t); setTokenState(t); }} />;
  }

  // ── PLAN ACCESS LOADING ──────────────────────────────────────────────────────
  if (planLoading || !planAccess) {
    return (
      <div className="min-h-[100dvh] bg-[var(--page-bg)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[var(--accent)] animate-spin" />
      </div>
    );
  }

  // ── PLAN ACCESS GATE ────────────────────────────────────────────────────────
  if (!planAccess.allowed) {
    return (
      <PlanLockedScreen
        state={planAccess.state}
        daysLeft={planAccess.daysLeft}
        onBack={() => { clearToken(); setTokenState(null); setPlanAccess(null); }}
      />
    );
  }

  if (token && tasksLoading) {
    return (
      <div className="min-h-[100dvh] bg-[var(--page-bg)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[var(--accent)] animate-spin" />
      </div>
    );
  }

  // ── DAILY PROMISE GATE ──────────────────────────────────────────────────────
  if (!tasksLoading && !dailyPromise && token) {
    return (
      <div className="fixed inset-0 z-[9999] bg-[var(--page-bg)] flex flex-col items-center justify-center p-6">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,_rgba(99,102,241,0.15)_0%,_transparent_65%)] pointer-events-none" />
        <motion.div initial={{ opacity: 0, scale: 0.92, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
          className="relative z-10 w-full max-w-sm bg-white border border-[#C7D2FE] rounded-3xl p-8 shadow-[0_0_60px_rgba(99,102,241,0.2)] backdrop-blur-2xl text-center">
          <div className="w-14 h-14 bg-[#6366F1]/20 rounded-full flex items-center justify-center mx-auto mb-5 shadow-[0_0_30px_rgba(99,102,241,0.4)]">
            <Target className="w-7 h-7 text-[var(--accent)]" />
          </div>
          <h2 className="text-xl font-black uppercase tracking-widest text-[#0F172A] mb-1">Daily Promise</h2>
          <p className="text-[#64748B] text-sm mb-7">What is your ONE goal for today?</p>
          <form onSubmit={handleSetPromise} className="space-y-3">
            <input type="text" autoFocus value={promiseInput} onChange={e => setPromiseInput(e.target.value)}
              placeholder="e.g. Complete 5 Mock Tests..."
              className="w-full bg-[#F8FAFF] border border-[#C7D2FE] rounded-xl p-4 text-center text-sm font-semibold text-[#0F172A] focus:outline-none focus:border-[#6366F1] focus:ring-1 focus:ring-[#6366F1]/20 placeholder:text-[#94A3B8] transition-all" />
            <button disabled={promiseLoading || !promiseInput.trim()} type="submit"
              className="w-full bg-[#6366F1] hover:bg-[#4F46E5] text-white py-3.5 rounded-xl font-black uppercase tracking-widest text-sm transition-all disabled:opacity-40 flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(99,102,241,0.4)]">
              {promiseLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Lock it in 🔒"}
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  // ── MAIN DASHBOARD ──────────────────────────────────────────────────────────
  return (
    <div className={`min-h-[100dvh] flex flex-col items-center justify-start transition-all duration-500 ${zenMode ? "pt-12" : `pt-24 ${musicPlaying && !spotifyOpen ? "pb-24" : "pb-6"}`} px-4 relative overflow-y-auto scrollbar-hide`} style={{ background: "var(--page-bg)" }}>

      {/* Home-page style background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(circle, #6366F122 1px, transparent 1px)", backgroundSize: "28px 28px" }} />
        <div className="absolute -top-32 right-0 h-[400px] w-[400px] rounded-full blur-[100px]" style={{ background: "radial-gradient(circle, rgba(139,92,246,0.15) 0%, rgba(99,102,241,0.07) 60%, transparent 100%)" }} />
        <div className="absolute bottom-0 -left-16 h-[300px] w-[300px] rounded-full blur-[80px]" style={{ background: "radial-gradient(circle, rgba(6,182,212,0.12) 0%, transparent 70%)" }} />
      </div>

      {/* ── Poll Overlay ── */}
      <AnimatePresence>
        {currentPoll && pollSeconds > 0 && (
          <motion.div initial={{ opacity: 0, scale: 0.92, y: 40 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.88, y: -30 }}
            className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-black/85 backdrop-blur-3xl p-6">
            <div className="relative w-full max-w-md bg-white border border-[var(--accent)]/40 rounded-3xl p-8 shadow-[0_0_80px_rgba(99,102,241,0.4)] overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-0.5 bg-[#6366F1]" style={{ width: `${(pollSeconds / 60) * 100}%`, transition: "width 1s linear" }} />
              <div className="flex flex-col items-center mb-7">
                <div className="w-14 h-14 bg-[#6366F1]/20 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(99,102,241,0.5)] mb-4">
                  <Zap className="w-7 h-7 text-[var(--accent)]" />
                </div>
                <p className="text-xs font-black uppercase tracking-[0.3em] text-[var(--accent)] mb-2">Pop Quiz!</p>
                <p className="text-2xl font-extrabold text-[#0F172A] text-center leading-tight">{currentPoll.question}</p>
                <div className="mt-3 px-3 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-400 font-mono font-bold text-sm flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" /> {formatTime(pollSeconds)}
                </div>
              </div>
              <div className="grid gap-2.5">
                {currentPoll.options.map((opt: string, i: number) => (
                  <button key={i} onClick={() => handlePollSubmit(currentPoll.id, opt)} disabled={pollSubmitting}
                    className="w-full bg-[#F8FAFF] hover:bg-[#6366F1] border border-[#C7D2FE] hover:border-[#6366F1] text-left px-5 py-3.5 rounded-xl transition-all disabled:opacity-50 text-[#0F172A] font-semibold text-sm">
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Floating Controls ── */}
      {studentName && !zenMode && (
        <div className="fixed top-4 left-4 z-[9000]">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#F8FAFF] border border-[#C7D2FE] backdrop-blur-md">
            <div className="w-6 h-6 rounded-full bg-[#6366F1]/20 flex items-center justify-center text-[10px] font-black text-[var(--accent)]">
              {studentName.charAt(0).toUpperCase()}
            </div>
            <span className="text-xs font-bold text-[#0F172A] max-w-[110px] truncate">{studentName}</span>
          </div>
        </div>
      )}

      <div className="fixed top-4 right-4 z-[9000] flex flex-col gap-2.5">
        <button onClick={() => setZenMode(!zenMode)}
          className={`p-2.5 rounded-full border transition-all shadow-lg ${zenMode ? "bg-[#6366F1] text-white border-[var(--accent)]" : "border-[#C7D2FE] bg-[#F8FAFF] hover:bg-white/10 text-[#334155] backdrop-blur-md"}`}>
          {zenMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
        {/* Music Player button */}
        <button
          onClick={() => setSpotifyOpen((o) => !o)}
          title="Study Music (YouTube + Spotify)"
          className={`p-2.5 rounded-full border transition-all shadow-lg ${spotifyOpen ? "border-purple-500 bg-purple-500 text-white" : "border-purple-400/30 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20"}`}
        >
          <Music2 className="w-4 h-4" />
        </button>
        {/* AI Chatbot button */}
        <button
          onClick={() => setChatOpen((o) => !o)}
          title="StudyMate AI"
          className={`p-2.5 rounded-full border transition-all shadow-lg ${chatOpen ? "border-[#6366F1] bg-[#6366F1] text-white" : "border-[#6366F1]/30 bg-[#6366F1]/10 text-[#6366F1] hover:bg-[#6366F1]/20"}`}
        >
          <Sparkles className="w-4 h-4" />
        </button>
        {!zenMode && (
          <button onClick={openMainStage} disabled={mainStageLoading}
            className={`p-2.5 rounded-full border transition-all shadow-lg backdrop-blur-md disabled:opacity-40 ${isMainStageOpen ? "border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20" : "border-blue-500/30 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20"}`}>
            {mainStageLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : isMainStageOpen ? <X className="w-4 h-4" /> : <MonitorPlay className="w-4 h-4" />}
          </button>
        )}
        {!zenMode && (
          <button onClick={handleLogout}
            className="p-2.5 rounded-full border border-[#C7D2FE] bg-white hover:bg-rose-50 hover:border-rose-300 text-[#64748B] hover:text-rose-500 transition-all">
            <LogOut className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Spotify floating player */}
      <SpotifyPlayer isOpen={spotifyOpen} onClose={() => setSpotifyOpen(false)} onOpen={() => setSpotifyOpen(true)} onPlayingChange={setMusicPlaying} />
      {/* AI Chatbot */}
      <AIChatBot
        isOpen={chatOpen}
        onClose={() => setChatOpen(false)}
        initialPrompt={pendingPrompt}
        onPromptConsumed={() => setPendingPrompt(null)}
      />

      <AnimatePresence mode="wait">
        <motion.div key={zenMode ? "zen" : "dash"} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }} transition={{ duration: 0.35 }}
          className={`w-full z-10 flex flex-col ${zenMode ? "max-w-sm items-center justify-center min-h-[60vh]" : "max-w-4xl"}`}>

          {/* ── Daily Promise Banner ── */}
          {!zenMode && dailyPromise && (
            <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}
              className="w-full flex justify-center mb-8 relative z-20">
              <div className="relative bg-white border border-[var(--accent)]/30 px-8 py-4 rounded-2xl flex items-center gap-5 shadow-[0_0_30px_rgba(99,102,241,0.15)] backdrop-blur-2xl overflow-hidden">
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--accent)]/60 to-transparent" />
                <div className="w-10 h-10 rounded-full bg-[#6366F1]/15 border border-[var(--accent)]/30 flex items-center justify-center">
                  <Target className="w-5 h-5 text-[var(--accent)]" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] font-black uppercase tracking-[0.35em] text-[var(--accent)] mb-0.5">Daily Promise 🎯</span>
                  <span className={`text-base font-extrabold text-[#0F172A] ${dailyPromise.completedAt ? "line-through opacity-40" : ""}`}>{dailyPromise.title}</span>
                </div>
                {!dailyPromise.completedAt && (
                  <button onClick={() => fetch("/api/meet-addon/today-task", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ markComplete: true, taskId: dailyPromise.id }) }).then(() => fetchTasks())}
                    className="ml-4 w-10 h-10 shrink-0 rounded-full border border-[var(--accent)]/40 bg-[#6366F1]/10 flex items-center justify-center text-[var(--accent)] hover:bg-[#6366F1] hover:text-white transition-all hover:scale-110">
                    <Check className="w-5 h-5" strokeWidth={3} />
                  </button>
                )}
              </div>
            </motion.div>
          )}

          {/* ── Trial Banner ── */}
          {!zenMode && planAccess?.state === "trial" && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
              className="w-full flex justify-center mb-3">
              <div className="flex items-center justify-between gap-4 px-5 py-2.5 rounded-xl bg-amber-50 border border-amber-200 w-full max-w-md">
                <span className="text-xs font-semibold text-amber-700">
                  ⚠️ Free trial —{" "}
                  <strong>{planAccess.daysLeft} days left.</strong>
                </span>
                <a href="/pricing" target="_blank" rel="noopener noreferrer"
                  className="text-[10px] font-black uppercase tracking-wider text-white px-3 py-1.5 rounded-lg shrink-0"
                  style={{ background: "linear-gradient(135deg, #F59E0B, #D97706)" }}>
                  Get a Plan →
                </a>
              </div>
            </motion.div>
          )}

          {/* ── Clock ── */}
          {!zenMode && <LiveClock />}

          {/* ── Slot Indicator ── */}
          {!zenMode && (
            <div className="w-full flex justify-center mb-5">
              {slotResolving ? (
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#EEF2FF] border border-[#C7D2FE] text-xs text-[#475569] font-semibold">
                  <Loader2 className="w-3 h-3 animate-spin" /> Detecting slot...
                </div>
              ) : resolvedSlot ? (
                <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-emerald-500/[0.08] border border-emerald-500/20">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold text-emerald-400 truncate">{resolvedSlot.slotName}</span>
                    {resolvedSlot.timeLabel && <span className="text-[9px] text-emerald-400/50">{resolvedSlot.timeLabel}</span>}
                  </div>
                  <span className="text-sm font-extrabold text-emerald-300 tabular-nums ml-2">{formatDuration(slotTodaySeconds + slotLiveSeconds)}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#EEF2FF] border border-[#C7D2FE]">
                  <span className="w-2 h-2 rounded-full bg-[#C7D2FE]" />
                  <span className="text-xs font-semibold text-[#475569]">No slot detected</span>
                </div>
              )}
            </div>
          )}

          {/* ── PiP Button ── */}
          {!zenMode && (
            <div className="w-full flex justify-center mb-7">
              <video ref={videoRef} playsInline muted className="w-0 h-0 opacity-0 absolute pointer-events-none" />
              <button onClick={startPiPMonitor}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-[var(--accent)] border border-[var(--accent)]/25 hover:bg-[#6366F1] hover:text-white transition-all font-bold uppercase tracking-widest text-[11px] shadow-[0_4px_20px_rgba(0,0,0,0.3)] hover:-translate-y-0.5">
                <MonitorPlay className="w-4 h-4" /> Floating Lecture Monitor
              </button>
            </div>
          )}

          {/* ── Main Widgets ── */}
          <div className={`w-full flex flex-col md:flex-row gap-5 items-start justify-center ${zenMode ? "flex-col items-center max-w-sm" : ""}`}>

            {/* Task Widget */}
            {!zenMode && (
              <section className="flex-1 w-full flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <button onClick={() => setShowTaskForm(!showTaskForm)}
                    className="flex items-center gap-2 rounded-xl bg-[#F8FAFF] border border-[#C7D2FE] hover:border-[var(--accent)]/40 hover:bg-[#6366F1]/[0.08] transition-all py-2 px-4">
                    <Plus className={`w-4 h-4 text-[var(--accent)] transition-transform duration-200 ${showTaskForm ? "rotate-45" : ""}`} />
                    <span className="text-[11px] font-black tracking-widest uppercase text-[#0F172A]">Tasks</span>
                  </button>
                  <span className="text-xs font-semibold text-[#475569]">{tasks.filter(t => !t.completedAt).length} remaining</span>
                </div>

                <div className="rounded-2xl border border-[#C7D2FE] bg-white p-4 shadow-[0_4px_16px_rgba(99,102,241,0.08)] flex flex-col gap-2 min-h-[320px]">
                  <AnimatePresence>
                    {showTaskForm && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                        className="mb-2 shrink-0 bg-white border border-[#C7D2FE] rounded-xl p-4 space-y-3 relative overflow-hidden">
                        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[var(--accent)]/50 to-transparent" />
                        <input autoFocus type="text" value={taskTitle} onChange={e => setTaskTitle(e.target.value)}
                          placeholder="Task title..."
                          onKeyDown={e => { if (e.key === "Enter" && taskTitle.trim()) handleCreateTask(); }}
                          className="w-full bg-transparent border-b border-[#C7D2FE] text-[#0F172A] px-2 py-2 text-sm font-bold focus:outline-none focus:border-[#6366F1] transition-colors placeholder:text-[#94A3B8]" />
                        <textarea value={taskDesc} onChange={e => setTaskDesc(e.target.value)} placeholder="Notes..." rows={2}
                          className="w-full bg-transparent border-b border-[#C7D2FE] text-[#334155] px-2 py-1.5 text-xs resize-none focus:outline-none focus:border-[#6366F1] transition-colors placeholder:text-[#94A3B8] scrollbar-hide" />
                        <div className="flex items-center justify-between pt-1 gap-2">
                          <select value={taskPriority} onChange={e => setTaskPriority(e.target.value)}
                            className="bg-white border border-[#C7D2FE] rounded-lg text-[#334155] pl-3 pr-6 py-1.5 text-[10px] font-bold uppercase tracking-widest focus:outline-none focus:border-[#6366F1] appearance-none cursor-pointer">
                            <option value="high">High</option>
                            <option value="medium">Medium</option>
                            <option value="normal">Normal</option>
                          </select>
                          <div className="flex items-center gap-2">
                            <button onClick={() => { setTaskTitle(""); setTaskDesc(""); setTaskPriority("medium"); setEditingTaskId(null); setShowTaskForm(false); }}
                              className="px-3 py-1.5 text-[10px] font-bold text-[#64748B] hover:text-[#0F172A] transition-colors uppercase tracking-widest">Cancel</button>
                            <button onClick={handleCreateTask} disabled={!taskTitle.trim()}
                              className="px-4 py-2 rounded-lg bg-[#6366F1] text-white text-[10px] font-black uppercase tracking-widest hover:bg-[#4F46E5] transition-all disabled:opacity-30 flex items-center gap-1.5 shadow-[0_4px_12px_rgba(99,102,241,0.3)]">
                              <CheckCircle className="w-3.5 h-3.5" /> Save
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="flex-1 overflow-y-auto space-y-2 scrollbar-hide pr-0.5 mt-1">
                    {tasksLoading && tasks.length === 0 ? (
                      <div className="h-full flex items-center justify-center"><Loader2 className="w-5 h-5 text-[#6366F1] animate-spin" /></div>
                    ) : tasks.filter(t => t.priority !== 0).length === 0 && !showTaskForm ? (
                      <div className="h-full flex flex-col items-center justify-center text-center opacity-60 gap-2">
                        <CheckCircle className="w-8 h-8 text-[#C7D2FE]" />
                        <p className="text-xs text-[#475569] uppercase tracking-widest font-bold">No tasks yet</p>
                      </div>
                    ) : (
                      tasks.filter(t => t.priority !== 0).map((task, idx) => (
                        <motion.div key={task.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.04 }}
                          className={`rounded-xl border border-[#C7D2FE] bg-white transition-all ${task.completedAt ? "opacity-35 grayscale" : ""}`}>
                          {/* Task row */}
                          <div className="group flex items-start gap-3 p-3">
                            <button onClick={() => !task.completedAt && handleCompleteTask(task.id)} disabled={!!task.completedAt}
                              className={`mt-0.5 shrink-0 w-5 h-5 rounded-full border flex items-center justify-center transition-all ${task.completedAt ? "bg-[#6366F1] border-transparent text-white scale-110" : "border-[#C7D2FE] hover:border-[var(--accent)] text-transparent cursor-pointer"}`}>
                              <CheckCircle className="w-3.5 h-3.5" />
                            </button>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-semibold truncate ${task.completedAt ? "line-through text-[#94A3B8]" : "text-[#0F172A] group-hover:text-[#6366F1]"}`}>{task.title}</p>
                              {task.description && <p className="text-[11px] text-[#94A3B8] truncate mt-0.5">{task.description}</p>}
                              {/* Subtask counter */}
                              {(task.subtasks?.length ?? 0) > 0 && (
                                <p className="text-[9px] text-[#94A3B8] mt-0.5">
                                  {task.subtasks.filter(s => s.completedAt).length}/{task.subtasks.length} subtasks
                                </p>
                              )}
                            </div>
                            <div className="shrink-0 flex items-center gap-1.5">
                              {task.priority === 1 && <span className="text-[9px] font-black text-rose-400 bg-rose-400/10 px-2 py-0.5 rounded-md border border-rose-500/20 uppercase opacity-0 group-hover:opacity-100 transition-opacity">High</span>}
                              {/* Expand subtasks */}
                              <button
                                onClick={() => setExpandedTaskId(expandedTaskId === task.id ? null : task.id)}
                                className="w-7 h-7 flex items-center justify-center text-[#94A3B8] hover:text-[#6366F1] hover:bg-[#EEF2FF] rounded-lg transition-colors text-[10px] font-black"
                                title="Subtasks"
                              >
                                {expandedTaskId === task.id ? "▲" : "▼"}
                              </button>
                              {!task.completedAt && (
                                <button onClick={() => { setEditingTaskId(task.id); setTaskTitle(task.title); setTaskDesc(task.description || ""); setTaskPriority(task.priority === 1 ? "high" : task.priority === 3 ? "normal" : "medium"); setShowTaskForm(true); }}
                                  className="w-7 h-7 flex items-center justify-center text-[#94A3B8] hover:text-[#6366F1] hover:bg-[#EEF2FF] rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Subtasks panel */}
                          {expandedTaskId === task.id && (
                            <div className="border-t border-[#EEF2FF] px-3 pb-3 pt-2 space-y-1.5">
                              {(task.subtasks ?? []).map(sub => (
                                <div key={sub.id} className="flex items-center gap-2">
                                  <button onClick={() => handleToggleSubtask(task.id, sub.id)}
                                    className={`shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-all ${sub.completedAt ? "bg-emerald-500 border-emerald-500 text-white" : "border-[#C7D2FE] hover:border-[#6366F1]"}`}>
                                    {sub.completedAt && <span className="text-[8px] font-black">✓</span>}
                                  </button>
                                  <span className={`text-[11px] flex-1 ${sub.completedAt ? "line-through text-[#94A3B8]" : "text-[#334155]"}`}>{sub.title}</span>
                                </div>
                              ))}
                              {/* Add subtask input */}
                              {(task.subtasks?.length ?? 0) < 10 && (
                                <div className="flex items-center gap-1.5 mt-2">
                                  <input
                                    type="text"
                                    value={subtaskInputs[task.id] ?? ""}
                                    onChange={e => setSubtaskInputs(prev => ({ ...prev, [task.id]: e.target.value }))}
                                    onKeyDown={e => { if (e.key === "Enter") handleAddSubtask(task.id); }}
                                    placeholder="Add subtask..."
                                    className="flex-1 bg-[#F8FAFF] border border-[#C7D2FE] rounded-lg px-2 py-1 text-[11px] focus:outline-none focus:border-[#6366F1]"
                                  />
                                  <button onClick={() => handleAddSubtask(task.id)}
                                    className="w-6 h-6 rounded-lg bg-[#6366F1] text-white flex items-center justify-center text-[10px] hover:bg-[#4F46E5] transition-colors">
                                    +
                                  </button>
                                </div>
                              )}
                              {(task.subtasks?.length ?? 0) >= 10 && (
                                <p className="text-[9px] text-[#94A3B8] text-center py-1">Max 10 subtasks reached</p>
                              )}
                            </div>
                          )}
                        </motion.div>
                      ))
                    )}
                  </div>
                </div>
              </section>
            )}

            {/* Timer Widget */}
            <section className={`flex-1 w-full relative rounded-2xl border border-[#C7D2FE] ${zenMode ? "bg-white/90" : "bg-white"} backdrop-blur-xl pt-12 px-7 pb-7 flex flex-col items-center justify-center min-h-[360px] transition-all duration-500 overflow-hidden`}>
              {/* Mode tabs */}
              <div className="flex border-b border-[#C7D2FE] w-full absolute top-0 inset-x-0 bg-black/20 text-[10px] uppercase font-black tracking-widest z-20">
                <button onClick={() => handleSetTimerMode("focus")}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-3 transition-colors ${timerMode === "focus" ? "bg-[#6366F1]/10 text-[var(--accent)] shadow-[inset_0_-2px_0_var(--accent)]" : "text-[#94A3B8] hover:bg-white"}`}>
                  <Flame className="w-3.5 h-3.5" /> Deep Work
                </button>
                <button onClick={() => handleSetTimerMode("break")}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-3 transition-colors ${timerMode === "break" ? "bg-blue-400/10 text-blue-400 shadow-[inset_0_-2px_0_rgba(96,165,250)]" : "text-[#94A3B8] hover:bg-white"}`}>
                  <Coffee className="w-3.5 h-3.5" /> Rest
                </button>
              </div>

              {/* Running glow */}
              {isRunning && (
                <div className={`absolute inset-0 rounded-2xl pointer-events-none bg-[radial-gradient(circle_at_50%_50%,_${timerMode === "focus" ? "rgba(99,102,241,0.12)" : "rgba(96,165,250,0.12)"}_0%,_transparent_70%)] animate-pulse`} />
              )}

              <div className="flex justify-between w-full items-center mb-5 relative z-10">
                <h2 className={`text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-1.5 ${timerMode === "focus" ? "text-[#475569]" : "text-blue-500"}`}>
                  <Clock className={`w-3.5 h-3.5 ${timerMode === "focus" ? "text-[var(--accent)]/70" : "text-blue-400/70"}`} /> Focus Engine
                </h2>
                {isRunning && (
                  <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border animate-pulse ${timerMode === "focus" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/25" : "bg-blue-500/10 text-blue-400 border-blue-500/25"}`}>
                    ● Live
                  </span>
                )}
              </div>

              {/* Time display */}
              <div className="text-center py-5 mb-3 relative z-10">
                <span className={`text-[5.5rem] sm:text-[6.5rem] leading-none font-mono font-black tracking-widest tabular-nums transition-all duration-300 ${isRunning ? (timerMode === "focus" ? "text-[var(--accent)] drop-shadow-[0_0_40px_rgba(99,102,241,0.5)]" : "text-blue-400 drop-shadow-[0_0_40px_rgba(96,165,250,0.5)]") : "text-[#0F172A]"}`}>
                  {formatTime(timeLeft)}
                </span>
              </div>

              {/* Duration presets */}
              <div className="min-h-[3rem] mb-7 flex flex-col justify-center items-center gap-3 relative z-10 w-full">
                {(!isRunning && timeLeft === timerDuration) ? (
                  <div className="flex flex-wrap justify-center items-center gap-2 w-full">
                    {(timerMode === "focus" ? [15, 25, 45, 60] : [5, 10, 15, 30]).map(mins => (
                      <button key={mins} onClick={() => setDuration(mins)}
                        className={`px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${timerDuration === mins * 60 ? (timerMode === "focus" ? "bg-[#6366F1] text-white border-[var(--accent)] shadow-[0_4px_16px_rgba(99,102,241,0.4)] scale-105" : "bg-blue-400 text-black border-blue-400 scale-105") : "bg-white border-[#C7D2FE] text-[#475569] hover:text-[#6366F1] hover:border-[#6366F1]"}`}>
                        {mins}m
                      </button>
                    ))}
                    <div className="flex items-center gap-1">
                      <button onClick={() => { const c = Math.floor(timerDuration / 60); if (c > 1) setDuration(c - 1); }}
                        className="w-7 h-7 rounded-lg bg-white border border-[#C7D2FE] text-[#64748B] hover:text-[#6366F1] hover:bg-[#EEF2FF] hover:border-[#C7D2FE] text-sm font-bold transition-all flex items-center justify-center">−</button>
                      <div className={`flex items-center bg-white border rounded-xl transition-all ${timerMode === "focus" ? "focus-within:border-[var(--accent)]/40" : "focus-within:border-blue-400/40"} border-[#C7D2FE]`}>
                        <input type="number" min="1" max="999" value={Math.floor(timerDuration / 60)}
                          onChange={e => { const v = parseInt(e.target.value); if (!isNaN(v) && v >= 1 && v <= 999) setDuration(v); }}
                          className="w-12 bg-transparent text-center text-[11px] font-bold text-[#334155] py-2 focus:outline-none appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                        <span className="text-[9px] font-black text-[#64748B] pr-2 select-none uppercase">m</span>
                      </div>
                      <button onClick={() => { const c = Math.floor(timerDuration / 60); if (c < 999) setDuration(c + 1); }}
                        className="w-7 h-7 rounded-lg bg-white border border-[#C7D2FE] text-[#64748B] hover:text-[#6366F1] hover:bg-[#EEF2FF] hover:border-[#C7D2FE] text-sm font-bold transition-all flex items-center justify-center">+</button>
                    </div>
                  </div>
                ) : (
                  <p className={`text-[10px] font-bold tracking-[0.2em] uppercase ${timerMode === "focus" ? "text-[#94A3B8]" : "text-blue-300/50"}`}>
                    {timerMode === "focus" ? "Deep work active" : "Brain break"}
                  </p>
                )}
              </div>

              {/* Controls */}
              <div className="flex w-full gap-3 relative z-10">
                <button onClick={toggleTimer}
                  className={`flex-1 rounded-xl py-4 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-xl ${isRunning ? "bg-rose-500/15 text-rose-400 border border-rose-500/25 hover:bg-rose-500/25" : (timerMode === "focus" ? "bg-[#6366F1] text-white hover:bg-[#4F46E5] shadow-[0_4px_20px_rgba(99,102,241,0.4)] hover:shadow-[0_8px_28px_rgba(99,102,241,0.5)] hover:scale-[1.02]" : "bg-blue-400 text-black hover:scale-[1.02] shadow-[0_4px_20px_rgba(96,165,250,0.35)]")}`}>
                  {isRunning ? <><X className="w-4 h-4" />Pause</> : (timerMode === "focus" ? <><Flame className="w-4 h-4" />Start Focus</> : <><Coffee className="w-4 h-4" />Start Break</>)}
                </button>
                <button onClick={resetTimer}
                  className="w-14 shrink-0 rounded-xl bg-white border border-[#C7D2FE] hover:bg-[#EEF2FF] hover:border-[#6366F1] transition-all text-[#64748B] hover:text-[#6366F1] flex items-center justify-center">
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>

              {/* Focus Tree */}
              <div className="w-full mt-5 border-t border-[#C7D2FE] pt-5 relative z-10 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-[var(--accent)]/80">Focus Tree</span>
                    <span className="text-lg">{totalPoints < 100 ? "🌱" : totalPoints < 200 ? "🌿" : totalPoints < 300 ? "🪴" : totalPoints < 400 ? "🎍" : "🌳"}</span>
                  </div>
                  <span className="text-[9px] font-black bg-[#6366F1]/10 text-[var(--accent)] px-2 py-0.5 rounded-md uppercase tracking-widest">Lvl {Math.floor(totalPoints / 100) + 1}</span>
                </div>
                <div className="w-full bg-black/30 rounded-full h-1.5 overflow-hidden border border-[#C7D2FE]">
                  <div className="h-full bg-gradient-to-r from-emerald-500 to-[var(--accent)] transition-all duration-1000 shadow-[0_0_8px_rgba(99,102,241,0.7)]"
                    style={{ width: `${totalPoints % 100}%` }} />
                </div>
                <div className="flex justify-between">
                  <span className="text-[9px] text-[#CBD5E1] font-bold uppercase">{totalPoints} coins</span>
                  <span className="text-[9px] text-[#CBD5E1] font-bold uppercase">{100 - (totalPoints % 100)} to next</span>
                </div>
              </div>

              {/* Hydration */}
              <div className="w-full mt-4 flex items-center justify-between border-t border-[#C7D2FE] pt-4 relative z-10">
                <div className="flex items-center gap-1.5 text-[#94A3B8]">
                  <Droplets className="w-4 h-4 text-blue-400/70" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Hydration</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex gap-0.5">
                    {[...Array(8)].map((_, i) => (
                      <div key={i} className={`w-2 h-4 rounded-full transition-all duration-300 ${i < waterGlasses ? "bg-blue-400 shadow-[0_0_6px_rgba(96,165,250,0.5)]" : "bg-white/[0.08]"}`} />
                    ))}
                  </div>
                  <button onClick={() => setWaterGlasses(prev => prev >= 8 ? 0 : prev + 1)}
                    className="w-8 h-8 rounded-full border border-blue-400/25 bg-blue-400/10 text-blue-400 flex items-center justify-center hover:bg-blue-400/20 transition-colors">
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </section>
          </div>

          {/* ── StudyMate AI Section ── */}
          {!zenMode && (
            <motion.section
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full mt-5 bg-white border border-[#C7D2FE] rounded-2xl overflow-hidden shadow-[0_4px_16px_rgba(99,102,241,0.08)]"
            >
              {/* Header */}
              <div
                className="flex items-center justify-between px-5 py-4 border-b border-[#C7D2FE]"
                style={{ background: "linear-gradient(135deg, #EEF2FF 0%, #F5F3FF 100%)" }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-[0_2px_8px_rgba(99,102,241,0.25)]"
                    style={{ background: "linear-gradient(135deg, #6366F1, #8B5CF6)" }}>
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-[#0F172A]">StudyMate AI</p>
                    <p className="text-[10px] text-[#94A3B8]">Doubt, plan, motivation — all here</p>
                  </div>
                </div>
                <button
                  onClick={() => setChatOpen(true)}
                  className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-white transition-all hover:opacity-90 shadow-[0_2px_10px_rgba(99,102,241,0.35)]"
                  style={{ background: "linear-gradient(135deg, #6366F1, #8B5CF6)" }}
                >
                  Open Chat →
                </button>
              </div>

              {/* Quick prompts */}
              <div className="px-5 py-4 flex flex-wrap gap-2">
                {[
                  { emoji: "📅", label: "Study Plan", prompt: "Create a study plan for today" },
                  { emoji: "🎯", label: "Motivation", prompt: "I need some motivation" },
                  { emoji: "⚡", label: "Shortcut Trick", prompt: "Share a shortcut trick" },
                  { emoji: "📖", label: "Revision Plan", prompt: "Tomorrow's revision plan" },
                  { emoji: "😰", label: "Feeling Stressed", prompt: "I'm very stressed, please help" },
                  { emoji: "📊", label: "Weak Topic", prompt: "Help me fix my weak topic" },
                ].map(({ emoji, label, prompt }) => (
                  <button
                    key={prompt}
                    onClick={() => { setPendingPrompt(prompt); setChatOpen(true); }}
                    className="flex items-center gap-1.5 rounded-full border border-[#C7D2FE] bg-[#F8FAFF] px-3 py-1.5 text-[11px] font-semibold text-[#475569] hover:border-[#6366F1]/50 hover:bg-[#EEF2FF] hover:text-[#6366F1] transition-all"
                  >
                    <span>{emoji}</span> {label}
                  </button>
                ))}
              </div>
            </motion.section>
          )}

          {/* ── Brain Dump ── */}
          {!zenMode && (
            <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              className="w-full mt-5 bg-white border border-[#C7D2FE] rounded-2xl p-6 backdrop-blur-xl flex flex-col gap-4 group relative overflow-hidden">
              <div className="absolute inset-0 rounded-2xl pointer-events-none opacity-0 group-focus-within:opacity-100 transition-opacity bg-[radial-gradient(circle_at_50%_0%,_rgba(99,102,241,0.04)_0%,_transparent_60%)]" />
              <div className="flex items-start justify-between relative z-10">
                <div>
                  <h2 className="text-sm font-black uppercase tracking-[0.18em] text-[#0F172A] flex items-center gap-2 mb-1">
                    <BrainCircuit className="w-4 h-4 text-[var(--accent)]/80" /> Brain Dump Pad
                  </h2>
                  <p className="text-[11px] text-[#94A3B8] max-w-xs leading-relaxed">Got distracted? Dump thoughts here to stay focused on your current task.</p>
                </div>
                {brainDumps.length > 0 && (
                  <button onClick={() => setShowDumps(!showDumps)}
                    className="text-[9px] font-black uppercase tracking-widest text-[var(--accent)]/70 hover:text-[var(--accent)] transition-colors bg-[#6366F1]/[0.06] px-3 py-1.5 rounded-lg border border-[var(--accent)]/15 shrink-0">
                    {showDumps ? "Hide" : `${brainDumps.length} thoughts`}
                  </button>
                )}
              </div>

              <div className="flex flex-col gap-2.5 relative z-10">
                <input type="text" value={dumpTitle} onChange={e => setDumpTitle(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleAddBrainDump(); } }}
                  placeholder="Title (optional)"
                  className="w-full bg-[#F8FAFF] border border-[#C7D2FE] rounded-xl text-xs font-bold text-[#0F172A] px-4 py-2.5 focus:outline-none focus:border-[#6366F1] transition-all placeholder:text-[#94A3B8]" />
                <textarea value={dumpInput} onChange={e => setDumpInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAddBrainDump(); } }}
                  placeholder="Dump your thought here..."
                  className="w-full h-16 bg-white border border-[#C7D2FE] rounded-xl resize-none text-xs text-[#334155] p-3 focus:outline-none focus:border-[var(--accent)]/30 transition-all placeholder:text-[#CBD5E1] scrollbar-hide" />
                <div className="flex justify-between items-center px-0.5">
                  <span className="text-[9px] text-[#CBD5E1] uppercase font-bold tracking-wider">Enter to save</span>
                  <button onClick={handleAddBrainDump} disabled={!dumpInput.trim() && !dumpTitle.trim()}
                    className="px-4 py-2 bg-[#6366F1]/10 text-[var(--accent)] border border-[var(--accent)]/20 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-[#6366F1] hover:text-white transition-all flex items-center gap-1.5 disabled:opacity-30">
                    Save <Send className="w-3 h-3" />
                  </button>
                </div>
              </div>

              <AnimatePresence>
                {showDumps && brainDumps.length > 0 && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden border-t border-[#C7D2FE] pt-4 relative z-10">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[9px] text-[#94A3B8] font-black uppercase tracking-widest">Workspace Memory</span>
                      <button onClick={() => setBrainDumps([])}
                        className="text-[9px] text-rose-500/70 hover:text-rose-400 flex items-center gap-1 font-bold uppercase tracking-wider bg-rose-500/[0.08] px-2.5 py-1 rounded-lg">
                        <Trash2 className="w-3 h-3" /> Clear All
                      </button>
                    </div>
                    <div className="flex flex-col gap-2 max-h-52 overflow-y-auto scrollbar-hide">
                      {brainDumps.map((d, i) => (
                        <motion.div key={d.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                          className="text-xs text-[#64748B] bg-white border border-[#C7D2FE] p-3.5 rounded-xl flex items-start justify-between group/d hover:bg-[#F8FAFF] transition-all">
                          <div className="flex flex-col gap-0.5 pr-3 w-full">
                            {d.title && <span className="font-bold text-[#0F172A] text-sm">{d.title}</span>}
                            {d.text && <span className="whitespace-pre-wrap opacity-70">{d.text}</span>}
                          </div>
                          <button onClick={() => setBrainDumps(prev => prev.filter(x => x.id !== d.id))}
                            className="shrink-0 text-[#CBD5E1] opacity-0 group-hover/d:opacity-100 hover:text-rose-400 transition-all p-1.5 bg-black/30 rounded-lg">
                            <X className="w-3 h-3" />
                          </button>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.section>
          )}

        </motion.div>
      </AnimatePresence>
    </div>
  );
}
