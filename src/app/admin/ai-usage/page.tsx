"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Bot, Zap, TrendingUp, Download, Search, Filter,
  Loader2, ChevronLeft, ChevronRight, RefreshCw,
  CheckCircle2, XCircle, Clock, Coins, IndianRupee,
  TrendingDown, BarChart3, ArrowUpRight,
} from "lucide-react";
import toast from "react-hot-toast";

// ── Types ──────────────────────────────────────────────────────────────────────

type Overview = {
  currentMonth: {
    totalCalls: number; totalTokens: number; totalCostInr: number; avgLatencyMs: number;
    coinsCharged: number; revenueInr: number; profitInr: number; profitMarginPct: number;
  };
  today: {
    calls: number; tokens: number; costInr: number;
    coinsCharged: number; revenueInr: number; profitInr: number;
  };
  byProvider: {
    provider: string; calls: number; tokens: number;
    costInr: number; coinsCharged: number; revenueInr: number; profitInr: number; pct: number;
  }[];
  byFeature: {
    feature: string; calls: number; tokens: number;
    costInr: number; coinsCharged: number; revenueInr: number; profitInr: number;
  }[];
};

type LogRow = {
  id: string; logId: string; userId: string | null;
  userName: string; userEmail: string; studentId: string;
  provider: string; model: string; feature: string;
  inputTokens: number; outputTokens: number; totalTokens: number;
  costInr: number; coinsCharged: number; latencyMs: number;
  status: string; errorMessage: string | null; createdAt: string;
};

// ── Helpers ────────────────────────────────────────────────────────────────────

const PROVIDER_COLORS: Record<string, string> = {
  google:    "bg-blue-100 text-blue-700",
  anthropic: "bg-orange-100 text-orange-700",
  openai:    "bg-emerald-100 text-emerald-700",
};
const PROVIDER_LABELS: Record<string, string> = {
  google: "Gemini", anthropic: "Claude", openai: "OpenAI",
};

