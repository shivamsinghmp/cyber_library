"use client";

import { useState, useEffect } from "react";
import { format, subDays, eachDayOfInterval, parseISO } from "date-fns";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Loader2, KanbanSquare, CheckCircle, Plus, Calendar, Filter, Lightbulb, Clock } from "lucide-react";
import toast from "react-hot-toast";

type Task = {
  id: string;
  title: string;
  description: string | null;
  priority: number;
  completedAt: string | null;
  taskDate: string;
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

  useEffect(() => {
    fetchTasks();
  }, [filterType, customStart, customEnd]);

  async function fetchTasks() {
    setLoading(true);
    try {
      let url = "/api/dashboard/todo";
      if (filterType === "today") url += "?range=today";
      else if (filterType === "week") url += "?range=week";
      else if (filterType === "month") url += "?range=month";
      else if (filterType === "custom" && customStart && customEnd) {
        url += `?range=custom&from=${customStart}&to=${customEnd}`;
      }
      const res = await fetch(url, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks || []);
      }
    } catch {
      toast.error("Failed to load tasks");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateTask(e: React.FormEvent) {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/dashboard/todo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTaskTitle,
          description: newTaskDesc,
          priority: newTaskPriority,
        }),
      });
      const data = await res.json();
      if (res.ok && data.task) {
        setNewTaskTitle("");
        setNewTaskDesc("");
        setNewTaskPriority(2);
        toast.success("Task created");
        fetchTasks();
      } else {
        toast.error(data.error || "Failed to create task");
      }
    } catch {
      toast.error("Failed to create task");
    } finally {
      setCreating(false);
    }
  }

  async function toggleTask(id: string, currentlyCompleted: boolean) {
    try {
      // Optimistic update
      setTasks(tasks.map((t) => (t.id === id ? { ...t, completedAt: currentlyCompleted ? null : new Date().toISOString() } : t)));
      const res = await fetch("/api/dashboard/todo", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, completed: !currentlyCompleted }),
      });
      if (!res.ok) {
        throw new Error();
      }
    } catch {
      toast.error("Failed to update task");
      fetchTasks(); // revert on fail
    }
  }

  // --- Process Chart Data ---
  let chartDataMap = new Map<string, { dateStr: string; displayDate: string; total: number; completed: number }>();
  
  // Fill missing dates if it's a fixed range
  if (filterType !== "today") {
    let startD = new Date();
    let endD = new Date();
    
    if (filterType === "week") {
      startD = subDays(new Date(), 6);
    } else if (filterType === "month") {
      const y = new Date().getFullYear();
      const m = new Date().getMonth();
      startD = new Date(y, m, 1);
      endD = new Date(y, m + 1, 0); // last day
    } else if (filterType === "custom" && customStart && customEnd) {
      startD = parseISO(customStart);
      endD = parseISO(customEnd);
    }
    
    // safe guard
    const diff = endD.getTime() - startD.getTime();
    if (diff > 0 && diff <= 1000 * 60 * 60 * 24 * 366) {
      const days = eachDayOfInterval({ start: startD, end: endD });
      days.forEach(d => {
        const dateStr = format(d, "yyyy-MM-dd");
        chartDataMap.set(dateStr, {
          dateStr,
          displayDate: format(d, "MMM dd"),
          total: 0,
          completed: 0,
        });
      });
    }
  }

  tasks.forEach((t) => {
    const dStr = t.taskDate;
    if (!chartDataMap.has(dStr)) {
      chartDataMap.set(dStr, {
         dateStr: dStr,
         displayDate: format(parseISO(dStr), "MMM dd"),
         total: 0,
         completed: 0,
      });
    }
    const entry = chartDataMap.get(dStr)!;
    entry.total += 1;
    if (t.completedAt) entry.completed += 1;
  });

  const chartData = Array.from(chartDataMap.values()).sort((a, b) => a.dateStr.localeCompare(b.dateStr));
  
  const CustomTooltipArea = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg border border-[var(--accent)] bg-black/90 p-3 shadow-xl backdrop-blur-sm">
          <p className="mb-2 text-xs font-semibold text-[var(--cream-muted)]">{label}</p>
          <div className="flex flex-col gap-1">
            <p className="text-sm font-bold text-[var(--cream)]">
              Total: <span className="text-[var(--cream)]">{payload[1]?.value || payload[0]?.payload.total}</span>
            </p>
            <p className="text-sm font-bold text-[var(--accent)]">
              Completed: <span className="text-[var(--accent)]">{payload[0]?.value || 0}</span>
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  const totalCreated = tasks.length;
  const totalCompleted = tasks.filter((t) => t.completedAt).length;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between rounded-xl border border-white/10 bg-black/30 p-4">
        <div>
          <h2 className="text-lg font-semibold text-[var(--cream)] flex items-center gap-2">
            <KanbanSquare className="h-5 w-5 text-[var(--accent)]" />
            Task Management
          </h2>
          <p className="text-xs text-[var(--cream-muted)] mt-1">Organize and track your daily tasks, assignments, and goals.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg bg-black/40 p-1 border border-white/10">
            <button
              onClick={() => setFilterType("today")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${filterType === "today" ? "bg-[var(--accent)] text-[var(--ink)] shadow-sm" : "text-[var(--cream-muted)] hover:text-[var(--cream)]"}`}
            >
              Today
            </button>
            <button
              onClick={() => setFilterType("week")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${filterType === "week" ? "bg-[var(--accent)] text-[var(--ink)] shadow-sm" : "text-[var(--cream-muted)] hover:text-[var(--cream)]"}`}
            >
              Week
            </button>
            <button
              onClick={() => setFilterType("month")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${filterType === "month" ? "bg-[var(--accent)] text-[var(--ink)] shadow-sm" : "text-[var(--cream-muted)] hover:text-[var(--cream)]"}`}
            >
              Month
            </button>
            <button
              onClick={() => setFilterType("custom")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition flex items-center gap-1 ${filterType === "custom" ? "bg-[var(--accent)] text-[var(--ink)] shadow-sm" : "text-[var(--cream-muted)] hover:text-[var(--cream)]"}`}
            >
              <Filter className="h-3 w-3" /> Custom
            </button>
          </div>

          {filterType === "custom" && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="rounded-lg border border-white/10 bg-black/40 px-3 py-1.5 text-xs text-[var(--cream)] outline-none focus:border-[var(--accent)] [&::-webkit-calendar-picker-indicator]:invert"
              />
              <span className="text-[var(--cream-muted)] text-xs">to</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="rounded-lg border border-white/10 bg-black/40 px-3 py-1.5 text-xs text-[var(--cream)] outline-none focus:border-[var(--accent)] [&::-webkit-calendar-picker-indicator]:invert"
              />
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column: Analytics */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
            <div className="flex justify-between items-center mb-4">
               <h3 className="flex items-center gap-2 text-sm font-bold text-[var(--cream)]">
                <Calendar className="h-4 w-4 text-[var(--accent)]" />
                Completion Trend
               </h3>
               <div className="flex gap-4">
                  <div className="flex items-center gap-1.5">
                     <div className="w-3 h-3 rounded-full bg-white/20"></div>
                     <span className="text-xs text-[var(--cream-muted)]">Created</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                     <div className="w-3 h-3 rounded-full bg-[var(--accent)]"></div>
                     <span className="text-xs text-[var(--cream-muted)]">Completed</span>
                  </div>
               </div>
            </div>
            
            <div className="h-[250px] w-full">
              {loading ? (
                <div className="flex h-full items-center justify-center text-xs text-[var(--cream-muted)]">
                  <Loader2 className="h-6 w-6 animate-spin text-[var(--accent)]" />
                </div>
              ) : chartData.length === 0 ? (
                <div className="flex h-full items-center justify-center text-xs text-[var(--cream-muted)]">
                  No data in this range.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.6} />
                        <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ffffff" stopOpacity={0.1} />
                        <stop offset="95%" stopColor="#ffffff" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                    <XAxis 
                      dataKey="displayDate" 
                      stroke="#ffffff40" 
                      fontSize={11} 
                      tickLine={false} 
                      axisLine={false}
                      dy={10}
                    />
                    <YAxis 
                      stroke="#ffffff40" 
                      fontSize={11} 
                      tickLine={false} 
                      allowDecimals={false}
                    />
                    <Tooltip content={<CustomTooltipArea />} cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1, strokeDasharray: '4 4' }} />
                    <Area 
                      type="monotone" 
                      dataKey="completed" 
                      stroke="var(--accent)" 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#colorCompleted)" 
                    />
                    <Area 
                      type="monotone" 
                      dataKey="total" 
                      stroke="#ffffff40" 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#colorTotal)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
            
            <div className="mt-4 flex items-center justify-around border-t border-white/10 pt-4">
              <div className="text-center">
                 <span className="block text-xs font-medium text-[var(--cream-muted)] uppercase tracking-wider mb-1">Total Tasks</span>
                 <span className="text-xl font-bold text-[var(--cream)]">{totalCreated}</span>
              </div>
              <div className="text-center">
                 <span className="block text-xs font-medium text-[var(--cream-muted)] uppercase tracking-wider mb-1">Completed</span>
                 <span className="text-xl font-bold text-[var(--accent)]">{totalCompleted}</span>
              </div>
              <div className="text-center">
                 <span className="block text-xs font-medium text-[var(--cream-muted)] uppercase tracking-wider mb-1">Completion Rate</span>
                 <span className="text-xl font-bold text-[var(--cream)]">{totalCreated > 0 ? Math.round((totalCompleted / totalCreated) * 100) : 0}%</span>
              </div>
            </div>
          </div>
          
          <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
             <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-[var(--cream)]">
                <CheckCircle className="h-4 w-4 text-[var(--accent)]" />
                Tasks List
             </h3>
             
             {loading ? (
                <div className="py-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-[var(--accent)]" /></div>
             ) : tasks.length === 0 ? (
                <div className="py-8 text-center text-sm text-[var(--cream-muted)]">No tasks found for this period. Create one below!</div>
             ) : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                   {tasks.map(task => (
                      <div 
                         key={task.id} 
                         className={`group relative flex items-start gap-4 rounded-xl border p-4 transition-all hover:-translate-y-0.5 ${task.completedAt ? "bg-white/5 border-white/5 opacity-70" : "bg-black/40 border-white/10 hover:border-white/20"}`}
                      >
                         <button
                           onClick={() => toggleTask(task.id, !!task.completedAt)}
                           className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors ${task.completedAt ? "border-[var(--accent)] bg-[var(--accent)] text-black" : "border-white/30 text-transparent hover:border-white/60"}`}
                         >
                           <CheckCircle className="h-4 w-4" />
                         </button>
                         <div className="flex-1 min-w-0">
                           <p className={`text-sm font-medium transition-colors ${task.completedAt ? "text-[var(--cream-muted)] line-through" : "text-[var(--cream)]"}`}>
                             {task.title}
                           </p>
                           {task.description && (
                             <p className="mt-1 text-xs text-[var(--cream-muted)] line-clamp-2">
                               {task.description}
                             </p>
                           )}
                           <div className="mt-2 flex items-center gap-3 text-[10px] font-medium text-[var(--cream-muted)] uppercase tracking-wider">
                              <span className="flex items-center gap-1">
                                 <Clock className="w-3 h-3" />
                                 {format(parseISO(task.taskDate), "MMM dd, yyyy")}
                              </span>
                              {task.priority === 1 && <span className="text-red-400">High Priority</span>}
                              {task.priority === 3 && <span className="text-gray-400">Low Priority</span>}
                           </div>
                         </div>
                      </div>
                   ))}
                </div>
             )}
          </div>
        </div>

        {/* Right Column: Creation Form */}
        <div className="rounded-2xl border border-[var(--wood)]/20 bg-[var(--ink)]/50 backdrop-blur-2xl p-6 shadow-[0_10px_40px_rgba(15,11,7,0.5)] lg:sticky top-6 self-start">
           <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-[var(--cream)]">
             <Plus className="h-4 w-4 text-[var(--accent)]" />
             Create New Task (Today)
           </h3>
           <p className="text-xs text-[var(--cream-muted)] mb-5">Tasks created here are automatically tracked for today's daily streak requirements via the Meet Add-on system. Maximum 3 daily goals recommended.</p>
           
           <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-[var(--cream-muted)]">Title</label>
                <input
                  type="text"
                  required
                  maxLength={100}
                  placeholder="What needs to be done?"
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-2.5 text-sm text-[var(--cream)] placeholder:text-white/20 focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                />
              </div>
              
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-[var(--cream-muted)]">Description (Optional)</label>
                <textarea
                  maxLength={300}
                  rows={3}
                  placeholder="Add some details..."
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-2.5 text-sm text-[var(--cream)] placeholder:text-white/20 focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] resize-none"
                  value={newTaskDesc}
                  onChange={(e) => setNewTaskDesc(e.target.value)}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-[var(--cream-muted)]">Priority</label>
                <div className="grid grid-cols-3 gap-2">
                   {[
                      { val: 1, label: "High" },
                      { val: 2, label: "Normal" },
                      { val: 3, label: "Low" },
                   ].map(p => (
                      <button
                         key={p.val}
                         type="button"
                         onClick={() => setNewTaskPriority(p.val)}
                         className={`rounded-lg border px-3 py-2 text-xs font-medium transition ${
                            newTaskPriority === p.val 
                               ? p.val === 1 ? "border-red-500 bg-red-500/20 text-red-400" 
                               : p.val === 2 ? "border-[var(--accent)] bg-[var(--accent)]/20 text-[var(--accent)]" 
                               : "border-gray-400 bg-gray-500/20 text-gray-300"
                               : "border-white/10 bg-black/20 text-[var(--cream-muted)] hover:bg-white/5"
                         }`}
                      >
                         {p.label}
                      </button>
                   ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={creating || !newTaskTitle.trim()}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-bold text-black transition hover:bg-[var(--accent-hover)] disabled:opacity-50"
              >
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Add Task
              </button>
           </form>
        </div>
      </div>
    </div>
  );
}
