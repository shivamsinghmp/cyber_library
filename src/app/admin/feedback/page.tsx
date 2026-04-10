"use client";

import { useEffect, useState, useMemo } from "react";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { MessageSquare, RefreshCcw, CheckCircle2, ShieldAlert, Clock, Star, Bug, Lightbulb, Activity, Mail, PieChart as PieChartIcon } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import toast from "react-hot-toast";

type Feedback = {
  id: string;
  category: string;
  message: string;
  rating: number | null;
  status: string;
  createdAt: string;
  user: {
    id: string;
    studentId: string | null;
    name: string | null;
    email: string;
  };
};

const STATUS_COLORS: Record<string, string> = {
  OPEN: "bg-red-500/20 text-red-400 border-red-500/30",
  IN_PROGRESS: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  RESOLVED: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
};

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  BUG: <Bug className="h-4 w-4 text-red-500" />,
  FEATURE_REQUEST: <Lightbulb className="h-4 w-4 text-amber-500" />,
  UI_UX: <MessageSquare className="h-4 w-4 text-blue-500" />,
  PERFORMANCE: <Activity className="h-4 w-4 text-emerald-500" />,
  OTHER: <Mail className="h-4 w-4 text-[var(--cream)]" />
};

const COLORS = ["#ef4444", "#f59e0b", "#3b82f6", "#10b981", "#ffffff"];

