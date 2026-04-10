"use client";

import { useState, useEffect } from "react";
import { Flame, ChevronLeft, ChevronRight, Trophy, CalendarDays, Loader2, Info } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  ReferenceLine
} from "recharts";
import { format, parseISO } from "date-fns";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function getCalendarGrid(year: number, month: number): (number | null)[][] {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startDay = first.getDay();
  const daysInMonth = last.getDate();
  const rows: (number | null)[][] = [];
  let row: (number | null)[] = [];
  for (let i = 0; i < startDay; i++) row.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    row.push(d);
    if (row.length === 7) {
      rows.push(row);
      row = [];
    }
  }
  if (row.length) {
    while (row.length < 7) row.push(null);
    rows.push(row);
  }
  while (rows.length < 6) {
    rows.push(Array(7).fill(null));
  }
  return rows.slice(0, 6);
}

function dateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export default function StreaksPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [studiedDates, setStudiedDates] = useState<Set<string>>(new Set());
  const [dailyMinutes, setDailyMinutes] = useState<{ date: string; displayDate: string; minutes: number }[]>([]);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const m = `${year}-${String(month + 1).padStart(2, "0")}`;
        const res = await fetch(`/api/study/streak-calendar?month=${m}`);
        if (!res.ok) return;
        const data = await res.json();
        setStudiedDates(new Set(data.studiedDates ?? []));
        setCurrentStreak(data.currentStreak ?? 0);
        setLongestStreak(data.longestStreak ?? 0);
        
        let arr = [];
        if (data.dailyMinutes && Array.isArray(data.dailyMinutes)) {
          arr = data.dailyMinutes.map((d: any) => ({
             date: d.date,
             displayDate: format(parseISO(d.date), "MMM dd"),
             minutes: d.minutes
          }));
        }
        setDailyMinutes(arr.sort((a: any, b: any) => a.date.localeCompare(b.date)));
      } catch {
        setStudiedDates(new Set());
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [year, month]);

  const grid = getCalendarGrid(year, month);
  const monthLabel = `${MONTHS[month]} ${year}`;

  function prevMonth() {
    if (month === 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else setMonth((m) => m - 1);
  }

  function nextMonth() {
    if (month === 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else setMonth((m) => m + 1);
  }

  const CustomTooltipArea = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg border border-[var(--accent)] bg-black/90 p-3 shadow-xl backdrop-blur-sm">
          <p className="mb-2 text-xs font-semibold text-[var(--cream-muted)]">{label}</p>
          <div className="flex flex-col gap-1">
            <p className="text-sm font-bold text-[var(--cream)]">
              Studied: <span className="text-[var(--accent)]">{payload[0]?.value || 0} mins</span>
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      
      {/* Header and Core Stats */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between rounded-xl border border-white/10 bg-black/30 p-4">
        <div>
          <h2 className="text-lg font-semibold text-[var(--cream)] flex items-center gap-2">
            <Flame className="h-5 w-5 text-amber-500" />
            My Study Streaks
          </h2>
          <p className="text-xs text-[var(--cream-muted)] mt-1">Track your consistency. Remember to study at least 10 minutes to maintain your streak!</p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-3 rounded-2xl border border-[var(--accent)]/30 bg-[var(--accent)]/10 px-4 py-2 shadow-lg shadow-[var(--accent)]/5">
            <Flame className="h-6 w-6 text-amber-400" />
            <div>
               <span className="block text-[10px] font-bold text-[var(--accent)] uppercase tracking-wider">Current Streak</span>
               <span className="text-xl font-bold text-[var(--cream)]">{currentStreak} <span className="text-sm text-[var(--cream-muted)]">days</span></span>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 shadow-lg">
            <Trophy className="h-6 w-6 text-gray-300" />
            <div>
               <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Longest Streak</span>
               <span className="text-xl font-bold text-[var(--cream)]">{longestStreak} <span className="text-sm text-[var(--cream-muted)]">days</span></span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Left Side: Calendar Area */}
        <div className="rounded-3xl border border-white/10 bg-black/30 p-6 shadow-xl backdrop-blur-md">
          <div className="mb-6 flex items-center justify-between">
            <button
              type="button"
              onClick={prevMonth}
              className="rounded-xl border border-white/10 bg-white/5 p-2 text-[var(--cream-muted)] transition hover:bg-white/10 hover:text-[var(--cream)]"
              aria-label="Previous month"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <h2 className="text-lg font-bold text-[var(--cream)] flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-[var(--accent)]" /> {monthLabel}
            </h2>
            <button
              type="button"
              onClick={nextMonth}
              className="rounded-xl border border-white/10 bg-white/5 p-2 text-[var(--cream-muted)] transition hover:bg-white/10 hover:text-[var(--cream)]"
              aria-label="Next month"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          {loading ? (
            <div className="flex h-72 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-[var(--accent)]" />
            </div>
          ) : (
            <div className="overflow-x-auto pb-4">
              <table className="w-full min-w-[320px] border-collapse mx-auto">
                <thead>
                  <tr>
                    {WEEKDAYS.map((day) => (
                      <th
                        key={day}
                        className="py-3 text-center text-xs font-bold uppercase tracking-wider text-[var(--cream-muted)]"
                      >
                        {day}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="space-y-2">
                  {grid.map((row, ri) => (
                    <tr key={ri} className="h-14">
                      {row.map((day, di) => {
                        const key = day === null ? `e-${ri}-${di}` : dateKey(year, month, day);
                        const studied = day !== null && studiedDates.has(key);
                        return (
                          <td
                            key={key}
                            className="p-1 text-center"
                          >
                            {day !== null ? (
                               <div className={`mx-auto relative flex h-10 w-10 items-center justify-center rounded-2xl border text-sm font-semibold transition-all duration-300 ${
                                 studied
                                   ? "bg-amber-500/20 border-amber-500/50 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.2)]"
                                   : "bg-white/5 border-white/5 text-[var(--cream-muted)] hover:border-white/20 hover:bg-white/10"
                               }`}>
                                 {day}
                                 {studied && (
                                   <div className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-black shadow-sm">
                                      <Flame className="h-[10px] w-[10px] fill-current" />
                                   </div>
                                 )}
                               </div>
                            ) : (
                               <div className="mx-auto h-10 w-10"></div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-2 rounded-xl bg-blue-500/10 border border-blue-500/20 p-3 flex gap-3 text-blue-200 text-xs leading-relaxed">
             <Info className="h-4 w-4 shrink-0 mt-0.5 text-blue-400" />
             <p>A streak day is awarded seamlessly when you study for at least <strong>10 minutes</strong>. Activities from the Study Room and Dashboard are combined automatically.</p>
          </div>
        </div>

        {/* Right Side: Graph Area */}
        <div className="rounded-3xl border border-white/10 bg-black/30 p-6 shadow-xl backdrop-blur-md flex flex-col h-full min-h-[400px]">
          <h3 className="mb-6 flex items-center gap-2 text-sm font-bold text-[var(--cream)]">
            <Flame className="h-4 w-4 text-[var(--accent)]" />
            Study Minutes Analysis
          </h3>
          
          <div className="flex-1 w-full relative">
            {loading ? (
              <div className="absolute inset-0 flex items-center justify-center">
                 <Loader2 className="h-8 w-8 animate-spin text-[var(--accent)]" />
              </div>
            ) : dailyMinutes.length === 0 ? (
               <div className="absolute inset-0 flex items-center justify-center text-sm text-[var(--cream-muted)]">
                  No data to display for this month.
               </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyMinutes} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorMinutes" x1="0" y1="0" x2="0" y2="1">
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
                    interval="preserveStartEnd"
                  />
                  <YAxis 
                    stroke="#ffffff40" 
                    fontSize={11} 
                    tickLine={false} 
                    axisLine={false}
                  />
                  <RechartsTooltip content={<CustomTooltipArea />} cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1, strokeDasharray: '4 4' }} />
                  <ReferenceLine y={10} stroke="rgba(245,158,11,0.5)" strokeDasharray="3 3" label={{ position: 'top', value: '10 Min Goal', fill: 'rgba(245,158,11,0.8)', fontSize: 10 }} />
                  <Area 
                    type="monotone" 
                    dataKey="minutes" 
                    stroke="var(--accent)" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorMinutes)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