function fmtNum(n: number)  { return n.toLocaleString("en-IN"); }
function fmtInr(n: number)  { return `₹${n.toFixed(2)}`; }
function fmtK(n: number)    { return n >= 1_000_000 ? `${(n/1_000_000).toFixed(2)}M` : n >= 1000 ? `${(n/1000).toFixed(1)}K` : String(n); }
function fmtTime(s: string) {
  return new Date(s).toLocaleString("en-IN", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}
function fmtFeature(f: string) {
  const map: Record<string,string> = {
    studymate: "StudyMate",
    studymate_meet: "StudyMate (Meet)",
    profile_extract: "Profile Extraction",
    router: "AI Router",
  };
  return map[f] ?? f;
}

function Bar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(100, pct)}%` }} />
    </div>
  );
}

function ProfitBadge({ profit }: { profit: number }) {
  const positive = profit >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${positive ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600"}`}>
      {positive ? <ArrowUpRight className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
      {fmtInr(Math.abs(profit))}
    </span>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function AIUsagePage() {

  const [overview, setOverview]               = useState<Overview | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(true);

  const [logs, setLogs]               = useState<LogRow[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsTotal, setLogsTotal]     = useState(0);
  const [logsPage, setLogsPage]       = useState(1);
  const [logsHasMore, setLogsHasMore] = useState(false);

  const [fProvider, setFProvider] = useState("");
  const [fFeature,  setFFeature]  = useState("");
  const [fStatus,   setFStatus]   = useState("");
  const [fStudent,  setFStudent]  = useState("");
  const [fFrom,     setFFrom]     = useState("");
  const [fTo,       setFTo]       = useState("");

  useEffect(() => {
    fetchOverview();
    fetchLogs(1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchOverview() {
    setOverviewLoading(true);
    try {
      const res  = await fetch("/api/admin/ai-usage/overview", { credentials: "include" });
      const data = await res.json();
      if (res.ok) setOverview(data);
    } catch { /* silent */ }
    finally { setOverviewLoading(false); }
  }

  const fetchLogs = useCallback(async (p: number) => {
    setLogsLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), limit: "50" });
      if (fProvider) params.set("provider", fProvider);
      if (fFeature)  params.set("feature",  fFeature);
      if (fStatus)   params.set("status",   fStatus);
      if (fStudent)  params.set("student",  fStudent);
      if (fFrom)     params.set("from",     fFrom);
      if (fTo)       params.set("to",       fTo);
      const res  = await fetch(`/api/admin/ai-usage/logs?${params}`, { credentials: "include" });
      const data = await res.json();
      if (res.ok) {
        setLogs(data.data ?? []);
        setLogsTotal(data.total ?? 0);
        setLogsHasMore(data.hasMore ?? false);
        setLogsPage(p);
      }
    } catch { toast.error("Failed to load logs"); }
    finally { setLogsLoading(false); }
  }, [fProvider, fFeature, fStatus, fStudent, fFrom, fTo]);

  function applyFilters(e?: React.FormEvent) { e?.preventDefault(); fetchLogs(1); }
  function resetFilters() {
    setFProvider(""); setFFeature(""); setFStatus("");
    setFStudent("");  setFFrom("");    setFTo("");
    setTimeout(() => fetchLogs(1), 0);
  }
  function exportUrl() {
    const p = new URLSearchParams({ export: "csv" });
    if (fProvider) p.set("provider", fProvider);
    if (fFeature)  p.set("feature",  fFeature);
    if (fStatus)   p.set("status",   fStatus);
    if (fStudent)  p.set("student",  fStudent);
    if (fFrom)     p.set("from",     fFrom);
    if (fTo)       p.set("to",       fTo);
    return `/api/admin/ai-usage/logs?${p}`;
  }

  const m = overview?.currentMonth;
  const t = overview?.today;

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 pb-16">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link href="/admin" className="mb-2 inline-flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-gray-800">
            <ChevronLeft className="h-3.5 w-3.5" /> Admin
          </Link>
          <h1 className="flex items-center gap-2 text-2xl font-extrabold text-gray-900 tracking-tight">
            <Bot className="h-6 w-6 text-indigo-500" /> AI Usage & Profit
          </h1>
          <p className="mt-0.5 text-sm text-gray-500">Track what students pay, what it costs, and how much profit AI generates.</p>
        </div>
        <button onClick={() => { fetchOverview(); fetchLogs(logsPage); }}
          className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50">
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>

      {/* ── Section 1: Main KPI Strip ── */}
      {overviewLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 rounded-2xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : m ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {/* Revenue */}
          <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] font-semibold text-indigo-500 uppercase tracking-wider">Revenue (this month)</p>
              <IndianRupee className="h-4 w-4 text-indigo-400" />
            </div>
            <p className="text-2xl font-extrabold text-indigo-700">{fmtInr(m.revenueInr)}</p>
            <p className="text-[10px] text-indigo-400 mt-0.5">{fmtNum(m.coinsCharged)} coins charged</p>
            <p className="text-[10px] text-indigo-400">+{fmtInr(t?.revenueInr ?? 0)} today</p>
          </div>

          {/* API Cost */}
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] font-semibold text-rose-500 uppercase tracking-wider">API Cost (this month)</p>
              <TrendingDown className="h-4 w-4 text-rose-400" />
            </div>
            <p className="text-2xl font-extrabold text-rose-700">{fmtInr(m.totalCostInr)}</p>
            <p className="text-[10px] text-rose-400 mt-0.5">{fmtK(m.totalTokens)} tokens used</p>
            <p className="text-[10px] text-rose-400">+{fmtInr(t?.costInr ?? 0)} today</p>
          </div>

          {/* Net Profit */}
          <div className={`rounded-2xl border p-4 ${m.profitInr >= 0 ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
            <div className="flex items-center justify-between mb-1">
              <p className={`text-[10px] font-semibold uppercase tracking-wider ${m.profitInr >= 0 ? "text-emerald-500" : "text-amber-500"}`}>Net Profit (this month)</p>
              <TrendingUp className={`h-4 w-4 ${m.profitInr >= 0 ? "text-emerald-400" : "text-amber-400"}`} />
            </div>
            <p className={`text-2xl font-extrabold ${m.profitInr >= 0 ? "text-emerald-700" : "text-amber-700"}`}>{fmtInr(m.profitInr)}</p>
            <p className={`text-[10px] mt-0.5 ${m.profitInr >= 0 ? "text-emerald-500" : "text-amber-500"}`}>{m.profitMarginPct}% margin</p>
            <p className={`text-[10px] ${m.profitInr >= 0 ? "text-emerald-400" : "text-amber-400"}`}>+{fmtInr(t?.profitInr ?? 0)} today</p>
          </div>

          {/* Calls & Latency */}
          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Total Calls (this month)</p>
              <Zap className="h-4 w-4 text-amber-400" />
            </div>
            <p className="text-2xl font-extrabold text-gray-900">{fmtNum(m.totalCalls)}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">+{fmtNum(t?.calls ?? 0)} today</p>
            <p className="text-[10px] text-gray-400">avg {fmtNum(m.avgLatencyMs)}ms latency</p>
          </div>
        </div>
      ) : null}

      {/* ── Section 2: Profit Breakdown ── */}
      {m && (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-bold text-gray-900 flex items-center gap-1.5">
            <BarChart3 className="h-4 w-4 text-indigo-400" /> Revenue vs Cost vs Profit — this month
          </h2>
          <div className="grid grid-cols-3 gap-6 mb-5">
            {[
              { label: "Students paid", value: fmtInr(m.revenueInr), sub: `${fmtNum(m.coinsCharged)} coins × ₹0.50`, color: "text-indigo-600", bg: "bg-indigo-500" },
              { label: "API cost", value: fmtInr(m.totalCostInr), sub: `${fmtK(m.totalTokens)} tokens across all models`, color: "text-rose-600", bg: "bg-rose-400" },
              { label: "Your profit", value: fmtInr(m.profitInr), sub: `${m.profitMarginPct}% profit margin`, color: m.profitInr >= 0 ? "text-emerald-600" : "text-amber-600", bg: m.profitInr >= 0 ? "bg-emerald-500" : "bg-amber-400" },
            ].map(({ label, value, sub, color, bg }) => (
              <div key={label}>
                <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold mb-1">{label}</p>
                <p className={`text-xl font-extrabold ${color}`}>{value}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>
                <div className="mt-2 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                  <div className={`h-full rounded-full ${bg} transition-all`}
                    style={{ width: m.revenueInr > 0 ? `${Math.min(100, Math.abs(parseFloat(value.slice(1))) / m.revenueInr * 100)}%` : "0%" }} />
                </div>
              </div>
            ))}
          </div>
          {/* Today strip */}
          {t && (
            <div className="border-t border-gray-100 pt-3 flex flex-wrap items-center gap-4 text-[11px] text-gray-500">
              <span className="font-semibold text-gray-700">Aaj:</span>
              <span>Revenue <b className="text-indigo-600">{fmtInr(t.revenueInr)}</b></span>
              <span>Cost <b className="text-rose-500">{fmtInr(t.costInr)}</b></span>
              <span>Profit <b className={t.profitInr >= 0 ? "text-emerald-600" : "text-amber-600"}>{fmtInr(t.profitInr)}</b></span>
              <span>Calls <b className="text-gray-700">{fmtNum(t.calls)}</b></span>
              <span>Coins <b className="text-amber-600">{fmtNum(t.coinsCharged)}</b></span>
            </div>
          )}
        </div>
      )}

      {/* ── Section 3: Provider + Feature Breakdown ── */}
      {overview && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* By Provider */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-bold text-gray-900 flex items-center gap-1.5">
              <Bot className="h-4 w-4 text-indigo-400" /> By Provider (this month)
            </h2>
            {overview.byProvider.length === 0 ? (
              <p className="text-xs text-gray-400">No data yet</p>
            ) : (
              <div className="space-y-4">
                {overview.byProvider.map(p => (
                  <div key={p.provider}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${PROVIDER_COLORS[p.provider] ?? "bg-gray-100 text-gray-600"}`}>
                          {PROVIDER_LABELS[p.provider] ?? p.provider}
                        </span>
                        <span className="text-xs text-gray-500">{fmtNum(p.calls)} calls</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-rose-500" title="API Cost">−{fmtInr(p.costInr)}</span>
                        <span className="text-indigo-600" title="Revenue">+{fmtInr(p.revenueInr)}</span>
                        <ProfitBadge profit={p.profitInr} />
                      </div>
                    </div>
                    <Bar pct={p.pct} color={p.provider === "google" ? "bg-blue-400" : p.provider === "anthropic" ? "bg-orange-400" : "bg-emerald-400"} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* By Feature */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-bold text-gray-900 flex items-center gap-1.5">
              <Zap className="h-4 w-4 text-amber-400" /> By Feature (this month)
            </h2>
            {overview.byFeature.length === 0 ? (
              <p className="text-xs text-gray-400">No data yet</p>
            ) : (
              <div className="divide-y divide-gray-50">
                {overview.byFeature.map(f => (
                  <div key={f.feature} className="py-2.5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-gray-800">{fmtFeature(f.feature)}</p>
                        <p className="text-[10px] text-gray-400">{fmtNum(f.calls)} calls · {fmtK(f.tokens)} tokens</p>
                      </div>
                      <div className="flex flex-col items-end gap-0.5">
                        <div className="flex items-center gap-1.5 text-xs">
                          <span className="text-rose-500">−{fmtInr(f.costInr)}</span>
                          <span className="text-indigo-600">+{fmtInr(f.revenueInr)}</span>
                        </div>
                        <ProfitBadge profit={f.profitInr} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Section 4: Full Log Table ── */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-blue-400" /> Full Log
            </h2>
            <p className="text-[10px] text-gray-400">{fmtNum(logsTotal)} total entries</p>
          </div>

          <form onSubmit={applyFilters} className="flex flex-wrap items-center gap-2">
            <select value={fProvider} onChange={e => setFProvider(e.target.value)}
              className="rounded-xl border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-xs text-gray-700 outline-none focus:border-indigo-400">
              <option value="">All Providers</option>
              <option value="google">Gemini</option>
              <option value="anthropic">Claude</option>
              <option value="openai">OpenAI</option>
            </select>

            <select value={fFeature} onChange={e => setFFeature(e.target.value)}
              className="rounded-xl border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-xs text-gray-700 outline-none focus:border-indigo-400">
              <option value="">All Features</option>
              <option value="studymate">StudyMate</option>
              <option value="studymate_meet">StudyMate Meet</option>
              <option value="profile_extract">Profile Extract</option>
              <option value="router">Router</option>
            </select>

            <select value={fStatus} onChange={e => setFStatus(e.target.value)}
              className="rounded-xl border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-xs text-gray-700 outline-none focus:border-indigo-400">
              <option value="">All Status</option>
              <option value="success">Success</option>
              <option value="error">Error</option>
              <option value="timeout">Timeout</option>
            </select>

            <input type="date" value={fFrom} onChange={e => setFFrom(e.target.value)}
              className="rounded-xl border border-gray-200 bg-gray-50 px-2 py-1.5 text-xs text-gray-700 outline-none focus:border-indigo-400" />
            <span className="text-[10px] text-gray-400">to</span>
            <input type="date" value={fTo} onChange={e => setFTo(e.target.value)}
              className="rounded-xl border border-gray-200 bg-gray-50 px-2 py-1.5 text-xs text-gray-700 outline-none focus:border-indigo-400" />

            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400" />
              <input type="text" value={fStudent} onChange={e => setFStudent(e.target.value)}
                placeholder="Student…"
                className="w-28 rounded-xl border border-gray-200 bg-gray-50 pl-7 pr-2 py-1.5 text-xs text-gray-700 outline-none focus:border-indigo-400" />
            </div>

            <button type="submit"
              className="flex items-center gap-1 rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-700">
              <Filter className="h-3 w-3" /> Apply
            </button>
            <button type="button" onClick={resetFilters}
              className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50">
              Reset
            </button>
            <a href={exportUrl()} target="_blank"
              className="flex items-center gap-1 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition">
              <Download className="h-3.5 w-3.5" /> CSV
            </a>
          </form>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {logsLoading ? (
            <div className="flex items-center justify-center py-12 gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
              <span className="text-sm text-gray-500">Loading…</span>
            </div>
          ) : logs.length === 0 ? (
            <div className="py-12 text-center">
              <Bot className="h-10 w-10 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No AI usage logs yet.</p>
            </div>
          ) : (
            <table className="w-full text-sm min-w-[1100px]">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-left">
                  {["Time", "Student", "Provider / Model", "Feature", "Tokens", "API Cost (₹)", "Coins", "Revenue (₹)", "Profit (₹)", "Latency", "Status"].map(h => (
                    <th key={h} className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {logs.map(row => {
                  const revenueInr = parseFloat((row.coinsCharged * 0.50).toFixed(2));
                  const profitInr  = parseFloat((revenueInr - row.costInr).toFixed(4));
                  return (
                    <tr key={row.id}
                      className={`transition-colors ${row.status === "error" ? "bg-red-50/40 hover:bg-red-50" : row.status === "timeout" ? "bg-amber-50/30 hover:bg-amber-50" : "hover:bg-gray-50/60"}`}>
                      <td className="px-4 py-3 font-mono text-[10px] text-gray-400 whitespace-nowrap">{fmtTime(row.createdAt)}</td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-gray-900 text-xs truncate max-w-[120px]">{row.userName}</p>
                        <p className="text-[10px] font-mono text-gray-400">{row.studentId !== "—" ? row.studentId : row.userEmail}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${PROVIDER_COLORS[row.provider] ?? "bg-gray-100 text-gray-600"}`}>
                          {PROVIDER_LABELS[row.provider] ?? row.provider}
                        </span>
                        <p className="mt-0.5 text-[10px] text-gray-400 font-mono">{row.model}</p>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600">{fmtFeature(row.feature)}</td>
                      <td className="px-4 py-3 text-xs font-mono text-gray-700">
                        <span title={`${fmtNum(row.inputTokens)} in + ${fmtNum(row.outputTokens)} out`}>
                          {fmtK(row.totalTokens)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs font-mono text-rose-600">{row.costInr.toFixed(4)}</td>
                      <td className="px-4 py-3">
                        {row.coinsCharged > 0 ? (
                          <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-amber-600">
                            <Coins className="h-3 w-3" />{row.coinsCharged}
                          </span>
                        ) : <span className="text-xs text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-xs font-bold text-indigo-600">{row.coinsCharged > 0 ? fmtInr(revenueInr) : "—"}</td>
                      <td className="px-4 py-3">
                        {row.coinsCharged > 0 ? <ProfitBadge profit={profitInr} /> : <span className="text-xs text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-xs font-mono text-gray-500">{row.latencyMs}ms</td>
                      <td className="px-4 py-3">
                        {row.status === "success"
                          ? <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600"><CheckCircle2 className="h-3 w-3" />OK</span>
                          : row.status === "error"
                          ? <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-500" title={row.errorMessage ?? ""}><XCircle className="h-3 w-3" />Error</span>
                          : <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-500"><Clock className="h-3 w-3" />Timeout</span>
                        }
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {(logsPage > 1 || logsHasMore) && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <button onClick={() => fetchLogs(logsPage - 1)} disabled={logsPage === 1}
              className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40">
              <ChevronLeft className="h-3 w-3" /> Prev
            </button>
            <span className="text-xs text-gray-400">Page {logsPage} · {fmtNum(logsTotal)} total</span>
            <button onClick={() => fetchLogs(logsPage + 1)} disabled={!logsHasMore}
              className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40">
              Next <ChevronRight className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
