"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import DashboardCharts from "@/components/DashboardCharts";
import { PlantLeaderboard } from "@/components/PlantLeaderboard";
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
  Coins,
  History,
  Timer,
  Activity,
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
  totalAbsent: number;
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
  pastTasks?: MeetAddonTask[];
  pollResponses: { id: string; question: string; answer: string; createdAt: string }[];
  coinLogs?: { id: string; coins: number; reason: string; createdAt: string; roomId: string | null }[];
  focusSessions?: {
    id: string;
    workMinutes: number;
    breakMinutes: number;
    cycles: number;
    startedAt: string;
    endedAt: string | null;
    roomTitle: string | null;
    roomKey: string;
  }[];
  presenceSessions?: {
    id: string;
    roomKey: string;
    roomTitle: string | null;
    startedAt: string;
    endedAt: string | null;
    lastHeartbeatAt: string;
    durationSeconds: number | null;
    active: boolean;
  }[];
  pomodoroTimerSessions?: {
    id: string;
    roomKey: string;
    roomTitle: string | null;
    plannedSeconds: number;
    completedSeconds: number;
    completedFully: boolean;
    startedAt: string;
    endedAt: string;
  }[];
  gamification?: {
    totalCoins: number;
    streakDays: number;
    longestStreakDays: number;
    lastStudyOn: string | null;
  };
};

function meetAddonPriorityLabel(p: number | undefined): string {
  if (p === 1) return "High";
  if (p === 3) return "Normal";
  return "Medium";
}

function formatMeetAddonDate(isoDate: string): string {
  const d = new Date(`${isoDate}T12:00:00.000Z`);
  return d.toLocaleDateString(undefined, { weekday: "short", year: "numeric", month: "short", day: "numeric" });
}

function groupPastTasksByDate(tasks: MeetAddonTask[]): [string, MeetAddonTask[]][] {
  const map = new Map<string, MeetAddonTask[]>();
  for (const t of tasks) {
    const key = t.taskDate;
    const arr = map.get(key);
    if (arr) arr.push(t);
    else map.set(key, [t]);
  }
  return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
}

function formatPresenceDuration(seconds: number | null): string {
  if (seconds == null) return "—";
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m < 60) return s > 0 ? `${m}m ${s}s` : `${m}m`;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return mm > 0 ? `${h}h ${mm}m` : `${h}h`;
}

function formatPomodoroSeconds(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m <= 0) return `${s}s`;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

function formatHoursToHMS(decimalHours: number): React.ReactNode {
  if (!decimalHours || Number.isNaN(decimalHours)) {
    return (
      <span className="flex items-baseline flex-wrap leading-tight tabular-nums">
        <span key="h">0<span className="text-[0.6em] text-[var(--wood)] font-extrabold ml-0.5 mr-1.5 uppercase tracking-widest">h</span></span>
        <span key="m">0<span className="text-[0.6em] text-[var(--wood)] font-extrabold ml-0.5 mr-1.5 uppercase tracking-widest">m</span></span>
        <span key="s">0<span className="text-[0.6em] text-[var(--wood)] font-extrabold ml-0.5 uppercase tracking-widest">s</span></span>
      </span>
    );
  }
  
  const totalSeconds = Math.round(decimalHours * 3600);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  
  return (
    <span className="flex items-baseline flex-wrap leading-tight tabular-nums">
      {h > 0 && <span key="h">{h}<span className="text-[0.6em] text-[var(--wood)] font-extrabold ml-0.5 mr-1.5 uppercase tracking-widest">h</span></span>}
      <span key="m">{m}<span className="text-[0.6em] text-[var(--wood)] font-extrabold ml-0.5 mr-1.5 uppercase tracking-widest">m</span></span>
      <span key="s">{s}<span className="text-[0.6em] text-[var(--wood)] font-extrabold ml-0.5 uppercase tracking-widest">s</span></span>
    </span>
  );
}

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

