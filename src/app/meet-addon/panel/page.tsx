"use client";

import { useState, useEffect } from "react";
import { Plus, CheckCircle, Clock, Flame, X, RotateCcw, CalendarClock, Loader2, ClipboardList, LogOut, Pencil } from "lucide-react";

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
  // --- STATE: AUTH ---
  const [token, setTokenState] = useState<string | null>(null);
  const [authTab, setAuthTab] = useState<"code" | "email">("code");
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
  const [timerDuration, setTimerDuration] = useState(25 * 60); // Default 25 minutes
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);

  // --- GOOGLE MEET SDK INITIALIZATION ---
  useEffect(() => {
    let sessionCreated = false;
    async function initMeetAddon() {
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

  const fetchTasks = async () => {
    if (!token) return;
    try {
      const res = await fetch("/api/meet-addon/today-task", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks || []);
      }
    } catch (e) { console.error(e); }
    finally { setTasksLoading(false); }
  };

  useEffect(() => {
    if (token) fetchTasks();
  }, [token]);

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
                  <input
                    type="email" placeholder="Student Email"
                    value={email} onChange={(e) => setEmail(e.target.value)} required
                    className="w-full rounded-[1rem] border border-[var(--wood)]/20 bg-[var(--background)]/60 px-4 py-3 text-xs font-semibold text-[var(--cream)] focus:border-[var(--accent)]/50 focus:outline-none focus:bg-[var(--background)]/90 transition-colors"
                  />
                  <input
                    type="password" placeholder="Key Phrase"
                    value={password} onChange={(e) => setPassword(e.target.value)} required
                    className="w-full rounded-[1rem] border border-[var(--wood)]/20 bg-[var(--background)]/60 px-4 py-3 text-xs font-semibold text-[var(--cream)] focus:border-[var(--accent)]/50 focus:outline-none focus:bg-[var(--background)]/90 transition-colors"
                  />
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

  // --- RENDER: DASHBOARD ---
  return (
    <div className="min-h-[100dvh] bg-[var(--background)] flex flex-col items-center justify-start pt-28 pb-4 px-4 relative overflow-y-auto scrollbar-hide">
      {/* Premium Animated Mesh Background */}
      <div className="pointer-events-none absolute inset-0 opacity-40 mix-blend-hard-light animate-[mesh] bg-[radial-gradient(circle_at_50%_0%,_var(--accent)_0%,_transparent_60%),radial-gradient(circle_at_80%_80%,_var(--wood)_0%,_transparent_50%),radial-gradient(circle_at_10%_80%,_var(--accent)_0%,_transparent_40%)]" />

      {/* GLOBAL LOGOUT HEADER */}
      <div className="fixed top-24 right-4 z-[9000]">
         <button onClick={handleLogout} className="p-2 rounded-full border border-[var(--wood)]/30 bg-[var(--ink)]/40 hover:bg-red-500/10 hover:border-red-500/30 text-[var(--wood)] hover:text-red-400 transition-all shadow-sm group">
            <LogOut className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
         </button>
      </div>

      <div className="w-full max-w-4xl z-10 flex flex-col">
        {/* LIVE CLOCK HEADER */}
        <LiveClock />

        {/* TWO COLUMN WIDGETS */}
        <div className="w-full flex flex-col md:flex-row gap-6 items-start justify-center">
        
        {/* TASK WIDGET - LEFT SIDE */}
        <section className="flex-1 w-full flex flex-col">
          <div className="flex justify-start items-center mb-3">
             <button 
                onClick={() => setShowTaskForm(!showTaskForm)}
                className="group flex items-center gap-2 rounded-full bg-[var(--ink)]/40 border border-[var(--wood)]/30 hover:border-[var(--accent)] hover:bg-[var(--ink)]/70 transition-all py-2 px-4 shadow-[0_4px_16px_rgba(0,0,0,0.3)] focus:outline-none"
              >
                <Plus className={`w-4 h-4 text-[var(--accent)] transition-all duration-300 ${showTaskForm ? 'rotate-45 text-red-500' : 'group-hover:rotate-90'}`} />
                <span className="text-[11px] font-extrabold tracking-[0.1em] uppercase text-[var(--cream)]">
                   Create Task
                </span>
             </button>
          </div>

          <div className="rounded-[1.5rem] border border-[var(--wood)]/20 bg-[var(--ink)]/30 backdrop-blur-md p-3 shadow-[0_8px_24px_rgba(0,0,0,0.2)] flex flex-col gap-2 min-h-[300px]">
            {showTaskForm && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-300 mb-2 shrink-0 bg-[var(--ink)]/60 border border-[var(--wood)]/20 rounded-[1.2rem] p-3.5 shadow-inner space-y-3">
                <input 
                  autoFocus
                  type="text" 
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="Task Heading" 
                  className="w-full bg-transparent border-b border-[var(--wood)]/30 text-[var(--cream)] px-2 py-1.5 text-[12px] font-bold focus:outline-none focus:border-[var(--accent)] transition-colors placeholder:text-[var(--wood)]/50 tracking-wide"
                  onKeyDown={(e) => {
                     if (e.key === 'Enter' && taskTitle.trim()) {
                        handleCreateTask();
                     }
                  }}
                />
                
                <textarea 
                  value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)}
                  placeholder="Task description..." 
                  rows={2}
                  className="w-full bg-transparent border-b border-[var(--wood)]/30 text-[var(--cream-muted)] px-2 py-1.5 text-[10px] resize-none focus:outline-none focus:border-[var(--accent)] transition-colors placeholder:text-[var(--wood)]/40 scrollbar-hide font-medium leading-relaxed"
                />
                
                <div className="flex items-center justify-between pt-1 gap-2">
                   <div className="relative">
                     <select 
                        value={taskPriority}
                        onChange={(e) => setTaskPriority(e.target.value)}
                        className="bg-[var(--ink)]/80 border border-[var(--wood)]/30 rounded-[0.6rem] text-[var(--cream)] pl-3 pr-7 py-2 text-[9px] font-bold uppercase tracking-widest focus:outline-none focus:border-[var(--accent)] appearance-none cursor-pointer shadow-sm"
                     >
                       <option value="high">High</option>
                       <option value="medium">Medium</option>
                       <option value="normal">Normal</option>
                     </select>
                     {/* Custom Select Arrow */}
                     <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-[var(--wood)]">
                       <svg className="fill-current h-3 w-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                     </div>
                   </div>

                   <div className="flex items-center gap-1.5 shrink-0">
                     <button 
                       onClick={() => {
                          setTaskTitle(""); setTaskDesc(""); setTaskPriority("medium");
                          setEditingTaskId(null);
                          setShowTaskForm(false);
                       }}
                       className="px-3 py-2 text-[9px] font-bold uppercase tracking-widest text-[var(--wood)] hover:text-[var(--cream)] transition-colors"
                     >
                       Cancel
                     </button>
                     <button 
                       onClick={handleCreateTask}
                       disabled={!taskTitle.trim()}
                       className="px-4 py-2 rounded-[0.6rem] bg-[var(--accent)] text-[var(--ink)] text-[9px] font-extrabold uppercase tracking-widest hover:bg-[var(--accent-hover)] transition-all disabled:opacity-40 disabled:hover:scale-100 shadow-[0_2px_8px_rgba(154,130,100,0.3)] flex items-center gap-1.5"
                     >
                       <CheckCircle className="w-3 h-3" /> Save
                     </button>
                   </div>
                </div>
              </div>
            )}
            
            {/* Live Data Task List */}
            <div className="flex-1 overflow-y-auto space-y-2 scrollbar-hide pr-1">
               {tasksLoading && tasks.length === 0 ? (
                 <div className="h-full flex items-center justify-center">
                    <Loader2 className="w-5 h-5 text-[var(--wood)] animate-spin" />
                 </div>
               ) : tasks.length === 0 && !showTaskForm ? (
                 <div className="h-full flex flex-col items-center justify-center text-center opacity-60">
                    <p className="text-[10px] uppercase tracking-widest font-bold text-[var(--wood)]">No active tasks</p>
                    <p className="text-[10px] text-[var(--wood)] mt-1">Enjoy a deeply focused session.</p>
                 </div>
               ) : (
                 tasks.map(task => (
                   <div key={task.id} className={`group rounded-[1rem] border border-[var(--wood)]/10 bg-[var(--ink)]/40 p-2.5 flex items-start gap-2.5 transition-all hover:border-[var(--wood)]/30 hover:bg-[var(--ink)]/60 ${task.completedAt ? "opacity-50" : ""}`}>
                     <button 
                        onClick={() => !task.completedAt && handleCompleteTask(task.id)}
                        disabled={!!task.completedAt}
                        className={`mt-0.5 shrink-0 w-4 h-4 rounded-full border border-[var(--wood)]/40 flex items-center justify-center transition-colors ${task.completedAt ? "bg-[var(--accent)] text-[var(--ink)] border-transparent" : "hover:border-[var(--accent)] hover:text-[var(--accent)] text-transparent cursor-pointer"}`}
                     >
                        <CheckCircle className="w-3 h-3" />
                     </button>
                     <div className="flex-1 min-w-0">
                        <p className={`text-[11px] font-semibold truncate transition-colors ${task.completedAt ? "text-[var(--wood)] line-through" : "text-[var(--cream)] group-hover:text-[var(--accent)]"}`}>{task.title}</p>
                        {task.description && <p className="text-[9px] text-[var(--cream-muted)] truncate mt-0.5">{task.description}</p>}
                     </div>
                     {!task.completedAt && (
                        <div className="shrink-0 flex items-center gap-2">
                           {task.priority === 1 && <span className="text-[8px] font-bold uppercase text-red-400 bg-red-400/10 px-1.5 py-0.5 rounded-sm">High</span>}
                           <button 
                             onClick={() => {
                               setEditingTaskId(task.id);
                               setTaskTitle(task.title);
                               setTaskDesc(task.description || "");
                               setTaskPriority(task.priority === 1 ? "high" : task.priority === 3 ? "normal" : "medium");
                               setShowTaskForm(true);
                             }}
                             className="w-5 h-5 flex items-center justify-center text-[var(--wood)] hover:text-[var(--accent)] transition-colors hover:bg-[var(--accent)]/10 rounded-md"
                           >
                              <Pencil className="w-3 h-3" />
                           </button>
                        </div>
                     )}
                   </div>
                 ))
               )}
            </div>
          </div>
        </section>

        {/* TIMER WIDGET - RIGHT SIDE */}
        <section className="flex-1 w-full rounded-[2rem] border border-[var(--wood)]/20 bg-[var(--ink)]/40 backdrop-blur-md p-6 shadow-[0_12px_40px_rgba(0,0,0,0.5)]">
          <div className="flex justify-between items-center mb-6">
             <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--wood)] flex items-center gap-1.5">
               <Clock className="w-3.5 h-3.5 text-[var(--accent)]" /> 
               Focus Engine
             </h2>
             {isRunning && (
               <span className="animate-pulse bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-md text-[8px] font-extrabold uppercase tracking-widest">
                 Live
               </span>
             )}
          </div>
          
          <div className="text-center py-4 mb-2">
            <span className="text-6xl font-mono font-extrabold tracking-widest text-[var(--cream)] drop-shadow-[0_0_16px_rgba(154,130,100,0.4)] tabular-nums">
              {formatTime(timeLeft)}
            </span>
          </div>

          <div className="min-h-[2.5rem] mb-6 flex flex-col justify-center items-center gap-3">
            {(!isRunning && timeLeft === timerDuration) ? (
              <div className="flex flex-wrap justify-center items-center gap-2">
                {[15, 25, 45, 60].map((mins) => (
                  <button
                    key={mins}
                    onClick={() => setDuration(mins)}
                    className={`px-3 py-1.5 rounded-[0.8rem] text-[9px] font-extrabold uppercase tracking-wider transition-all shadow-sm ${timerDuration === mins * 60 ? "bg-[var(--accent)] text-[var(--ink)] scale-105" : "bg-[var(--ink)]/50 border border-[var(--wood)]/20 text-[var(--wood)] hover:text-[var(--cream)] hover:border-[var(--wood)]/50"}`}
                  >
                    {mins}m
                  </button>
                ))}
                
                {/* Custom Input */}
                <div className="flex items-center bg-[var(--ink)]/40 border border-[var(--wood)]/20 rounded-[0.8rem] transition-colors focus-within:border-[var(--accent)]/50 focus-within:bg-[var(--ink)]/70 shadow-inner ml-0.5">
                  <input
                    type="number"
                    min="1"
                    max="999"
                    value={Math.floor(timerDuration / 60)}
                    onChange={(e) => {
                       const val = parseInt(e.target.value);
                       if (!isNaN(val) && val > 0) setDuration(val);
                    }}
                    className="w-10 bg-transparent text-center text-[10px] font-bold text-[var(--cream)] py-1.5 focus:outline-none appearance-none [&::-webkit-inner-spin-button]:appearance-none shadow-none"
                    placeholder="Min"
                  />
                  <span className="text-[9px] font-extrabold uppercase tracking-widest text-[var(--wood)] pr-2.5 select-none opacity-80">m</span>
                </div>
              </div>
            ) : (
               <p className="text-[10px] font-medium tracking-widest uppercase text-[var(--wood)] mt-1">
                 Deep work in progress
               </p>
            )}
          </div>

          <div className="flex gap-3">
            <button
               onClick={toggleTimer}
               className={`flex-1 rounded-full py-3.5 text-xs font-extrabold uppercase tracking-widest flex items-center justify-center gap-2 transition-all duration-300 shadow-[0_4px_16px_rgba(0,0,0,0.3)] ${isRunning ? "bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20" : "bg-[var(--accent)] text-[var(--ink)] hover:-translate-y-1 hover:shadow-[0_8px_24px_rgba(154,130,100,0.4)]"}`}
            >
              {isRunning ? <><X className="w-4 h-4"/> Pause</> : <><Flame className="w-4 h-4"/> Start</>}
            </button>
            
            <button
               onClick={resetTimer}
               className="w-14 shrink-0 rounded-full bg-[var(--ink)] border border-[var(--wood)]/30 hover:bg-[var(--ink)]/70 hover:border-[var(--wood)]/60 transition-all text-[var(--wood)] hover:text-[var(--cream)] flex items-center justify-center shadow-inner"
            >
               <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </section>

        </div>
      </div>
    </div>
  );
}

