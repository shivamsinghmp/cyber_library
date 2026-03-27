"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { CheckCircle, ClipboardList, Clock, LogOut, Loader2, Pencil, Plus, Send, X } from "lucide-react";
import { getMeetRoomId, publishMeetEvent, subscribeMeetEvents } from "@/meet-addon/events/bus";
import { useMeetAddonStore } from "@/meet-addon/state/store";
import { startFocusGuard } from "@/meet-addon/focus/focus-guard";
import { PomodoroWatch } from "@/meet-addon/pomodoro/PomodoroWatch";

const TOKEN_KEY = "vl_meet_addon_token";
const PRESENCE_HEARTBEAT_MS = 60_000;

type TodayTaskItem = {
  id: string;
  title: string;
  description: string | null;
  priority: number;
  completedAt: string | null;
};

function priorityLabel(p: number): string {
  if (p === 1) return "High";
  if (p === 3) return "Normal";
  return "Medium";
}

function priorityBadgeClass(p: number): string {
  if (p === 1) return "bg-red-500/20 text-red-300 border-red-500/40";
  if (p === 3) return "bg-slate-500/30 text-slate-300 border-slate-500/50";
  return "bg-amber-500/20 text-amber-200 border-amber-500/40";
}
type Poll = { id: string; question: string; options: string[]; alreadyAnswered?: boolean };
type LeaderboardItem = { rank: number; name: string; coins: number; streakDays: number };

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

