"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import {
  Flame,
  Clock,
  Target,
  Video,
  Megaphone,
  BookOpen,
  ChevronRight,
  CheckCircle,
  Receipt,
  Gift,
  Trophy,
  LogIn,
  Play,
  Square,
  UserPlus,
  Copy,
  Link2,
  ClipboardList,
  CalendarCheck,
  CalendarX,
} from "lucide-react";

type DashboardStats = {
  currentStreak: number;
  longestStreak: number;
  totalStudyHours: number;
  hoursToday: number;
  sessionsToday: number;
  goalCountdown: number | null;
  targetYear: number | null;
  targetExam: string | null;
  totalAttendance: number;
  totalUnattendance: number;
};

type StudyRoomItem = {
  id: string;
  roomId: string | null;
  name: string;
  timeLabel: string;
  capacity: number;
  price?: number;
  goal?: string | null;
};

type SubscribedRoom = {
  id: string;
  studySlotId: string;
  endDate?: string;
  room: {
    id: string;
    roomId: string | null;
    name: string;
    timeLabel: string;
    isActive: boolean;
    meetLink?: string;
  };
};

type TransactionItem = {
  id: string;
  transactionId: string;
  amount: number;
  currency: string;
  status: string;
  orderDetails: { slotId: string; name: string; price: number }[] | null;
  createdAt: string;
};

type RewardWin = {
  id: string;
  status: string;
  wonAt: string;
  reward: { id: string; name: string; amount: number; type: string };
};

type LeaderboardEntry = {
  rank: number;
  userId: string;
  name: string;
  weeklyMinutes: number;
  weeklyHours: number;
};

type ReferredUser = {
  id: string;
  name: string;
  email: string;
  joinedAt: string;
  rewarded: boolean;
};

const NOTICES = [
  "New weekend marathon session from 6 AM – 6 PM.",
  "Maintenance: Sunday 2–3 AM. Rooms may be briefly unavailable.",
  "Share your feedback: feedback@virtuallibrary.com",
];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

