"use client";

import { useState, useCallback } from "react";
import {
  Search, User, Mail, Phone, Coins, Flame, Trophy,
  Clock, Users, CreditCard, LayoutDashboard, Wallet,
  BookOpen, Settings, Puzzle, Star, ExternalLink,
  Loader2, AlertCircle, CalendarDays, ShieldCheck,
  ListOrdered, History,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
type StudentResult = {
  id: string; studentId: string | null; name: string; email: string;
  phone: string | null; role: string; createdAt: string; trialUsed: boolean;
  coinBalance: number; currentStreak: number; longestStreak: number;
  totalStudyHours: number; referralCount: number;
  subscription: { planType: string; endDate: string; daysLeft: number } | null;
};

type AccessLog = {
  id: string; adminName: string; studentName: string | null; studentUniqueId: string | null;
  pageAccessed: string; action: string; accessedAtIST: string;
};

// ── Page Grid Config ───────────────────────────────────────────────────────────
const PAGES = [
  { label: "Main Dashboard",  path: "/dashboard",               icon: LayoutDashboard, color: "#6366F1" },
  { label: "Wallet & Coins",  path: "/dashboard/wallet",        icon: Wallet,          color: "#D97706" },
  { label: "Buy Coins",       path: "/dashboard/wallet/buy-coins", icon: Coins,        color: "#F59E0B" },
  { label: "Referrals",       path: "/dashboard/refer",         icon: Users,           color: "#059669" },
  { label: "Leaderboard",     path: "/dashboard/leaderboard",   icon: Trophy,          color: "#DC2626" },
  { label: "Meet Add-on",     path: "/dashboard/meet-addon",    icon: Puzzle,          color: "#7C3AED" },
  { label: "Study Rooms",     path: "/dashboard/study-sessions",icon: BookOpen,        color: "#2563EB" },
  { label: "StudyMate AI",    path: "/dashboard/studymate",     icon: Star,            color: "#0891B2" },
  { label: "Profile",         path: "/dashboard/profile",       icon: User,            color: "#64748B" },
  { label: "Settings",        path: "/dashboard/settings",      icon: Settings,        color: "#475569" },
];

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, color }: {
  icon: React.ElementType; label: string; value: string | number; color: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border bg-white p-4" style={{ borderColor: "#E2E8F0" }}>
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
        style={{ background: color + "18" }}>
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      <div>
        <p className="text-xs text-[#64748B] font-medium">{label}</p>
        <p className="text-base font-black text-[#0F172A]">{value}</p>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function AdminStudentViewPage() {
  const [query,    setQuery]   = useState("");
  const [loading,  setLoading] = useState(false);
  const [student,  setStudent] = useState<StudentResult | null>(null);
  const [error,    setError]   = useState("");
  const [opening,  setOpening] = useState<string | null>(null);
  const [logs,     setLogs]    = useState<AccessLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  // ── Search ─────────────────────────────────────────────────────────────────
  const handleSearch = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    const q = query.trim();
    if (!q) return;
    setLoading(true); setError(""); setStudent(null);
    try {
      const res = await fetch(`/api/admin/student-view/search?id=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Search failed"); return; }
      setStudent(data.student);
      loadLogs(data.student.id);
    } catch {
      setError("Network error — please try again");
    } finally { setLoading(false); }
  }, [query]);

  // ── Load Logs ──────────────────────────────────────────────────────────────
  async function loadLogs(studentId?: string) {
    setLogsLoading(true);
    try {
      const qs = studentId ? `?studentId=${studentId}&date=today` : "?date=today";
      const res = await fetch(`/api/admin/student-view/logs${qs}`);
      if (res.ok) { const d = await res.json(); setLogs(d.data ?? []); }
    } catch {} finally { setLogsLoading(false); }
  }

  // ── Open Page ──────────────────────────────────────────────────────────────
  async function openPage(path: string) {
    if (!student) return;
    setOpening(path);
    try {
      const res  = await fetch("/api/admin/student-view/token", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ studentId: student.id, page: path }),
      });
      const data = await res.json();
      if (!res.ok) { alert(data.error ?? "Token generation failed"); return; }
      window.open(data.redirectUrl, "_blank", "noopener,noreferrer");
    } catch {
      alert("Network error — please try again");
    } finally { setOpening(null); }
  }

  const subBadge = student?.subscription
    ? { label: student.subscription.planType, color: "#059669", bg: "#ECFDF5", border: "#A7F3D0" }
    : student?.trialUsed
      ? { label: "Trial Used / Expired", color: "#DC2626", bg: "#FEF2F2", border: "#FECACA" }
      : { label: "No Plan", color: "#6B7280", bg: "#F9FAFB", border: "#E5E7EB" };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">

      {/* ── Header ── */}
      <div>
        <h1 className="text-2xl font-black text-[#0F172A] flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-[#6366F1]" />
          Student View
        </h1>
        <p className="text-sm text-[#64748B] mt-1">
          View the student's dashboard from an admin perspective. All access is logged.
        </p>
      </div>

      {/* ── Search ── */}
      <form onSubmit={handleSearch}
        className="flex gap-3 rounded-2xl border bg-white p-5 shadow-sm"
        style={{ borderColor: "#E2E8F0" }}>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Enter student ID (VL-2026-03-47291), email, or DB ID…"
            className="w-full rounded-xl border pl-10 pr-4 py-3 text-sm font-medium text-[#0F172A] focus:outline-none focus:border-[#6366F1] transition-colors"
            style={{ borderColor: "#E2E8F0", background: "#F8FAFF" }}
          />
        </div>
        <button type="submit" disabled={loading || !query.trim()}
          className="flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-black text-white transition-all disabled:opacity-40"
          style={{ background: "linear-gradient(135deg, #6366F1, #8B5CF6)" }}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          Search
        </button>
      </form>

      {/* ── Error ── */}
      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700 font-semibold">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* ── Student Info Card ── */}
      {student && (
        <div className="rounded-2xl border bg-white shadow-sm overflow-hidden" style={{ borderColor: "#E2E8F0" }}>
          {/* Top gradient bar */}
          <div className="h-1.5" style={{ background: "linear-gradient(135deg, #6366F1, #8B5CF6, #06B6D4)" }} />

          <div className="p-6">
            {/* Avatar + name row */}
            <div className="flex items-start gap-5 mb-6">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-xl font-black text-white shadow-[0_4px_16px_rgba(99,102,241,0.3)]"
                style={{ background: "linear-gradient(135deg, #6366F1, #8B5CF6)" }}>
                {student.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <h2 className="text-lg font-black text-[#0F172A]">{student.name}</h2>
                  <span className="text-xs font-mono font-bold text-[#64748B] bg-[#F1F5F9] px-2 py-0.5 rounded">
                    #{student.studentId ?? student.id.slice(0, 8)}
                  </span>
                  <span className="text-[11px] font-black uppercase tracking-wide px-2.5 py-1 rounded-full border"
                    style={{ background: subBadge.bg, borderColor: subBadge.border, color: subBadge.color }}>
                    {subBadge.label}
                    {student.subscription && ` — ${student.subscription.daysLeft}d left`}
                  </span>
                </div>
                <div className="flex flex-wrap gap-4 mt-1.5">
                  <span className="flex items-center gap-1.5 text-xs text-[#64748B]">
                    <Mail className="w-3.5 h-3.5" />{student.email}
                  </span>
                  {student.phone && (
                    <span className="flex items-center gap-1.5 text-xs text-[#64748B]">
                      <Phone className="w-3.5 h-3.5" />{student.phone}
                    </span>
                  )}
                  <span className="flex items-center gap-1.5 text-xs text-[#64748B]">
                    <CalendarDays className="w-3.5 h-3.5" />
                    Joined {new Date(student.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                </div>
              </div>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
              <StatCard icon={Coins}        label="Coin Balance"    value={student.coinBalance}    color="#D97706" />
              <StatCard icon={Flame}        label="Current Streak"  value={`${student.currentStreak}d`} color="#EA580C" />
              <StatCard icon={Trophy}       label="Best Streak"     value={`${student.longestStreak}d`} color="#7C3AED" />
              <StatCard icon={Clock}        label="Study Hours"     value={`${student.totalStudyHours}h`} color="#0891B2" />
              <StatCard icon={Users}        label="Referrals"       value={student.referralCount}  color="#059669" />
              <StatCard icon={ListOrdered}  label="Role"            value={student.role}           color="#6366F1" />
            </div>

            {/* Page access grid */}
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-[#94A3B8] mb-3">Dashboard Pages — Click to open in new tab</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
                {PAGES.map(({ label, path, icon: Icon, color }) => (
                  <button
                    key={path}
                    onClick={() => openPage(path)}
                    disabled={opening === path}
                    className="group flex items-center gap-2.5 rounded-xl border p-3 text-left transition-all hover:-translate-y-0.5 hover:shadow-md disabled:opacity-60"
                    style={{ borderColor: "#E2E8F0", background: "white" }}
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors group-hover:scale-110"
                      style={{ background: color + "18" }}>
                      {opening === path
                        ? <Loader2 className="w-4 h-4 animate-spin" style={{ color }} />
                        : <Icon className="w-4 h-4" style={{ color }} />
                      }
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[#334155] truncate leading-tight">{label}</p>
                      <p className="text-[10px] text-[#94A3B8] truncate">{path}</p>
                    </div>
                    <ExternalLink className="w-3 h-3 text-[#CBD5E1] ml-auto shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Access Log ── */}
      <div className="rounded-2xl border bg-white shadow-sm overflow-hidden" style={{ borderColor: "#E2E8F0" }}>
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "#F1F5F9" }}>
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-[#6366F1]" />
            <h3 className="text-sm font-black text-[#0F172A] uppercase tracking-wider">
              {student ? `Access Log — ${student.name}` : "Today's Access Log"}
            </h3>
          </div>
          <div className="flex gap-2">
            <button onClick={() => loadLogs(student?.id)} disabled={logsLoading}
              className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold text-[#475569] hover:bg-[#F8FAFF] transition-colors disabled:opacity-50"
              style={{ borderColor: "#E2E8F0" }}>
              {logsLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Refresh"}
            </button>
            <a href={`/api/admin/student-view/logs?export=csv${student ? `&studentId=${student.id}` : ""}&date=today`}
              className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold text-[#475569] hover:bg-[#F8FAFF] transition-colors"
              style={{ borderColor: "#E2E8F0" }}>
              Export CSV
            </a>
          </div>
        </div>

        {logsLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 text-[#6366F1] animate-spin" />
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-[#94A3B8] gap-2">
            <History className="w-8 h-8" />
            <p className="text-sm font-medium">No access logged today</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "#F8FAFF", borderBottom: "1px solid #F1F5F9" }}>
                  {["Admin", "Student", "Student ID", "Page", "Action", "Time"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-[#94A3B8]">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.map((log, i) => (
                  <tr key={log.id}
                    style={{ borderBottom: i < logs.length - 1 ? "1px solid #F8FAFF" : "none" }}
                    className="hover:bg-[#FAFBFF] transition-colors">
                    <td className="px-4 py-3 font-semibold text-[#334155]">{log.adminName}</td>
                    <td className="px-4 py-3 text-[#334155]">{log.studentName ?? "—"}</td>
                    <td className="px-4 py-3 font-mono text-xs text-[#64748B]">{log.studentUniqueId ?? "—"}</td>
                    <td className="px-4 py-3 font-mono text-xs text-[#475569]">{log.pageAccessed}</td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] font-black uppercase px-2 py-1 rounded-full"
                        style={{
                          background: log.action === "impersonate" ? "#EEF2FF" : log.action === "exit" ? "#FEF2F2" : "#F1F5F9",
                          color:      log.action === "impersonate" ? "#4338CA" : log.action === "exit" ? "#DC2626" : "#475569",
                        }}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-[#64748B] whitespace-nowrap">{log.accessedAtIST}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
