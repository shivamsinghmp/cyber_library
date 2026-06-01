"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Video, Coins, Flame, Trophy, Key, ArrowRight, Activity, CalendarDays, Loader2, ExternalLink, Zap, CheckCircle2, Copy, Check } from "lucide-react";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";

type MeetAddonTask = {
  id: string;
  title: string;
  description: string | null;
  priority?: number;
  completedAt: string | null;
  taskDate: string;
};

type MeetAddonData = {
  todayTasks: MeetAddonTask[];
  gamification?: {
    totalCoins: number;
    streakDays: number;
    longestStreakDays: number;
    lastStudyOn: string | null;
  };
};

const HOW_TO_STEPS = [
  { num: "01", title: "Open Google Meet", desc: "Join your scheduled study room session via the Meet link." },
  { num: "02", title: "Launch the Add-on", desc: "Click the Let's Study icon in Meet's sidebar to open the panel." },
  { num: "03", title: "Enter Link Code", desc: "Generate a code below and paste it in the sidebar to sync your account." },
  { num: "04", title: "Start Focusing", desc: "Your Pomodoro timer, tasks, and coins all sync automatically." },
];

export default function MeetAddonPage() {
  const [meetAddonData, setMeetAddonData] = useState<MeetAddonData | null>(null);
  const [meetAddonLoading, setMeetAddonLoading] = useState(true);
  const [meetAddonCode, setMeetAddonCode] = useState<string | null>(null);
  const [meetAddonCodeLoading, setMeetAddonCodeLoading] = useState(false);
  const [meetAddonCodeExpiry, setMeetAddonCodeExpiry] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/dashboard/meet-addon", { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(d => d && setMeetAddonData(d))
      .catch(() => {})
      .finally(() => setMeetAddonLoading(false));
  }, []);

  function handleCopyCode() {
    if (!meetAddonCode) return;
    navigator.clipboard.writeText(meetAddonCode)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => toast.error("Copy failed"));
  }

  async function handleGetMeetAddonCode() {
    setMeetAddonCodeLoading(true);
    setMeetAddonCode(null);
    setMeetAddonCodeExpiry(null);
    try {
      const res = await fetch("/api/meet-addon/link-code", { method: "POST", credentials: "include" });
      const data = await res.json();
      if (res.ok && data.code) {
        setMeetAddonCode(data.code);
        setMeetAddonCodeExpiry(data.expiresInMinutes ?? 5);
      }
    } catch { toast.error("Could not generate code"); }
    finally { setMeetAddonCodeLoading(false); }
  }

  const gamification = meetAddonData?.gamification;

  const STAT_CARDS = [
    { icon: Coins, label: "Study Coins", value: gamification?.totalCoins ?? 0, color: "text-amber-600", bg: "bg-amber-50 border-amber-200", iconColor: "text-amber-500" },
    { icon: Flame, label: "Active Streak", value: `${gamification?.streakDays ?? 0}d`, color: "text-orange-600", bg: "bg-orange-50 border-orange-200", iconColor: "text-orange-500" },
    { icon: Trophy, label: "Best Streak", value: `${gamification?.longestStreakDays ?? 0}d`, color: "text-[var(--accent)]", bg: "bg-[var(--accent-pale)] border-[var(--accent-border)]", iconColor: "text-[var(--accent)]" },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-6">

      {/* ── Header ── */}
      <div className="bg-white rounded-2xl border border-[var(--border)] shadow-[var(--shadow-sm)] px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center">
            <Video className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-[var(--foreground)]">Meet Add-on</h1>
            <p className="text-xs text-[var(--muted-text)]">Connect your profile to Google Meet for live focus tracking</p>
          </div>
        </div>
        <Link href="/meet-addon/panel" target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[var(--border)] bg-[var(--page-bg)] text-sm font-semibold text-[var(--body-text)] hover:bg-[var(--accent-pale)] hover:text-[var(--accent)] hover:border-[var(--accent-border)] transition-all">
          Launch Add-on Panel <ExternalLink className="w-4 h-4" />
        </Link>
      </div>

      {/* ── Generate Code ── */}
      <div className="bg-white rounded-2xl border border-[var(--border)] shadow-[var(--shadow-sm)] overflow-hidden">
        <div className="px-6 py-5 border-b border-[var(--border)] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[var(--accent-pale)] border border-[var(--accent-border)] flex items-center justify-center">
              <Key className="w-4 h-4 text-[var(--accent)]" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[var(--foreground)]">Generate Link Code</h2>
              <p className="text-xs text-[var(--muted-text)]">Paste this code in the Meet sidebar to connect</p>
            </div>
          </div>
          <Zap className="w-5 h-5 text-[var(--accent-light)]" />
        </div>

        <div className="px-6 py-8 flex flex-col items-center text-center">
          <p className="text-sm text-[var(--muted-text)] max-w-md leading-relaxed mb-6">
            This temporary code syncs your Pomodoro timers, daily tasks, and study coins with the Google Meet sidebar — no password needed.
          </p>

          <AnimatePresence mode="wait">
            {meetAddonCode ? (
              <motion.div key="code"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-sm">
                <div className="rounded-2xl border-2 border-[var(--accent)] bg-[var(--accent-pale)] px-8 py-6 text-center">
                  <p className="text-xs font-bold text-[var(--accent)] uppercase tracking-widest mb-2">
                    Valid for {meetAddonCodeExpiry ?? 5} minutes
                  </p>
                  <p className="font-mono text-5xl font-black tracking-[0.25em] text-[var(--foreground)]">{meetAddonCode}</p>
                </div>
                {/* Copy + new code buttons */}
                <div className="flex items-center gap-2 mt-3">
                  <button
                    onClick={handleCopyCode}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm transition-all ${
                      copied
                        ? "bg-emerald-50 border border-emerald-200 text-emerald-600"
                        : "bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] shadow-[var(--shadow-brand)]"
                    }`}
                  >
                    {copied
                      ? <><Check className="w-4 h-4" /> Copied!</>
                      : <><Copy className="w-4 h-4" /> Copy Code</>
                    }
                  </button>
                  <button
                    onClick={() => { setMeetAddonCode(null); setCopied(false); }}
                    className="px-4 py-2.5 rounded-xl border border-[var(--border)] text-xs font-semibold text-[var(--muted-text)] hover:bg-[var(--page-bg)] transition-colors">
                    New Code
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.button key="btn"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={handleGetMeetAddonCode}
                disabled={meetAddonCodeLoading}
                className="w-full max-w-sm py-3.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-60 shadow-[var(--shadow-brand)] text-sm">
                {meetAddonCodeLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
                {meetAddonCodeLoading ? "Generating..." : "Generate Link Code"}
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Live Stats ── */}
      <div className="bg-white rounded-2xl border border-[var(--border)] shadow-[var(--shadow-sm)] p-6">
        <div className="flex items-center gap-2 mb-5">
          <Activity className="w-4 h-4 text-emerald-500" />
          <h2 className="text-sm font-bold text-[var(--foreground)]">Live Tracking Stats</h2>
        </div>

        {meetAddonLoading ? (
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map(i => <div key={i} className="h-28 rounded-2xl bg-[var(--page-bg)] animate-pulse border border-[var(--border)]" />)}
          </div>
        ) : gamification ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {STAT_CARDS.map(({ icon: Icon, label, value, color, bg, iconColor }) => (
              <div key={label} className={`rounded-2xl border ${bg} p-5 text-center`}>
                <div className={`w-10 h-10 rounded-xl ${bg} border flex items-center justify-center mx-auto mb-3`}>
                  <Icon className={`w-5 h-5 ${iconColor}`} />
                </div>
                <p className={`text-3xl font-black ${color}`}>{value}</p>
                <p className="text-xs font-semibold text-[var(--muted-text)] uppercase tracking-wide mt-1">{label}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--page-bg)] p-8 text-center text-sm text-[var(--muted-text)]">
            Unable to load stats. Please refresh.
          </div>
        )}

        <div className="mt-5 flex items-start gap-3 rounded-xl bg-blue-50 border border-blue-100 p-4">
          <CalendarDays className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
          <p className="text-sm text-blue-700 leading-relaxed">
            Your streak updates automatically when you maintain active study room presence for <strong>10+ minutes</strong>.
          </p>
        </div>
      </div>

      {/* ── How it Works ── */}
      <div className="bg-white rounded-2xl border border-[var(--border)] shadow-[var(--shadow-sm)] p-6">
        <div className="flex items-center gap-2 mb-5">
          <CheckCircle2 className="w-4 h-4 text-[var(--accent)]" />
          <h2 className="text-sm font-bold text-[var(--foreground)]">How It Works</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {HOW_TO_STEPS.map(({ num, title, desc }) => (
            <div key={num} className="flex items-start gap-3 p-4 rounded-xl bg-[var(--page-bg)] border border-[var(--border)] hover:border-[var(--accent-border)] hover:bg-[var(--accent-pale)]/30 transition-all">
              <span className="shrink-0 w-7 h-7 rounded-lg bg-[var(--accent)] text-white text-xs font-black flex items-center justify-center">{num}</span>
              <div>
                <p className="text-sm font-bold text-[var(--foreground)] mb-0.5">{title}</p>
                <p className="text-xs text-[var(--muted-text)] leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex justify-center">
          <Link href="/meet-addon/panel" target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-bold text-sm transition-all shadow-[var(--shadow-brand)]">
            Open Meet Add-on Panel <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
