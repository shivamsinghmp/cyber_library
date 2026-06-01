"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Clock, Users, TrendingUp, XCircle, CheckCircle2,
  Search, Download, Filter, Loader2, ChevronLeft, ChevronRight,
  RefreshCw, AlertTriangle, Crown, RotateCcw, X,
} from "lucide-react";
import toast from "react-hot-toast";

// ── Types ──────────────────────────────────────────────────────────────────────

type Stats = {
  totalEnrolled: number; activeCount: number; expiredCount: number;
  convertedCount: number; conversionRate: number; newThisWeek: number;
  retrialBlockedToday: number;
  expiringSoon: { userId: string; name: string; studentId: string; phone: string; endDate: string; daysLeft: number }[];
};

type TrialRow = {
  userId: string; name: string; email: string; studentId: string;
  phone: string; startDate: string; endDate: string; daysLeft: number;
  subStatus: string; converted: boolean; convertedPlan: string | null;
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtDate(d: string | Date) {
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function rowClass(row: TrialRow): string {
  if (row.converted)  return "bg-purple-50/40 hover:bg-purple-50";
  if (row.subStatus === "ACTIVE" && row.daysLeft <= 3) return "bg-amber-50/40 hover:bg-amber-50";
  if (row.subStatus === "ACTIVE") return "bg-emerald-50/30 hover:bg-emerald-50";
  return "bg-red-50/30 hover:bg-red-50";
}

function StatusBadge({ row }: { row: TrialRow }) {
  if (row.converted) return <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-700"><Crown className="h-3 w-3" />{row.convertedPlan}</span>;
  if (row.subStatus === "ACTIVE" && row.daysLeft <= 3) return <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700"><AlertTriangle className="h-3 w-3" />Expiring ({row.daysLeft}d)</span>;
  if (row.subStatus === "ACTIVE") return <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700"><CheckCircle2 className="h-3 w-3" />Active</span>;
  return <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-600"><XCircle className="h-3 w-3" />Expired</span>;
}

// ── Reset Modal ────────────────────────────────────────────────────────────────

function ResetModal({ userId, name, onClose, onDone }: {
  userId: string; name: string; onClose: () => void; onDone: () => void;
}) {
  const [reason, setReason]   = useState("");
  const [loading, setLoading] = useState(false);

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    if (reason.trim().length < 3) { toast.error("Reason min 3 chars hona chahiye"); return; }
    setLoading(true);
    try {
      const res  = await fetch(`/api/admin/trial/reset/${userId}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ reason: reason.trim() }),
      });
      const data = await res.json();
      if (res.ok) { toast.success(data.message ?? "Trial reset ho gaya"); onDone(); }
      else toast.error(data.error ?? "Reset fail ho gaya");
    } catch { toast.error("Network error"); }
    finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <RotateCcw className="h-4 w-4 text-indigo-500" /> Reset Trial
          </h3>
          <button onClick={onClose}><X className="h-4 w-4 text-gray-400" /></button>
        </div>
        <p className="text-xs text-gray-500 mb-4">
          <span className="font-semibold">{name}</span> ka trial reset ho jayega. Woh dobara free trial activate kar sakenge.
        </p>
        <form onSubmit={handleReset} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Reason (required)</label>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="e.g. Admin approved reset due to..."
              rows={3}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 outline-none focus:border-indigo-400 resize-none"
            />
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onClose}
              className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
              {loading ? "Resetting…" : "Reset Trial"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function AdminTrialPage() {
  const [stats, setStats]           = useState<Stats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const [rows, setRows]             = useState<TrialRow[]>([]);
  const [total, setTotal]           = useState(0);
  const [logsLoading, setLogsLoading] = useState(false);
  const [page, setPage]             = useState(1);
  const [hasMore, setHasMore]       = useState(false);

  const [fStatus, setFStatus]   = useState("all");
  const [fSearch, setFSearch]   = useState("");
  const [fFrom,   setFFrom]     = useState("");
  const [fTo,     setFTo]       = useState("");

  const [resetUser, setResetUser] = useState<{ userId: string; name: string } | null>(null);

  // Trial days config
  const [trialDays, setTrialDays]   = useState(7);
  const [editDays,  setEditDays]    = useState(7);
  const [savingDays, setSavingDays] = useState(false);

  useEffect(() => {
    fetchStats();
    fetchLogs(1);
    fetch("/api/admin/settings/trial-days", { credentials: "include" })
      .then(r => r.ok ? r.json() : { trialDays: 7 })
      .then(d => { setTrialDays(d.trialDays ?? 7); setEditDays(d.trialDays ?? 7); })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchStats() {
    setStatsLoading(true);
    try {
      const res  = await fetch("/api/admin/trial/stats", { credentials: "include" });
      const data = await res.json();
      if (res.ok) setStats(data);
    } catch { /* silent */ }
    finally { setStatsLoading(false); }
  }

  const fetchLogs = useCallback(async (p: number) => {
    setLogsLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), status: fStatus });
      if (fSearch) params.set("search", fSearch);
      if (fFrom)   params.set("from",   fFrom);
      if (fTo)     params.set("to",     fTo);
      const res  = await fetch(`/api/admin/trial/logs?${params}`, { credentials: "include" });
      const data = await res.json();
      if (res.ok) { setRows(data.data ?? []); setTotal(data.total ?? 0); setHasMore(data.hasMore ?? false); setPage(p); }
    } catch { toast.error("Logs load fail"); }
    finally { setLogsLoading(false); }
  }, [fStatus, fSearch, fFrom, fTo]);

  function applyFilters(e?: React.FormEvent) {
    e?.preventDefault();
    fetchLogs(1);
  }

  function exportUrl() {
    const p = new URLSearchParams({ export: "csv", status: fStatus });
    if (fSearch) p.set("search", fSearch);
    if (fFrom)   p.set("from",   fFrom);
    if (fTo)     p.set("to",     fTo);
    return `/api/admin/trial/logs?${p}`;
  }

  async function saveTrialDays(e: React.FormEvent) {
    e.preventDefault();
    if (editDays < 1) { toast.error("Min 1 din"); return; }
    setSavingDays(true);
    try {
      const res  = await fetch("/api/admin/settings/trial-days", {
        method: "POST", headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ trialDays: editDays }),
      });
      const data = await res.json();
      if (res.ok) { setTrialDays(data.trialDays ?? editDays); toast.success(`Trial duration: ${data.trialDays ?? editDays} days`); }
      else toast.error(data.error ?? "Save fail ho gaya");
    } catch { toast.error("Network error"); }
    finally { setSavingDays(false); }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 pb-16">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link href="/admin" className="mb-2 inline-flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-gray-800">
            <ChevronLeft className="h-3.5 w-3.5" /> Admin
          </Link>
          <h1 className="flex items-center gap-2 text-2xl font-extrabold text-gray-900 tracking-tight">
            <Clock className="h-6 w-6 text-indigo-500" /> Trial Management
          </h1>
          <p className="mt-0.5 text-sm text-gray-500">Track free trials, conversions, and blocked re-trial attempts.</p>
        </div>
        <button onClick={() => { fetchStats(); fetchLogs(page); }}
          className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50">
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>

      {/* Stats strip */}
      {statsLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 rounded-2xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Total Enrolled", value: stats.totalEnrolled,  sub: `+${stats.newThisWeek} this week`, icon: Users,        color: "text-indigo-600",  bg: "bg-indigo-50",  border: "border-indigo-200" },
            { label: "Active Trials",  value: stats.activeCount,    sub: `${stats.expiringSoon.length} expiring soon`,icon: Clock,   color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200" },
            { label: "Expired",        value: stats.expiredCount,   sub: `${stats.retrialBlockedToday} blocked today`, icon: XCircle, color: "text-red-500",     bg: "bg-red-50",     border: "border-red-200" },
            { label: "Converted",      value: `${stats.convertedCount} (${stats.conversionRate}%)`, sub: "to paid plan", icon: TrendingUp, color: "text-purple-600",  bg: "bg-purple-50",  border: "border-purple-200" },
          ].map(({ label, value, sub, icon: Icon, color, bg, border }) => (
            <div key={label} className={`rounded-2xl border ${border} ${bg} p-4`}>
              <div className="flex items-center justify-between mb-1">
                <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">{label}</p>
                <Icon className={`h-4 w-4 ${color}`} />
              </div>
              <p className={`text-2xl font-extrabold ${color}`}>{value}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>
            </div>
          ))}
        </div>
      ) : null}

      {/* Two-column: Expiring Soon + Config */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Expiring Soon */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-gray-900">
              <AlertTriangle className="h-4 w-4 text-amber-400" /> Expiring Soon (3 days)
            </h2>
            {stats.expiringSoon.length === 0 ? (
              <p className="text-xs text-gray-400">Koi trial expiring nahi in 3 days.</p>
            ) : (
              <div className="divide-y divide-gray-50">
                {stats.expiringSoon.map(s => (
                  <div key={s.userId} className="flex items-center justify-between py-2.5">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{s.name}</p>
                      <p className="text-[10px] text-gray-400 font-mono">{s.studentId} · {s.phone}</p>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${s.daysLeft <= 1 ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-700"}`}>
                      {s.daysLeft === 0 ? "Expires today" : `${s.daysLeft}d left`}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Trial Config */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-gray-900">
              <Clock className="h-4 w-4 text-indigo-400" /> Trial Config
            </h2>
            <form onSubmit={saveTrialDays} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Trial Duration (days)</label>
                <div className="flex gap-2">
                  <input
                    type="number" min={1} max={365}
                    value={editDays}
                    onChange={e => setEditDays(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-24 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-bold text-indigo-600 outline-none focus:border-indigo-400"
                  />
                  <button type="submit" disabled={savingDays || editDays === trialDays}
                    className="flex items-center gap-1 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-50">
                    {savingDays ? <Loader2 className="h-3 w-3 animate-spin" /> : null} Save
                  </button>
                </div>
                <p className="mt-1 text-[10px] text-gray-400">Currently: {trialDays} days. Naye users ke liye apply hoga.</p>
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5">
                <p className="text-xs text-amber-700 font-medium">
                  ⚠️ Trial duration change sirf naye trials ke liye apply hoga. Existing active trials unchanged rahenge.
                </p>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Full Trial Log Table */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-sm font-bold text-gray-900">Trial Log</h2>
            <p className="text-[10px] text-gray-400">{total.toLocaleString("en-IN")} total entries</p>
          </div>

          <form onSubmit={applyFilters} className="flex flex-wrap items-center gap-2">
            {/* Status filter */}
            <div className="flex gap-0.5 rounded-xl border border-gray-200 bg-gray-50 p-0.5">
              {[
                { v: "all",       l: "All" },
                { v: "active",    l: "Active" },
                { v: "expired",   l: "Expired" },
                { v: "converted", l: "Converted" },
              ].map(({ v, l }) => (
                <button key={v} type="button"
                  onClick={() => { setFStatus(v); fetchLogs(1); }}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition ${
                    fStatus === v
                      ? v === "active" ? "bg-emerald-500 text-white"
                        : v === "expired" ? "bg-red-500 text-white"
                        : v === "converted" ? "bg-purple-500 text-white"
                        : "bg-indigo-600 text-white"
                      : "text-gray-500 hover:text-gray-700"
                  }`}>
                  {l}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400" />
              <input type="text" value={fSearch} onChange={e => setFSearch(e.target.value)}
                placeholder="Search…"
                className="w-28 rounded-xl border border-gray-200 bg-gray-50 pl-7 pr-2 py-1.5 text-xs text-gray-700 outline-none focus:border-indigo-400" />
            </div>

            {/* Date range */}
            <input type="date" value={fFrom} onChange={e => setFFrom(e.target.value)}
              className="rounded-xl border border-gray-200 bg-gray-50 px-2 py-1.5 text-xs text-gray-700 outline-none focus:border-indigo-400" />
            <span className="text-[10px] text-gray-400">to</span>
            <input type="date" value={fTo} onChange={e => setFTo(e.target.value)}
              className="rounded-xl border border-gray-200 bg-gray-50 px-2 py-1.5 text-xs text-gray-700 outline-none focus:border-indigo-400" />

            <button type="submit"
              className="flex items-center gap-1 rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-700">
              <Filter className="h-3 w-3" /> Apply
            </button>

            <a href={exportUrl()} target="_blank"
              className="flex items-center gap-1 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition">
              <Download className="h-3.5 w-3.5" /> CSV
            </a>
          </form>
        </div>

        <div className="overflow-x-auto">
          {logsLoading ? (
            <div className="flex items-center justify-center py-12 gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
              <span className="text-sm text-gray-400">Loading…</span>
            </div>
          ) : rows.length === 0 ? (
            <div className="py-12 text-center text-sm text-gray-400">No trial data found.</div>
          ) : (
            <table className="w-full text-sm min-w-[900px]">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-left">
                  {["Student", "Student ID", "Phone", "Enrolled On", "Expires On", "Days Left", "Status", ""].map(h => (
                    <th key={h} className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rows.map(row => (
                  <tr key={row.userId + row.startDate} className={`transition-colors ${rowClass(row)}`}>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-900 text-xs">{row.name}</p>
                      <p className="text-[10px] text-gray-400">{row.email}</p>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{row.studentId}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{row.phone}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{fmtDate(row.startDate)}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{fmtDate(row.endDate)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-bold ${row.daysLeft <= 0 ? "text-red-500" : row.daysLeft <= 3 ? "text-amber-600" : "text-emerald-600"}`}>
                        {row.daysLeft <= 0 ? "Expired" : `${row.daysLeft}d`}
                      </span>
                    </td>
                    <td className="px-4 py-3"><StatusBadge row={row} /></td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => setResetUser({ userId: row.userId, name: row.name })}
                        className="flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-[10px] font-semibold text-gray-600 hover:bg-gray-100 transition"
                        title="Reset trial"
                      >
                        <RotateCcw className="h-3 w-3" /> Reset
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {(page > 1 || hasMore) && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <button onClick={() => fetchLogs(page - 1)} disabled={page === 1}
              className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40">
              <ChevronLeft className="h-3 w-3" /> Prev
            </button>
            <span className="text-xs text-gray-400">Page {page} · {total.toLocaleString("en-IN")} total</span>
            <button onClick={() => fetchLogs(page + 1)} disabled={!hasMore}
              className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40">
              Next <ChevronRight className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>

      {/* Reset Modal */}
      {resetUser && (
        <ResetModal
          userId={resetUser.userId}
          name={resetUser.name}
          onClose={() => setResetUser(null)}
          onDone={() => { setResetUser(null); fetchStats(); fetchLogs(page); }}
        />
      )}
    </div>
  );
}