function authHeaders(): HeadersInit {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

function LiveClockBar() {
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    setMounted(true);
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);
  const weekday = now.toLocaleDateString(undefined, { weekday: "long" });
  const dateLine = now.toLocaleDateString(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const time = now.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  return (
    <div className="rounded-lg border border-slate-600/80 bg-slate-800/60 px-3 py-2.5">
      <div className="flex items-center justify-center gap-2 text-slate-500 mb-1">
        <Clock className="w-3.5 h-3.5 shrink-0" aria-hidden />
        <span className="text-[10px] uppercase tracking-wider">Now</span>
      </div>
      {!mounted ? (
        <>
          <p className="text-center text-sm font-semibold text-slate-500" aria-hidden>
            …
          </p>
          <p className="text-center text-xs text-slate-500" aria-hidden>
            …
          </p>
          <p className="text-center text-lg font-mono tabular-nums text-slate-500 mt-1" aria-hidden>
            --:--:--
          </p>
        </>
      ) : (
        <>
          <p className="text-center text-sm font-semibold text-slate-100">{weekday}</p>
          <p className="text-center text-xs text-slate-400">{dateLine}</p>
          <p className="text-center text-lg font-mono tabular-nums text-emerald-400/95 mt-1">{time}</p>
        </>
      )}
    </div>
  );
}

export default function MeetAddonPanelPage() {
  const { roomId, setRoomId, onEvent, activeQuizId } = useMeetAddonStore();
  const [token, setTokenState] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [linkCode, setLinkCode] = useState("");
  const [linkCodeError, setLinkCodeError] = useState("");
  const [linkCodeLoading, setLinkCodeLoading] = useState(false);

  const [todayTasks, setTodayTasks] = useState<TodayTaskItem[]>([]);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskPriority, setTaskPriority] = useState<1 | 2 | 3>(2);
  const [editTaskId, setEditTaskId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(true);
  const [taskLoading, setTaskLoading] = useState(false);
  const [taskSaveLoading, setTaskSaveLoading] = useState(false);
  const [markCompleteLoadingId, setMarkCompleteLoadingId] = useState<string | null>(null);

  const [polls, setPolls] = useState<Poll[]>([]);
  const [pollsLoading, setPollsLoading] = useState(false);
  const [pollSelections, setPollSelections] = useState<Record<string, string>>({});
  const [submittedPolls, setSubmittedPolls] = useState<Set<string>>(new Set());
  const [pollSubmitLoading, setPollSubmitLoading] = useState<string | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardItem[]>([]);
  const [focusNotice, setFocusNotice] = useState("");
  const cleanupRef = useRef<null | (() => void)>(null);

  useEffect(() => {
    setTokenState(getToken());
  }, []);

  useEffect(() => {
    if (!token || !roomId) return;
    const roomKey = roomId;

    const ping = () => {
      const t = getToken();
      if (!t) return;
      fetch("/api/meet-addon/presence", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
        body: JSON.stringify({ roomKey, event: "ping" }),
      }).catch(() => {});
    };

    ping();
    const intervalId = window.setInterval(ping, PRESENCE_HEARTBEAT_MS);

    const endPresence = () => {
      const t = getToken();
      if (!t) return;
      fetch("/api/meet-addon/presence", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
        body: JSON.stringify({ roomKey, event: "end" }),
        keepalive: true,
      }).catch(() => {});
    };

    window.addEventListener("pagehide", endPresence);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("pagehide", endPresence);
      endPresence();
    };
  }, [token, roomId]);

  useEffect(() => {
    if (!token) return;
    let stopBus: (() => void) | null = null;
    let stopFocus: (() => void) | null = null;
    (async () => {
      const id = await getMeetRoomId();
      setRoomId(id);
      stopBus = subscribeMeetEvents(onEvent);
      stopFocus = startFocusGuard({
        roomId: id,
        userId: "self",
        onReminder: (msg) => setFocusNotice(msg),
      });
      cleanupRef.current = () => {
        stopBus?.();
        stopFocus?.();
      };
    })();
    return () => cleanupRef.current?.();
  }, [token, onEvent, setRoomId]);

  const fetchTodayTasks = useCallback(async () => {
    const t = getToken();
    if (!t) return;
    setTaskLoading(true);
    try {
      const res = await fetch("/api/meet-addon/today-task", { headers: authHeaders() });
      const data = await res.json();
      if (res.ok && data?.tasks && Array.isArray(data.tasks)) {
        setTodayTasks(
          data.tasks.map((row: TodayTaskItem) => ({
            ...row,
            priority: row.priority === 1 || row.priority === 2 || row.priority === 3 ? row.priority : 2,
          }))
        );
      } else {
        setTodayTasks([]);
      }
    } catch {
      setTodayTasks([]);
    } finally {
      setTaskLoading(false);
    }
  }, []);

  const fetchPolls = useCallback(async () => {
    setPollsLoading(true);
    try {
      const res = await fetch("/api/meet-addon/polls", { headers: authHeaders() });
      const data = await res.json();
      if (Array.isArray(data)) setPolls(data);
      else setPolls([]);
    } catch {
      setPolls([]);
    } finally {
      setPollsLoading(false);
    }
  }, []);

  const fetchLeaderboard = useCallback(async () => {
    if (!roomId) return;
    try {
      const res = await fetch(`/api/meet-addon/leaderboard?roomId=${encodeURIComponent(roomId)}`);
      const data = await res.json();
      setLeaderboard(Array.isArray(data.leaderboard) ? data.leaderboard : []);
    } catch {
      setLeaderboard([]);
    }
  }, [roomId]);

  useEffect(() => {
    if (!token) return;
    fetchTodayTasks();
    fetchPolls();
  }, [token, fetchTodayTasks, fetchPolls]);

  useEffect(() => {
    if (!token || !roomId) return;
    fetchLeaderboard();
  }, [token, roomId, fetchLeaderboard]);

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
        setToken(data.token);
        setTokenState(data.token);
        setEmail("");
        setPassword("");
      } else {
        setLoginError(data.error || "Login failed");
      }
    } catch {
      setLoginError("Network error");
    } finally {
      setLoginLoading(false);
    }
  }

  async function handleLinkWithCode(e: React.FormEvent) {
    e.preventDefault();
    const code = linkCode.replace(/\D/g, "").slice(0, 6);
    if (code.length !== 6) {
      setLinkCodeError("Enter the 6-digit code from your dashboard");
      return;
    }
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
        setToken(data.token);
        setTokenState(data.token);
        setLinkCode("");
      } else {
        setLinkCodeError(data.error || "Invalid or expired code");
      }
    } catch {
      setLinkCodeError("Network error");
    } finally {
      setLinkCodeLoading(false);
    }
  }

  async function handleLogout() {
    const t = getToken();
    const rk = roomId ?? "local-room";
    if (t) {
      try {
        await fetch("/api/meet-addon/presence", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
          body: JSON.stringify({ roomKey: rk, event: "end" }),
        });
      } catch {
        // ignore
      }
    }
    clearToken();
    setTokenState(null);
    setTodayTasks([]);
    setTaskTitle("");
    setTaskDescription("");
    setTaskPriority(2);
    setEditTaskId(null);
    setShowAddForm(true);
    setPolls([]);
    setSubmittedPolls(new Set());
    setPollSelections({});
  }

  function resetNewTaskForm() {
    setTaskTitle("");
    setTaskDescription("");
    setTaskPriority(2);
    setEditTaskId(null);
  }

  async function handleSaveTask(e: React.FormEvent) {
    e.preventDefault();
    if (!taskTitle.trim()) return;
    setTaskSaveLoading(true);
    try {
      const body: Record<string, unknown> = {
        title: taskTitle.trim(),
        description: taskDescription.trim() || null,
        priority: taskPriority,
      };
      if (editTaskId) body.id = editTaskId;
      const res = await fetch("/api/meet-addon/today-task", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        resetNewTaskForm();
        setShowAddForm(false);
        await fetchTodayTasks();
      }
    } finally {
      setTaskSaveLoading(false);
    }
  }

  async function handleMarkCompleteTask(taskId: string) {
    setMarkCompleteLoadingId(taskId);
    try {
      const res = await fetch("/api/meet-addon/today-task", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ taskId, markComplete: true }),
      });
      if (res.ok) await fetchTodayTasks();
    } finally {
      setMarkCompleteLoadingId(null);
    }
  }

  function beginEdit(task: TodayTaskItem) {
    setEditTaskId(task.id);
    setTaskTitle(task.title);
    setTaskDescription(task.description ?? "");
    setTaskPriority(task.priority === 1 || task.priority === 2 || task.priority === 3 ? task.priority : 2);
    setShowAddForm(true);
  }

  async function handlePollSubmit(pollId: string) {
    const answer = pollSelections[pollId];
    if (!answer) return;
    setPollSubmitLoading(pollId);
    try {
      const res = await fetch("/api/meet-addon/poll-response", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ pollId, answer }),
      });
      if (res.ok) {
        setSubmittedPolls((prev) => new Set(prev).add(pollId));
        await publishMeetEvent({
          type: "POLL_START",
          roomId: roomId ?? "local-room",
          pollId,
          ts: Date.now(),
        });
      }
    } finally {
      setPollSubmitLoading(null);
    }
  }

  if (token === null) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 p-4 flex flex-col items-center justify-center">
        <div className="w-full max-w-sm space-y-5">
          <LiveClockBar />
          <div className="text-center">
            <h1 className="text-lg font-semibold flex items-center justify-center gap-2">
              <ClipboardList className="w-5 h-5" />
              Virtual Library – Meet Add-on
            </h1>
            <p className="text-sm text-slate-400 mt-1">Sign in to sync tasks & polls with your dashboard</p>
          </div>

          {/* Option 1: Code from dashboard (no password in Meet) */}
          <div className="rounded-lg border border-slate-600 bg-slate-800/50 p-3">
            <p className="text-xs font-medium text-slate-300 mb-2">Already on dashboard? Use code</p>
            <form onSubmit={handleLinkWithCode} className="space-y-2">
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                placeholder="6-digit code"
                value={linkCode}
                onChange={(e) => { setLinkCode(e.target.value.replace(/\D/g, "").slice(0, 6)); setLinkCodeError(""); }}
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-center font-mono text-lg tracking-widest"
              />
              {linkCodeError && <p className="text-red-400 text-xs">{linkCodeError}</p>}
              <button
                type="submit"
                disabled={linkCodeLoading || linkCode.replace(/\D/g, "").length !== 6}
                className="w-full rounded-lg bg-slate-600 hover:bg-slate-500 text-white py-2 text-sm font-medium flex items-center justify-center gap-2"
              >
                {linkCodeLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Link with code
              </button>
            </form>
            <p className="text-xs text-slate-500 mt-2">Dashboard → Open add-on → Get code</p>
          </div>

          {/* Option 2: Email + password */}
          <div className="rounded-lg border border-slate-600 bg-slate-800/50 p-3">
            <p className="text-xs font-medium text-slate-300 mb-2">Or log in with email & password</p>
            <form onSubmit={handleLogin} className="space-y-2">
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm"
                required
              />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm"
                required
              />
              {loginError && <p className="text-red-400 text-sm">{loginError}</p>}
              <button
                type="submit"
                disabled={loginLoading}
                className="w-full rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white py-2 text-sm font-medium flex items-center justify-center gap-2"
              >
                {loginLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Log in
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 pb-8">
      <LiveClockBar />
      <div className="flex items-center justify-between mb-4 mt-3">
        <h1 className="text-base font-semibold flex items-center gap-2">
          <ClipboardList className="w-4 h-4" />
          Virtual Library
        </h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={async () => {
              if (!window.meet?.addon?.createSpace) return;
              const url = `${window.location.origin}/meet-addon/main`;
              await window.meet.addon.createSpace({ url });
            }}
            className="text-xs rounded-md bg-indigo-600 hover:bg-indigo-500 px-2 py-1"
          >
            Open Stage
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="text-slate-400 hover:text-white flex items-center gap-1 text-sm"
          >
            <LogOut className="w-4 h-4" />
            Log out
          </button>
        </div>
      </div>
      <div className="mb-4 space-y-3">
        <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-3 text-xs text-slate-300">
          <p>Room: {roomId ?? "Loading..."}</p>
          {focusNotice ? <p className="text-amber-300 mt-1">{focusNotice}</p> : null}
          {activeQuizId ? <p className="text-emerald-300 mt-1">Live Quiz: {activeQuizId}</p> : null}
        </div>
        <PomodoroWatch roomKey={roomId ?? "local-room"} />
      </div>

      {/* Today's tasks (multiple) */}
      <section className="mb-6">
        <h2 className="text-sm font-medium text-slate-300 mb-2">Today&apos;s tasks</h2>
        {taskLoading ? (
          <div className="flex items-center gap-2 text-slate-400 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading…
          </div>
        ) : (
          <>
            <div className="space-y-3 mb-3">
              {todayTasks.length === 0 ? (
                <p className="text-slate-500 text-sm">No tasks yet — add one below.</p>
              ) : (
                todayTasks.map((task) => (
                  <div key={task.id} className="rounded-lg border border-slate-700 bg-slate-800/50 p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm text-slate-200 ${task.completedAt ? "line-through text-slate-400" : ""}`}
                        >
                          {task.title}
                        </p>
                        {task.description ? (
                          <p
                            className={`text-xs text-slate-400 mt-1 whitespace-pre-wrap ${
                              task.completedAt ? "line-through opacity-70" : ""
                            }`}
                          >
                            {task.description}
                          </p>
                        ) : null}
                      </div>
                      <span
                        className={`shrink-0 rounded border px-2 py-0.5 text-[10px] font-medium uppercase ${priorityBadgeClass(task.priority)}`}
                      >
                        {priorityLabel(task.priority)}
                      </span>
                    </div>
                    {task.completedAt ? (
                      <p className="text-emerald-400 text-xs flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5" />
                        Completed
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => beginEdit(task)}
                          className="rounded-lg border border-slate-600 hover:bg-slate-700/80 text-slate-200 px-3 py-1.5 text-sm font-medium flex items-center gap-1.5"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMarkCompleteTask(task.id)}
                          disabled={markCompleteLoadingId === task.id}
                          className="rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 text-sm font-medium flex items-center gap-1.5"
                        >
                          {markCompleteLoadingId === task.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <CheckCircle className="w-3.5 h-3.5" />
                          )}
                          Mark complete
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {showAddForm ? (
              <form
                onSubmit={handleSaveTask}
                className="space-y-2 rounded-lg border border-slate-700 bg-slate-800/30 p-3"
              >
                <input
                  type="text"
                  placeholder="Task title"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm"
                />
                <textarea
                  placeholder="Description (optional)"
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-200 resize-y min-h-[72px]"
                />
                <label className="block text-xs text-slate-400">
                  Priority
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(Number(e.target.value) as 1 | 2 | 3)}
                    className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-200"
                  >
                    <option value={1}>High</option>
                    <option value={2}>Medium</option>
                    <option value={3}>Normal</option>
                  </select>
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="submit"
                    disabled={taskSaveLoading || !taskTitle.trim()}
                    className="rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 text-sm font-medium flex items-center gap-1.5"
                  >
                    {taskSaveLoading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    {editTaskId ? "Save changes" : "Create task"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      resetNewTaskForm();
                      if (todayTasks.length > 0) setShowAddForm(false);
                    }}
                    className="rounded-lg border border-slate-600 px-3 py-1.5 text-sm text-slate-300 flex items-center gap-1"
                  >
                    <X className="w-3.5 h-3.5" />
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => {
                  resetNewTaskForm();
                  setShowAddForm(true);
                }}
                className="rounded-lg border border-dashed border-slate-600 hover:bg-slate-800/80 text-slate-300 px-3 py-2 text-sm font-medium flex items-center gap-2 w-full justify-center"
              >
                <Plus className="w-4 h-4" />
                Add another task
              </button>
            )}
          </>
        )}
      </section>

      {/* Polls / Quiz */}
      <section>
        <h2 className="text-sm font-medium text-slate-300 mb-2">Polls & quiz</h2>
        {pollsLoading ? (
          <div className="flex items-center gap-2 text-slate-400 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading…
          </div>
        ) : polls.length === 0 ? (
          <p className="text-slate-500 text-sm">No active polls right now.</p>
        ) : (
          <div className="space-y-4">
            {polls.map((poll) => (
              <div key={poll.id} className="rounded-lg border border-slate-700 bg-slate-800/50 p-3">
                <p className="text-sm font-medium text-slate-200 mb-2">{poll.question}</p>
                {submittedPolls.has(poll.id) || poll.alreadyAnswered ? (
                  <p className="text-emerald-400 text-xs flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" />
                    {poll.alreadyAnswered ? "Already submitted in this room." : `You answered: ${pollSelections[poll.id]}`}
                  </p>
                ) : (
                  <>
                    <div className="space-y-1.5 mb-2">
                      {(poll.options as string[]).map((opt) => (
                        <label key={opt} className="flex items-center gap-2 cursor-pointer text-sm">
                          <input
                            type="radio"
                            name={`poll-${poll.id}`}
                            checked={pollSelections[poll.id] === opt}
                            onChange={() => setPollSelections((prev) => ({ ...prev, [poll.id]: opt }))}
                            className="rounded-full border-slate-500 text-emerald-600"
                          />
                          <span className="text-slate-300">{opt}</span>
                        </label>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => handlePollSubmit(poll.id)}
                      disabled={!pollSelections[poll.id] || pollSubmitLoading === poll.id}
                      className="rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 text-sm font-medium flex items-center gap-1.5"
                    >
                      {pollSubmitLoading === poll.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                      Submit
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
      <section className="mt-6">
        <h2 className="text-sm font-medium text-slate-300 mb-2">Scholar Leaderboard</h2>
        <div className="space-y-1.5">
          {leaderboard.length === 0 ? (
            <p className="text-slate-500 text-sm">No scores yet.</p>
          ) : (
            leaderboard.slice(0, 5).map((row) => (
              <div key={`${row.rank}-${row.name}`} className="text-sm text-slate-200 flex justify-between">
                <span>
                  #{row.rank} {row.name}
                </span>
                <span>{row.coins} coins • {row.streakDays}d streak</span>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
