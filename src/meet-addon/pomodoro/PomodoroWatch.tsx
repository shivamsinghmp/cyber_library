"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Play, Square } from "lucide-react";

const PRESETS = [15, 25, 45, 60] as const;
const MEET_ADDON_TOKEN_KEY = "vl_meet_addon_token";

function clampMinutes(n: number): number {
  if (!Number.isFinite(n)) return 25;
  return Math.min(180, Math.max(1, Math.round(n)));
}

type PomodoroWatchProps = {
  /** Meet meeting code / room id from `getMeetRoomId()` */
  roomKey: string;
  className?: string;
};

export function PomodoroWatch({ roomKey, className = "" }: PomodoroWatchProps) {
  const [minutes, setMinutes] = useState(25);
  const [totalSeconds, setTotalSeconds] = useState(25 * 60);
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [justFinished, setJustFinished] = useState(false);

  const secondsLeftRef = useRef(secondsLeft);
  const segmentPlannedRef = useRef(0);
  const completionSentRef = useRef(false);

  useEffect(() => {
    secondsLeftRef.current = secondsLeft;
  }, [secondsLeft]);

  const reportSession = useCallback(
    async (plannedSeconds: number, completedSeconds: number, completedFully: boolean) => {
      const token = typeof window !== "undefined" ? localStorage.getItem(MEET_ADDON_TOKEN_KEY) : null;
      if (!token) return;
      try {
        await fetch("/api/meet-addon/pomodoro-session", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            roomKey,
            plannedSeconds,
            completedSeconds,
            completedFully,
          }),
        });
      } catch {
        // ignore
      }
    },
    [roomKey]
  );

  const applyMinutes = useCallback((m: number) => {
    const next = clampMinutes(m);
    setMinutes(next);
    const sec = next * 60;
    setTotalSeconds(sec);
    setSecondsLeft(sec);
    setJustFinished(false);
  }, []);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          setRunning(false);
          setJustFinished(true);
          const planned = segmentPlannedRef.current;
          if (planned > 0 && !completionSentRef.current) {
            completionSentRef.current = true;
            void reportSession(planned, planned, true);
          }
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [running, reportSession]);

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");
  const progress = totalSeconds > 0 ? secondsLeft / totalSeconds : 0;

  const { size, stroke, r, c } = useMemo(() => {
    const size = 168;
    const stroke = 8;
    const r = (size - stroke) / 2;
    const c = 2 * Math.PI * r;
    return { size, stroke, r, c };
  }, []);

  const dashOffset = c * (1 - progress);

  function handleStart() {
    setJustFinished(false);
    completionSentRef.current = false;
    let remain = secondsLeft;
    if (remain <= 0) {
      const sec = minutes * 60;
      setTotalSeconds(sec);
      setSecondsLeft(sec);
      remain = sec;
    }
    segmentPlannedRef.current = remain;
    setRunning(true);
  }

  function handleStop() {
    setRunning(false);
    const planned = segmentPlannedRef.current;
    const remaining = secondsLeftRef.current;
    const completed = Math.max(0, planned - remaining);
    if (planned > 0 && completed > 0) {
      void reportSession(planned, completed, false);
    }
    completionSentRef.current = true;
  }

  return (
    <div className={`rounded-2xl border border-slate-600/80 bg-gradient-to-b from-slate-800/90 to-slate-900/95 p-4 shadow-xl shadow-black/30 ${className}`}>
      <p className="text-center text-[11px] font-medium uppercase tracking-[0.2em] text-slate-500 mb-3">Pomodoro</p>

      <div className="relative mx-auto flex items-center justify-center" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          className="rotate-[-90deg] drop-shadow-[0_0_12px_rgba(52,211,153,0.15)]"
          aria-hidden
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="rgb(51 65 85 / 0.85)"
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={justFinished ? "rgb(52 211 153)" : "rgb(16 185 129)"}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={dashOffset}
            className="transition-[stroke-dashoffset] duration-1000 ease-linear"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span
            className={`font-mono text-3xl font-semibold tabular-nums tracking-tight ${
              justFinished ? "text-emerald-400" : "text-slate-100"
            }`}
          >
            {mm}:{ss}
          </span>
          <span className="text-[10px] text-slate-500 mt-0.5">{running ? "Running" : justFinished ? "Done" : "Ready"}</span>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        <label className="block text-[11px] text-slate-500 uppercase tracking-wide">Minutes</label>
        <div className="flex flex-wrap gap-1.5 justify-center">
          {PRESETS.map((m) => (
            <button
              key={m}
              type="button"
              disabled={running}
              onClick={() => applyMinutes(m)}
              className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                minutes === m && !running
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-700/80 text-slate-300 hover:bg-slate-600 disabled:opacity-40"
              }`}
            >
              {m}m
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 justify-center">
          <input
            type="number"
            min={1}
            max={180}
            value={minutes}
            disabled={running}
            onChange={(e) => applyMinutes(Number(e.target.value))}
            className="w-20 rounded-lg border border-slate-600 bg-slate-900/80 px-2 py-1.5 text-center text-sm text-slate-100 disabled:opacity-50"
          />
          <span className="text-xs text-slate-500">min (1–180)</span>
        </div>

        <div className="flex gap-2 justify-center pt-1">
          <button
            type="button"
            onClick={handleStart}
            disabled={running}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:pointer-events-none text-white px-6 py-2.5 text-sm font-semibold shadow-lg shadow-emerald-900/40 min-w-[120px]"
          >
            <Play className="w-4 h-4 fill-current" />
            Start
          </button>
          <button
            type="button"
            onClick={handleStop}
            disabled={!running}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-500 bg-slate-800/90 hover:bg-slate-700 disabled:opacity-40 text-slate-200 px-6 py-2.5 text-sm font-semibold min-w-[120px]"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
            Stop
          </button>
        </div>
      </div>
    </div>
  );
}
