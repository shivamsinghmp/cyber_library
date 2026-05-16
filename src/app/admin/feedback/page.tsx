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
  OPEN:        "bg-red-100 text-red-700 border-red-200",
  IN_PROGRESS: "bg-amber-100 text-amber-700 border-amber-200",
  RESOLVED:    "bg-emerald-100 text-emerald-700 border-emerald-200",
};

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  BUG:             <Bug className="h-4 w-4 text-red-500" />,
  FEATURE_REQUEST: <Lightbulb className="h-4 w-4 text-amber-500" />,
  UI_UX:           <MessageSquare className="h-4 w-4 text-blue-500" />,
  PERFORMANCE:     <Activity className="h-4 w-4 text-emerald-500" />,
  OTHER:           <Mail className="h-4 w-4 text-gray-500" />,
};

const COLORS = ["#ef4444", "#f59e0b", "#3b82f6", "#10b981", "#6366f1"];

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
        <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-xl">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">{payload[0].name}</p>
          <p className="text-xl font-bold text-gray-900">{payload[0].value} <span className="text-xs text-gray-400 font-medium normal-case">reports</span></p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="mx-auto max-w-7xl space-y-8 pb-10">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between rounded-2xl border border-indigo-100 bg-indigo-50 p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-sm">
            <MessageSquare className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Feedback Intelligence</h1>
            <p className="text-sm font-medium text-indigo-600 mt-0.5">Student insights and platform health</p>
          </div>
        </div>
        <button onClick={fetchFeedbacks} className="flex items-center justify-center gap-2 rounded-xl bg-white hover:bg-gray-50 px-5 py-2.5 text-sm font-semibold border border-gray-200 shadow-sm transition text-gray-700 cursor-pointer">
          <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Sync Data
        </button>
      </div>

      {/* Analytics */}
      <div className="grid gap-6 md:grid-cols-3">
        <div className="col-span-1 md:col-span-2 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm overflow-hidden">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-2 mb-6">
            <PieChartIcon className="h-4 w-4 text-indigo-500" /> Report Distribution
          </h3>
          <div className="h-[200px] w-full">
            {categoryData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-gray-400">No data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={categoryData} cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={5} dataKey="value" stroke="none" cornerRadius={6}>
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

        <div className="col-span-1 flex flex-col gap-4">
          <div className="flex-1 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Avg Satisfaction</h3>
            <p className="text-4xl font-extrabold text-gray-900 flex items-center gap-2">
              {ratingAvg} <Star className="h-7 w-7 text-amber-500 fill-amber-500" />
            </p>
          </div>
          <div className="flex-1 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Total Reports</h3>
            <p className="text-4xl font-extrabold text-gray-900 tabular-nums">{feedbacks.length}</p>
          </div>
        </div>
      </div>

      {/* Tickets */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h2 className="text-base font-bold text-gray-900">Recent Submissions</h2>
          <div className="flex bg-gray-100 p-1 rounded-xl gap-1">
            {["ALL", "OPEN", "IN_PROGRESS", "RESOLVED"].map(status => (
              <button
                key={status} onClick={() => setFilterStatus(status)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${filterStatus === status ? "bg-indigo-600 text-white shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
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
                <motion.div key={f.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col justify-between rounded-2xl border border-gray-200 bg-white p-5 hover:bg-gray-100 transition-colors">
                   <div>
                     <div className="flex items-start justify-between mb-3 border-b border-gray-100 pb-3">
                        <div>
                          <p className="text-sm font-bold text-gray-900">{f.user.name || "Anonymous Member"}</p>
                          <p className="text-[10px] font-semibold tracking-wider text-[var(--cream-muted)]">{f.user.studentId || f.user.email}</p>
                        </div>
                        <div className={`px-2.5 py-1 rounded-md border text-[9px] font-extrabold uppercase tracking-widest ${STATUS_COLORS[f.status]}`}>
                          {f.status.replace("_", " ")}
                        </div>
                     </div>
                     <div className="mb-3 flex items-center gap-2">
                       {CATEGORY_ICONS[f.category]}
                       <span className="text-[10px] font-extrabold uppercase tracking-widest text-gray-500">{f.category.replace("_", " ")}</span>
                       {f.rating && (
                         <div className="ml-auto flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-500/20">
                            <span className="text-xs font-black text-amber-500">{f.rating}</span><Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                         </div>
                       )}
                     </div>
                     <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 p-3 rounded-xl border border-gray-100">{f.message}</p>
                     <p className="mt-3 text-[10px] uppercase tracking-wider text-gray-400 font-medium">{format(new Date(f.createdAt), "MMM d, yyyy • hh:mm a")}</p>
                   </div>

                   <div className="mt-4 flex flex-wrap gap-2 pt-4 border-t border-gray-100">
                      {f.status !== "OPEN" && (
                        <button onClick={() => updateStatus(f.id, "OPEN")} className="flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-red-500 hover:bg-red-100 transition-colors">
                           <ShieldAlert className="h-3 w-3" /> Re-open
                        </button>
                      )}
                      {f.status !== "IN_PROGRESS" && (
                        <button onClick={() => updateStatus(f.id, "IN_PROGRESS")} className="flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-500 hover:bg-amber-100 transition-colors">
                           <Clock className="h-3 w-3" /> Investigate
                        </button>
                      )}
                      {f.status !== "RESOLVED" && (
                        <button onClick={() => updateStatus(f.id, "RESOLVED")} className="flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-500 hover:bg-emerald-100 transition-colors">
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
