"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import toast from "react-hot-toast";
import {
  Coins, Check, AlertTriangle, Search, User as UserIcon,
  Calendar as CalendarIcon, TrendingUp, TrendingDown, Gift,
  Minus, Plus, X, Download, ChevronLeft, ChevronRight,
  Users, CircleDollarSign, Wallet, ArrowUpRight, ArrowDownRight,
  Loader2, Filter,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────

type ActionReward   = { actionKey: string; label: string; coins: number; isActive: boolean };
type StudentResult  = {
  id: string; studentId: string | null; name: string | null; email: string;
  profile: { fullName: string | null; coinBalance: number; phone: string | null } | null;
};
type OverviewStats  = {
  totalInCirculation: number; studentsWithCoins: number;
  totalIssued: number; totalSpent: number;
  todayCredits: number; todayDebits: number;
  last30Days: { date: string; credits: number; debits: number }[];
};
type StudentRow = {
  rank: number; id: string; name: string; email: string;
  studentId: string; coinBalance: number; lastTxnAt: string | null;
};
type TxnRow = {
  id: string; txnId: string | null; userId: string; userName: string;
  userEmail: string; studentId: string | null; coins: number;
  reason: string; balanceBefore: number | null; balanceAfter: number | null;
  adminId: string | null; adminName: string | null; createdAt: string;
};

const DEFAULT_RULES: ActionReward[] = [
  { actionKey: "25M_FOCUS_SESSION",        label: "25m Focus Session",        coins: 25, isActive: true },
  { actionKey: "POMODORO_CYCLE_COMPLETED", label: "Pomodoro Cycle Completed", coins: 2,  isActive: true },
  { actionKey: "QUIZ_CORRECT",             label: "Correct Quiz Answer",      coins: 1,  isActive: true },
  { actionKey: "TODO_COMPLETED",           label: "Completed a Daily Task",   coins: 1,  isActive: true },
  { actionKey: "STREAK_MAINTAINED",        label: "Maintained Study Streak",  coins: 1,  isActive: true },
  { actionKey: "TAB_AWAY_VIOLATION",       label: "Tab Away Penalty",         coins: -1, isActive: true },
];

function fmtNum(n: number) {
  return n.toLocaleString("en-IN");
}
function fmtDate(s: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
function fmtTime(s: string) {
  return new Date(s).toLocaleString("en-IN", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

// ── Mini bar chart component (CSS-only, no extra deps) ─────────────────────────
function MiniBarChart({ data }: { data: { date: string; credits: number; debits: number }[] }) {
  if (!data.length) return <p className="text-xs text-gray-400 py-4 text-center">No data yet</p>;
  const maxVal = Math.max(...data.flatMap(d => [d.credits, d.debits]), 1);
  const last14 = data.slice(-14);
  return (
    <div className="flex items-end gap-0.5 h-16 w-full">
      {last14.map(d => (
        <div key={d.date} className="flex flex-col items-center gap-0.5 flex-1" title={`${d.date}: +${d.credits} / -${d.debits}`}>
          <div className="w-full rounded-t bg-emerald-400 opacity-80 min-h-[2px]"
            style={{ height: `${(d.credits / maxVal) * 56}px` }} />
          <div className="w-full rounded-t bg-red-400 opacity-80 min-h-[2px]"
            style={{ height: `${(d.debits / maxVal) * 56}px` }} />
        </div>
      ))}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function CoinEnginePage() {

  // ── Existing: Rules ──────────────────────────────────────────────────────────
  const [rules, setRules]   = useState<ActionReward[]>(DEFAULT_RULES);
  const [rulesLoading, setRulesLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // ── Existing: Check-in config ────────────────────────────────────────────────
  const [checkinCoins, setCheckinCoins]     = useState(5);
  const [checkinInput, setCheckinInput]     = useState(5);
  const [savingCheckin, setSavingCheckin]   = useState(false);

  // ── Existing: Manual Award ───────────────────────────────────────────────────
  const [awardUserId, setAwardUserId]       = useState("");
  const [awardAmount, setAwardAmount]       = useState(0);
  const [awardReason, setAwardReason]       = useState("");
  const [awarding, setAwarding]             = useState(false);
  const [studentQuery, setStudentQuery]     = useState("");
  const [studentResults, setStudentResults] = useState<StudentResult[]>([]);
  const [studentSearching, setStudentSearching] = useState(false);
  const [selectedStudent, setSelectedStudent]   = useState<StudentResult | null>(null);
  const [showDropdown, setShowDropdown]         = useState(false);
  const searchRef    = useRef<HTMLDivElement>(null);
  const searchDebRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── NEW: Overview ────────────────────────────────────────────────────────────
  const [overview, setOverview]           = useState<OverviewStats | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(true);

  // ── NEW: Students Leaderboard ────────────────────────────────────────────────
  const [students, setStudents]           = useState<StudentRow[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [studentsQ, setStudentsQ]         = useState("");
  const [studentsPage, setStudentsPage]   = useState(1);
  const [studentsHasMore, setStudentsHasMore] = useState(false);
  const [studentsTotal, setStudentsTotal] = useState(0);

  // ── NEW: Transaction Log ─────────────────────────────────────────────────────
  const [txns, setTxns]             = useState<TxnRow[]>([]);
  const [txnLoading, setTxnLoading] = useState(false);
  const [txnType, setTxnType]       = useState("all");
  const [txnFrom, setTxnFrom]       = useState("");
  const [txnTo, setTxnTo]           = useState("");
  const [txnStudent, setTxnStudent] = useState("");
  const [txnPage, setTxnPage]       = useState(1);
  const [txnTotal, setTxnTotal]     = useState(0);
  const [txnHasMore, setTxnHasMore] = useState(false);

  // ── Mount ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchRules();
    fetchOverview();
    fetchStudents(1, "");
    fetchTxns(1, "all", "", "", "");
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleClickOutside(e: MouseEvent) {
    if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
      setShowDropdown(false);
    }
  }

  // ── Overview fetch ───────────────────────────────────────────────────────────
  async function fetchOverview() {
    setOverviewLoading(true);
    try {
      const res  = await fetch("/api/admin/coin-engine/overview", { credentials: "include" });
      const data = await res.json();
      if (res.ok) setOverview(data);
    } catch { /* silent */ }
    finally { setOverviewLoading(false); }
  }

  // ── Students leaderboard fetch ───────────────────────────────────────────────
  const fetchStudents = useCallback(async (p: number, q: string) => {
    setStudentsLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p) });
      if (q) params.set("q", q);
      const res  = await fetch(`/api/admin/coin-engine/students?${params}`, { credentials: "include" });
      const data = await res.json();
      if (res.ok) {
        setStudents(data.data ?? []);
        setStudentsHasMore(data.hasMore ?? false);
        setStudentsTotal(data.total ?? 0);
        setStudentsPage(p);
      }
    } catch { /* silent */ }
    finally { setStudentsLoading(false); }
  }, []);

  function handleStudentsSearch(e: React.FormEvent) {
    e.preventDefault();
    fetchStudents(1, studentsQ);
  }

  // ── Transactions log fetch ───────────────────────────────────────────────────
  const fetchTxns = useCallback(async (p: number, type: string, from: string, to: string, student: string) => {
    setTxnLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), type });
      if (from)    params.set("from",    from);
      if (to)      params.set("to",      to);
      if (student) params.set("student", student);
      const res  = await fetch(`/api/admin/coin-engine/transactions?${params}`, { credentials: "include" });
      const data = await res.json();
      if (res.ok) {
        setTxns(data.data ?? []);
        setTxnTotal(data.total ?? 0);
        setTxnHasMore(data.hasMore ?? false);
        setTxnPage(p);
      }
    } catch { /* silent */ }
    finally { setTxnLoading(false); }
  }, []);

  function applyTxnFilters(e?: React.FormEvent) {
    e?.preventDefault();
    fetchTxns(1, txnType, txnFrom, txnTo, txnStudent);
  }

  function resetTxnFilters() {
    setTxnType("all"); setTxnFrom(""); setTxnTo(""); setTxnStudent("");
    fetchTxns(1, "all", "", "", "");
  }

  // ── Rules ────────────────────────────────────────────────────────────────────
  async function fetchRules() {
    setRulesLoading(true);
    try {
      const res  = await fetch("/api/admin/coin-engine");
      const data = await res.json();
      if (res.ok) {
        const rulesArr = data.rules ?? data;
        if (Array.isArray(rulesArr) && rulesArr.length > 0) {
          const merged = DEFAULT_RULES.map(d => {
            const found = rulesArr.find((r: ActionReward) => r.actionKey === d.actionKey);
            return found ? { ...d, ...found } : d;
          });
          setRules(merged);
        }
        if (data.checkinCoins != null) { setCheckinCoins(data.checkinCoins); setCheckinInput(data.checkinCoins); }
      }
    } catch { toast.error("Failed to fetch coin rules."); }
    finally { setRulesLoading(false); }
  }

  function handleRuleChange(idx: number, field: keyof ActionReward, value: unknown) {
    const updated = [...rules];
    updated[idx] = { ...updated[idx], [field]: value };
    setRules(updated);
  }

  async function saveRules() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/coin-engine", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rules),
      });
      if (res.ok) toast.success("Coin Engine synchronized!");
      else toast.error("Failed to sync rules.");
    } catch { toast.error("Failed to sync rules."); }
    finally { setSaving(false); }
  }

  async function saveCheckinCoins(e: React.FormEvent) {
    e.preventDefault();
    if (checkinInput < 1) { toast.error("Minimum 1 coin required"); return; }
    setSavingCheckin(true);
    try {
      const res  = await fetch("/api/admin/coin-engine", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checkinCoins: checkinInput }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Failed"); return; }
      setCheckinCoins(data.checkinCoins);
      toast.success(`Daily check-in coins updated to ${data.checkinCoins}`);
    } catch { toast.error("Failed to save"); }
    finally { setSavingCheckin(false); }
  }

  // ── Manual award ─────────────────────────────────────────────────────────────
  async function handleAward(e: React.FormEvent) {
    e.preventDefault();
    if (!awardUserId.trim() || !awardAmount || !awardReason.trim()) { toast.error("Please fill all fields"); return; }
    setAwarding(true);
    try {
      const res  = await fetch("/api/admin/coin-engine/award", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: awardUserId.trim(), amount: awardAmount, reason: awardReason.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Failed"); return; }
      toast.success(`Done! New balance: ${data.newBalance} coins`);
      setSelectedStudent(prev => prev
        ? { ...prev, profile: prev.profile ? { ...prev.profile, coinBalance: data.newBalance } : prev.profile }
        : prev
      );
      setAwardAmount(0); setAwardReason("");
      fetchOverview();
      fetchStudents(1, studentsQ);
      fetchTxns(1, txnType, txnFrom, txnTo, txnStudent);
    } catch { toast.error("Failed to award coins"); }
    finally { setAwarding(false); }
  }

  function handleStudentQueryChange(val: string) {
    setStudentQuery(val); setShowDropdown(true);
    if (searchDebRef.current) clearTimeout(searchDebRef.current);
    if (val.trim().length < 2) { setStudentResults([]); return; }
    searchDebRef.current = setTimeout(async () => {
      setStudentSearching(true);
      try {
        const res  = await fetch(`/api/admin/coin-engine/user-lookup?q=${encodeURIComponent(val.trim())}`);
        const data = await res.json();
        setStudentResults(Array.isArray(data) ? data : []);
      } catch { setStudentResults([]); }
      finally { setStudentSearching(false); }
    }, 300);
  }

  function selectStudent(s: StudentResult) {
    setSelectedStudent(s); setAwardUserId(s.id);
    setStudentQuery(""); setStudentResults([]); setShowDropdown(false);
  }

  function clearSelectedStudent() {
    setSelectedStudent(null); setAwardUserId("");
    setStudentQuery(""); setStudentResults([]);
  }

  // ── Row color helper for transaction log ─────────────────────────────────────
  function txnRowClass(row: TxnRow) {
    if (row.adminId) return "bg-purple-50/40 hover:bg-purple-50";
    if (row.coins > 0) return "bg-emerald-50/30 hover:bg-emerald-50";
    return "bg-red-50/30 hover:bg-red-50";
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-6xl space-y-6">

      {/* Page header */}
      <div>
        <h1 className="text-3xl font-bold text-[var(--cream)] tracking-tight">Coin Management Engine</h1>
        <p className="mt-1 text-sm text-[var(--cream-muted)]">
          Platform-wide coin economy — rules, grants, audit log, and student leaderboard.
        </p>
      </div>

      {/* ── SECTION 1: Platform Overview Stats ── */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <CircleDollarSign className="h-5 w-5 text-amber-500" />
            <h2 className="text-base font-bold text-[var(--cream)]">Platform Wallet Overview</h2>
          </div>
          <button onClick={fetchOverview} className="text-xs text-[var(--cream-muted)] hover:text-[var(--accent)] flex items-center gap-1">
            <Loader2 className={`h-3 w-3 ${overviewLoading ? "animate-spin" : "hidden"}`} />
            Refresh
          </button>
        </div>

        {overviewLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-20 rounded-xl bg-gray-100 animate-pulse" />
            ))}
          </div>
        ) : overview ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {[
                { label: "In Circulation",      value: fmtNum(overview.totalInCirculation), icon: Wallet,          color: "text-amber-600",  bg: "bg-amber-50",   border: "border-amber-200" },
                { label: "Total Issued",         value: fmtNum(overview.totalIssued),        icon: ArrowUpRight,    color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200" },
                { label: "Total Spent",          value: fmtNum(overview.totalSpent),         icon: ArrowDownRight,  color: "text-red-500",     bg: "bg-red-50",     border: "border-red-200" },
                { label: "Students with Coins",  value: fmtNum(overview.studentsWithCoins),  icon: Users,           color: "text-indigo-600",  bg: "bg-indigo-50",  border: "border-indigo-200" },
                { label: "Today: Credits",       value: `+${fmtNum(overview.todayCredits)}`, icon: TrendingUp,      color: "text-teal-600",    bg: "bg-teal-50",    border: "border-teal-200",
                  sub: `−${fmtNum(overview.todayDebits)} debits` },
              ].map(({ label, value, icon: Icon, color, bg, border, sub }) => (
                <div key={label} className={`rounded-xl border ${border} ${bg} p-3`}>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[10px] font-semibold text-[var(--cream-muted)] uppercase tracking-wider leading-tight">{label}</p>
                    <Icon className={`h-3.5 w-3.5 ${color}`} />
                  </div>
                  <p className={`text-2xl font-extrabold ${color}`}>{value}</p>
                  {sub && <p className="text-[10px] text-red-500 mt-0.5">{sub}</p>}
                </div>
              ))}
            </div>

            {/* 30-day chart */}
            <div className="mt-5">
              <p className="text-xs font-semibold text-[var(--cream-muted)] mb-2 flex items-center gap-2">
                Last 30 Days Activity
                <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" /> Credits</span>
                <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400 inline-block" /> Debits</span>
              </p>
              <MiniBarChart data={overview.last30Days} />
            </div>
          </>
        ) : (
          <p className="text-sm text-[var(--cream-muted)]">Failed to load overview.</p>
        )}
      </div>

      {/* ── SECTION 2: Students Leaderboard ── */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-indigo-500" />
            <h2 className="text-base font-bold text-[var(--cream)]">Student Coin Leaderboard</h2>
          </div>
          <div className="flex gap-2">
            <form onSubmit={handleStudentsSearch} className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                <input
                  type="text" value={studentsQ} onChange={e => setStudentsQ(e.target.value)}
                  placeholder="Search name, email, ID…"
                  className="w-52 rounded-xl border border-gray-200 bg-gray-50 pl-8 pr-3 py-2 text-xs text-[var(--cream)] outline-none focus:border-[var(--accent)]"
                />
              </div>
              <button type="submit" className="rounded-xl bg-[var(--accent)] px-3 py-2 text-xs font-bold text-[var(--ink)] hover:opacity-90">Search</button>
            </form>
            <a
              href="/api/admin/coin-engine/students?export=csv"
              target="_blank"
              className="flex items-center gap-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition"
            >
              <Download className="h-3.5 w-3.5" /> CSV
            </a>
          </div>
        </div>

        <div className="overflow-x-auto">
          {studentsLoading ? (
            <div className="flex items-center justify-center py-10 gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-[var(--accent)]" />
              <span className="text-sm text-[var(--cream-muted)]">Loading…</span>
            </div>
          ) : students.length === 0 ? (
            <div className="py-10 text-center text-sm text-[var(--cream-muted)]">No students found.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-left">
                  {["Rank", "Student", "Student ID", "Coin Balance", "Last Activity", ""].map(h => (
                    <th key={h} className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {students.map(s => (
                  <tr key={s.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-4 py-3 text-sm font-bold text-gray-400">{s.rank <= 3
                      ? ["🥇","🥈","🥉"][s.rank - 1]
                      : `#${s.rank}`}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-[var(--cream)]">{s.name}</p>
                      <p className="text-xs text-[var(--cream-muted)]">{s.email}</p>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{s.studentId}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 font-bold text-amber-600 text-base">
                        <Coins className="h-4 w-4" /> {fmtNum(s.coinBalance)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">{fmtDate(s.lastTxnAt)}</td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => { setStudentQuery(""); setStudentResults([]); selectStudent({ id: s.id, studentId: s.studentId, name: s.name, email: s.email, profile: { fullName: s.name, coinBalance: s.coinBalance, phone: null } }); window.scrollTo({ top: document.getElementById("manual-award")?.offsetTop ?? 0, behavior: "smooth" }); }}
                        className="text-xs text-indigo-600 hover:underline"
                      >
                        Grant ↓
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination — always visible */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
          <button
            onClick={() => fetchStudents(studentsPage - 1, studentsQ)}
            disabled={studentsPage === 1 || studentsLoading}
            className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40"
          >
            <ChevronLeft className="h-3 w-3" /> Prev
          </button>
          <span className="text-xs text-[var(--cream-muted)]">
            Page {studentsPage}
            {studentsTotal > 0 && (
              <>
                {" · "}
                {(studentsPage - 1) * 50 + 1}–{Math.min(studentsPage * 50, studentsTotal)} of {fmtNum(studentsTotal)} students
              </>
            )}
          </span>
          <button
            onClick={() => fetchStudents(studentsPage + 1, studentsQ)}
            disabled={!studentsHasMore || studentsLoading}
            className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40"
          >
            Next <ChevronRight className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* ── SECTION 3: Coin Rules Editor (existing) ── */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-1 text-base font-bold text-[var(--cream)]">Coin Engine Rules</h2>
        <p className="mb-5 text-xs text-[var(--cream-muted)]">Control how many coins each action awards or deducts.</p>

        {rulesLoading ? (
          <p className="text-sm text-[var(--cream-muted)] animate-pulse">Loading rules…</p>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {rules.map((rule, idx) => (
                <div key={rule.actionKey}
                  className={`rounded-2xl border border-gray-100 bg-gray-50 p-4 transition-all hover:shadow-md hover:border-indigo-200 ${!rule.isActive && "opacity-60 grayscale"}`}>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-mono font-bold tracking-wider text-amber-700 uppercase bg-amber-100/80 px-2 py-0.5 rounded">
                      {rule.actionKey.replace(/_/g, " ")}
                    </span>
                    <label className="relative inline-flex cursor-pointer items-center">
                      <input type="checkbox" className="peer sr-only" checked={rule.isActive}
                        onChange={e => handleRuleChange(idx, "isActive", e.target.checked)} />
                      <div className="h-5 w-9 rounded-full bg-gray-200 peer-checked:bg-[var(--accent)] transition-colors" />
                      <div className="absolute left-[2px] top-[2px] h-4 w-4 rounded-full bg-white transition-all peer-checked:translate-x-full" />
                    </label>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-[var(--cream-muted)] font-medium mb-1">Label</label>
                      <input type="text" value={rule.label} onChange={e => handleRuleChange(idx, "label", e.target.value)}
                        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-[var(--cream)] outline-none focus:border-[var(--accent)]" />
                    </div>
                    <div>
                      <label className="block text-xs text-[var(--cream-muted)] font-medium mb-1">Coins</label>
                      <div className="relative">
                        <Coins className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${rule.coins < 0 ? "text-red-400" : "text-amber-400"}`} />
                        <input type="number" value={rule.coins}
                          onChange={e => handleRuleChange(idx, "coins", parseInt(e.target.value) || 0)}
                          className={`w-full rounded-xl border border-gray-200 pl-9 pr-3 py-2.5 text-xl font-black outline-none focus:border-[var(--accent)] ${rule.coins < 0 ? "text-red-600 bg-red-50" : "text-amber-500 bg-amber-50"}`} />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-between border-t border-gray-200 pt-4 gap-3">
              <p className="text-xs text-amber-600 flex items-center gap-1.5 bg-amber-50 px-3 py-2 rounded-lg">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                Changes apply instantly across the platform.
              </p>
              <button onClick={saveRules} disabled={saving}
                className="flex items-center gap-2 shrink-0 rounded-xl bg-[var(--accent)] px-6 py-2.5 text-sm font-bold text-[var(--ink)] hover:bg-amber-400 disabled:opacity-50 shadow">
                <Check className="h-4 w-4" />
                {saving ? "Saving…" : "Sync Engine Rules"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── SECTION 4: Daily Check-in Config (existing) ── */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100">
            <Coins className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[var(--cream)]">Daily Check-in Coins</h2>
            <p className="text-xs text-[var(--cream-muted)]">Currently <strong>{checkinCoins}</strong> coins · 7-day streak = +20 · 30-day = +100</p>
          </div>
        </div>
        <form onSubmit={saveCheckinCoins} className="flex items-end gap-3">
          <div>
            <label className="block text-xs font-semibold text-[var(--cream-muted)] mb-1">Coins per Day</label>
            <div className="relative">
              <Coins className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-amber-500" />
              <input type="number" min={1} max={1000} value={checkinInput}
                onChange={e => setCheckinInput(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-32 rounded-xl border border-gray-200 bg-gray-50 pl-9 pr-3 py-2.5 text-xl font-black text-amber-500 outline-none focus:border-[var(--accent)]" />
            </div>
          </div>
          <button type="submit" disabled={savingCheckin || checkinInput === checkinCoins}
            className="flex items-center gap-2 rounded-xl bg-[var(--accent)] px-5 py-2.5 text-sm font-bold text-[var(--ink)] hover:bg-amber-400 disabled:opacity-50 mb-0.5">
            <Check className="h-4 w-4" />
            {savingCheckin ? "Saving…" : "Save"}
          </button>
        </form>
      </div>

      {/* ── SECTION 5: Manual Award / Deduct (existing, enhanced) ── */}
      <div id="manual-award" className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100">
            <Gift className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[var(--cream)]">Manual Coin Award / Deduct</h2>
            <p className="text-xs text-[var(--cream-muted)]">Directly credit or debit any student's wallet — full audit trail maintained.</p>
          </div>
        </div>

        {/* Student search */}
        <div className="mb-4" ref={searchRef}>
          <label className="block text-xs font-semibold text-[var(--cream-muted)] mb-1">Student Search</label>
          {selectedStudent ? (
            <div className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-200 text-amber-800 font-bold text-sm shrink-0">
                  {(selectedStudent.profile?.fullName || selectedStudent.name || selectedStudent.email)[0].toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm text-[var(--cream)]">
                      {selectedStudent.profile?.fullName || selectedStudent.name || "—"}
                    </span>
                    {selectedStudent.studentId && (
                      <span className="text-[10px] font-mono bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded">
                        {selectedStudent.studentId}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs text-[var(--cream-muted)]">{selectedStudent.email}</span>
                    <span className="flex items-center gap-1 text-xs font-bold text-amber-600">
                      <Coins className="h-3 w-3" /> {selectedStudent.profile?.coinBalance ?? 0} coins
                    </span>
                  </div>
                </div>
              </div>
              <button type="button" onClick={clearSelectedStudent}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-200 text-amber-700 hover:bg-red-100 hover:text-red-600 transition">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              <input type="text" placeholder="Search by student ID, email, or name…"
                value={studentQuery} onChange={e => handleStudentQueryChange(e.target.value)}
                onFocus={() => studentQuery.length >= 2 && setShowDropdown(true)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 pl-9 pr-3 py-2.5 text-sm text-[var(--cream)] outline-none focus:border-[var(--accent)]" />
              {showDropdown && (studentSearching || studentResults.length > 0) && (
                <div className="absolute z-20 mt-1 w-full rounded-xl border border-gray-200 bg-white shadow-xl overflow-hidden">
                  {studentSearching ? (
                    <div className="px-4 py-3 text-xs text-[var(--cream-muted)] animate-pulse">Searching…</div>
                  ) : studentResults.map(s => (
                    <button key={s.id} type="button" onClick={() => selectStudent(s)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-amber-50 text-left border-b border-gray-50 last:border-0">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-600 font-bold text-xs">
                        {(s.profile?.fullName || s.name || s.email)[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-semibold text-[var(--cream)] block truncate">
                          {s.profile?.fullName || s.name || "—"}
                        </span>
                        <span className="text-xs text-[var(--cream-muted)] truncate block">{s.email}</span>
                      </div>
                      <span className="flex items-center gap-1 text-xs font-bold text-amber-600 shrink-0">
                        <Coins className="h-3 w-3" /> {s.profile?.coinBalance ?? 0}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {selectedStudent && (
          <form onSubmit={handleAward} className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-semibold text-[var(--cream-muted)] mb-1">
                Amount <span className="text-red-400">(negative = deduct)</span>
              </label>
              <div className="relative">
                <Coins className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-amber-500" />
                <input type="number" value={awardAmount || ""}
                  onChange={e => setAwardAmount(parseInt(e.target.value) || 0)}
                  placeholder="e.g. 50 or -10"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 pl-9 pr-3 py-2.5 text-sm text-[var(--cream)] outline-none focus:border-[var(--accent)]" />
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-[var(--cream-muted)] mb-1">Reason</label>
              <input type="text" placeholder="e.g. Contest win, Correction, Bonus"
                value={awardReason} onChange={e => setAwardReason(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-[var(--cream)] outline-none focus:border-[var(--accent)]" />
            </div>
            <div className="sm:col-span-3 flex items-center justify-between">
              {awardAmount !== 0 && selectedStudent.profile && (
                <p className="text-xs text-[var(--cream-muted)]">
                  Balance: <span className="font-bold text-amber-600">{selectedStudent.profile.coinBalance}</span>
                  {" → "}
                  <span className={`font-bold ${awardAmount < 0 ? "text-red-600" : "text-emerald-600"}`}>
                    {Math.max(0, (selectedStudent.profile.coinBalance ?? 0) + awardAmount)}
                  </span>
                  {awardAmount < 0 && (selectedStudent.profile.coinBalance ?? 0) + awardAmount < 0 && (
                    <span className="ml-2 text-red-500">(insufficient)</span>
                  )}
                </p>
              )}
              <button type="submit" disabled={awarding || !awardAmount || !awardReason.trim()}
                className={`ml-auto flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-bold transition disabled:opacity-50 ${awardAmount < 0 ? "bg-red-100 text-red-700 hover:bg-red-200" : "bg-amber-400 text-amber-900 hover:bg-amber-500 shadow"}`}>
                {awardAmount < 0 ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                {awarding ? "Processing…" : awardAmount < 0 ? "Deduct Coins" : "Award Coins"}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* ── SECTION 6: Full Transaction Log (enhanced passbook) ── */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-blue-500" />
            <div>
              <h2 className="text-base font-bold text-[var(--cream)]">Transaction Log</h2>
              <p className="text-xs text-[var(--cream-muted)]">{fmtNum(txnTotal)} total entries</p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Type filter */}
            <div className="flex gap-0.5 rounded-xl border border-gray-200 bg-gray-50 p-0.5">
              {[
                { key: "all",    label: "All" },
                { key: "credit", label: "Credits" },
                { key: "debit",  label: "Debits" },
                { key: "admin",  label: "Admin" },
              ].map(({ key, label }) => (
                <button key={key} type="button"
                  onClick={() => { setTxnType(key); fetchTxns(1, key, txnFrom, txnTo, txnStudent); }}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition ${
                    txnType === key
                      ? key === "credit" ? "bg-emerald-500 text-white"
                        : key === "debit" ? "bg-red-500 text-white"
                        : key === "admin" ? "bg-purple-500 text-white"
                        : "bg-[var(--accent)] text-[var(--ink)]"
                      : "text-[var(--cream-muted)] hover:text-[var(--cream)]"
                  }`}>
                  {label}
                </button>
              ))}
            </div>

            {/* Date range */}
            <input type="date" value={txnFrom} onChange={e => setTxnFrom(e.target.value)}
              className="rounded-xl border border-gray-200 bg-gray-50 px-2 py-1.5 text-xs text-[var(--cream)] outline-none focus:border-[var(--accent)]" />
            <span className="text-xs text-gray-400">to</span>
            <input type="date" value={txnTo} onChange={e => setTxnTo(e.target.value)}
              className="rounded-xl border border-gray-200 bg-gray-50 px-2 py-1.5 text-xs text-[var(--cream)] outline-none focus:border-[var(--accent)]" />

            {/* Student search */}
            <form onSubmit={applyTxnFilters} className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400" />
              <input type="text" value={txnStudent} onChange={e => setTxnStudent(e.target.value)}
                placeholder="Student…"
                className="w-28 rounded-xl border border-gray-200 bg-gray-50 pl-7 pr-2 py-1.5 text-xs text-[var(--cream)] outline-none focus:border-[var(--accent)]" />
            </form>

            <button onClick={applyTxnFilters}
              className="flex items-center gap-1 rounded-xl bg-[var(--accent)] px-3 py-1.5 text-xs font-bold text-[var(--ink)] hover:opacity-90">
              <Filter className="h-3 w-3" /> Apply
            </button>

            <button onClick={resetTxnFilters}
              className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50">
              Reset
            </button>

            {/* Export CSV */}
            <a
              href={`/api/admin/coin-engine/transactions?export=csv&type=${txnType}${txnFrom ? `&from=${txnFrom}` : ""}${txnTo ? `&to=${txnTo}` : ""}${txnStudent ? `&student=${encodeURIComponent(txnStudent)}` : ""}`}
              target="_blank"
              className="flex items-center gap-1 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition"
            >
              <Download className="h-3.5 w-3.5" /> CSV
            </a>
          </div>
        </div>

        <div className="overflow-x-auto">
          {txnLoading ? (
            <div className="flex items-center justify-center py-10 gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-[var(--accent)]" />
              <span className="text-sm text-[var(--cream-muted)]">Loading transactions…</span>
            </div>
          ) : txns.length === 0 ? (
            <div className="py-10 text-center text-sm text-[var(--cream-muted)]">No transactions match the filters.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-left">
                  {["Date", "Student", "Type", "Coins", "Balance", "Reason", "Admin"].map(h => (
                    <th key={h} className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {txns.map(row => (
                  <tr key={row.id} className={`transition-colors ${txnRowClass(row)}`}>
                    <td className="px-4 py-3 font-mono text-xs text-[var(--cream-muted)] whitespace-nowrap">
                      {fmtTime(row.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-[var(--cream)]">{row.userName}</p>
                      <p className="text-[10px] text-[var(--cream-muted)]">{row.studentId ?? row.userEmail}</p>
                    </td>
                    <td className="px-4 py-3">
                      {row.adminId
                        ? <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-700">Admin</span>
                        : row.coins > 0
                        ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700"><TrendingUp className="h-2.5 w-2.5" />Credit</span>
                        : <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-600"><TrendingDown className="h-2.5 w-2.5" />Debit</span>
                      }
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-sm">
                      <span className={row.coins > 0 ? "text-emerald-600" : "text-red-600"}>
                        {row.coins > 0 ? "+" : ""}{row.coins}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--cream-muted)] font-mono whitespace-nowrap">
                      {row.balanceBefore != null ? row.balanceBefore : "—"}
                      {" → "}
                      {row.balanceAfter  != null ? <span className="font-bold text-[var(--cream)]">{row.balanceAfter}</span> : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--cream-muted)] max-w-[180px] truncate">
                      {row.reason}
                    </td>
                    <td className="px-4 py-3 text-xs text-purple-600">
                      {row.adminName ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {(txnPage > 1 || txnHasMore) && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <button onClick={() => fetchTxns(txnPage - 1, txnType, txnFrom, txnTo, txnStudent)} disabled={txnPage === 1}
              className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40">
              <ChevronLeft className="h-3 w-3" /> Prev
            </button>
            <span className="text-xs text-[var(--cream-muted)]">Page {txnPage} · {fmtNum(txnTotal)} total</span>
            <button onClick={() => fetchTxns(txnPage + 1, txnType, txnFrom, txnTo, txnStudent)} disabled={!txnHasMore}
              className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40">
              Next <ChevronRight className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>

    </div>
  );
}