const DAILY_QUOTES = [
  "Every minute you invest today is a down payment on your ultimate success.",
  "Intensity gets you started, but consistency is what makes you unstoppable.",
  "The pain of discipline is nothing compared to the pain of regret. Keep pushing.",
  "Average efforts yield average results. Push beyond the limits and dominate.",
  "Your future self is watching you right now through memories. Make them proud.",
  "Distractions are the enemy of greatness. Lock in and secure your target.",
  "Genius is just relentless dedication in disguise. Keep refining your craft.",
  "Success is rented, not owned. And the rent is due every single day.",
  "Sacrifice the temporary comfort of today for the permanent victory of tomorrow.",
  "Small, invisible steps today lead to undeniable dominance tomorrow.",
  "When you feel like stopping, remember exactly why you started.",
  "Doubt kills more dreams than failure ever will. Believe in your grind.",
  "Focus on the step in front of you, not the entire mountain.",
  "The only difference between a dream and reality is a deadline and action.",
  "Rest if you must, but do not quit. The finish line is closer than it looks.",
  "Pressure makes diamonds. Embrace the grind and shine under the weight.",
  "To be in the 1%, you must be willing to do what the 99% won't.",
  "Time is your most valuable asset. Spend it building your future empire.",
  "You don't have to be extreme, just consistent. Consistency compounds.",
  "Let your success make the noise. Work relentlessly in silence.",
  "If it was easy, everyone would do it. Hard work is your ultimate advantage.",
  "Champions are built in the empty hours when nobody is watching.",
  "Every difficult concept mastered is another weapon in your intellectual arsenal.",
  "Your focus determines your reality. Turn off the noise and execute.",
  "Don't count the days, make the days count. Maximize today's potential.",
  "Action is the foundational key to all success. Keep moving forward.",
  "You are the architect of your own life. Build something unbreakable.",
  "A year from now, you will wish you had started today. You are right on time.",
  "Tough times never last, but tough people do. Crush the challenges ahead.",
  "Greatness is a lot of small things done extraordinarily well on a daily basis.",
  "Push yourself beyond the limit, because no one else is going to do it for you."
];

