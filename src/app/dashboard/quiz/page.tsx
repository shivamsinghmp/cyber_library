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
import { Loader2, HelpCircle, Calendar, Filter, Clock, CheckCircle2 } from "lucide-react";
import toast from "react-hot-toast";

type QuizResponse = {
  id: string;
  pollId: string;
  question: string;
  answer: string;
  createdAt: string;
};

export default function QuizPage() {
  const [responses, setResponses] = useState<QuizResponse[]>([]);
  const [loading, setLoading] = useState(true);

  const [filterType, setFilterType] = useState<"today" | "week" | "month" | "custom">("week");
  const [customStart, setCustomStart] = useState(format(subDays(new Date(), 6), "yyyy-MM-dd"));
  const [customEnd, setCustomEnd] = useState(format(new Date(), "yyyy-MM-dd"));

  useEffect(() => {
    fetchQuizzes();
  }, [filterType, customStart, customEnd]);

  async function fetchQuizzes() {
    setLoading(true);
    try {
      let url = "/api/dashboard/quiz";
      if (filterType === "today") url += "?range=today";
      else if (filterType === "week") url += "?range=week";
      else if (filterType === "month") url += "?range=month";
      else if (filterType === "custom" && customStart && customEnd) {
        url += `?range=custom&from=${customStart}&to=${customEnd}`;
      }
      const res = await fetch(url, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setResponses(data.responses || []);
      }
    } catch {
      toast.error("Failed to load quiz data");
    } finally {
      setLoading(false);
    }
  }

  // --- Process Chart Data ---
  let chartDataMap = new Map<string, { dateStr: string; displayDate: string; answered: number }>();
  
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
          answered: 0,
        });
      });
    }
  }

  responses.forEach((r) => {
    const dStr = r.createdAt.slice(0, 10);
    if (!chartDataMap.has(dStr)) {
      chartDataMap.set(dStr, {
         dateStr: dStr,
         displayDate: format(parseISO(dStr), "MMM dd"),
         answered: 0,
      });
    }
    const entry = chartDataMap.get(dStr)!;
    entry.answered += 1;
  });

  const chartData = Array.from(chartDataMap.values()).sort((a, b) => a.dateStr.localeCompare(b.dateStr));
  
  const CustomTooltipArea = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg border border-[var(--accent)] bg-black/90 p-3 shadow-xl backdrop-blur-sm">
          <p className="mb-2 text-xs font-semibold text-[var(--cream-muted)]">{label}</p>
          <div className="flex flex-col gap-1">
            <p className="text-sm font-bold text-[var(--cream)]">
              Answered: <span className="text-[var(--accent)]">{payload[0]?.value || 0}</span>
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  const totalAnswered = responses.length;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between rounded-xl border border-white/10 bg-black/30 p-4">
        <div>
          <h2 className="text-lg font-semibold text-[var(--cream)] flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-[var(--accent)]" />
            Quiz Performance
          </h2>
          <p className="text-xs text-[var(--cream-muted)] mt-1">Track the quizzes and polls you have participated in.</p>
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
        {/* Left Column: Analytics Chart + List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
            <div className="flex justify-between items-center mb-4">
               <h3 className="flex items-center gap-2 text-sm font-bold text-[var(--cream)]">
                <Calendar className="h-4 w-4 text-[var(--accent)]" />
                Participation Trend
               </h3>
               <div className="flex gap-4">
                  <div className="flex items-center gap-1.5">
                     <div className="w-3 h-3 rounded-full bg-[var(--accent)]"></div>
                     <span className="text-xs text-[var(--cream-muted)]">Quizzes Answered</span>
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
                      <linearGradient id="colorAnswered" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.6} />
                        <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
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
                      dataKey="answered" 
                      stroke="var(--accent)" 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#colorAnswered)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
            
            <div className="mt-4 flex items-center justify-around border-t border-white/10 pt-4">
              <div className="text-center">
                 <span className="block text-xs font-medium text-[var(--cream-muted)] uppercase tracking-wider mb-1">Total Answered</span>
                 <span className="text-xl font-bold text-[var(--accent)]">{totalAnswered}</span>
              </div>
            </div>
          </div>
          
          <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
             <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-[var(--cream)]">
                <CheckCircle2 className="h-4 w-4 text-[var(--accent)]" />
                History
             </h3>
             
             {loading ? (
                <div className="py-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-[var(--accent)]" /></div>
             ) : responses.length === 0 ? (
                <div className="py-8 text-center text-sm text-[var(--cream-muted)]">No quizzes answered in this period. Enter a Study Room to participate!</div>
             ) : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                   {responses.map(res => (
                      <div 
                         key={res.id} 
                         className="group relative flex items-start gap-4 rounded-xl border border-white/10 bg-black/40 p-4 transition-all hover:-translate-y-0.5 hover:border-white/20"
                      >
                         <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--accent)]/20 text-[var(--accent)]">
                           <HelpCircle className="h-4 w-4" />
                         </div>
                         <div className="flex-1 min-w-0">
                           <p className="text-sm font-medium text-[var(--cream)] leading-snug">
                             {res.question}
                           </p>
                           <div className="mt-2 rounded-lg bg-black/50 p-2.5 border border-white/5">
                             <p className="text-sm text-[var(--accent)] flex items-start gap-2 font-medium">
                               <span className="shrink-0 text-[10px] uppercase tracking-wider text-[var(--cream-muted)] pt-0.5">Your Answer:</span>
                               {res.answer}
                             </p>
                           </div>
                           <div className="mt-2 flex items-center gap-3 text-[10px] font-medium text-[var(--cream-muted)] uppercase tracking-wider">
                              <span className="flex items-center gap-1">
                                 <Clock className="w-3 h-3" />
                                 {format(parseISO(res.createdAt), "MMM dd, yyyy h:mm a")}
                              </span>
                           </div>
                         </div>
                      </div>
                   ))}
                </div>
             )}
          </div>
        </div>

        {/* Right Column: Information panel */}
        <div className="rounded-2xl border border-[var(--wood)]/20 bg-[var(--ink)]/50 backdrop-blur-2xl p-6 shadow-[0_10px_40px_rgba(15,11,7,0.5)] lg:sticky top-6 self-start">
           <h3 className="mb-4 flex items-center gap-2 text-[var(--cream)] font-bold">
             <HelpCircle className="h-5 w-5 text-[var(--accent)]" />
             About Quizzes
           </h3>
           <p className="text-sm text-[var(--cream-muted)] mb-4 leading-relaxed">
             Quizzes and polls are interactive activities created by your instructors during live sessions in the Study Room (Focus Theater).
           </p>
           <ul className="space-y-3 mb-6">
              <li className="flex gap-2 text-sm text-[var(--cream-muted)] leading-relaxed">
                 <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]"></span>
                 Answer quizzes actively to check your knowledge and stay engaged.
              </li>
              <li className="flex gap-2 text-sm text-[var(--cream-muted)] leading-relaxed">
                 <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]"></span>
                 Your participation might contribute to leaderboard rankings and rewards.
              </li>
              <li className="flex gap-2 text-sm text-[var(--cream-muted)] leading-relaxed">
                 <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]"></span>
                 All answered queries are stored here for you to review at any time.
              </li>
           </ul>
           
           <div className="rounded-xl border border-[var(--accent)]/30 bg-[var(--accent)]/10 p-4">
              <p className="text-sm font-semibold text-[var(--accent)] mb-1">Score More</p>
              <p className="text-xs text-[var(--cream-muted)]">Attend sessions and utilize the Meet Add-on panel to find more live quizzes!</p>
           </div>
        </div>
      </div>
    </div>
  );
}