export function DashboardContent({ userName }: { userName: string }) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [studyRooms, setStudyRooms] = useState<StudyRoomItem[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [subscribedRooms, setSubscribedRooms] = useState<SubscribedRoom[]>([]);
  const [subsLoading, setSubsLoading] = useState(true);
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [txnLoading, setTxnLoading] = useState(true);
  const [rewards, setRewards] = useState<RewardWin[]>([]);
  const [rewardsLoading, setRewardsLoading] = useState(true);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(true);
  const [checkingInSlotId, setCheckingInSlotId] = useState<string | null>(null);
  const [activeSession, setActiveSession] = useState<{ id: string; startedAt: string } | null>(null);
  const [sessionElapsedSeconds, setSessionElapsedSeconds] = useState(0);
  const [stoppingSession, setStoppingSession] = useState(false);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [referralLink, setReferralLink] = useState<string | null>(null);
  const [referredUsers, setReferredUsers] = useState<ReferredUser[]>([]);
  const [referralLoading, setReferralLoading] = useState(true);
  const [referralGenerating, setReferralGenerating] = useState(false);

  useEffect(() => {
    fetch("/api/study/session", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : {}))
      .then((data: { activeSession?: { id: string; startedAt: string } | null }) => {
        setActiveSession(data.activeSession ?? null);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!activeSession?.startedAt) return;
    const started = new Date(activeSession.startedAt).getTime();
    const tick = () => setSessionElapsedSeconds(Math.floor((Date.now() - started) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [activeSession?.id, activeSession?.startedAt]);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch("/api/dashboard/stats");
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch {
        setStats(null);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  useEffect(() => {
    setRoomsLoading(true);
    fetch("/api/slots", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : []))
      .then((data: StudyRoomItem[]) => {
        setStudyRooms(Array.isArray(data) ? data : []);
      })
      .catch(() => setStudyRooms([]))
      .finally(() => setRoomsLoading(false));
  }, []);

  useEffect(() => {
    setSubsLoading(true);
    fetch("/api/user/subscriptions", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : []))
      .then((data: SubscribedRoom[]) => {
        setSubscribedRooms(Array.isArray(data) ? data : []);
      })
      .catch(() => setSubscribedRooms([]))
      .finally(() => setSubsLoading(false));
  }, []);

  useEffect(() => {
    setTxnLoading(true);
    fetch("/api/user/transactions", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : []))
      .then((data: TransactionItem[]) => {
        setTransactions(Array.isArray(data) ? data : []);
      })
      .catch(() => setTransactions([]))
      .finally(() => setTxnLoading(false));
  }, []);

  useEffect(() => {
    setRewardsLoading(true);
    fetch("/api/user/rewards", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : []))
      .then((data: RewardWin[]) => {
        setRewards(Array.isArray(data) ? data : []);
      })
      .catch(() => setRewards([]))
      .finally(() => setRewardsLoading(false));
  }, []);

  useEffect(() => {
    setLeaderboardLoading(true);
    fetch("/api/dashboard/leaderboard", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : { leaderboard: [] }))
      .then((data: { leaderboard?: LeaderboardEntry[] }) => {
        setLeaderboard(Array.isArray(data.leaderboard) ? data.leaderboard : []);
      })
      .catch(() => setLeaderboard([]))
      .finally(() => setLeaderboardLoading(false));
  }, []);

  useEffect(() => {
    setReferralLoading(true);
    fetch("/api/user/referral", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : {}))
      .then((data: { referralCode?: string; referralLink?: string; referredUsers?: ReferredUser[] }) => {
        setReferralCode(data.referralCode ?? null);
        setReferralLink(data.referralLink ?? null);
        setReferredUsers(Array.isArray(data.referredUsers) ? data.referredUsers : []);
      })
      .catch(() => {})
      .finally(() => setReferralLoading(false));
  }, []);

  async function handleGenerateReferral() {
    setReferralGenerating(true);
    try {
      const res = await fetch("/api/user/referral", { method: "POST", credentials: "include" });
      const data = await res.json();
      if (res.ok) {
        setReferralCode(data.referralCode ?? null);
        setReferralLink(data.referralLink ?? null);
        toast.success("Referral link ready! Share it with friends.");
      } else toast.error(data.error || "Could not generate link");
    } catch {
      toast.error("Could not generate link");
    } finally {
      setReferralGenerating(false);
    }
  }

  function copyReferralLink() {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink).then(
      () => toast.success("Link copied!"),
      () => toast.error("Copy failed")
    );
  }

  const enrolledRoomIds = new Set(subscribedRooms.map((s) => s.studySlotId));
  const totalRewardAmount = rewards.reduce((s, w) => s + w.reward.amount, 0);

  async function handleStartStudy(meetLink: string) {
    window.open(meetLink, "_blank", "noopener,noreferrer");
    try {
      const res = await fetch("/api/study/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "START" }),
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok && data.session) {
        setActiveSession({ id: data.session.id, startedAt: data.session.startedAt });
      } else {
        toast.error(data.error || "Could not start session");
      }
    } catch {
      toast.error("Could not start session");
    }
  }

  async function handleStopSession() {
    setStoppingSession(true);
    try {
      const res = await fetch("/api/study/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "STOP" }),
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok) {
        setActiveSession(null);
        setSessionElapsedSeconds(0);
        if (stats) setStats({ ...stats, hoursToday: stats.hoursToday + (data.session?.durationMinutes ?? 0) / 60 });
        fetch("/api/dashboard/stats").then((r) => r.ok && r.json()).then((d) => d && setStats(d)).catch(() => {});
        fetch("/api/dashboard/leaderboard").then((r) => r.ok && r.json()).then((d) => d?.leaderboard && setLeaderboard(d.leaderboard)).catch(() => {});
        toast.success(`Session saved. ${data.session?.durationMinutes ?? 0} min recorded.`);
      } else {
        toast.error(data.error || "Could not stop session");
      }
    } catch {
      toast.error("Could not stop session");
    } finally {
      setStoppingSession(false);
    }
  }

  function formatElapsed(seconds: number) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    return `${m}:${String(s).padStart(2, "0")}`;
  }

  async function handleCheckIn(studySlotId: string) {
    setCheckingInSlotId(studySlotId);
    try {
      const res = await fetch("/api/study/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studySlotId }),
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Checked in! Attendance recorded.");
      } else {
        toast.error(data.error || "Check-in failed");
      }
    } catch {
      toast.error("Check-in failed");
    } finally {
      setCheckingInSlotId(null);
    }
  }
  const pendingRewards = rewards.filter((w) => w.status === "PENDING");

  const [studiedDates, setStudiedDates] = useState<Set<string>>(new Set());
  useEffect(() => {
    const now = new Date();
    const m = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    fetch(`/api/study/streak-calendar?month=${m}`)
      .then((r) => r.json())
      .then((d) => setStudiedDates(new Set(d.studiedDates ?? [])))
      .catch(() => {});
  }, []);

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startDay = first.getDay();
  const daysInMonth = last.getDate();
  const weeks: (number | null)[][] = [];
  let row: (number | null)[] = Array(startDay).fill(null);
  for (let d = 1; d <= daysInMonth; d++) {
    row.push(d);
    if (row.length === 7) {
      weeks.push(row);
      row = [];
    }
  }
  if (row.length) {
    while (row.length < 7) row.push(null);
    weeks.push(row);
  }
  const monthWeeks = weeks.slice(0, 4);
  const dateKey = (d: number) =>
    `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

  return (
    <div className="mx-auto max-w-6xl space-y-6 lg:flex lg:gap-6">
      <div className="min-w-0 flex-1 space-y-6">
        {/* Welcome + Stat Cards */}
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="space-y-4"
        >
          <motion.h1
            variants={item}
            className="text-xl font-semibold text-[var(--cream)] md:text-2xl"
          >
            Welcome, {userName}!
          </motion.h1>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <motion.div variants={item}>
              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/30 p-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400">
                  <Flame className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-medium text-[var(--cream-muted)]">
                    Current Streak
                  </p>
                  <p className="text-xl font-bold text-[var(--cream)]">
                    {loading ? "—" : (stats?.currentStreak ?? 0)} days
                  </p>
                </div>
              </div>
            </motion.div>
            <motion.div variants={item}>
              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/30 p-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--accent)]/20 text-[var(--accent)]">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-medium text-[var(--cream-muted)]">
                    Hours Today
                  </p>
                  <p className="text-xl font-bold text-[var(--cream)]">
                    {loading ? "—" : (stats?.hoursToday ?? 0)}h
                  </p>
                </div>
              </div>
            </motion.div>
            <motion.div variants={item}>
              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/30 p-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/20 text-blue-400">
                  <BookOpen className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-medium text-[var(--cream-muted)]">
                    Total Study Hours
                  </p>
                  <p className="text-xl font-bold text-[var(--cream)]">
                    {loading ? "—" : (stats?.totalStudyHours ?? 0)}h
                  </p>
                </div>
              </div>
            </motion.div>
            <motion.div variants={item}>
              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/30 p-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
                  <CalendarCheck className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-medium text-[var(--cream-muted)]">
                    Total Attendance
                  </p>
                  <p className="text-xl font-bold text-[var(--cream)]">
                    {loading ? "—" : (stats?.totalAttendance ?? 0)} days
                  </p>
                </div>
              </div>
            </motion.div>
            <motion.div variants={item}>
              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/30 p-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-500/20 text-red-400">
                  <CalendarX className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-medium text-[var(--cream-muted)]">
                    Total Unattendance
                  </p>
                  <p className="text-xl font-bold text-[var(--cream)]">
                    {loading ? "—" : (stats?.totalUnattendance ?? 0)} days
                  </p>
                </div>
              </div>
            </motion.div>
            <motion.div variants={item}>
              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/30 p-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
                  <Target className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-medium text-[var(--cream-muted)]">
                    Goal Countdown
                  </p>
                  <p className="text-xl font-bold text-[var(--cream)]">
                    {loading
                      ? "—"
                      : stats?.goalCountdown != null
                        ? `${stats.goalCountdown} days`
                        : "—"}
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* Active study session widget */}
        {activeSession && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-[var(--accent)]/40 bg-[var(--accent)]/10 p-4 flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--accent)]/30">
                <Clock className="h-6 w-6 text-[var(--accent)]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--cream)]">Study session in progress</p>
                <p className="font-mono text-2xl font-bold text-[var(--accent)] tabular-nums">
                  {formatElapsed(sessionElapsedSeconds)}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleStopSession}
              disabled={stoppingSession}
              className="flex items-center gap-2 rounded-xl bg-red-500/20 px-4 py-2.5 text-sm font-semibold text-red-300 hover:bg-red-500/30 disabled:opacity-50"
            >
              <Square className="h-4 w-4" />
              {stoppingSession ? "Stopping…" : "Stop session"}
            </button>
          </motion.div>
        )}

        {/* Student Form button */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Link
            href="/dashboard/student-form"
            className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black/30 p-4 transition hover:border-[var(--accent)]/30 hover:bg-black/40"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--accent)]/20 text-[var(--accent)]">
                <ClipboardList className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium text-[var(--cream)]">Student Form</p>
                <p className="text-xs text-[var(--cream-muted)]">Fill the form shared by admin</p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 shrink-0 text-[var(--cream-muted)]" />
          </Link>
        </motion.div>

        {/* My Subscribed Study Rooms */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl border border-white/10 bg-black/30 p-4 md:p-6"
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[var(--cream)]">
              My Rooms
            </h2>
            <Link
              href="/study-room"
              className="flex items-center gap-1 text-xs font-medium text-[var(--accent)] hover:underline"
            >
              Browse more
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          {subsLoading ? (
            <p className="rounded-xl border border-white/10 bg-black/20 px-4 py-6 text-center text-sm text-[var(--cream-muted)]">
              Loading your rooms…
            </p>
          ) : subscribedRooms.length === 0 ? (
            <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-8 text-center flex flex-col items-center">
              <p className="text-sm text-[var(--cream-muted)] mb-3">
                You haven't subscribed to any study rooms yet.
              </p>
              <Link href="/study-room" className="inline-flex rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--ink)] transition hover:opacity-90">
                Explore Study Rooms
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {subscribedRooms.map((sub) => {
                const isExpired = sub.endDate ? new Date(sub.endDate) < new Date() : false;
                const daysLeft = sub.endDate ? Math.ceil((new Date(sub.endDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24)) : 30;

                return (
                  <div
                    key={sub.id}
                    className="flex flex-col justify-between rounded-xl border border-white/10 bg-black/20 p-4 transition hover:border-[var(--accent)]/40 relative overflow-hidden"
                  >
                    {isExpired && (
                      <div className="absolute top-0 left-0 right-0 h-1 bg-red-500" />
                    )}
                    <div className="flex items-center gap-2">
                      <Video className={`h-4 w-4 ${isExpired ? "text-red-400" : "text-[var(--accent)]"}`} />
                      <span className="text-sm font-medium text-[var(--cream)]">
                        {sub.room.name}
                      </span>
                    </div>
                    {sub.room.roomId && (
                      <p className="mt-0.5 font-mono text-[10px] text-[var(--cream-muted)]">
                        {sub.room.roomId}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-[var(--cream-muted)]">{sub.room.timeLabel}</p>
                    
                    <div className="mt-3 flex items-center justify-between">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          isExpired
                            ? "bg-red-500/15 text-red-400"
                            : daysLeft <= 3
                            ? "bg-amber-500/15 text-amber-300"
                            : "bg-emerald-500/15 text-emerald-300"
                        }`}
                      >
                        {isExpired ? "Expired" : `Valid for ${Math.max(0, daysLeft)} days`}
                      </span>
                    </div>

                    <div className="mt-4 flex flex-col gap-2">
                      {sub.room.meetLink ? (
                        <button
                          type="button"
                          onClick={() => !isExpired && handleStartStudy(sub.room.meetLink!)}
                          disabled={isExpired || !!activeSession}
                          className={`w-full rounded-xl py-2 text-center text-sm font-semibold transition flex items-center justify-center gap-2 ${isExpired || activeSession ? 'bg-white/5 text-white/40 cursor-not-allowed border border-white/10' : 'bg-[var(--accent)] text-[var(--ink)] hover:bg-[var(--accent-hover)] shadow-lg hover:shadow-[var(--accent)]/20'}`}
                        >
                          <Play className="w-4 h-4" />
                          {activeSession ? "Session in progress…" : "Start Study"}
                        </button>
                      ) : (
                        <button
                          disabled
                          className="w-full rounded-xl py-2 text-center text-sm font-semibold bg-white/5 text-[var(--cream-muted)]/50 cursor-not-allowed border border-white/5"
                        >
                          No Meet Link Set
                        </button>
                      )}
                      {!isExpired && (
                        <button
                          type="button"
                          onClick={() => handleCheckIn(sub.studySlotId)}
                          disabled={checkingInSlotId === sub.studySlotId}
                          className="w-full rounded-xl py-2 text-center text-sm font-semibold border border-[var(--accent)]/50 text-[var(--accent)] hover:bg-[var(--accent)]/10 flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          <LogIn className="w-4 h-4" />
                          {checkingInSlotId === sub.studySlotId ? "Checking in…" : "Check-in"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </motion.section>

        {/* Reward Program */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.24 }}
          className="rounded-2xl border border-white/10 bg-black/30 p-4 md:p-6"
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-[var(--cream)]">
              <Gift className="h-5 w-5 text-[var(--accent)]" />
              Reward Program
            </h2>
            <Link
              href="/dashboard/rewards"
              className="flex items-center gap-1 text-xs font-medium text-[var(--accent)] hover:underline"
            >
              My Rewards
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          {rewardsLoading ? (
            <p className="rounded-xl border border-white/10 bg-black/20 px-4 py-6 text-center text-sm text-[var(--cream-muted)]">
              Loading…
            </p>
          ) : rewards.length === 0 ? (
            <p className="rounded-xl border border-white/10 bg-black/20 px-4 py-6 text-center text-sm text-[var(--cream-muted)]">
              No rewards yet. Win streaks, contests, or referrals to earn amounts!
            </p>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-xl border border-[var(--accent)]/20 bg-[var(--accent)]/10 px-4 py-3">
                <span className="text-sm font-medium text-[var(--cream)]">Total won</span>
                <span className="text-lg font-bold text-[var(--accent)]">₹{totalRewardAmount}</span>
              </div>
              {pendingRewards.length > 0 && (
                <p className="text-xs text-amber-300/90">
                  {pendingRewards.length} pending reward(s) — amount will be credited when marked paid.
                </p>
              )}
              {rewards.slice(0, 3).map((w) => (
                <Link
                  key={w.id}
                  href="/dashboard/rewards"
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 transition hover:border-[var(--accent)]/30"
                >
                  <span className="text-sm font-medium text-[var(--cream)]">{w.reward.name}</span>
                  <span className="text-sm font-semibold text-[var(--cream)]">₹{w.reward.amount}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${w.status === "PAID" ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-300"}`}>
                    {w.status}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </motion.section>

        {/* Recent Transactions */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="rounded-2xl border border-white/10 bg-black/30 p-4 md:p-6"
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[var(--cream)]">
              Recent Transactions
            </h2>
            <Link
              href="/dashboard/transactions"
              className="flex items-center gap-1 text-xs font-medium text-[var(--accent)] hover:underline"
            >
              View all
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          {txnLoading ? (
            <p className="rounded-xl border border-white/10 bg-black/20 px-4 py-6 text-center text-sm text-[var(--cream-muted)]">
              Loading…
            </p>
          ) : transactions.length === 0 ? (
            <p className="rounded-xl border border-white/10 bg-black/20 px-4 py-6 text-center text-sm text-[var(--cream-muted)]">
              No transactions yet. Orders will appear here after checkout.
            </p>
          ) : (
            <div className="space-y-2">
              {transactions.slice(0, 5).map((txn) => (
                <Link
                  key={txn.id}
                  href="/dashboard/transactions"
                  className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 transition hover:border-[var(--accent)]/30"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <Receipt className="h-4 w-4 shrink-0 text-[var(--accent)]" />
                    <span className="truncate font-mono text-sm font-medium text-[var(--cream)]">
                      {txn.transactionId}
                    </span>
                  </div>
                  <span className="shrink-0 text-sm font-semibold text-[var(--cream)]">
                    ₹{txn.amount}
                  </span>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      txn.status === "SUCCESS"
                        ? "bg-emerald-500/15 text-emerald-300"
                        : "bg-amber-500/15 text-amber-300"
                    }`}
                  >
                    {txn.status}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </motion.section>

        {/* Refer & Earn */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.26 }}
          className="rounded-2xl border border-white/10 bg-black/30 p-4 md:p-6"
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-[var(--cream)]">
              <UserPlus className="h-5 w-5 text-[var(--accent)]" />
              Refer & Earn
            </h2>
          </div>
          {referralLoading ? (
            <p className="rounded-xl border border-white/10 bg-black/20 px-4 py-6 text-center text-sm text-[var(--cream-muted)]">
              Loading…
            </p>
          ) : !referralCode ? (
            <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-6 text-center">
              <p className="text-sm text-[var(--cream-muted)] mb-4">
                Apna referral link banao — jitne friends is link se sign up karenge, unka data yahan dikhega.
              </p>
              <button
                type="button"
                onClick={handleGenerateReferral}
                disabled={referralGenerating}
                className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[var(--ink)] hover:opacity-90 disabled:opacity-50"
              >
                <Link2 className="h-4 w-4" />
                {referralGenerating ? "Generating…" : "Generate referral link"}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-[var(--accent)]/20 bg-[var(--accent)]/10 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-[var(--cream-muted)]">Your referral link</p>
                  <p className="truncate font-mono text-sm text-[var(--cream)]">{referralLink}</p>
                </div>
                <button
                  type="button"
                  onClick={copyReferralLink}
                  className="shrink-0 flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm font-medium text-[var(--cream)] hover:bg-white/20"
                >
                  <Copy className="h-4 w-4" />
                  Copy link
                </button>
              </div>
              <div>
                <p className="mb-2 text-sm font-medium text-[var(--cream)]">
                  Referred friends ({referredUsers.length})
                </p>
                {referredUsers.length === 0 ? (
                  <p className="rounded-xl border border-white/10 bg-black/20 px-4 py-4 text-center text-xs text-[var(--cream-muted)]">
                    Abhi koi aapke link se sign up nahi kiya. Link share karo!
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {referredUsers.map((u) => (
                      <li
                        key={u.id}
                        className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm"
                      >
                        <span className="font-medium text-[var(--cream)] truncate">{u.name}</span>
                        <span className="text-xs text-[var(--cream-muted)] shrink-0 ml-2">
                          {new Date(u.joinedAt).toLocaleDateString()}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </motion.section>

        {/* Bottom: Streak Calendar + Notice Board */}
        <div className="grid gap-6 lg:grid-cols-2">
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="rounded-2xl border border-white/10 bg-black/30 p-4 md:p-6"
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[var(--cream)]">
                Monthly Streak Calendar
              </h2>
              <Link
                href="/dashboard/streaks"
                className="flex items-center gap-1 text-xs font-medium text-[var(--accent)] hover:underline"
              >
                View all
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[200px] border-collapse text-center text-xs">
                <thead>
                  <tr>
                    {WEEKDAYS.map((w, wi) => (
                      <th
                        key={`weekday-${wi}`}
                        className="border border-white/10 py-1 text-[var(--cream-muted)]"
                      >
                        {w}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {monthWeeks.map((week, wi) => (
                    <tr key={wi}>
                      {week.map((day, di) => {
                        const studied =
                          day !== null && studiedDates.has(dateKey(day));
                        return (
                          <td
                            key={`cell-${wi}-${di}`}
                            className={`border border-white/10 py-0.5 ${
                              day === null
                                ? "bg-white/5"
                                : studied
                                  ? "bg-amber-500/30 text-amber-200"
                                  : "text-[var(--cream-muted)]"
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
            <Link
              href="/dashboard/streaks"
              className="mt-3 block text-center text-xs font-medium text-[var(--accent)] hover:underline"
            >
              Full calendar →
            </Link>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="rounded-2xl border border-white/10 bg-black/30 p-4 md:p-6"
          >
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-[var(--cream)]">
              <Megaphone className="h-5 w-5 text-[var(--accent)]" />
              Notice Board
            </h2>
            <ul className="space-y-3">
              {NOTICES.map((notice, i) => (
                <li
                  key={i}
                  className="rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-[var(--cream-muted)]"
                >
                  {notice}
                </li>
              ))}
            </ul>
          </motion.section>
        </div>
      </div>

      {/* Right Sidebar: Leaderboard + Recommended Products */}
      <motion.aside
        initial={{ opacity: 0, x: 16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.4 }}
        className="mt-6 shrink-0 lg:mt-0 lg:w-72 space-y-6"
      >
        <div className="rounded-2xl border border-white/10 bg-black/30 p-4 md:p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-base font-semibold text-[var(--cream)]">
              <Trophy className="h-4 w-4 text-amber-400" />
              Study Leaderboard
            </h2>
            <Link href="/dashboard/leaderboard" className="text-xs font-medium text-[var(--accent)] hover:underline">
              View full
            </Link>
          </div>
          <p className="mb-3 text-xs text-[var(--cream-muted)]">
            Top study hours this week
          </p>
          {leaderboardLoading ? (
            <p className="rounded-xl border border-white/10 bg-black/20 px-3 py-4 text-center text-xs text-[var(--cream-muted)]">
              Loading…
            </p>
          ) : leaderboard.length === 0 ? (
            <p className="rounded-xl border border-white/10 bg-black/20 px-3 py-4 text-center text-xs text-[var(--cream-muted)]">
              No activity yet. Start studying to appear here!
            </p>
          ) : (
            <ul className="space-y-2">
              {leaderboard.map((entry) => (
                <li
                  key={entry.userId}
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm"
                >
                  <span className="flex items-center gap-2">
                    <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                      entry.rank === 1 ? "bg-amber-500/30 text-amber-300" :
                      entry.rank === 2 ? "bg-white/20 text-[var(--cream)]" :
                      entry.rank === 3 ? "bg-amber-700/30 text-amber-200" :
                      "bg-white/10 text-[var(--cream-muted)]"
                    }`}>
                      {entry.rank}
                    </span>
                    <span className="truncate font-medium text-[var(--cream)]">{entry.name}</span>
                  </span>
                  <span className="shrink-0 text-xs font-semibold text-[var(--accent)]">{entry.weeklyHours}h</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </motion.aside>
    </div>
  );
}
