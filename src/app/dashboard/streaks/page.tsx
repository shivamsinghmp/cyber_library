"use client";

import { useState, useEffect } from "react";
import { Flame, ChevronLeft, ChevronRight, Trophy, CalendarDays, Loader2, Info, Zap, Target } from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import { format, parseISO } from "date-fns";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

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
    if (row.length === 7) { rows.push(row); row = []; }
  }
  if (row.length) { while (row.length < 7) row.push(null); rows.push(row); }
  while (rows.length < 6) rows.push(Array(7).fill(null));
  return rows.slice(0, 6);
}

function dateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-white shadow-[var(--shadow-md)] p-3 text-sm">
        <p className="text-xs font-semibold text-[var(--muted-text)] mb-1">{label}</p>
        <p className="text-[var(--accent)] font-bold">{payload[0]?.value || 0} mins studied</p>
      </div>
    );
  }
  return null;
};

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
        const arr = (data.dailyMinutes ?? []).map((d: any) => ({
          date: d.date,
          displayDate: format(parseISO(d.date), "MMM dd"),
          minutes: d.minutes,
        }));
        setDailyMinutes(arr.sort((a: any, b: any) => a.date.localeCompare(b.date)));
      } catch { setStudiedDates(new Set()); }
      finally { setLoading(false); }
    }
    fetchData();
  }, [year, month]);

  const grid = getCalendarGrid(year, month);

  function prevMonth() { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); }
  function nextMonth() { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); }

  const daysStudied = studiedDates.size;

  return (
    <div className="mx-auto max-w-5xl space-y-6">

      {/* ── Page Header ── */}
      <div className="bg-white rounded-2xl border border-[var(--border)] shadow-[var(--shadow-sm)] px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center">
            <Flame className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-[var(--foreground)]">Study Streaks</h1>
            <p className="text-xs text-[var(--muted-text)]">Study 10+ mins/day to keep your streak alive</p>
          </div>
        </div>

        {/* Streak Stats */}
        <div className="flex gap-3">
          <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-amber-50 border border-amber-200">
            <Flame className="w-5 h-5 text-amber-500 shrink-0" />
            <div>
              <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wide">Current</p>
              <p className="text-xl font-black text-amber-700">{currentStreak} <span className="text-sm font-medium text-amber-500">days</span></p>
            </div>
          </div>
          <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-[var(--accent-pale)] border border-[var(--accent-border)]">
            <Trophy className="w-5 h-5 text-[var(--accent)] shrink-0" />
            <div>
              <p className="text-[10px] font-bold text-[var(--accent)] uppercase tracking-wide">Best</p>
              <p className="text-xl font-black text-[var(--accent)]">{longestStreak} <span className="text-sm font-medium text-[var(--accent-light)]">days</span></p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Quick Stats ── */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { icon: CalendarDays, label: "Days Studied", value: daysStudied, color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200", iconColor: "text-emerald-500" },
          { icon: Target, label: "Current Streak", value: `${currentStreak}d`, color: "text-amber-600", bg: "bg-amber-50 border-amber-200", iconColor: "text-amber-500" },
          { icon: Zap, label: "Best Streak", value: `${longestStreak}d`, color: "text-[var(--accent)]", bg: "bg-[var(--accent-pale)] border-[var(--accent-border)]", iconColor: "text-[var(--accent)]" },
        ].map(({ icon: Icon, label, value, color, bg, iconColor }) => (
          <div key={label} className="bg-white rounded-2xl border border-[var(--border)] shadow-[var(--shadow-sm)] px-5 py-4 text-center">
            <div className={`w-9 h-9 rounded-xl ${bg} border flex items-center justify-center mx-auto mb-2`}>
              <Icon className={`w-4 h-4 ${iconColor}`} />
            </div>
            <div className={`text-2xl font-black ${color}`}>{value}</div>
            <div className="text-xs font-medium text-[var(--muted-text)] mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ── Calendar ── */}
        <div className="bg-white rounded-2xl border border-[var(--border)] shadow-[var(--shadow-sm)] p-6">
          <div className="flex items-center justify-between mb-5">
            <button onClick={prevMonth} className="w-8 h-8 rounded-xl border border-[var(--border)] bg-[var(--page-bg)] flex items-center justify-center text-[var(--muted-text)] hover:bg-[var(--accent-pale)] hover:text-[var(--accent)] transition-all">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <h2 className="text-sm font-bold text-[var(--foreground)] flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-[var(--accent)]" />
              {MONTHS[month]} {year}
            </h2>
            <button onClick={nextMonth} className="w-8 h-8 rounded-xl border border-[var(--border)] bg-[var(--page-bg)] flex items-center justify-center text-[var(--muted-text)] hover:bg-[var(--accent-pale)] hover:text-[var(--accent)] transition-all">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {loading ? (
            <div className="flex h-64 items-center justify-center"><Loader2 className="w-7 h-7 animate-spin text-[var(--accent)]" /></div>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  {WEEKDAYS.map(d => (
                    <th key={d} className="py-2 text-center text-[10px] font-bold uppercase tracking-wider text-[var(--muted-text)]">{d}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {grid.map((row, ri) => (
                  <tr key={ri} className="h-12">
                    {row.map((day, di) => {
                      const key = day === null ? `e-${ri}-${di}` : dateKey(year, month, day);
                      const studied = day !== null && studiedDates.has(key);
                      return (
                        <td key={key} className="p-0.5 text-center">
                          {day !== null ? (
                            <div className={`mx-auto relative flex h-9 w-9 items-center justify-center rounded-xl text-sm font-semibold transition-all ${
                              studied
                                ? "bg-amber-500 text-white shadow-[0_2px_8px_rgba(245,158,11,0.4)]"
                                : "bg-[var(--page-bg)] text-[var(--body-text)] hover:bg-[var(--accent-pale)] hover:text-[var(--accent)]"
                            }`}>
                              {day}
                              {studied && <Flame className="absolute -top-1 -right-1 w-3 h-3 text-amber-200 fill-amber-200" />}
                            </div>
                          ) : <div className="mx-auto h-9 w-9" />}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-blue-50 border border-blue-100 p-3 text-xs text-blue-700 leading-relaxed">
            <Info className="w-4 h-4 shrink-0 mt-0.5 text-blue-500" />
            Study for at least <strong>10 minutes</strong> in a session to count as a streak day. Sessions from Study Room and Dashboard are combined.
          </div>
        </div>

        {/* ── Study Minutes Chart ── */}
        <div className="bg-white rounded-2xl border border-[var(--border)] shadow-[var(--shadow-sm)] p-6 flex flex-col">
          <div className="flex items-center gap-2 mb-5">
            <Flame className="w-4 h-4 text-[var(--accent)]" />
            <h3 className="text-sm font-bold text-[var(--foreground)]">Study Minutes — {MONTHS[month]}</h3>
          </div>

          <div className="flex-1 min-h-[260px] relative">
            {loading ? (
              <div className="absolute inset-0 flex items-center justify-center"><Loader2 className="w-7 h-7 animate-spin text-[var(--accent)]" /></div>
            ) : dailyMinutes.length === 0 ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center gap-2">
                <div className="text-3xl">📊</div>
                <p className="text-sm font-semibold text-[var(--foreground)]">No data this month</p>
                <p className="text-xs text-[var(--muted-text)]">Start studying to see your chart</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyMinutes} margin={{ top: 10, right: 5, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gMinutes" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366F1" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                  <XAxis dataKey="displayDate" stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} dy={8} interval="preserveStartEnd" />
                  <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} />
                  <RechartsTooltip content={<CustomTooltip />} cursor={{ stroke: "#E2E8F0", strokeWidth: 1 }} />
                  <ReferenceLine y={10} stroke="#F59E0B" strokeDasharray="4 4" label={{ value: "10m goal", fill: "#F59E0B", fontSize: 10, position: "top" }} />
                  <Area type="monotone" dataKey="minutes" stroke="#6366F1" strokeWidth={2} fill="url(#gMinutes)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Month Summary */}
          {dailyMinutes.length > 0 && (
            <div className="mt-4 pt-4 border-t border-[var(--border)] grid grid-cols-2 gap-3">
              <div className="text-center">
                <p className="text-lg font-black text-[var(--accent)]">
                  {Math.round(dailyMinutes.reduce((s, d) => s + d.minutes, 0) / 60 * 10) / 10}h
                </p>
                <p className="text-xs text-[var(--muted-text)]">Total this month</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-black text-amber-500">
                  {Math.round(dailyMinutes.reduce((s, d) => s + d.minutes, 0) / Math.max(1, dailyMinutes.length))}m
                </p>
                <p className="text-xs text-[var(--muted-text)]">Avg per day</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