function getDynamicGreeting(name: string) {
  const hour = new Date().getHours();
  if (hour < 12) return <><span className="text-white/80">Rise and conquer,</span> <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--accent)] to-amber-300">{name}</span>.</>;
  if (hour < 17) return <><span className="text-white/80">Keep the momentum,</span> <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--accent)] to-amber-300">{name}</span>.</>;
  return <><span className="text-white/80">Evening grind,</span> <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--accent)] to-amber-300">{name}</span>.</>;
}

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

  useEffect(() => {
    function fetchSession() {
      fetch("/api/study/session", { credentials: "include" })
        .then((r) => (r.ok ? r.json() : {}))
        .then((data: { activeSession?: { id: string; startedAt: string } | null }) => {
          // Compare with existing state so we don't trigger unnecessary re-renders
          setActiveSession((prev) => {
            if (!prev && data.activeSession) return data.activeSession;
            if (prev && !data.activeSession) return null;
            if (prev && data.activeSession && prev.id !== data.activeSession.id) return data.activeSession;
            return prev;
          });
        })
        .catch(() => {});
    }
    fetchSession();
    // Poll every 5 seconds to catch Meet Addon pushes quickly
    const id = setInterval(fetchSession, 5000);
    return () => clearInterval(id);
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
        // preserve existing if failed silently
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
    // Poll stats every 30 seconds to update external Add-on hours
    const id = setInterval(fetchStats, 30000);
    return () => clearInterval(id);
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

  const liveHoursToday = (stats?.hoursToday ?? 0) + (activeSession ? sessionElapsedSeconds / 3600 : 0);
  const liveTotalStudyHours = (stats?.totalStudyHours ?? 0) + (activeSession ? sessionElapsedSeconds / 3600 : 0);
  
  // Get daily quote based on the day of the month (1-31)
  const currentDayIndex = new Date().getDate() - 1;
  const todayQuote = DAILY_QUOTES[currentDayIndex] || DAILY_QUOTES[0];

  return (
    <div className="mx-auto max-w-7xl space-y-4 pb-4">
      {/* Hero Welcome Section */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="relative overflow-hidden rounded-[1.5rem] border border-[var(--accent)]/30 bg-gradient-to-br from-black/80 via-black/40 to-black/80 p-5 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.8)] backdrop-blur-2xl"
      >
        <div className="absolute -left-10 -top-10 h-32 w-32 rounded-full bg-[var(--accent)]/10 blur-[50px] pointer-events-none" />
        <div className="absolute -bottom-16 -right-16 h-40 w-40 rounded-full bg-blue-500/10 blur-[60px] pointer-events-none" />
        
        <div className="relative z-10 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <motion.h1 variants={item} className="text-xl font-extrabold tracking-tight md:text-2xl">
              {getDynamicGreeting(userName)}
            </motion.h1>
            <motion.p variants={item} className="text-xs text-[var(--cream-muted)] max-w-xl leading-relaxed italic border-l-2 border-[var(--accent)]/50 pl-2 mt-2">
              "{todayQuote}"
            </motion.p>
          </div>
          
          {stats?.goalCountdown != null && (
            <motion.div variants={item} className="flex shrink-0 items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-2.5 backdrop-blur-md">
               <div className="flex flex-col items-center justify-center h-10 w-10 rounded-[0.8rem] bg-[var(--accent)]/20 text-[var(--accent)] border border-[var(--accent)]/30 shadow-[0_0_15px_rgba(var(--accent-rgb),0.3)]">
                 <Target className="h-5 w-5" />
               </div>
               <div>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-[var(--cream-muted)]">Target Countdown</p>
                  <p className="text-2xl font-extrabold text-[var(--cream)] tabular-nums leading-none mt-0.5">
                    {stats.goalCountdown} <span className="text-xs font-medium text-[var(--cream-muted)]">days</span>
                  </p>
               </div>
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Primary Metrics Grid */}
      <motion.div variants={container} initial="hidden" animate="show" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Metric 1 */}
        <motion.div variants={item} className="group relative overflow-hidden rounded-[1.5rem] border border-white/5 bg-black/40 p-4 shadow-lg backdrop-blur-xl transition-all hover:bg-black/60">
           <div className="absolute -right-8 -top-8 h-20 w-20 rounded-full bg-amber-500/10 blur-[30px]" />
           <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-[0.8rem] bg-amber-500/10 text-amber-400 border border-amber-500/20">
             <Flame className="h-5 w-5" />
           </div>
           <p className="text-xs font-bold uppercase tracking-wider text-[var(--cream-muted)]">Current Streak</p>
           <p className="mt-1.5 flex items-baseline gap-2 text-2xl font-extrabold text-[var(--cream)] tracking-tight">
             {loading ? "—" : (stats?.currentStreak ?? 0)} <span className="text-xs font-semibold text-amber-500/80">days</span>
           </p>
        </motion.div>

        {/* Metric 2 */}
        <motion.div variants={item} className="group relative overflow-hidden rounded-[1.5rem] border border-white/5 bg-black/40 p-4 shadow-lg backdrop-blur-xl transition-all hover:bg-black/60">
           <div className="absolute -right-8 -top-8 h-20 w-20 rounded-full bg-[var(--accent)]/10 blur-[30px]" />
           <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-[0.8rem] bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20">
             <Clock className="h-5 w-5" />
           </div>
           <p className="text-xs font-bold uppercase tracking-wider text-[var(--cream-muted)]">Hours Today</p>
           <div className="mt-1.5 flex items-baseline gap-2 text-2xl font-extrabold text-[var(--cream)] tracking-tight">
             {loading ? "—" : formatHoursToHMS(liveHoursToday)}
           </div>
        </motion.div>

        {/* Metric 3 */}
        <motion.div variants={item} className="group relative overflow-hidden rounded-[1.5rem] border border-white/5 bg-black/40 p-4 shadow-lg backdrop-blur-xl transition-all hover:bg-black/60">
           <div className="absolute -right-8 -top-8 h-20 w-20 rounded-full bg-blue-500/10 blur-[30px]" />
           <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-[0.8rem] bg-blue-500/10 text-blue-400 border border-blue-500/20">
             <BookOpen className="h-5 w-5" />
           </div>
           <p className="text-xs font-bold uppercase tracking-wider text-[var(--cream-muted)]">Total Hours</p>
           <div className="mt-1.5 flex items-baseline gap-2 text-2xl font-extrabold text-[var(--cream)] tracking-tight">
             {loading ? "—" : formatHoursToHMS(liveTotalStudyHours)}
           </div>
        </motion.div>

        {/* Metric 4 */}
        <motion.div variants={item} className="group relative overflow-hidden rounded-[1.5rem] border border-white/5 bg-black/40 p-4 shadow-lg backdrop-blur-xl transition-all hover:bg-black/60">
           <div className="absolute -right-8 -top-8 h-20 w-20 rounded-full bg-emerald-500/10 blur-[30px]" />
           <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-[0.8rem] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
             <CalendarCheck className="h-5 w-5" />
           </div>
           <p className="text-xs font-bold uppercase tracking-wider text-[var(--cream-muted)]">Attendance</p>
           <p className="mt-1.5 flex items-baseline gap-2 text-2xl font-extrabold text-[var(--cream)] tracking-tight">
             {loading ? "—" : (stats?.totalAttendance ?? 0)} <span className="text-xs font-semibold text-emerald-500/80">days</span>
           </p>
        </motion.div>
      </motion.div>

      {/* Active Session Pulsing Banner */}
      {activeSession && (
        <motion.div
           initial={{ opacity: 0, scale: 0.95, y: 10 }}
           animate={{ opacity: 1, scale: 1, y: 0 }}
           className="relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-[1.5rem] border border-red-500/50 bg-gradient-to-r from-red-500/10 via-black/80 to-red-500/10 p-4 shadow-[0_0_30px_rgba(239,68,68,0.2)] backdrop-blur-3xl before:absolute before:inset-0 before:bg-red-500/5 before:animate-pulse"
        >
           <div className="relative z-10 flex items-center gap-4">
             <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-500/20 relative">
               <div className="absolute inset-0 rounded-xl border-2 border-red-500/50 animate-ping opacity-75"></div>
               <Timer className="h-6 w-6 text-red-500" />
             </div>
             <div>
               <div className="flex items-center gap-2 mb-0.5">
                 <div className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse"></div>
                 <p className="text-[10px] font-bold uppercase tracking-widest text-red-400">Live Session</p>
               </div>
               <p className="font-mono text-3xl font-extrabold text-[var(--cream)] tabular-nums tracking-tighter">
                 {formatElapsed(sessionElapsedSeconds)}
               </p>
             </div>
           </div>
           <button
             type="button"
             onClick={handleStopSession}
             disabled={stoppingSession}
             className="relative z-10 group flex items-center gap-2 rounded-xl bg-red-500 px-6 py-2.5 text-sm font-bold uppercase tracking-wider text-white shadow-[0_0_20px_rgba(239,68,68,0.5)] transition-all hover:bg-red-600 hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
           >
             <Square className="h-4 w-4 fill-white/20" />
             {stoppingSession ? "Stopping…" : "End Session"}
           </button>
        </motion.div>
      )}

      {/* Performance Charts Section */}
      <DashboardCharts />

      {/* Global Plant Leaderboard */}
      <motion.div variants={item} className="mt-8">
        <PlantLeaderboard limit={5} />
      </motion.div>
    </div>
  );
}
