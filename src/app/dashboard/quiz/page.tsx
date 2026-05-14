"use client";

import { useState, useEffect } from "react";
import { format, subDays, eachDayOfInterval, parseISO } from "date-fns";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";
import { Loader2, HelpCircle, Filter, Clock, CheckCircle2, BrainCircuit, Sparkles, TrendingUp } from "lucide-react";
import toast from "react-hot-toast";

type QuizResponse = {
  id: string;
  pollId: string;
  question: string;
  answer: string;
  createdAt: string;
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-white shadow-[var(--shadow-md)] p-3 text-sm">
        <p className="text-xs font-semibold text-[var(--muted-text)] mb-1">{label}</p>
        <p className="text-[var(--accent)] font-bold">{payload[0]?.value || 0} answered</p>
      </div>
    );
  }
  return null;
};

export default function QuizPage() {
  const [responses, setResponses] = useState<QuizResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<"today" | "week" | "month" | "custom">("week");
  const [customStart, setCustomStart] = useState(format(subDays(new Date(), 6), "yyyy-MM-dd"));
  const [customEnd, setCustomEnd] = useState(format(new Date(), "yyyy-MM-dd"));

  useEffect(() => { fetchQuizzes(); }, [filterType, customStart, customEnd]);

  async function fetchQuizzes() {
    setLoading(true);
    try {
      let url = "/api/dashboard/quiz";
      if (filterType === "today") url += "?range=today";
      else if (filterType === "week") url += "?range=week";
      else if (filterType === "month") url += "?range=month";
      else if (filterType === "custom" && customStart && customEnd)
        url += `?range=custom&from=${customStart}&to=${customEnd}`;
      const res = await fetch(url, { credentials: "include" });
      if (res.ok) setResponses((await res.json()).responses || []);
    } catch { toast.error("Failed to load quiz data"); }
    finally { setLoading(false); }
  }

  let chartDataMap = new Map<string, { dateStr: string; displayDate: string; answered: number }>();
  if (filterType !== "today") {
    let startD = new Date(), endD = new Date();
    if (filterType === "week") startD = subDays(new Date(), 6);
    else if (filterType === "month") { const y = new Date().getFullYear(), m = new Date().getMonth(); startD = new Date(y, m, 1); endD = new Date(y, m + 1, 0); }
    else if (filterType === "custom" && customStart && customEnd) { startD = parseISO(customStart); endD = parseISO(customEnd); }
    const diff = endD.getTime() - startD.getTime();
    if (diff > 0 && diff <= 1000 * 60 * 60 * 24 * 366)
      eachDayOfInterval({ start: startD, end: endD }).forEach(d => {
        const dateStr = format(d, "yyyy-MM-dd");
        chartDataMap.set(dateStr, { dateStr, displayDate: format(d, "MMM dd"), answered: 0 });
      });
  }
  responses.forEach(r => {
    const dStr = r.createdAt.slice(0, 10);
    if (!chartDataMap.has(dStr)) chartDataMap.set(dStr, { dateStr: dStr, displayDate: format(parseISO(dStr), "MMM dd"), answered: 0 });
    chartDataMap.get(dStr)!.answered += 1;
  });
  const chartData = Array.from(chartDataMap.values()).sort((a, b) => a.dateStr.localeCompare(b.dateStr));

  const FILTERS = ["today", "week", "month", "custom"] as const;

  return (
    <div className="mx-auto max-w-6xl space-y-6">

      {/* ── Header ── */}
      <div className="bg-white rounded-2xl border border-[var(--border)] shadow-[var(--shadow-sm)] px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-50 border border-violet-200 flex items-center justify-center">
            <BrainCircuit className="w-5 h-5 text-violet-600" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-[var(--foreground)]">Quiz Performance</h1>
            <p className="text-xs text-[var(--muted-text)]">Track quizzes and polls from your study sessions</p>
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
              <span className="text-xs text-[var(--muted-text)]">to</span>
              <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)}
                className="rounded-lg border border-[var(--border)] bg-white px-3 py-1.5 text-xs text-[var(--foreground)] outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/20" />
            </div>
          )}
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Total Answered", value: responses.length, icon: "🎯", color: "text-[var(--accent)]" },
          { label: "This Period", value: responses.length, icon: "📅", color: "text-violet-600" },
          { label: "Participation", value: responses.length > 0 ? "Active" : "Inactive", icon: "⚡", color: "text-emerald-600" },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-[var(--border)] shadow-[var(--shadow-sm)] px-5 py-4 text-center">
            <div className="text-2xl mb-1">{s.icon}</div>
            <div className={`text-2xl font-black ${s.color}`}>{s.value}</div>
            <div className="text-xs font-medium text-[var(--muted-text)] mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Chart + History */}
        <div className="lg:col-span-2 space-y-5">
          {/* Chart */}
          <div className="bg-white rounded-2xl border border-[var(--border)] shadow-[var(--shadow-sm)] p-6">
            <div className="flex items-center gap-2 mb-5">
              <TrendingUp className="w-4 h-4 text-[var(--accent)]" />
              <h3 className="text-sm font-bold text-[var(--foreground)]">Participation Trend</h3>
              <span className="ml-auto flex items-center gap-1.5 text-xs text-[var(--muted-text)]">
                <span className="w-2.5 h-2.5 rounded-full bg-[var(--accent)] inline-block" />Quizzes Answered
              </span>
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
                      <linearGradient id="gAnswered" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366F1" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                    <XAxis dataKey="displayDate" stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} dy={8} />
                    <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} allowDecimals={false} />
                    <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#E2E8F0", strokeWidth: 1 }} />
                    <Area type="monotone" dataKey="answered" stroke="#6366F1" strokeWidth={2} fill="url(#gAnswered)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* History */}
          <div className="bg-white rounded-2xl border border-[var(--border)] shadow-[var(--shadow-sm)] p-6">
            <div className="flex items-center gap-2 mb-5">
              <CheckCircle2 className="w-4 h-4 text-[var(--accent)]" />
              <h3 className="text-sm font-bold text-[var(--foreground)]">Quiz History</h3>
              {responses.length > 0 && <span className="ml-auto text-xs text-[var(--muted-text)] bg-[var(--page-bg)] px-2 py-0.5 rounded-full">{responses.length} answered</span>}
            </div>
            {loading ? (
              <div className="py-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-[var(--accent)]" /></div>
            ) : responses.length === 0 ? (
              <div className="py-12 text-center space-y-2">
                <div className="text-4xl">🎓</div>
                <p className="text-sm font-semibold text-[var(--foreground)]">No quizzes answered yet</p>
                <p className="text-xs text-[var(--muted-text)]">Enter a Study Room and answer live polls to see them here</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                {responses.map(res => (
                  <div key={res.id}
                    className="flex items-start gap-3 rounded-xl border border-[var(--border)] bg-white p-4 hover:border-[var(--accent-border)] hover:bg-[var(--accent-pale)]/30 transition-all">
                    <div className="mt-0.5 w-8 h-8 shrink-0 rounded-xl bg-violet-50 border border-violet-200 flex items-center justify-center">
                      <HelpCircle className="w-4 h-4 text-violet-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[var(--foreground)] leading-snug">{res.question}</p>
                      <div className="mt-2 rounded-lg bg-[var(--accent-pale)] border border-[var(--accent-border)] px-3 py-2">
                        <p className="text-xs text-[var(--muted-text)] font-semibold uppercase tracking-wide mb-0.5">Your Answer</p>
                        <p className="text-sm font-bold text-[var(--accent)]">{res.answer}</p>
                      </div>
                      <p className="flex items-center gap-1 text-[10px] text-[var(--muted-text)] mt-2">
                        <Clock className="w-3 h-3" />{format(parseISO(res.createdAt), "MMM dd, yyyy h:mm a")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Info Sidebar */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-[var(--border)] shadow-[var(--shadow-sm)] p-6">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-5 h-5 text-violet-500" />
              <h3 className="font-bold text-[var(--foreground)]">About Quizzes</h3>
            </div>
            <p className="text-sm text-[var(--muted-text)] mb-4 leading-relaxed">
              Quizzes and polls are interactive activities created by instructors during live sessions in the Study Room.
            </p>
            <ul className="space-y-3">
              {[
                "Answer quizzes actively to check your knowledge and stay engaged.",
                "Participation contributes to leaderboard rankings and coin rewards.",
                "All answered queries are stored here for review at any time.",
              ].map(tip => (
                <li key={tip} className="flex items-start gap-2.5 text-sm text-[var(--body-text)] leading-relaxed">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[var(--accent)] shrink-0" />
                  {tip}
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-violet-50 border border-violet-200 rounded-2xl p-5">
            <p className="text-sm font-bold text-violet-700 mb-1.5">🚀 Score More Coins</p>
            <p className="text-xs text-violet-600 leading-relaxed">
              Attend live sessions and use the Meet Add-on sidebar to answer quizzes in real time and earn bonus coins!
            </p>
          </div>

          <div className="bg-[var(--accent-pale)] border border-[var(--accent-border)] rounded-2xl p-5">
            <p className="text-xs font-bold text-[var(--accent)] uppercase tracking-wide mb-1">Quiz Stats</p>
            <div className="flex items-baseline gap-1 mt-2">
              <span className="text-3xl font-black text-[var(--accent)]">{responses.length}</span>
              <span className="text-sm text-[var(--muted-text)]">total answered</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
