"use client";

import { useState, useEffect } from "react";
import { Flame, ChevronLeft, ChevronRight, Trophy } from "lucide-react";

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

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-xl font-semibold text-[var(--cream)] md:text-2xl">
        My Streaks
      </h1>

      <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-white/10 bg-black/30 p-4">
        <div className="flex items-center gap-2 rounded-xl bg-amber-500/20 px-3 py-2">
          <Flame className="h-5 w-5 text-amber-400" />
          <span className="text-sm font-medium text-[var(--cream-muted)]">Current</span>
          <span className="text-lg font-bold text-amber-400">{currentStreak} days</span>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2">
          <Trophy className="h-5 w-5 text-[var(--accent)]" />
          <span className="text-sm font-medium text-[var(--cream-muted)]">Longest</span>
          <span className="text-lg font-bold text-[var(--cream)]">{longestStreak} days</span>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-black/30 p-4 md:p-6">
        <div className="mb-4 flex items-center justify-between">
          <button
            type="button"
            onClick={prevMonth}
            className="rounded-xl border border-white/10 p-2 text-[var(--cream-muted)] transition hover:bg-white/5 hover:text-[var(--cream)]"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h2 className="text-lg font-semibold text-[var(--cream)]">{monthLabel}</h2>
          <button
            type="button"
            onClick={nextMonth}
            className="rounded-xl border border-white/10 p-2 text-[var(--cream-muted)] transition hover:bg-white/5 hover:text-[var(--cream)]"
            aria-label="Next month"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[280px] border-collapse">
              <thead>
                <tr>
                  {WEEKDAYS.map((day) => (
                    <th
                      key={day}
                      className="border border-white/10 py-2 text-center text-xs font-medium text-[var(--cream-muted)]"
                    >
                      {day}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {grid.map((row, ri) => (
                  <tr key={ri}>
                    {row.map((day, di) => {
                      const key = day === null ? `e-${ri}-${di}` : dateKey(year, month, day);
                      const studied = day !== null && studiedDates.has(key);
                      return (
                        <td
                          key={key}
                          className={`border border-white/10 p-1 text-center transition md:p-2 ${
                            day === null
                              ? "bg-white/5"
                              : studied
                                ? "bg-amber-500/25 text-amber-200"
                                : "bg-black/20 text-[var(--cream-muted)]"
                          }`}
                        >
                          {day ?? ""}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="mt-3 text-center text-xs text-[var(--cream-muted)]">
          Highlighted days = you studied. Use &quot;I studied today&quot; on Dashboard or join a slot to log.
        </p>
      </div>
    </div>
  );
}
