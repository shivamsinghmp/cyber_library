"use client";

import { useState, useEffect, useCallback } from "react";
import { CheckCircle, ClipboardList, LogOut, Loader2, Send } from "lucide-react";

const TOKEN_KEY = "vl_meet_addon_token";

type TodayTask = { id: string; title: string; completedAt: string | null } | null;
type Poll = { id: string; question: string; options: string[] };

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

export default function MeetAddonPanelPage() {
  const [token, setTokenState] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [linkCode, setLinkCode] = useState("");
  const [linkCodeError, setLinkCodeError] = useState("");
  const [linkCodeLoading, setLinkCodeLoading] = useState(false);

  const [todayTask, setTodayTask] = useState<TodayTask>(null);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskLoading, setTaskLoading] = useState(false);
  const [taskSaveLoading, setTaskSaveLoading] = useState(false);
  const [markCompleteLoading, setMarkCompleteLoading] = useState(false);

  const [polls, setPolls] = useState<Poll[]>([]);
  const [pollsLoading, setPollsLoading] = useState(false);
  const [pollSelections, setPollSelections] = useState<Record<string, string>>({});
  const [submittedPolls, setSubmittedPolls] = useState<Set<string>>(new Set());
  const [pollSubmitLoading, setPollSubmitLoading] = useState<string | null>(null);

  useEffect(() => {
    setTokenState(getToken());
  }, []);

  const fetchTodayTask = useCallback(async () => {
    const t = getToken();
    if (!t) return;
    setTaskLoading(true);
    try {
      const res = await fetch("/api/meet-addon/today-task", { headers: authHeaders() });
      const data = await res.json();
      if (res.ok && data) {
        setTodayTask({ id: data.id, title: data.title, completedAt: data.completedAt });
        setTaskTitle(data.title);
      } else {
        setTodayTask(null);
        setTaskTitle("");
      }
    } catch {
      setTodayTask(null);
    } finally {
      setTaskLoading(false);
    }
  }, []);

  const fetchPolls = useCallback(async () => {
    setPollsLoading(true);
    try {
      const res = await fetch("/api/meet-addon/polls");
      const data = await res.json();
      if (Array.isArray(data)) setPolls(data);
      else setPolls([]);
    } catch {
      setPolls([]);
    } finally {
      setPollsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!token) return;
    fetchTodayTask();
    fetchPolls();
  }, [token, fetchTodayTask, fetchPolls]);

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
    clearToken();
    setTokenState(null);
    setTodayTask(null);
    setPolls([]);
    setSubmittedPolls(new Set());
    setPollSelections({});
  }

  async function handleSaveTask(e: React.FormEvent) {
    e.preventDefault();
    if (!taskTitle.trim()) return;
    setTaskSaveLoading(true);
    try {
      const res = await fetch("/api/meet-addon/today-task", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ title: taskTitle.trim() }),
      });
      const data = await res.json();
      if (res.ok && data) {
        setTodayTask({ id: data.id, title: data.title, completedAt: data.completedAt });
      }
    } finally {
      setTaskSaveLoading(false);
    }
  }

  async function handleMarkComplete() {
    setMarkCompleteLoading(true);
    try {
      const res = await fetch("/api/meet-addon/today-task", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ markComplete: true }),
      });
      const data = await res.json();
      if (res.ok && data) {
        setTodayTask((prev) => (prev ? { ...prev, completedAt: data.completedAt } : null));
      }
    } finally {
      setMarkCompleteLoading(false);
    }
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
      }
    } finally {
      setPollSubmitLoading(null);
    }
  }

  if (token === null) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 p-4 flex flex-col items-center justify-center">
        <div className="w-full max-w-sm space-y-5">
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
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-base font-semibold flex items-center gap-2">
          <ClipboardList className="w-4 h-4" />
          Virtual Library
        </h1>
        <button
          type="button"
          onClick={handleLogout}
          className="text-slate-400 hover:text-white flex items-center gap-1 text-sm"
        >
          <LogOut className="w-4 h-4" />
          Log out
        </button>
      </div>

      {/* Today's task */}
      <section className="mb-6">
        <h2 className="text-sm font-medium text-slate-300 mb-2">Today&apos;s task</h2>
        {taskLoading ? (
          <div className="flex items-center gap-2 text-slate-400 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading…
          </div>
        ) : todayTask?.completedAt ? (
          <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-3">
            <p className="text-slate-300 line-through text-sm">{todayTask.title}</p>
            <p className="text-emerald-400 text-xs mt-1 flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5" />
              Completed
            </p>
          </div>
        ) : todayTask ? (
          <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-3 space-y-2">
            <p className="text-sm text-slate-200">{todayTask.title}</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleMarkComplete}
                disabled={markCompleteLoading}
                className="rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 text-sm font-medium flex items-center gap-1.5"
              >
                {markCompleteLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                Mark complete
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSaveTask} className="space-y-2">
            <input
              type="text"
              placeholder="What's your task for today?"
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={taskSaveLoading || !taskTitle.trim()}
              className="rounded-lg bg-slate-600 hover:bg-slate-500 text-white px-3 py-1.5 text-sm font-medium flex items-center gap-1.5"
            >
              {taskSaveLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              Save task
            </button>
          </form>
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
                {submittedPolls.has(poll.id) ? (
                  <p className="text-emerald-400 text-xs flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" />
                    You answered: {pollSelections[poll.id]}
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
    </div>
  );
}
