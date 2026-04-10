"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Video, Coins, Flame, Trophy, Key, ArrowRight, Activity, CalendarDays } from "lucide-react";
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

export default function MeetAddonPage() {
  const [meetAddonData, setMeetAddonData] = useState<MeetAddonData | null>(null);
  const [meetAddonLoading, setMeetAddonLoading] = useState(true);
  const [meetAddonCode, setMeetAddonCode] = useState<string | null>(null);
  const [meetAddonCodeLoading, setMeetAddonCodeLoading] = useState(false);
  const [meetAddonCodeExpiry, setMeetAddonCodeExpiry] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/dashboard/meet-addon", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setMeetAddonData(d))
      .catch(() => {})
      .finally(() => setMeetAddonLoading(false));
  }, []);

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
    } catch {
      toast.error("Could not get code");
    } finally {
      setMeetAddonCodeLoading(false);
    }
  }

  // Framer Motion Variants
  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0, 
      transition: { duration: 0.5, staggerChildren: 0.1 } 
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1 }
  };

  return (
    <div className="mx-auto max-w-4xl pt-4 pb-12">
      <motion.div 
        initial="hidden" 
        animate="visible" 
        variants={containerVariants}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold tracking-tight text-[var(--cream)] md:text-4xl">Meet Add-on</h1>
        <p className="mt-2 text-[15px] text-[var(--cream-muted)]">Seamlessly connect your profile to Google Meet and track your focus hours instantly.</p>
      </motion.div>

      <motion.div 
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="relative overflow-hidden rounded-3xl border border-white/10 bg-black/40 shadow-2xl backdrop-blur-xl"
      >
        {/* Glow Header */}
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-[var(--accent)]/10 blur-2xl pointer-events-none" />

        <div className="relative p-6 sm:p-10">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-white/10 shadow-inner">
                <Video className="h-6 w-6 text-blue-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-[var(--cream)]">Secure Connection</h2>
                <p className="text-sm text-[var(--cream-muted)]">Link without password sharing</p>
              </div>
            </div>
            <Link
              href="/meet-addon/panel"
              target="_blank"
              rel="noopener noreferrer"
            >
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="group flex items-center gap-2 rounded-full border border-white/10 bg-white/5 auto px-5 py-2.5 text-sm font-medium text-[var(--cream)] shadow-lg transition-colors hover:bg-white/10"
              >
                Launch Add-on <ArrowRight className="h-4 w-4 text-[var(--cream-muted)] group-hover:text-white transition-colors" />
              </motion.button>
            </Link>
          </div>

          {/* Connection Code Generation Block */}
          <div className="mb-10 rounded-2xl border border-white/5 bg-black/60 p-1">
            <div className="rounded-xl bg-gradient-to-br from-white/5 to-transparent p-6 sm:p-8 flex flex-col items-center justify-center text-center">
              <Key className="h-8 w-8 text-[var(--cream-muted)] mb-4 opacity-70" />
              <h3 className="text-[17px] font-semibold text-[var(--cream)] mb-2">Generate Link Code</h3>
              <p className="max-w-md text-sm text-[var(--cream-muted)]/80 leading-relaxed mb-6">
                Paste this temporary code directly inside your Google Meet sidebar to sync your Pomodoro timers and tasks automatically.
              </p>
              
              <AnimatePresence mode="wait">
                {meetAddonCode ? (
                  <motion.div 
                    key="code"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="relative overflow-hidden rounded-2xl border border-[var(--accent)]/30 bg-[var(--accent)]/10 px-10 py-5 w-full max-w-sm"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-[var(--accent)]/0 via-[var(--accent)]/5 to-[var(--accent)]/0 animate-shimmer" />
                    <p className="text-xs font-semibold tracking-widest text-[var(--accent)] mb-1 uppercase">Valid for {meetAddonCodeExpiry ?? 5} Minutes</p>
                    <p className="font-mono text-4xl font-extrabold tracking-[0.2em] text-[var(--cream)] drop-shadow-md">{meetAddonCode}</p>
                  </motion.div>
                ) : (
                  <motion.button
                    key="button"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleGetMeetAddonCode}
                    disabled={meetAddonCodeLoading}
                    className="flex w-full max-w-sm items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[var(--accent)] to-emerald-400 py-3.5 text-sm font-bold text-black shadow-lg shadow-[var(--accent)]/20 transition-all hover:shadow-[var(--accent)]/40 disabled:opacity-70"
                  >
                    {meetAddonCodeLoading ? (
                      <span className="flex items-center gap-2">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/80 border-t-transparent" />
                        Generating Code...
                      </span>
                    ) : (
                      "Generate Link Code"
                    )}
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="border-t border-white/10" />

          {/* Gamification Stats Area */}
          <div className="pt-10">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-[var(--cream)] flex items-center gap-2">
                <Activity className="h-5 w-5 text-emerald-400" /> Live Tracking Stats
              </h3>
            </div>

            {meetAddonLoading ? (
               <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                 {[1, 2, 3].map(i => (
                   <div key={i} className="h-32 rounded-2xl border border-white/5 bg-white/5 animate-pulse" />
                 ))}
               </div>
            ) : meetAddonData ? (
              <motion.div 
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-1 sm:grid-cols-3 gap-6"
              >
                {/* Coins */}
                <motion.div variants={itemVariants} className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/5 to-transparent px-6 py-6 text-center hover:border-amber-500/30 transition-colors">
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Coins className="h-20 w-20 text-amber-500" />
                  </div>
                  <Coins className="mx-auto h-8 w-8 text-amber-400 mb-3 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]" />
                  <p className="text-3xl font-bold text-[var(--cream)] tabular-nums">
                    {meetAddonData.gamification?.totalCoins ?? 0}
                  </p>
                  <p className="text-[11px] font-semibold text-[var(--cream-muted)] uppercase tracking-widest mt-2">Study Coins</p>
                </motion.div>

                {/* Day Streak */}
                <motion.div variants={itemVariants} className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/5 to-transparent px-6 py-6 text-center hover:border-orange-500/30 transition-colors">
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Flame className="h-20 w-20 text-orange-500" />
                  </div>
                  <Flame className="mx-auto h-8 w-8 text-orange-400 mb-3 drop-shadow-[0_0_8px_rgba(251,146,60,0.5)]" />
                  <p className="text-3xl font-bold text-[var(--cream)] tabular-nums">
                    {meetAddonData.gamification?.streakDays ?? 0}
                  </p>
                  <p className="text-[11px] font-semibold text-[var(--cream-muted)] uppercase tracking-widest mt-2">Active Streak</p>
                </motion.div>

                {/* Longest Streak */}
                <motion.div variants={itemVariants} className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/5 to-transparent px-6 py-6 text-center hover:border-[var(--accent)]/30 transition-colors">
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Trophy className="h-20 w-20 text-[var(--accent)]" />
                  </div>
                  <Trophy className="mx-auto h-8 w-8 text-[var(--accent)] mb-3 drop-shadow-[0_0_8px_rgba(var(--accent-rgb),0.5)]" />
                  <p className="text-3xl font-bold text-[var(--cream)] tabular-nums">
                    {meetAddonData.gamification?.longestStreakDays ?? 0}
                  </p>
                  <p className="text-[11px] font-semibold text-[var(--cream-muted)] uppercase tracking-widest mt-2">Best Streak</p>
                </motion.div>
              </motion.div>
            ) : (
              <div className="rounded-2xl border border-white/5 bg-white/5 p-8 text-center text-[var(--cream-muted)]">
                Unable to load activity data. Please refresh.
              </div>
            )}
            
            <div className="mt-8 flex items-start gap-3 rounded-xl bg-blue-500/5 p-4 border border-blue-500/10">
              <CalendarDays className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
              <p className="text-sm text-[var(--cream-muted)]/90 leading-relaxed">
                Your streak updates automatically when you complete a task or maintain an active study room presence for <strong className="text-white">10+ minutes</strong> (UTC).
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