export default function AdminFeedbackPage() {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("ALL");

  useEffect(() => {
    fetchFeedbacks();
  }, []);

  async function fetchFeedbacks() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/feedback");
      if (res.ok) {
        const data = await res.json();
        setFeedbacks(data.feedbacks || []);
      }
    } catch {
      toast.error("Failed to fetch feedback logs");
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(id: string, newStatus: string) {
    try {
      const res = await fetch("/api/admin/feedback", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: newStatus })
      });
      if (res.ok) {
        toast.success(`Status updated to ${newStatus}`);
        setFeedbacks((prev) => prev.map((f) => f.id === id ? { ...f, status: newStatus } : f));
      } else {
        toast.error("Status update failed");
      }
    } catch {
      toast.error("Status update failed");
    }
  }

  // Analytics Computation
  const categoryData = useMemo(() => {
    const counts: Record<string, number> = {};
    feedbacks.forEach(f => { counts[f.category] = (counts[f.category] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [feedbacks]);

  const ratingAvg = useMemo(() => {
    const ratings = feedbacks.map(f => f.rating).filter((r): r is number => r !== null);
    if (!ratings.length) return 0;
    return (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1);
  }, [feedbacks]);

  const filteredFeedbacks = feedbacks.filter((f) => filterStatus === "ALL" ? true : f.status === filterStatus);

  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-xl border border-white/10 bg-black/90 p-3 shadow-xl backdrop-blur-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-[var(--cream-muted)] mb-1">{payload[0].name}</p>
          <p className="text-xl font-bold text-[var(--cream)]">{payload[0].value} <span className="text-xs opacity-50 font-medium tracking-normal normal-case">reports</span></p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="mx-auto max-w-7xl space-y-8 pb-10">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between rounded-[2rem] border border-[var(--accent)]/30 bg-[var(--accent)]/10 p-6 shadow-xl backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--accent)] text-black shadow-[0_0_20px_rgba(var(--accent-rgb),0.5)]">
             <MessageSquare className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-[var(--cream)] tracking-tight">Feedback Intelligence</h1>
            <p className="text-sm font-medium text-[var(--cream-muted)] tracking-wider uppercase mt-1">Student insights and platform health</p>
          </div>
        </div>
        <button onClick={fetchFeedbacks} className="flex items-center justify-center gap-2 rounded-xl bg-white/5 hover:bg-white/10 px-5 py-3 text-sm font-bold border border-white/10 transition-all text-[var(--cream)] cursor-pointer">
          <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Sync Data
        </button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Analytics Card 1: Category Distribution */}
        <div className="col-span-1 md:col-span-2 rounded-[2rem] border border-white/10 bg-black/40 p-6 shadow-lg backdrop-blur-xl relative overflow-hidden">
           <div className="absolute -right-10 -bottom-10 h-40 w-40 rounded-full bg-[var(--accent)]/10 blur-[50px]"></div>
           <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--cream-muted)] flex items-center gap-2 mb-6 relative z-10">
             <PieChartIcon className="h-4 w-4 text-[var(--accent)]" /> Report Distribution
           </h3>
           <div className="h-[200px] w-full relative z-10">
             {categoryData.length === 0 ? (
               <div className="flex h-full items-center justify-center text-sm font-medium opacity-50 text-[var(--cream-muted)]">No data yet</div>
             ) : (
               <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                   <Pie
                     data={categoryData}
                     cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={5}
                     dataKey="value" stroke="none" cornerRadius={6}
                   >
                     {categoryData.map((entry, index) => (
                       <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                     ))}
                   </Pie>
                   <Tooltip content={<CustomPieTooltip />} />
                 </PieChart>
               </ResponsiveContainer>
             )}
           </div>
        </div>

        {/* Analytics Card 2: Overview */}
        <div className="col-span-1 flex flex-col gap-6">
           <div className="flex-1 rounded-[2rem] border border-white/10 bg-black/40 p-6 shadow-lg backdrop-blur-xl relative overflow-hidden group">
              <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-amber-500/10 blur-[30px]"></div>
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-[var(--cream-muted)] relative z-10 mb-2">Average Satisfaction</h3>
              <p className="text-4xl font-extrabold text-[var(--cream)] relative z-10 flex items-center gap-2">
                {ratingAvg} <Star className="h-8 w-8 text-amber-500 fill-amber-500" />
              </p>
           </div>
           <div className="flex-1 rounded-[2rem] border border-white/10 bg-black/40 p-6 shadow-lg backdrop-blur-xl relative overflow-hidden group">
              <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-red-500/10 blur-[30px]"></div>
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-[var(--cream-muted)] relative z-10 mb-2">Total Reports</h3>
              <p className="text-4xl font-extrabold text-[var(--cream)] relative z-10 tabular-nums">
                {feedbacks.length}
              </p>
           </div>
        </div>
      </div>

      <div className="rounded-[2rem] border border-white/10 bg-black/20 p-6 shadow-lg backdrop-blur-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h2 className="text-lg font-bold text-[var(--cream)]">Recent Submissions</h2>
          <div className="flex bg-black/50 p-1 rounded-xl border border-white/10">
            {["ALL", "OPEN", "IN_PROGRESS", "RESOLVED"].map(status => (
              <button 
                 key={status} onClick={() => setFilterStatus(status)}
                 className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-300 ${filterStatus === status ? "bg-[var(--accent)] text-black shadow-[0_0_15px_rgba(var(--accent-rgb),0.5)]" : "text-[var(--cream-muted)] hover:text-white"}`}
              >
                {status.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
           <div className="py-20 text-center animate-pulse text-sm text-[var(--accent)] font-bold tracking-widest uppercase">Fetching Diagnostics...</div>
        ) : filteredFeedbacks.length === 0 ? (
           <div className="py-20 text-center text-sm text-[var(--cream-muted)] font-medium opacity-50">No tickets match this filter.</div>
        ) : (
           <div className="grid gap-4 md:grid-cols-2">
             {filteredFeedbacks.map((f) => (
                <motion.div key={f.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col justify-between rounded-2xl border border-white/10 bg-black/40 p-5 hover:bg-black/60 transition-colors">
                   <div>
                     <div className="flex items-start justify-between mb-3 border-b border-white/5 pb-3">
                        <div>
                          <p className="text-sm font-bold text-[var(--cream)]">{f.user.name || "Anonymous Member"}</p>
                          <p className="text-[10px] font-semibold tracking-wider text-[var(--cream-muted)]">{f.user.studentId || f.user.email}</p>
                        </div>
                        <div className={`px-2.5 py-1 rounded-md border text-[9px] font-extrabold uppercase tracking-widest ${STATUS_COLORS[f.status]}`}>
                          {f.status.replace("_", " ")}
                        </div>
                     </div>
                     <div className="mb-3 flex items-center gap-2">
                       {CATEGORY_ICONS[f.category]}
                       <span className="text-[10px] font-extrabold uppercase tracking-widest text-white/70">{f.category.replace("_", " ")}</span>
                       {f.rating && (
                         <div className="ml-auto flex items-center gap-1 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                            <span className="text-xs font-black text-amber-500">{f.rating}</span><Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                         </div>
                       )}
                     </div>
                     <p className="text-sm text-[var(--cream)] leading-relaxed bg-black/50 p-3 rounded-xl border border-white/5">{f.message}</p>
                     <p className="mt-3 text-[10px] uppercase tracking-wider text-white/30 font-medium">{format(new Date(f.createdAt), "MMM d, yyyy • hh:mm a")}</p>
                   </div>

                   <div className="mt-4 flex flex-wrap gap-2 pt-4 border-t border-white/5">
                      {f.status !== "OPEN" && (
                        <button onClick={() => updateStatus(f.id, "OPEN")} className="flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-red-500 hover:bg-red-500/20 transition-colors">
                           <ShieldAlert className="h-3 w-3" /> Re-open
                        </button>
                      )}
                      {f.status !== "IN_PROGRESS" && (
                        <button onClick={() => updateStatus(f.id, "IN_PROGRESS")} className="flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-500 hover:bg-amber-500/20 transition-colors">
                           <Clock className="h-3 w-3" /> Investigate
                        </button>
                      )}
                      {f.status !== "RESOLVED" && (
                        <button onClick={() => updateStatus(f.id, "RESOLVED")} className="flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-500 hover:bg-emerald-500/20 transition-colors">
                           <CheckCircle2 className="h-3 w-3" /> Resolve
                        </button>
                      )}
                   </div>
                </motion.div>
             ))}
           </div>
        )}
      </div>
    </div>
  );
}
