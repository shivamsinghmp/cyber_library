"use client";

import { useState, useEffect } from "react";
import { format, subDays, eachDayOfInterval, parseISO } from "date-fns";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";
import {
  Loader2, CheckCircle2, Plus, Filter, Clock,
  ListTodo, TrendingUp, Sparkles, Circle,
} from "lucide-react";
import toast from "react-hot-toast";

type Task = {
  id: string;
  title: string;
  description: string | null;
  priority: number;
  completedAt: string | null;
  taskDate: string;
};

const PRIORITY_CONFIG: Record<number, { label: string; color: string; dot: string }> = {
  1: { label: "High",   color: "text-rose-600 bg-rose-50 border-rose-200",   dot: "bg-rose-500" },
  2: { label: "Normal", color: "text-[var(--accent)] bg-[var(--accent-pale)] border-[var(--accent-border)]", dot: "bg-[var(--accent)]" },
  3: { label: "Low",    color: "text-slate-500 bg-slate-50 border-slate-200", dot: "bg-slate-400" },
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-white shadow-[var(--shadow-md)] p-3 text-sm">
        <p className="font-semibold text-[var(--muted-text)] text-xs mb-2">{label}</p>
        <p className="text-[var(--foreground)] font-bold">Total: {payload[1]?.value ?? payload[0]?.payload.total}</p>
        <p className="text-[var(--accent)] font-bold">Done: {payload[0]?.value ?? 0}</p>
      </div>
    );
  }
  return null;
};

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<"today" | "week" | "month" | "custom">("week");
  const [customStart, setCustomStart] = useState(format(subDays(new Date(), 6), "yyyy-MM-dd"));
  const [customEnd, setCustomEnd] = useState(format(new Date(), "yyyy-MM-dd"));
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDesc, setNewTaskDesc] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState(2);
  const [creating, setCreating] = useState(false);

  useEffect(() => { fetchTasks(); }, [filterType, customStart, customEnd]);

  async function fetchTasks() {
    setLoading(true);
    try {
      let url = "/api/dashboard/todo";
      if (filterType === "today") url += "?range=today";
      else if (filterType === "week") url += "?range=week";
      else if (filterType === "month") url += "?range=month";
      else if (filterType === "custom" && customStart && customEnd)
        url += `?range=custom&from=${customStart}&to=${customEnd}`;
      const res = await fetch(url, { credentials: "include" });
      if (res.ok) setTasks((await res.json()).tasks || []);
    } catch { toast.error("Failed to load tasks"); }
    finally { setLoading(false); }
  }

  async function handleCreateTask(e: React.FormEvent) {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/dashboard/todo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTaskTitle, description: newTaskDesc, priority: newTaskPriority }),
      });
      const data = await res.json();
      if (res.ok && data.task) {
        setNewTaskTitle(""); setNewTaskDesc(""); setNewTaskPriority(2);
        toast.success("Task created!");
        fetchTasks();
      } else { toast.error(data.error || "Failed to create task"); }
    } catch { toast.error("Failed to create task"); }
    finally { setCreating(false); }
  }

  async function toggleTask(id: string, currentlyCompleted: boolean) {
    setTasks(tasks.map(t => t.id === id ? { ...t, completedAt: currentlyCompleted ? null : new Date().toISOString() } : t));
    try {
      const res = await fetch("/api/dashboard/todo", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, completed: !currentlyCompleted }),
      });
      if (!res.ok) throw new Error();
    } catch { toast.error("Failed to update task"); fetchTasks(); }
  }

  // Chart data
  let chartDataMap = new Map<string, { dateStr: string; displayDate: string; total: number; completed: number }>();
  if (filterType !== "today") {
    let startD = new Date(), endD = new Date();
    if (filterType === "week") startD = subDays(new Date(), 6);
    else if (filterType === "month") { const y = new Date().getFullYear(), m = new Date().getMonth(); startD = new Date(y, m, 1); endD = new Date(y, m + 1, 0); }
    else if (filterType === "custom" && customStart && customEnd) { startD = parseISO(customStart); endD = parseISO(customEnd); }
    const diff = endD.getTime() - startD.getTime();
    if (diff > 0 && diff <= 1000 * 60 * 60 * 24 * 366)
      eachDayOfInterval({ start: startD, end: endD }).forEach(d => {
        const dateStr = format(d, "yyyy-MM-dd");
        chartDataMap.set(dateStr, { dateStr, displayDate: format(d, "MMM dd"), total: 0, completed: 0 });
      });
  }
  tasks.forEach(t => {
    const dStr = t.taskDate;
    if (!chartDataMap.has(dStr)) chartDataMap.set(dStr, { dateStr: dStr, displayDate: format(parseISO(dStr), "MMM dd"), total: 0, completed: 0 });
    const entry = chartDataMap.get(dStr)!;
    entry.total += 1;
    if (t.completedAt) entry.completed += 1;
  });
  const chartData = Array.from(chartDataMap.values()).sort((a, b) => a.dateStr.localeCompare(b.dateStr));
  const totalCreated = tasks.length;
  const totalCompleted = tasks.filter(t => t.completedAt).length;
  const completionRate = totalCreated > 0 ? Math.round((totalCompleted / totalCreated) * 100) : 0;

  const FILTERS = ["today", "week", "month", "custom"] as const;

  return (
    <div className="mx-auto max-w-6xl space-y-6">

      {/* ── Page Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white rounded-2xl border border-[var(--border)] shadow-[var(--shadow-sm)] px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--accent-pale)] flex items-center justify-center">
            <ListTodo className="w-5 h-5 text-[var(--accent)]" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-[var(--foreground)]">Task Management</h1>
            <p className="text-xs text-[var(--muted-text)]">Organize and track your daily study tasks</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center rounded-xl bg-[var(--page-bg)] border border-[var(--border)] p-1 gap-1">
            {FILTERS.map(f => (
              <button key={f} onClick={() => setFilterType(f)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg capitalize transition-all ${filterType === f ? "bg-[var(--accent)] text-white shadow-sm" : "text-[var(--muted-text)] hover:text-[var(--foreground)]"}`}>
                {f === "custom" ? <span className="flex items-center gap-1"><Filter className="w-3 h-3" />Custom</span> : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
          {filterType === "custom" && (
            <div className="flex items-center gap-2">
              <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)}
                className="rounded-lg border border-[var(--border)] bg-white px-3 py-1.5 text-xs text-[var(--foreground)] outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/20" />
              <span className="text-[var(--muted-text)] text-xs">to</span>
              <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)}
                className="rounded-lg border border-[var(--border)] bg-white px-3 py-1.5 text-xs text-[var(--foreground)] outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/20" />
            </div>
          )}
        </div>
      </div>

      {/* ── Stats Strip ── */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Tasks", value: totalCreated, color: "text-[var(--foreground)]", icon: "📋" },
          { label: "Completed", value: totalCompleted, color: "text-emerald-600", icon: "✅" },
          { label: "Completion Rate", value: `${completionRate}%`, color: "text-[var(--accent)]", icon: "📈" },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-[var(--border)] shadow-[var(--shadow-sm)] px-5 py-4 text-center">
            <div className="text-xl mb-1">{s.icon}</div>
            <div className={`text-2xl font-black ${s.color}`}>{s.value}</div>
            <div className="text-xs font-medium text-[var(--muted-text)] mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Chart + List */}
        <div className="lg:col-span-2 space-y-5">

          {/* Chart */}
          <div className="bg-white rounded-2xl border border-[var(--border)] shadow-[var(--shadow-sm)] p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[var(--accent)]" />
                <h3 className="text-sm font-bold text-[var(--foreground)]">Completion Trend</h3>
              </div>
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5 text-xs text-[var(--muted-text)]"><span className="w-2.5 h-2.5 rounded-full bg-slate-200 inline-block" />Created</span>
                <span className="flex items-center gap-1.5 text-xs text-[var(--muted-text)]"><span className="w-2.5 h-2.5 rounded-full bg-[var(--accent)] inline-block" />Done</span>
              </div>
            </div>
            <div className="h-52">
              {loading ? (
                <div className="h-full flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-[var(--accent)]" /></div>
              ) : chartData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-sm text-[var(--muted-text)]">No data for this range</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gCompleted" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366F1" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gTotal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#CBD5E1" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#CBD5E1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                    <XAxis dataKey="displayDate" stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} dy={8} />
                    <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} allowDecimals={false} />
                    <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#E2E8F0", strokeWidth: 1 }} />
                    <Area type="monotone" dataKey="total" stroke="#CBD5E1" strokeWidth={2} fill="url(#gTotal)" />
                    <Area type="monotone" dataKey="completed" stroke="#6366F1" strokeWidth={2} fill="url(#gCompleted)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Task List */}
          <div className="bg-white rounded-2xl border border-[var(--border)] shadow-[var(--shadow-sm)] p-6">
            <div className="flex items-center gap-2 mb-5">
              <CheckCircle2 className="w-4 h-4 text-[var(--accent)]" />
              <h3 className="text-sm font-bold text-[var(--foreground)]">Tasks List</h3>
              {tasks.length > 0 && <span className="ml-auto text-xs font-medium text-[var(--muted-text)] bg-[var(--page-bg)] px-2 py-0.5 rounded-full">{tasks.length} tasks</span>}
            </div>
            {loading ? (
              <div className="py-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-[var(--accent)]" /></div>
            ) : tasks.length === 0 ? (
              <div className="py-12 text-center space-y-2">
                <div className="text-4xl">📝</div>
                <p className="text-sm font-semibold text-[var(--foreground)]">No tasks in this period</p>
                <p className="text-xs text-[var(--muted-text)]">Create a task using the form on the right →</p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                {tasks.map(task => {
                  const done = !!task.completedAt;
                  const pc = PRIORITY_CONFIG[task.priority] ?? PRIORITY_CONFIG[2];
                  return (
                    <div key={task.id}
                      className={`flex items-start gap-3 rounded-xl border p-4 transition-all ${done ? "bg-[var(--page-bg)] border-[var(--border)] opacity-60" : "bg-white border-[var(--border)] hover:border-[var(--accent-border)] hover:shadow-[var(--shadow-sm)]"}`}>
                      <button onClick={() => toggleTask(task.id, done)}
                        className={`mt-0.5 shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${done ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300 hover:border-[var(--accent)] text-transparent"}`}>
                        <CheckCircle2 className="w-3 h-3" />
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold ${done ? "line-through text-[var(--muted-text)]" : "text-[var(--foreground)]"}`}>{task.title}</p>
                        {task.description && <p className="text-xs text-[var(--muted-text)] mt-0.5 line-clamp-2">{task.description}</p>}
                        <div className="flex items-center gap-2 mt-2">
                          <span className="flex items-center gap-1 text-[10px] text-[var(--muted-text)]">
                            <Clock className="w-3 h-3" />{format(parseISO(task.taskDate), "MMM dd")}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${pc.color}`}>{pc.label}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right: Create Task */}
        <div className="bg-white rounded-2xl border border-[var(--border)] shadow-[var(--shadow-sm)] p-6 lg:sticky top-6 self-start">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-[var(--accent)]" />
            <h3 className="text-sm font-bold text-[var(--foreground)]">New Task (Today)</h3>
          </div>
          <p className="text-xs text-[var(--muted-text)] mb-5 leading-relaxed">Tasks are tracked for today's streak via Meet Add-on. Max 3 daily goals recommended.</p>

          <form onSubmit={handleCreateTask} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--body-text)]">Title</label>
              <input required maxLength={100} value={newTaskTitle}
                onChange={e => setNewTaskTitle(e.target.value)}
                placeholder="What needs to be done?"
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--page-bg)] px-4 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--placeholder)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/15 transition-all" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--body-text)]">Description <span className="font-normal text-[var(--muted-text)]">(optional)</span></label>
              <textarea rows={3} maxLength={300} value={newTaskDesc}
                onChange={e => setNewTaskDesc(e.target.value)}
                placeholder="Add some details..."
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--page-bg)] px-4 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--placeholder)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/15 transition-all resize-none" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--body-text)]">Priority</label>
              <div className="grid grid-cols-3 gap-2">
                {[{ val: 1, label: "High" }, { val: 2, label: "Normal" }, { val: 3, label: "Low" }].map(p => (
                  <button key={p.val} type="button" onClick={() => setNewTaskPriority(p.val)}
                    className={`rounded-xl border px-2 py-2.5 text-xs font-semibold transition-all ${
                      newTaskPriority === p.val
                        ? p.val === 1 ? "border-rose-300 bg-rose-50 text-rose-600"
                          : p.val === 2 ? "border-[var(--accent-border)] bg-[var(--accent-pale)] text-[var(--accent)]"
                          : "border-slate-200 bg-slate-50 text-slate-600"
                        : "border-[var(--border)] bg-white text-[var(--muted-text)] hover:bg-[var(--page-bg)]"
                    }`}>
                    <Circle className="w-2 h-2 inline mr-1" />{p.label}
                  </button>
                ))}
              </div>
            </div>
            <button type="submit" disabled={creating || !newTaskTitle.trim()}
              className="w-full py-3 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-[var(--shadow-brand)] text-sm mt-2">
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Add Task
            </button>
          </form>

          {/* Tips */}
          <div className="mt-5 rounded-xl bg-[var(--accent-pale)] border border-[var(--accent-border)] p-4">
            <p className="text-xs font-semibold text-[var(--accent)] mb-1">💡 Pro Tip</p>
            <p className="text-xs text-[var(--muted-text)] leading-relaxed">Set 1–3 high-priority tasks each morning. Complete them via Meet Add-on to earn streak points.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
