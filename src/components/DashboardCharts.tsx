"use client";

import { useState, useEffect } from "react";
import { format, subDays } from "date-fns";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";
import { Calendar, Filter, Loader2, Activity, CheckCircle2, UserCheck, Lightbulb, TrendingUp } from "lucide-react";

type ChartData = {
  studyData: { date: string; rawDate: string; hours: number }[];
  taskData: { name: string; value: number }[];
  attendanceData: { name: string; value: number }[];
  insights?: string[];
  summary: {
    totalHours: number;
    totalTasks: number;
    completionRate: number;
    presentDays: number;
  };
};

export default function DashboardCharts() {
  const [data, setData] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [filterType, setFilterType] = useState<"7days" | "30days" | "custom">("7days");
  const [customStart, setCustomStart] = useState(format(subDays(new Date(), 6), "yyyy-MM-dd"));
  const [customEnd, setCustomEnd] = useState(format(new Date(), "yyyy-MM-dd"));

  // Modern vibrant colors
  const COLORS_TASKS = ["#10b981", "#1e293b"]; // Emerald glowing for completed, slate for pending
  const COLORS_ATTENDANCE = ["#3b82f6", "#1e293b"]; // Bright Blue for present, slate for absent

  useEffect(() => {
    async function fetchChartData() {
      setLoading(true);
      try {
        let url = "/api/dashboard/charts";
        
        if (filterType === "7days") {
          url += `?from=${format(subDays(new Date(), 6), "yyyy-MM-dd")}&to=${format(new Date(), "yyyy-MM-dd")}`;
        } else if (filterType === "30days") {
          url += `?from=${format(subDays(new Date(), 29), "yyyy-MM-dd")}&to=${format(new Date(), "yyyy-MM-dd")}`;
        } else if (filterType === "custom" && customStart && customEnd) {
          url += `?from=${customStart}&to=${customEnd}`;
        }

        const res = await fetch(url, { credentials: "include" });
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (e) {
        console.error("Failed to fetch chart data", e);
      } finally {
        setLoading(false);
      }
    }

    fetchChartData();
  }, [filterType, customStart, customEnd]);

  // Premium custom tooltips
  const CustomTooltipArea = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="relative overflow-hidden rounded-xl border border-white/20 bg-black/80 px-4 py-3 shadow-[0_10px_40px_rgba(0,0,0,0.8)] backdrop-blur-xl">
          <div className="absolute -left-4 -top-4 h-12 w-12 rounded-full bg-[var(--accent)]/20 blur-xl"></div>
          <p className="relative z-10 mb-1 text-xs font-semibold text-[var(--cream-muted)] uppercase tracking-wider">{label}</p>
          <div className="relative z-10 flex items-end gap-1 text-[var(--accent)]">
            <span className="text-xl font-extrabold">{payload[0].value}</span>
            <span className="mb-0.5 text-xs font-medium opacity-80">hours</span>
          </div>
        </div>
      );
    }
    return null;
  };

  const CustomTooltipPie = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div className="rounded-xl border border-white/10 bg-black/80 px-4 py-2.5 shadow-xl backdrop-blur-xl">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--cream-muted)] mb-1">
            {data.name}
          </p>
          <p className="text-base font-bold text-[var(--cream)]">
            {data.value} <span className="text-xs font-medium text-[var(--cream-muted)]">entries</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <section className="mt-4 space-y-4">
      {/* Dynamic Header & Segmented Controls */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-[var(--cream)] flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent)]/20 text-[var(--accent)] shadow-inner">
               <Activity className="h-4 w-4" />
            </div>
            Performance Analytics
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center rounded-xl bg-black/40 p-1 border border-white/10 shadow-inner backdrop-blur-sm">
            <button
              onClick={() => setFilterType("7days")}
              className={`relative px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all duration-300 ${filterType === "7days" ? "bg-[var(--accent)] text-[var(--ink)] shadow-[0_0_15px_rgba(var(--accent-rgb),0.4)]" : "text-[var(--cream-muted)] hover:text-[var(--cream)] hover:bg-white/5"}`}
            >
              7 Days
            </button>
            <button
              onClick={() => setFilterType("30days")}
              className={`relative px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all duration-300 ${filterType === "30days" ? "bg-[var(--accent)] text-[var(--ink)] shadow-[0_0_15px_rgba(var(--accent-rgb),0.4)]" : "text-[var(--cream-muted)] hover:text-[var(--cream)] hover:bg-white/5"}`}
            >
              30 Days
            </button>
            <button
              onClick={() => setFilterType("custom")}
              className={`relative px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg flex items-center gap-1.5 transition-all duration-300 ${filterType === "custom" ? "bg-[var(--accent)] text-[var(--ink)] shadow-[0_0_15px_rgba(var(--accent-rgb),0.4)]" : "text-[var(--cream-muted)] hover:text-[var(--cream)] hover:bg-white/5"}`}
            >
              <Filter className="h-3.5 w-3.5" /> Date
            </button>
          </div>

          {filterType === "custom" && (
            <div className="flex items-center gap-2 rounded-xl bg-black/40 p-1 border border-white/10 backdrop-blur-sm">
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="rounded-lg bg-transparent px-3 py-1.5 text-xs font-medium text-[var(--cream)] outline-none transition focus:bg-white/5 [&::-webkit-calendar-picker-indicator]:invert"
              />
              <span className="text-[var(--cream-muted)] text-xs font-bold opacity-50">→</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="rounded-lg bg-transparent px-3 py-1.5 text-xs font-medium text-[var(--cream)] outline-none transition focus:bg-white/5 [&::-webkit-calendar-picker-indicator]:invert"
              />
            </div>
          )}
        </div>
      </div>

      {/* Smart insights - Floating Glass Card */}
      {!loading && data?.insights && data.insights.length > 0 && (
        <div className="relative overflow-hidden rounded-[1.5rem] border border-[var(--accent)]/30 bg-gradient-to-r from-[var(--accent)]/10 via-black/40 to-black/40 p-4 shadow-lg backdrop-blur-xl">
          <div className="absolute -left-10 -top-10 h-20 w-20 rounded-full bg-[var(--accent)]/20 blur-[30px] pointer-events-none"></div>
          <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.8rem] bg-[var(--accent)] text-[var(--ink)] shadow-[0_0_15px_rgba(var(--accent-rgb),0.5)]">
               <Lightbulb className="h-5 w-5" />
            </div>
            <div className="flex-1">
               <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[var(--cream-muted)]">
                 {data.insights.map((line, i) => (
                   <li key={i} className="flex gap-1.5 items-center leading-relaxed">
                     <span className="h-1 w-1 shrink-0 rounded-full bg-[var(--accent)]" aria-hidden />
                     <span>{line}</span>
                   </li>
                 ))}
               </ul>
            </div>
          </div>
        </div>
      )}

      {/* Main Grid for Charts */}
      {loading ? (
        <div className="flex h-80 items-center justify-center rounded-[2rem] border border-white/5 bg-black/20 shadow-inner backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3">
             <Loader2 className="h-10 w-10 animate-spin text-[var(--accent)]" />
             <p className="text-xs font-bold uppercase tracking-widest text-[var(--cream-muted)] animate-pulse">Analyzing Data...</p>
          </div>
        </div>
      ) : !data ? (
        <div className="flex h-80 items-center justify-center rounded-[2rem] border border-white/5 bg-black/20 shadow-inner backdrop-blur-sm text-sm font-medium text-[var(--cream-muted)]">
          Data temporarily unavailable
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-12 lg:grid-rows-2">
          
          {/* Main Area Chart: Span 8 columns, 2 rows */}
          <div className="relative flex flex-col overflow-hidden rounded-[1.5rem] border border-white/10 bg-black/30 p-4 shadow-lg backdrop-blur-xl lg:col-span-8 lg:row-span-2 group">
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />
            
            <div className="relative z-10 flex items-start justify-between mb-4">
               <div>
                 <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[var(--cream-muted)]">
                   <TrendingUp className="h-3 w-3 text-[var(--accent)]" />
                   Study Trajectory
                 </h3>
                 <p className="mt-1 text-2xl font-extrabold text-[var(--cream)] tabular-nums tracking-tight">
                    {data.summary.totalHours.toFixed(1)} <span className="text-sm font-semibold text-[var(--cream-muted)]">avg hrs</span>
                 </p>
               </div>
               <div className="rounded-lg border border-[var(--wood)]/20 bg-[var(--background)] px-3 py-1.5 shadow-inner">
                  <span className="text-[10px] font-medium text-[var(--cream-muted)] block mb-0.5">Total Focus</span>
                  <span className="text-sm font-bold text-[var(--accent)]">{data.summary.totalHours} hrs</span>
               </div>
            </div>

            <div className="relative z-10 flex-1 min-h-[160px] w-full">
              {data.studyData.length === 0 || data.summary.totalHours === 0 ? (
                <div className="flex h-full items-center justify-center text-sm font-medium text-[var(--cream-muted)] opacity-60">
                  Awaiting your focus sessions...
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.studyData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorHoursEnhanced" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.5} />
                        <stop offset="95%" stopColor="var(--accent)" stopOpacity={0.0} />
                      </linearGradient>
                      <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                         <feGaussianBlur stdDeviation="4" result="blur" />
                         <feComposite in="SourceGraphic" in2="blur" operator="over" />
                      </filter>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" vertical={false} />
                    <XAxis 
                      dataKey="date" 
                      stroke="#ffffff30" 
                      fontSize={11} 
                      tickLine={false} 
                      axisLine={false}
                      dy={15}
                      tickMargin={5}
                    />
                    <YAxis 
                      stroke="#ffffff30" 
                      fontSize={11} 
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => value > 0 ? `${value}h` : ''}
                      dx={-10}
                    />
                    <Tooltip content={<CustomTooltipArea />} cursor={{ stroke: 'rgba(255,255,255,0.05)', strokeWidth: 2 }} />
                    <Area 
                      type="monotone" 
                      dataKey="hours" 
                      stroke="var(--accent)" 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#colorHoursEnhanced)" 
                      activeDot={{ r: 6, fill: 'var(--accent)', stroke: '#000', strokeWidth: 2, filter: 'url(#glow)' }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Top Right: Task Completion Pie */}
          <div className="relative overflow-hidden rounded-[1.5rem] border border-white/10 bg-black/30 p-4 shadow-lg backdrop-blur-xl lg:col-span-4 flex flex-col group transition-colors hover:border-emerald-500/30">
            <div className="absolute -right-8 -bottom-8 h-24 w-24 rounded-full bg-emerald-500/5 blur-[30px] transition group-hover:bg-emerald-500/10 pointer-events-none"></div>
            <h3 className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--cream-muted)] relative z-10">
              <CheckCircle2 className="h-3 w-3 text-emerald-500" />
              Task Execution
            </h3>
            
            <div className="relative z-10 flex-1 flex items-center justify-between mt-1">
              <div className="flex-1 h-[80px] w-full">
                {data.summary.totalTasks === 0 ? (
                  <div className="flex h-full items-center justify-center text-[10px] text-[var(--cream-muted)] opacity-60">
                    No tasks found
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.taskData}
                        cx="50%"
                        cy="50%"
                        innerRadius={25}
                        outerRadius={38}
                        paddingAngle={6}
                        dataKey="value"
                        stroke="none"
                        cornerRadius={4}
                      >
                        {data.taskData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS_TASKS[index % COLORS_TASKS.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltipPie />} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
              <div className="w-1/3 min-w-[70px]">
                 <p className="text-2xl font-extrabold text-[var(--cream)]">{Math.round(data.summary.completionRate)}<span className="text-sm text-emerald-500">%</span></p>
                 <p className="text-[9px] font-semibold uppercase tracking-wider text-[var(--cream-muted)] mt-0.5">Completed</p>
              </div>
            </div>
          </div>

          {/* Bottom Right: Attendance Donut */}
          <div className="relative overflow-hidden rounded-[1.5rem] border border-white/10 bg-black/30 p-4 shadow-lg backdrop-blur-xl lg:col-span-4 flex flex-col group transition-colors hover:border-blue-500/30">
            <div className="absolute -left-8 -bottom-8 h-24 w-24 rounded-full bg-blue-500/5 blur-[30px] transition group-hover:bg-blue-500/10 pointer-events-none"></div>
            <h3 className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--cream-muted)] relative z-10">
              <UserCheck className="h-3 w-3 text-blue-500" />
              Consistency Ratio
            </h3>
            
            <div className="relative z-10 flex-1 flex items-center justify-between mt-1">
              <div className="flex-1 h-[80px] w-full">
                {data.summary.presentDays === 0 && data.attendanceData[1].value === 0 ? (
                  <div className="flex h-full items-center justify-center text-[10px] text-[var(--cream-muted)] opacity-60">
                    No tracking data
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.attendanceData}
                        cx="50%"
                        cy="50%"
                        innerRadius={25}
                        outerRadius={38}
                        paddingAngle={6}
                        dataKey="value"
                        stroke="none"
                        cornerRadius={4}
                      >
                        {data.attendanceData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS_ATTENDANCE[index % COLORS_ATTENDANCE.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltipPie />} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
              <div className="w-1/3 min-w-[70px]">
                 <p className="text-2xl font-extrabold text-[var(--cream)]">{data.summary.presentDays}<span className="text-sm text-blue-500 ml-1">days</span></p>
                 <p className="text-[9px] font-semibold uppercase tracking-wider text-[var(--cream-muted)] mt-0.5">Present</p>
              </div>
            </div>
          </div>

        </div>
      )}
    </section>
  );
}
