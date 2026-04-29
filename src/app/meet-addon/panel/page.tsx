"use client";

import { useState, useEffect, useRef } from "react";
import { Plus, CheckCircle, Clock, Flame, X, RotateCcw, CalendarClock, Loader2, ClipboardList, LogOut, Pencil, MonitorPlay, Droplets, Maximize2, Minimize2, Coffee, BrainCircuit, Trash2, Send, Target, Check, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// --- GLOBALS ---
const TOKEN_KEY = "vl_meet_addon_token";
const TIMER_STORAGE_KEY = "vl_meet_timer_state";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

function saveToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

// --- WIDGETS ---
function LiveClock() {
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState(new Date());
  
  useEffect(() => {
    setMounted(true);
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!mounted) {
     return (
        <div className="flex flex-col items-center justify-center text-center opacity-0 h-[80px]">
           <span className="text-3xl md:text-4xl font-mono font-extrabold tracking-widest text-[var(--cream)]">--:--:--</span>
        </div>
     );
  }

  const timeString = now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const dateString = now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  return (
    <div className="flex flex-col items-center justify-center text-center animate-in fade-in duration-500 mb-8 bg-[var(--ink)]/40 border border-[var(--wood)]/20 p-4 rounded-[1.5rem] shadow-[0_8px_32px_rgba(0,0,0,0.3)] backdrop-blur-md self-center w-full max-w-md">
       <span className="text-3xl md:text-4xl font-mono font-extrabold tracking-widest text-[var(--cream)] drop-shadow-[0_0_12px_rgba(154,130,100,0.4)]">
         {timeString}
       </span>
       <span className="text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] text-[var(--wood)] mt-2 flex items-center justify-center gap-2">
         <CalendarClock className="w-3.5 h-3.5 text-[var(--accent)]" />
         {dateString}
       </span>
    </div>
  );
}

export default function MeetAddonPanelPage() {
  const videoRef = useRef<HTMLVideoElement>(null);

  const startPiPMonitor = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: "browser" },
        audio: false
      });

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        // Wait for video to load metadata/start playing before PiP
        await videoRef.current.play();
        
        mediaStream.getVideoTracks()[0].onended = () => {
           if (document.pictureInPictureElement) {
              document.exitPictureInPicture().catch(console.error);
           }
        };

        await videoRef.current.requestPictureInPicture();
      }
    } catch (err) {
      console.error("PiP Screen capture failed:", err);
      alert("Floating Monitor requires screen share permissions.");
    }
  };

  // --- STATE: AUTH ---
  const [token, setTokenState] = useState<string | null>(null);
  const [authTab, setAuthTab] = useState<"code" | "email">("code");
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  
  const [linkCode, setLinkCode] = useState("");
  const [linkCodeError, setLinkCodeError] = useState("");
  const [linkCodeLoading, setLinkCodeLoading] = useState(false);

  // --- STATE: TASKS ---
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [taskPriority, setTaskPriority] = useState("medium");
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);

  // --- STATE: TIMER ---
  const [timerMode, setTimerMode] = useState<"focus" | "break">("focus");
  const [timerDuration, setTimerDuration] = useState(25 * 60); // Default 25 minutes
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);

  // --- NEW FEATURES: ZEN MODE & HYDRATION ---
  const [zenMode, setZenMode] = useState(false);
  const [waterGlasses, setWaterGlasses] = useState(0);

  // --- NEW FEATURES: BRAIN DUMP ---
  const [brainDumps, setBrainDumps] = useState<{id: string, title?: string, text: string}[]>([]);
  const [dumpTitle, setDumpTitle] = useState("");
  const [dumpInput, setDumpInput] = useState("");
  const [showDumps, setShowDumps] = useState(false);

  // --- GOOGLE MEET SDK INITIALIZATION ---
  useEffect(() => {
    let sessionCreated = false;
    async function initMeetAddon() {
      // Check if we are actually running inside Google Meet's iframe by checking for the SDK param
      if (typeof window !== "undefined" && !window.location.search.includes("meet_sdk")) {
        console.info("Running outside of Google Meet. SDK initialization skipped.");
        return;
      }

      try {
        const { meet } = await import("@googleworkspace/meet-addons/meet.addons");
        if (!sessionCreated) {
           sessionCreated = true;
           await meet.addon.createAddonSession({
             cloudProjectNumber: "273461550329",
           });
           console.log("Successfully handshaked with Google Meet!");
        }
      } catch (err) {
        console.error("Failed to initialize Meet Addon SDK:", err);
      }
    }
    initMeetAddon();
  }, []);

  // Load Token and Timer State on mount
  useEffect(() => {
    setTokenState(getToken());
    
    // Recover Timer
    const saved = localStorage.getItem(TIMER_STORAGE_KEY);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (data.isRunning && data.endTime) {
          const remaining = Math.max(0, Math.floor((data.endTime - Date.now()) / 1000));
          setTimerDuration(data.duration || 25 * 60);
          if (remaining > 0) {
            setTimeLeft(remaining);
            setIsRunning(true);
          } else {
            setTimeLeft(data.duration || 25 * 60);
            setIsRunning(false);
          }
        } else {
          setTimerDuration(data.duration || 25 * 60);
          setTimeLeft(data.pausedTimeLeft ?? data.duration ?? (25 * 60));
          setIsRunning(false);
        }
      } catch (e) {
        console.error("Timer corrupt", e);
      }
    }
  }, []);

  // --- ACTIONS: AUTH ---
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginError("");

    // Gmail-only validation
    if (!email.toLowerCase().endsWith("@gmail.com")) {
      setLoginError("Only @gmail.com emails are allowed");
      return;
    }

    setLoginLoading(true);
    try {
      const res = await fetch("/api/meet-addon/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (res.ok && data.token) {
        saveToken(data.token);
        setTokenState(data.token);
      } else {
        setLoginError(data.error || "Login failed");
      }
    } catch {
      setLoginError("Network connection error");
    } finally {
      setLoginLoading(false);
    }
  }

  async function handleLinkWithCode(e: React.FormEvent) {
    e.preventDefault();
    const code = linkCode.replace(/\D/g, "").slice(0, 6);
    if (code.length !== 6) return setLinkCodeError("Enter 6 digits");
    setLinkCodeError("");
    setLinkCodeLoading(true);
    try {
      const res = await fetch("/api/meet-addon/link-with-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (res.ok && data.token) {
        saveToken(data.token);
        setTokenState(data.token);
      } else {
        setLinkCodeError(data.error || "Invalid link code");
      }
    } catch {
      setLinkCodeError("Network connection error");
    } finally {
      setLinkCodeLoading(false);
    }
  }

  function handleLogout() {
    clearToken();
    setTokenState(null);
  }

  // --- REAL-TIME DATA FETCHING ---
  const [tasks, setTasks] = useState<{ id: string, title: string, description: string | null, priority: number, completedAt: string | null }[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [totalPoints, setTotalPoints] = useState(0);

  const fetchTasks = async () => {
    if (!token) return;
    try {
      const res = await fetch("/api/meet-addon/today-task", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks || []);
        if (data.totalPoints !== undefined) setTotalPoints(data.totalPoints);
      } else if (res.status === 401) {
        handleLogout();
      }
    } catch (e) { console.error(e); }
    finally { setTasksLoading(false); }
  };

  useEffect(() => {
    if (token) fetchTasks();
  }, [token]);

  // --- REAL-TIME POLLS RADAR ---
  const [activePolls, setActivePolls] = useState<any[]>([]);
  const [pollSubmitting, setPollSubmitting] = useState(false);
  const [pollSeconds, setPollSeconds] = useState(0);

  const fetchPolls = async () => {
    if (!token) return;
    try {
      const res = await fetch("/api/meet-addon/polls", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const unanswered = data.filter((p: any) => !p.alreadyAnswered);
        setActivePolls(unanswered);
      }
    } catch {}
  };

  useEffect(() => {
    if (!token) return;
    fetchPolls();
    const intervalId = setInterval(fetchPolls, 10000); // 10 second sweep
    return () => clearInterval(intervalId);
  }, [token]);

  const currentPoll = activePolls[0] || null;

  useEffect(() => {
    if (!currentPoll?.expiresAt) return;
    const target = new Date(currentPoll.expiresAt).getTime();
    
    const tick = () => {
      const left = Math.max(0, Math.floor((target - Date.now()) / 1000));
      setPollSeconds(left);
      if (left === 0) fetchPolls(); // Poll expired! Resync.
    };
    
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
        body: JSON.stringify({ pollId, answer })
      });
      if (res.ok) {
        setActivePolls(prev => prev.filter(p => p.id !== pollId));
      }
    } finally {
      setPollSubmitting(false);
    }
  };

  // --- DAILY PROMISE LOGIC ---
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
         body: JSON.stringify({ title: promiseInput, priority: 0 })
      });
      if (res.ok) fetchTasks();
    } finally {
       setPromiseLoading(false);
    }
  };

  // --- LIVE BUDDY STATUS SYNC ---
  useEffect(() => {
    if (!token) return;
    const sendStatus = (override?: string) => {
       const status = override || (isRunning 
          ? (timerMode === "focus" ? "🟢 In Deep Focus" : "☕ Taking a Break") 
          : "Offline");
       
       fetch("/api/user/live-status", {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ status })
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
    
    // Check if we are editing an existing task
    if (editingTaskId) {
      const targetId = editingTaskId;
      // Optimistic Update
      setTasks(prev => prev.map(t => t.id === targetId ? { ...t, title: taskTitle, description: taskDesc || null, priority: p } : t).sort((a, b) => a.priority - b.priority));
      
      setEditingTaskId(null);
      setTaskTitle(""); setTaskDesc(""); setTaskPriority("medium");

      try {
        const res = await fetch("/api/meet-addon/today-task", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ taskId: targetId, title: taskTitle, description: taskDesc, priority: p })
        });
        if (res.status === 401) {
           handleLogout();
           return;
        }
        if (!res.ok) {
          console.error(`Task Edit Failed: ${res.status} ${res.statusText}`);
          fetchTasks(); // rollback if error
        }
      } catch (err) {
        console.error("Network Error on Edit Task:", err);
        fetchTasks();
      }
      return;
    }

    // Optimistic UI Update (New Task)
    const tempId = `temp-${Date.now()}`;
    const newTask = { id: tempId, title: taskTitle, description: taskDesc || null, priority: p, completedAt: null };
    setTasks(prev => [...prev, newTask].sort((a, b) => a.priority - b.priority));
    
    setTaskTitle(""); setTaskDesc(""); setTaskPriority("medium");

    try {
      const res = await fetch("/api/meet-addon/today-task", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: newTask.title, description: newTask.description, priority: newTask.priority })
      });
      if (res.ok) {
        const saved = await res.json();
        setTasks(prev => prev.map(t => t.id === tempId ? saved : t).sort((a,b) => a.priority - b.priority));
      } else if (res.status === 401) {
        handleLogout();
      } else {
        console.error(`Task Creation Failed: ${res.status} ${res.statusText}`, await res.text());
        fetchTasks(); // rollback
      }
    } catch (err) {
      console.error("Network Error on Create Task:", err);
      fetchTasks();
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    if (!token) return;
    // Optimistic Update
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, completedAt: new Date().toISOString() } : t));
    
    try {
      await fetch("/api/meet-addon/today-task", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ markComplete: true, taskId })
      });
    } catch (e) {
      console.error(e);
      fetchTasks(); // rollback if network fails
    }
  };

  // --- TIMER SAVE SYNC LOGIC ---
  const saveTimerSession = async (planned: number, completed: number, isFinished: boolean) => {
    if (!token || completed <= 0) return;
    try {
      await fetch("/api/meet-addon/pomodoro-session", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
           roomKey: "local-room",
           plannedSeconds: planned,
           completedSeconds: completed,
           completedFully: isFinished
        })
      });
    } catch(e) { console.error("Failed to sync timer", e); }
  };

  useEffect(() => {
    if (!isRunning || !token) return;
    const sendPresence = (eventType: "ping" | "end") => {
      fetch("/api/meet-addon/presence", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ event: eventType, roomKey: "local-room" })
      }).catch(console.error);
    };
    sendPresence("ping"); // initial ping
    const presenceInterval = setInterval(() => sendPresence("ping"), 60000); // ping every 1 min
    return () => {
      clearInterval(presenceInterval);
      sendPresence("end");
    };
  }, [isRunning, token]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
         const saved = localStorage.getItem(TIMER_STORAGE_KEY);
         let driftSet = false;
         if (saved) {
             try {
                 const data = JSON.parse(saved);
                 if (data.endTime) {
                     const remaining = Math.max(0, Math.floor((data.endTime - Date.now()) / 1000));
                     setTimeLeft(remaining);
                     driftSet = true;
                 }
             } catch {}
         }
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
      // User is Pausing early -> log the session chunk
      saveTimerSession(timerDuration, timerDuration - timeLeft, false);
      setTimerDuration(timeLeft); // set new max
      setIsRunning(false);
      localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify({ isRunning: false, duration: timeLeft, pausedTimeLeft: timeLeft }));
    } else {
      setIsRunning(true);
      localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify({ isRunning: true, duration: timerDuration, endTime: Date.now() + timeLeft * 1000 }));
    }
  };
  
  const resetTimer = () => {
    if (isRunning) {
       saveTimerSession(timerDuration, timerDuration - timeLeft, false);
    }
    setIsRunning(false);
    setTimeLeft(timerDuration);
    localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify({ isRunning: false, duration: timerDuration, pausedTimeLeft: timerDuration }));
  };
  
  const setDuration = (minutes: number) => {
    if (isRunning) {
       saveTimerSession(timerDuration, timerDuration - timeLeft, false);
    }
    setIsRunning(false);
    setTimerDuration(minutes * 60);
    setTimeLeft(minutes * 60);
    localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify({ isRunning: false, duration: minutes * 60, pausedTimeLeft: minutes * 60 }));
  };

  const handleSetTimerMode = (mode: "focus" | "break") => {
    if (timerMode === mode) return;
    if (isRunning) {
       saveTimerSession(timerDuration, timerDuration - timeLeft, false);
    }
    setIsRunning(false);
    setTimerMode(mode);
    const newMins = mode === "focus" ? 25 : 5;
    setTimerDuration(newMins * 60);
    setTimeLeft(newMins * 60);
    localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify({ isRunning: false, duration: newMins * 60, pausedTimeLeft: newMins * 60 }));
  };

  const handleAddBrainDump = () => {
    if (!dumpInput.trim() && !dumpTitle.trim()) return;
    setBrainDumps(prev => [{ id: Date.now().toString(), title: dumpTitle.trim() || undefined, text: dumpInput.trim() }, ...prev]);
    setDumpInput("");
    setDumpTitle("");
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // --- RENDER: LOGIN GATE ---
  if (!token) {
    return (
      <div className="min-h-[100dvh] bg-[var(--background)] text-[var(--foreground)] flex flex-col items-center justify-center p-4 relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_50%_0%,_var(--accent)_0%,_transparent_60%)] mix-blend-hard-light animate-[mesh]" />
        
        <div className="w-full max-w-sm z-10 space-y-4">
          <div className="text-center mb-6">
            <h1 className="text-lg font-extrabold flex items-center justify-center gap-1.5 tracking-widest text-[var(--cream)] uppercase">
              <ClipboardList className="w-5 h-5 text-[var(--wood)]" />
              Identify Scholar
            </h1>
          </div>

          <div className="rounded-[1.5rem] border border-[var(--wood)]/20 bg-[var(--ink)]/40 backdrop-blur-md shadow-[0_12px_40px_rgba(0,0,0,0.5)] overflow-hidden">
            <div className="flex border-b border-[var(--wood)]/10 text-[11px] uppercase tracking-widest font-bold">
              <button 
                onClick={() => setAuthTab("code")} 
                className={`flex-1 py-4 text-center transition-colors ${authTab === "code" ? "bg-[var(--accent)]/10 text-[var(--accent)] shadow-[inset_0_-2px_0_var(--accent)]" : "text-[var(--wood)] hover:bg-[var(--ink)]/40"}`}
              >
                Passcode
              </button>
              <button 
                onClick={() => setAuthTab("email")} 
                className={`flex-1 py-4 text-center transition-colors ${authTab === "email" ? "bg-[var(--accent)]/10 text-[var(--accent)] shadow-[inset_0_-2px_0_var(--accent)]" : "text-[var(--wood)] hover:bg-[var(--ink)]/40"}`}
              >
                Web Email
              </button>
            </div>

            <div className="p-6">
              {authTab === "code" ? (
                <form onSubmit={handleLinkWithCode} className="space-y-4">
                  <input
                    type="text" inputMode="numeric" pattern="[0-9]*" maxLength={6}
                    placeholder="000 000"
                    value={linkCode}
                    onChange={(e) => { setLinkCode(e.target.value.replace(/\D/g, "").slice(0, 6)); setLinkCodeError(""); }}
                    className="w-full rounded-xl border border-[var(--wood)]/30 bg-[var(--background)]/80 px-4 py-3 text-center font-mono text-2xl tracking-[0.4em] text-[var(--cream)] shadow-inner focus:border-[var(--accent)]/50 focus:outline-none transition-colors placeholder:text-[var(--wood)]/40"
                  />
                  {linkCodeError && <p className="text-red-400 text-[10px] text-center font-bold uppercase tracking-wider">{linkCodeError}</p>}
                  <button
                    type="submit"
                    disabled={linkCodeLoading || linkCode.length !== 6}
                    className="w-full rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--ink)] py-3 text-[11px] font-extrabold tracking-[0.2em] uppercase flex items-center justify-center gap-2 shadow-[0_4px_16px_rgba(154,130,100,0.3)] transition-all disabled:opacity-30 disabled:hover:scale-100 hover:scale-105"
                  >
                    {linkCodeLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Link Add-on Dashboard"}
                  </button>
                  <p className="text-[9px] text-[var(--wood)] font-medium text-center uppercase tracking-wider pt-2">From web app layout → get link code</p>
                </form>
              ) : (
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-1">
                    <input
                      type="email" placeholder="Student Email (@gmail.com)"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setLoginError("");
                      }}
                      required
                      className="w-full rounded-[1rem] border border-[var(--wood)]/20 bg-[var(--background)]/60 px-4 py-3 text-xs font-semibold text-[var(--cream)] focus:border-[var(--accent)]/50 focus:outline-none focus:bg-[var(--background)]/90 transition-colors"
                    />
                    {email && !email.toLowerCase().endsWith("@gmail.com") && (
                      <p className="text-red-400 text-[10px] font-bold px-1">
                        ⚠ Only @gmail.com emails allowed
                      </p>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Key Phrase"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full rounded-[1rem] border border-[var(--wood)]/20 bg-[var(--background)]/60 px-4 py-3 pr-11 text-xs font-semibold text-[var(--cream)] focus:border-[var(--accent)]/50 focus:outline-none focus:bg-[var(--background)]/90 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((p) => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--wood)] hover:text-[var(--cream)] transition-colors p-1"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                          <line x1="1" y1="1" x2="23" y2="23"/>
                        </svg>
                      ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                          <circle cx="12" cy="12" r="3"/>
                        </svg>
                      )}
                    </button>
                  </div>
                  {loginError && <p className="text-red-400 text-[10px] font-bold text-center uppercase tracking-wider">{loginError}</p>}
                  <button
                    type="submit"
                    disabled={loginLoading}
                    className="w-full rounded-[1rem] border border-[var(--wood)]/30 bg-[var(--ink)] hover:bg-[var(--ink)]/80 text-[var(--cream)] py-3 text-[11px] tracking-widest uppercase font-extrabold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                  >
                    {loginLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Secure Log In"}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- RENDER: LOADING ---
  if (token && tasksLoading) {
    return (
      <div className="min-h-[100dvh] bg-[#050505] flex items-center justify-center">
         <Loader2 className="w-10 h-10 text-[var(--accent)] animate-spin" />
      </div>
    );
  }

  // --- RENDER: DASHBOARD ---
  if (!tasksLoading && !dailyPromise && token) {
    return (
      <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-[var(--foreground)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,_var(--accent)_0%,_transparent_70%)] opacity-20 pointer-events-none mix-blend-screen" />
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="relative z-10 w-full max-w-lg bg-neutral-900/60 border border-[var(--accent)]/30 rounded-[2rem] p-8 shadow-[0_0_50px_rgba(var(--accent-rgb),0.3)] backdrop-blur-2xl text-center"
        >
          <div className="w-16 h-16 bg-[var(--accent)]/20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(var(--accent-rgb),0.5)]">
            <Target className="w-8 h-8 text-[var(--accent)]" />
          </div>
          <h2 className="text-2xl font-black uppercase tracking-widest text-white mb-2">The Daily Promise</h2>
          <p className="text-gray-400 text-sm mb-8">What is your ONE non-negotiable goal for today?</p>
          
          <form onSubmit={handleSetPromise} className="space-y-4">
            <input 
              type="text"
              autoFocus
              value={promiseInput}
              onChange={e => setPromiseInput(e.target.value)}
              placeholder="e.g. Complete 5 Mock Tests..."
              className="w-full bg-black/50 border border-[var(--wood)]/20 rounded-2xl p-5 text-center text-lg focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] placeholder:text-gray-600 transition-all font-semibold text-[var(--cream)]"
            />
            <button 
              disabled={promiseLoading || !promiseInput.trim()}
              type="submit"
              className="w-full bg-gradient-to-r from-[var(--accent)] to-emerald-400 text-black py-4 rounded-2xl font-black uppercase tracking-widest text-sm hover:scale-[1.02] transition-transform disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {promiseLoading ? <Loader2 className="w-5 h-5 animate-spin"/> : "Lock it in"}
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={`min-h-[100dvh] transition-colors duration-700 flex flex-col items-center justify-start ${zenMode ? 'bg-black pt-16' : 'bg-[#050505] pt-28 pb-4'} px-4 relative overflow-y-auto scrollbar-hide`}>
      {/* REAL-TIME POLL POP-UP OVERLAY */}
      <AnimatePresence>
        {currentPoll && pollSeconds > 0 && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -50 }}
            className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-black/80 backdrop-blur-3xl p-6"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,_var(--accent)_0%,_transparent_60%)] opacity-30 mix-blend-screen pointer-events-none animate-pulse" />
            
            <div className="relative w-full max-w-lg bg-black/50 border border-[var(--accent)]/50 rounded-[2rem] p-8 shadow-[0_0_80px_rgba(var(--accent-rgb),0.5)] overflow-hidden">
               <div className="absolute top-0 inset-x-0 h-1 bg-[var(--accent)]" style={{ width: `${(pollSeconds / 60) * 100}%`, transition: 'width 1s linear' }} />
               
               <div className="flex flex-col items-center mb-8">
                 <div className="w-16 h-16 bg-[var(--accent)]/20 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(var(--accent-rgb),0.6)] mb-4">
                   <Zap className="w-8 h-8 text-[var(--accent)]" />
                 </div>
                 <h2 className="text-sm font-black uppercase tracking-[0.3em] text-[var(--accent)] animate-bounce text-center mb-2">Pop Quiz Event!</h2>
                 <p className="text-3xl font-extrabold text-white text-center leading-tight drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">{currentPoll.question}</p>
                 <div className="mt-4 px-4 py-1.5 rounded-full bg-red-500/20 border border-red-500/40 text-red-400 font-mono font-bold tracking-widest text-sm flex items-center gap-2">
                   <Clock className="w-4 h-4" /> {formatTime(pollSeconds)}
                 </div>
               </div>

               <div className="grid gap-3">
                 {currentPoll.options.map((opt: string, i: number) => (
                   <button
                     key={i}
                     onClick={() => handlePollSubmit(currentPoll.id, opt)}
                     disabled={pollSubmitting}
                     className="w-full relative overflow-hidden group bg-white/5 hover:bg-[var(--accent)] border border-white/10 hover:border-[var(--accent)] text-left px-6 py-4 rounded-xl transition-all disabled:opacity-50"
                   >
                     <span className="relative z-10 text-[var(--cream)] group-hover:text-black font-bold text-lg">{opt}</span>
                     <div className="absolute inset-0 bg-white/10 translate-y-[100%] group-hover:translate-y-0 transition-transform duration-300" />
                   </button>
                 ))}
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Premium Animated Mesh Background */}
      {!zenMode && <div className="pointer-events-none absolute inset-0 opacity-30 mix-blend-screen animate-[mesh] bg-[radial-gradient(circle_at_50%_0%,_var(--accent)_0%,_transparent_50%),radial-gradient(circle_at_80%_80%,_rgba(59,130,246,0.3)_0%,_transparent_40%),radial-gradient(circle_at_10%_80%,_var(--accent)_0%,_transparent_30%)]" />}

      {/* GLOBAL HEADER CONTROLS */}
      <div className="fixed top-24 right-4 z-[9000] flex flex-col gap-3">
         <button 
           onClick={() => setZenMode(!zenMode)} 
           title="Toggle Zen Mode"
           className={`p-2.5 rounded-full border transition-all shadow-lg group ${zenMode ? 'bg-[var(--accent)] text-black border-[var(--accent)] shadow-[0_0_20px_rgba(var(--accent-rgb),0.4)] hover:scale-110' : 'border-white/10 bg-white/5 hover:bg-white/10 text-[var(--cream)] hover:text-white backdrop-blur-md'}`}
         >
            {zenMode ? <Minimize2 className="w-4 h-4 transition-transform group-hover:scale-95" /> : <Maximize2 className="w-4 h-4 transition-transform group-hover:scale-110" />}
         </button>

         {!zenMode && (
           <button onClick={handleLogout} title="Log Out" className="p-2.5 rounded-full border border-white/10 bg-neutral-900/40 hover:bg-red-500/20 hover:border-red-500/30 text-gray-400 hover:text-red-400 transition-all shadow-lg group backdrop-blur-md">
              <LogOut className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
           </button>
         )}
      </div>

      <AnimatePresence mode="wait">
        <motion.div 
          key={zenMode ? "zen" : "dash"}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.4 }}
          className={`w-full z-10 flex flex-col ${zenMode ? 'max-w-lg items-center justify-center min-h-[60vh]' : 'max-w-4xl'}`}
        >
          
          {/* THE DAILY PROMISE HEADER */}
          {!zenMode && dailyPromise && (
            <motion.div 
               initial={{ opacity: 0, scale: 0.95, y: -20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
               className="w-full flex justify-center mb-10 relative z-20 group"
            >
               {/* Massive Glow Pulse Behind */}
               <div className="absolute inset-0 bg-[var(--accent)]/10 blur-[40px] rounded-full group-hover:bg-[var(--accent)]/20 transition-all duration-700 pointer-events-none" />

               <div className="relative bg-gradient-to-r from-[var(--accent)]/10 via-white/5 to-[var(--accent)]/10 border border-[var(--accent)]/40 px-10 py-5 rounded-full flex items-center gap-6 shadow-[0_0_30px_rgba(var(--accent-rgb),0.3)] backdrop-blur-2xl transition-all duration-500 overflow-hidden">
                 
                 {/* Internal Shiny Line */}
                 <div className="absolute -inset-x-20 top-0 h-[1px] bg-gradient-to-r from-transparent via-[var(--accent)] to-transparent opacity-80" />
                 <div className="absolute -inset-x-20 bottom-0 h-[1px] bg-gradient-to-r from-transparent via-[var(--accent)] to-transparent opacity-30" />

                 <div className="relative w-12 h-12 flex items-center justify-center bg-[var(--accent)]/20 rounded-full border border-[var(--accent)]/40 shadow-[0_0_20px_rgba(var(--accent-rgb),0.6)]">
                   <Target className="w-6 h-6 text-[var(--accent)] drop-shadow-[0_0_10px_rgba(var(--accent-rgb),0.9)] animate-pulse" />
                 </div>

                 <div className="flex flex-col">
                   <span className="text-[10px] font-black uppercase tracking-[0.4em] text-[var(--accent)] mb-1 drop-shadow-md">The Daily Promise 🎯</span>
                   <span className={`text-xl font-extrabold text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.3)] ${dailyPromise.completedAt ? 'line-through text-gray-500 drop-shadow-none opacity-60' : ''}`}>{dailyPromise.title}</span>
                 </div>

                 {!dailyPromise.completedAt && (
                   <button 
                     onClick={() => {
                        fetch("/api/meet-addon/today-task", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ markComplete: true, taskId: dailyPromise.id }) }).then(() => fetchTasks());
                     }}
                     className="ml-6 w-12 h-12 shrink-0 rounded-full border-2 border-[var(--accent)] bg-[var(--accent)]/10 flex items-center justify-center text-[var(--accent)] hover:bg-[var(--accent)] hover:text-black transition-all hover:scale-110 shadow-[0_0_20px_rgba(var(--accent-rgb),0.4)] hover:shadow-[0_0_30px_rgba(var(--accent-rgb),0.8)]"
                     title="Complete Promise"
                   >
                     <Check className="w-6 h-6" strokeWidth={3} />
                   </button>
                 )}
               </div>
            </motion.div>
          )}

          {/* LIVE CLOCK HEADER */}
          {!zenMode && <LiveClock />}

          {/* MONITOR NAVIGATION BUTTON */}
          {!zenMode && (
          <div className="w-full flex justify-center mb-8 relative">
             <video ref={videoRef} playsInline muted className="w-0 h-0 opacity-0 absolute pointer-events-none" />
             <button 
                onClick={startPiPMonitor}
                className="group flex items-center gap-2 px-6 py-3 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/30 hover:bg-[var(--accent)] hover:text-black transition-all font-extrabold uppercase tracking-widest text-[11px] shadow-[0_4px_16px_rgba(0,0,0,0.4)] hover:shadow-[0_4px_24px_rgba(255,255,255,0.1)] hover:-translate-y-1"
             >
                <MonitorPlay className="w-4 h-4 group-hover:scale-110 transition-transform" /> Start Floating Lecture Monitor
             </button>
          </div>
          )}

          {/* TWO COLUMN WIDGETS */}
          <div className={`w-full flex flex-col md:flex-row gap-6 items-start justify-center ${zenMode ? 'flex-col items-center max-w-sm' : ''}`}>
          
          {/* TASK WIDGET - LEFT SIDE */}
          {!zenMode && (
          <section className="flex-1 w-full flex flex-col">
            <div className="flex justify-start items-center mb-3">
               <button 
                  onClick={() => setShowTaskForm(!showTaskForm)}
                  className="group flex items-center gap-2 rounded-full bg-white/5 border border-white/10 hover:border-[var(--accent)] hover:bg-white/10 transition-all py-2 px-4 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-md focus:outline-none"
                >
                  <Plus className={`w-4 h-4 text-[var(--accent)] transition-all duration-300 ${showTaskForm ? 'rotate-45 text-red-500' : 'group-hover:rotate-90'}`} />
                  <span className="text-[11px] font-extrabold tracking-[0.1em] uppercase text-[var(--cream)]">
                     Create Task
                  </span>
               </button>
            </div>

            <div className="rounded-3xl border border-white/10 bg-black/40 backdrop-blur-xl p-4 shadow-[0_16px_40px_rgba(0,0,0,0.6)] flex flex-col gap-2 min-h-[340px]">
              <AnimatePresence>
              {showTaskForm && (
                <motion.div 
                  initial={{ opacity: 0, height: 0, scale: 0.95 }}
                  animate={{ opacity: 1, height: "auto", scale: 1 }}
                  exit={{ opacity: 0, height: 0, scale: 0.95 }}
                  className="mb-2 shrink-0 bg-white/5 border border-white/10 rounded-2xl p-4 shadow-inner space-y-3 relative overflow-hidden"
                >
                  <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-[var(--accent)] to-transparent opacity-50" />
                  <input 
                    autoFocus
                    type="text" 
                    value={taskTitle}
                    onChange={(e) => setTaskTitle(e.target.value)}
                    placeholder="Task Heading..." 
                    className="w-full bg-transparent border-b border-white/10 text-[var(--cream)] px-2 py-2 text-[13px] font-bold focus:outline-none focus:border-[var(--accent)] transition-colors placeholder:text-gray-500 tracking-wide"
                    onKeyDown={(e) => {
                       if (e.key === 'Enter' && taskTitle.trim()) {
                          handleCreateTask();
                       }
                    }}
                  />
                  
                  <textarea 
                    value={taskDesc}
                    onChange={(e) => setTaskDesc(e.target.value)}
                    placeholder="Add notes or subtasks..." 
                    rows={2}
                    className="w-full bg-transparent border-b border-white/10 text-gray-300 px-2 py-1.5 text-[11px] resize-none focus:outline-none focus:border-[var(--accent)] transition-colors placeholder:text-gray-600 scrollbar-hide font-medium leading-relaxed"
                  />
                  
                  <div className="flex items-center justify-between pt-2 gap-2">
                     <div className="relative">
                       <select 
                          value={taskPriority}
                          onChange={(e) => setTaskPriority(e.target.value)}
                          className="bg-black/60 border border-white/10 rounded-xl text-[var(--cream)] pl-3 pr-7 py-2 text-[10px] font-extrabold uppercase tracking-widest focus:outline-none focus:border-[var(--accent)] appearance-none cursor-pointer shadow-sm hover:bg-black/80 transition-colors"
                       >
                         <option value="high">High</option>
                         <option value="medium">Medium</option>
                         <option value="normal">Normal</option>
                       </select>
                       <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
                         <svg className="fill-current h-3 w-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                       </div>
                     </div>

                     <div className="flex items-center gap-2 shrink-0">
                       <button 
                         onClick={() => {
                            setTaskTitle(""); setTaskDesc(""); setTaskPriority("medium");
                            setEditingTaskId(null);
                            setShowTaskForm(false);
                         }}
                         className="px-3 py-2 text-[9px] font-bold uppercase tracking-widest text-gray-500 hover:text-white transition-colors"
                       >
                         Cancel
                       </button>
                       <button 
                         onClick={handleCreateTask}
                         disabled={!taskTitle.trim()}
                         className="px-5 py-2.5 rounded-xl bg-[var(--accent)] text-black text-[10px] font-extrabold uppercase tracking-widest hover:bg-[var(--accent-hover)] transition-all disabled:opacity-40 disabled:hover:scale-100 shadow-[0_4px_16px_rgba(var(--accent-rgb),0.3)] flex items-center gap-1.5"
                       >
                         <CheckCircle className="w-3.5 h-3.5" /> Save
                       </button>
                     </div>
                  </div>
                </motion.div>
              )}
              </AnimatePresence>
              
              {/* Live Data Task List */}
              <div className="flex-1 overflow-y-auto space-y-2.5 scrollbar-hide pr-1 mt-1">
                 {tasksLoading && tasks.length === 0 ? (
                   <div className="h-full flex items-center justify-center">
                      <Loader2 className="w-6 h-6 text-gray-500 animate-spin" />
                   </div>
                 ) : tasks.length === 0 && !showTaskForm ? (
                   <div className="h-full flex flex-col items-center justify-center text-center opacity-70">
                      <p className="text-xs uppercase tracking-widest font-bold text-gray-400 mb-2">No active tasks</p>
                      <p className="text-[11px] text-gray-500">Hit the + button to plan your deeply focused session.</p>
                   </div>
                 ) : (
                   tasks.map((task, idx) => (
                     <motion.div 
                       initial={{ opacity: 0, x: -10 }}
                       animate={{ opacity: 1, x: 0 }}
                       transition={{ delay: idx * 0.05 }}
                       key={task.id} 
                       className={`group rounded-2xl border border-white/5 bg-white/5 p-3 flex items-start gap-3 transition-all hover:border-[var(--accent)]/40 hover:bg-white/10 hover:shadow-lg ${task.completedAt ? "opacity-40 grayscale" : ""}`}
                     >
                       <button 
                          onClick={() => !task.completedAt && handleCompleteTask(task.id)}
                          disabled={!!task.completedAt}
                          className={`mt-1 shrink-0 w-5 h-5 rounded-full border flex items-center justify-center transition-all ${task.completedAt ? "bg-[var(--accent)] text-black border-transparent scale-110" : "border-gray-500 hover:border-[var(--accent)] hover:text-[var(--accent)] text-transparent cursor-pointer"}`}
                       >
                          <CheckCircle className="w-3.5 h-3.5" />
                       </button>
                       <div className="flex-1 min-w-0">
                          <p className={`text-[13px] font-semibold truncate transition-colors ${task.completedAt ? "text-gray-500 line-through" : "text-[var(--cream)] group-hover:text-[var(--accent)]"}`}>{task.title}</p>
                          {task.description && <p className="text-[11px] text-gray-400 truncate mt-1">{task.description}</p>}
                       </div>
                       {!task.completedAt && (
                          <div className="shrink-0 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                             {task.priority === 1 && <span className="text-[9px] font-extrabold uppercase text-red-400 bg-red-400/10 px-2 py-1 rounded-md border border-red-500/20 shadow-sm">High</span>}
                             <button 
                               onClick={() => {
                                 setEditingTaskId(task.id);
                                 setTaskTitle(task.title);
                                 setTaskDesc(task.description || "");
                                 setTaskPriority(task.priority === 1 ? "high" : task.priority === 3 ? "normal" : "medium");
                                 setShowTaskForm(true);
                               }}
                               className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-[var(--accent)] hover:bg-white/10 rounded-lg transition-colors"
                             >
                                <Pencil className="w-3.5 h-3.5" />
                             </button>
                          </div>
                       )}
                     </motion.div>
                   ))
                 )}
              </div>
            </div>
          </section>
          )}

          {/* TIMER WIDGET - RIGHT SIDE */}
          <section className={`flex-1 w-full relative rounded-3xl border border-white/10 ${zenMode ? 'bg-black/60 shadow-[0_0_80px_rgba(var(--accent-rgb),0.1)]' : 'bg-black/40 shadow-[0_16px_40px_rgba(0,0,0,0.6)]'} backdrop-blur-xl pt-14 px-8 pb-8 flex flex-col items-center justify-center min-h-[380px] transition-all duration-500 overflow-hidden`}>
            
            {/* Mode Switcher Tabs */}
            <div className="flex border-b border-white/10 w-full absolute top-0 inset-x-0 bg-black/20 text-[10px] uppercase font-extrabold tracking-widest z-20">
               <button 
                  onClick={() => handleSetTimerMode("focus")}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-3 transition-colors ${timerMode === "focus" ? "bg-[var(--accent)]/10 text-[var(--accent)] shadow-[inset_0_-2px_0_var(--accent)]" : "text-gray-500 hover:bg-white/5"}`}
               >
                  <Flame className="w-3.5 h-3.5" /> Deep Work
               </button>
               <button 
                  onClick={() => handleSetTimerMode("break")}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-3 transition-colors ${timerMode === "break" ? "bg-blue-500/10 text-blue-400 shadow-[inset_0_-2px_0_rgb(96,165,250)]" : "text-gray-500 hover:bg-white/5"}`}
               >
                  <Coffee className="w-3.5 h-3.5" /> Rest / Chill
               </button>
            </div>

            {/* Absolute Glow Background inside Timer */}
            <div className={`absolute inset-0 rounded-3xl pointer-events-none transition-opacity duration-1000 ${isRunning ? 'opacity-100' : 'opacity-0'}`}>
              <div className={`absolute inset-0 rounded-3xl bg-[radial-gradient(circle_at_50%_50%,_${timerMode === 'focus' ? 'rgba(var(--accent-rgb),0.15)' : 'rgba(96,165,250,0.15)'}_0%,_transparent_70%)] animate-pulse`} />
            </div>

            <div className="flex justify-between w-full items-center mb-6 relative z-10">
               <h2 className="text-[11px] font-extrabold uppercase tracking-[0.25em] text-gray-400 flex items-center gap-2">
                 <Clock className={`w-4 h-4 ${timerMode === 'focus' ? 'text-[var(--accent)]' : 'text-blue-400'}`} /> 
                 Focus Engine
               </h2>
               {isRunning && (
                 <span className={`animate-pulse border px-3 py-1 rounded-lg text-[9px] font-extrabold uppercase tracking-widest ${timerMode === 'focus' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.3)]' : 'bg-blue-500/10 text-blue-400 border-blue-500/30 shadow-[0_0_12px_rgba(96,165,250,0.3)]'}`}>
                   Live Tracking
                 </span>
               )}
            </div>
            
            <div className="text-center py-6 mb-4 relative z-10 group">
              <span className={`text-[5rem] sm:text-[6rem] leading-none font-mono font-extrabold tracking-widest tabular-nums transition-colors duration-500 ${isRunning ? (timerMode === 'focus' ? 'text-[var(--accent)] drop-shadow-[0_0_30px_rgba(var(--accent-rgb),0.6)]' : 'text-blue-400 drop-shadow-[0_0_30px_rgba(96,165,250,0.6)]') : 'text-white'}`}>
                {formatTime(timeLeft)}
              </span>
            </div>

            <div className="min-h-[3rem] mb-8 flex flex-col justify-center items-center gap-4 relative z-10 w-full">
              {(!isRunning && timeLeft === timerDuration) ? (
                <div className="flex flex-wrap justify-center items-center gap-3 w-full">
                  {(timerMode === "focus" ? [15, 25, 45, 60] : [5, 10, 15, 30]).map((mins) => (
                    <button
                      key={mins}
                      onClick={() => setDuration(mins)}
                      className={`px-4 py-2 rounded-xl text-[10px] font-extrabold uppercase tracking-wider transition-all shadow-sm ${timerDuration === mins * 60 ? (timerMode === 'focus' ? "bg-[var(--accent)] text-black shadow-[0_4px_16px_rgba(var(--accent-rgb),0.4)] scale-105" : "bg-blue-400 text-black shadow-[0_4px_16px_rgba(96,165,250,0.4)] scale-105") : "bg-white/5 border border-white/10 text-gray-300 hover:text-white hover:bg-white/10 hover:border-white/20"}`}
                    >
                      {mins}m
                    </button>
                  ))}
                  
                  {/* Custom Input */}
                  <div className={`flex items-center bg-white/5 border border-white/10 rounded-xl transition-all shadow-inner ml-1 ${timerMode === 'focus' ? 'focus-within:border-[var(--accent)]' : 'focus-within:border-blue-400'} focus-within:bg-black/50`}>
                    <input
                      type="number"
                      min="1"
                      max="999"
                      value={Math.floor(timerDuration / 60)}
                      onChange={(e) => {
                         const val = parseInt(e.target.value);
                         if (!isNaN(val) && val > 0) setDuration(val);
                      }}
                      className="w-12 bg-transparent text-center text-[12px] font-bold text-white py-2 focus:outline-none appearance-none [&::-webkit-inner-spin-button]:appearance-none shadow-none"
                      placeholder="Min"
                    />
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-gray-500 pr-3 select-none">m</span>
                  </div>
                </div>
              ) : (
                 <motion.p 
                   initial={{ opacity: 0, y: 10 }}
                   animate={{ opacity: 1, y: 0 }}
                   className={`text-[11px] font-bold tracking-[0.2em] uppercase mt-2 ${timerMode === 'focus' ? 'text-gray-400' : 'text-blue-300'}`}
                 >
                   {timerMode === 'focus' ? 'Deep work session active' : 'Taking a brain break'}
                 </motion.p>
              )}
            </div>

            {/* Controls */}
            <div className="flex w-full gap-3 relative z-10">
              <button
                 onClick={toggleTimer}
                 className={`flex-1 rounded-2xl py-4 text-xs font-extrabold uppercase tracking-widest flex items-center justify-center gap-2 transition-all duration-300 shadow-xl ${isRunning ? "bg-red-500/10 text-red-500 border border-red-500/30 hover:bg-red-500/20 shadow-[0_0_20px_rgba(239,68,68,0.2)]" : (timerMode === 'focus' ? "bg-gradient-to-br from-[var(--accent)] to-emerald-400 text-black hover:scale-[1.02] hover:shadow-[0_8px_30px_rgba(var(--accent-rgb),0.4)]" : "bg-gradient-to-br from-blue-400 to-cyan-300 text-black hover:scale-[1.02] hover:shadow-[0_8px_30px_rgba(96,165,250,0.4)]")}`}
              >
                {isRunning ? <><X className="w-5 h-5"/> Pause Checkpoint</> : (timerMode === 'focus' ? <><Flame className="w-5 h-5"/> Start Focus</> : <><Coffee className="w-5 h-5"/> Start Break</>)}
              </button>
              
              <button
                 onClick={resetTimer}
                 title="Reset Timer"
                 className="w-16 shrink-0 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all text-gray-400 hover:text-white flex items-center justify-center shadow-inner"
              >
                 <RotateCcw className="w-5 h-5" />
              </button>
            </div>

            {/* FOCUS TREE WIDGET */}
            <div className="w-full mt-6 flex flex-col gap-3 border-t border-[var(--accent)]/10 pt-5 relative z-10">
               <div className="flex items-center justify-between text-gray-400 mb-1">
                  <div className="flex items-center gap-2">
                     <span className="text-[10px] font-extrabold uppercase tracking-widest text-[var(--accent)]">Focus Tree</span>
                     <span className="text-xl filter drop-shadow-[0_0_8px_rgba(var(--accent-rgb),0.5)]">
                        {totalPoints < 100 ? "🌱" : totalPoints < 200 ? "🌿" : totalPoints < 300 ? "🪴" : totalPoints < 400 ? "🎍" : "🌳"}
                     </span>
                  </div>
                  <span className="text-[9px] font-bold uppercase tracking-widest bg-[var(--accent)]/10 text-[var(--accent)] px-2 py-1 rounded-md">
                     Lvl {Math.floor(totalPoints / 100) + 1}
                  </span>
               </div>
               
               <div className="w-full bg-black/40 rounded-full h-1.5 overflow-hidden border border-white/5 relative">
                  <div 
                     className="h-full bg-gradient-to-r from-emerald-500 to-[var(--accent)] transition-all duration-1000 shadow-[0_0_10px_rgba(var(--accent-rgb),0.8)]"
                     style={{ width: `${(totalPoints % 100)}%` }}
                  />
               </div>
               <div className="flex justify-between w-full">
                  <span className="text-[8px] text-gray-500 font-bold uppercase">{totalPoints} Coins</span>
                  <span className="text-[8px] text-gray-500 font-bold uppercase">{100 - (totalPoints % 100)} to next level</span>
               </div>
            </div>

            {/* Hydration Tracker Divider */}
            <div className="w-full mt-4 flex items-center justify-between border-t border-white/10 pt-4 relative z-10">
               <div className="flex items-center gap-2 text-gray-400">
                  <Droplets className="w-4 h-4 text-blue-400" />
                  <span className="text-[10px] font-extrabold uppercase tracking-widest">Hydration</span>
               </div>
               <div className="flex items-center gap-3">
                  <div className="flex gap-1">
                     {[...Array(8)].map((_, i) => (
                        <div 
                           key={i} 
                           className={`w-2 h-4 rounded-full transition-all duration-500 ${i < waterGlasses ? 'bg-blue-400 shadow-[0_0_10px_rgba(96,165,250,0.6)]' : 'bg-white/10'}`}
                        />
                     ))}
                  </div>
                  <button 
                     onClick={() => setWaterGlasses(prev => prev >= 8 ? 0 : prev + 1)}
                     className="ml-2 w-8 h-8 rounded-full border border-blue-400/30 bg-blue-400/10 text-blue-400 flex items-center justify-center hover:bg-blue-400/20 transition-colors"
                  >
                     <Plus className="w-4 h-4" />
                  </button>
               </div>
            </div>

          </section>
          </div>

          {/* LARGE BRAIN DUMP WIDGET - BOTTOM ROW */}
          {!zenMode && (
            <motion.section 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full mt-6 bg-black/40 border border-white/10 rounded-3xl p-6 backdrop-blur-xl shadow-[0_16px_40px_rgba(0,0,0,0.6)] flex flex-col gap-4 group transition-all duration-300 hover:bg-black/50 overflow-hidden relative"
            >
               {/* Internal Glow on focus */}
               <div className="absolute inset-0 rounded-3xl pointer-events-none transition-opacity duration-500 opacity-0 group-focus-within:opacity-100">
                  <div className="absolute inset-0 rounded-3xl bg-[radial-gradient(circle_at_50%_0%,_rgba(var(--accent-rgb),0.05)_0%,_transparent_60%)] animate-pulse" />
               </div>

               <div className="flex justify-between items-start w-full relative z-10 mb-2">
                 <div>
                    <h2 className="text-[13px] font-extrabold uppercase tracking-[0.2em] text-white flex items-center gap-2 mb-1.5 group-focus-within:text-[var(--accent)] transition-colors">
                      <BrainCircuit className="w-5 h-5 text-[var(--accent)] bg-[var(--accent)]/10 p-1 rounded-md" /> 
                      Brain Dump Pad
                    </h2>
                    <p className="text-[11px] text-gray-400 max-w-sm leading-relaxed">
                      Got a distraction while studying? Dump your thoughts here to keep your mind completely focused on the current task.
                    </p>
                 </div>
                 {brainDumps.length > 0 && (
                   <button onClick={() => setShowDumps(!showDumps)} className="text-[9px] font-bold uppercase tracking-widest text-[var(--accent)] hover:text-white transition-colors mt-1 bg-[var(--accent)]/5 px-3 py-1.5 rounded-lg border border-[var(--accent)]/20 shadow-sm">
                      {showDumps ? "Hide Thoughts" : `View ${brainDumps.length} Thoughts`}
                   </button>
                 )}
               </div>

               <div className="flex flex-col gap-3 relative z-10">
                  <input 
                     type="text"
                     value={dumpTitle}
                     onChange={(e) => setDumpTitle(e.target.value)}
                     onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                           e.preventDefault();
                           handleAddBrainDump();
                        }
                     }}
                     placeholder="Thought Title (Optional)"
                     className="w-full bg-white/5 border border-white/10 rounded-xl text-[12px] font-bold text-white px-4 py-3 focus:outline-none focus:border-[var(--accent)]/50 focus:bg-black/60 transition-all placeholder:text-gray-500 shadow-inner"
                  />
                  <textarea 
                     value={dumpInput}
                     onChange={(e) => setDumpInput(e.target.value)}
                     onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                           e.preventDefault();
                           handleAddBrainDump();
                        }
                     }}
                     placeholder="Got distracted? Dump your thoughts here to keep your mind clear..."
                     className="w-full h-20 bg-white/5 border border-white/10 rounded-2xl resize-none text-[12px] text-gray-300 p-4 focus:outline-none focus:border-[var(--accent)]/50 focus:bg-black/60 transition-all placeholder:text-gray-600 shadow-inner"
                  />
                  <div className="flex justify-between items-center px-1">
                     <span className="text-[9px] text-gray-500 uppercase font-bold tracking-wider">Hit Enter to save</span>
                     <button 
                        onClick={handleAddBrainDump} 
                        className="px-5 py-2.5 bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20 rounded-xl text-[10px] font-extrabold uppercase tracking-widest hover:bg-[var(--accent)] hover:text-black transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={!dumpInput.trim() && !dumpTitle.trim()}
                     >
                        Save Thought <Send className="w-3.5 h-3.5" />
                     </button>
                  </div>
               </div>

               {/* Expanded list below text area */}
               <AnimatePresence>
                  {showDumps && brainDumps.length > 0 && (
                     <motion.div 
                       initial={{ opacity: 0, height: 0 }}
                       animate={{ opacity: 1, height: 'auto' }}
                       exit={{ opacity: 0, height: 0 }}
                       className="overflow-hidden mt-2 border-t border-white/10 pt-4 relative z-10"
                     >
                        <div className="flex items-center justify-between mb-4">
                          <span className="text-[9px] text-gray-400 font-extrabold uppercase tracking-widest">Workspace Memory</span>
                          <button onClick={() => setBrainDumps([])} className="text-[9px] text-red-500 hover:text-red-400 flex items-center gap-1 font-bold uppercase tracking-wider bg-red-500/10 px-3 py-1.5 rounded-lg transition-colors">
                             <Trash2 className="w-3 h-3"/> Clear All
                          </button>
                        </div>
                        <div className="flex flex-col gap-3 max-h-[250px] overflow-y-auto scrollbar-hide pb-2">
                           {brainDumps.map((d, index) => (
                             <motion.div
                               initial={{ opacity: 0, x: -10 }}
                               animate={{ opacity: 1, x: 0 }}
                               transition={{ delay: index * 0.05 }}
                               key={d.id} 
                               className="text-[12px] text-gray-300 bg-black/40 border border-white/5 p-4 rounded-xl leading-relaxed flex items-start justify-between group hover:bg-white/5 hover:border-white/10 transition-all hover:scale-[1.01]"
                             >
                                <div className="pr-4 flex flex-col gap-1 w-full">
                                   {d.title && <span className="font-bold text-[var(--cream)] text-[13px]">{d.title}</span>}
                                   {d.text && <span className="whitespace-pre-wrap opacity-80">{d.text}</span>}
                                </div>
                                <button onClick={() => setBrainDumps(prev => prev.filter(x => x.id !== d.id))} className="shrink-0 text-gray-500 opacity-0 group-hover:opacity-100 hover:text-red-400 transition-all p-2 bg-black/60 rounded-full hover:bg-red-500/20">
                                  <X className="w-3.5 h-3.5"/>
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

