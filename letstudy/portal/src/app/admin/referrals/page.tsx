"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  UserPlus, ChevronLeft, Search, Download, Users,
  CheckCircle2, XCircle, Calendar, ArrowLeft, Loader2, X,
} from "lucide-react";
import toast from "react-hot-toast";

// ── Types ──────────────────────────────────────────────────────────────────────

type ReferredUser = {
  id: string; name: string | null; email: string; studentId: string | null;
  joinedAt: string; rewarded: boolean; active: boolean;
};

type ReferrerRow = {
  referrerId: string; referrerName: string; referrerEmail: string;
  studentId: string | null; referralCode: string | null; role: string;
  referredCount: number; activeCount: number; inactiveCount: number;
  firstReferralAt: string | null; lastReferralAt: string | null;
  referredUsers?: ReferredUser[];
};

type DetailData = {
  id: string; name: string | null; email: string; studentId: string | null;
  referralCode: string | null; role: string; joinedAt: string;
  totalReferrals: number; activeReferrals: number;
  referrals: ReferredUser[];
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function Badge({ active }: { active: boolean }) {
  return active
    ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-700"><CheckCircle2 className="h-3 w-3" />Active</span>
    : <span className="inline-flex items-center gap-1 rounded-full bg-red-50 border border-red-200 px-2 py-0.5 text-[10px] font-bold text-red-600"><XCircle className="h-3 w-3" />Inactive</span>;
}

// ── Tab 1: Overview ────────────────────────────────────────────────────────────

function OverviewTab({ onSelect }: { onSelect: (id: string) => void }) {
  const [rows, setRows] = useState<ReferrerRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/referrals", { credentials: "include" })
      .then(r => r.ok ? r.json() : [])
      .then(setRows)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center py-16 gap-3">
      <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />
      <span className="text-sm text-gray-500">Loading referral data…</span>
    </div>
  );

  if (rows.length === 0) return (
    <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 py-16 text-center">
      <Users className="mx-auto mb-3 h-10 w-10 text-gray-300" />
      <p className="text-sm font-semibold text-gray-500">No referral data</p>
      <p className="mt-1 text-xs text-gray-400">This will appear once students generate their referral links.</p>
    </div>
  );

  return (
    <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50 text-left">
            {["Referrer Name", "Student ID", "Referral Code", "Total", "Active", "Inactive", "First Referral", "Last Referral", ""].map(h => (
              <th key={h} className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400 whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {rows.map(row => (
            <tr key={row.referrerId} className="hover:bg-gray-50/60 transition-colors">
              <td className="px-4 py-3">
                <p className="font-semibold text-gray-900">{row.referrerName}</p>
                <p className="text-xs text-gray-400">{row.referrerEmail}</p>
              </td>
              <td className="px-4 py-3 font-mono text-xs text-gray-500">{row.studentId ?? "—"}</td>
              <td className="px-4 py-3">
                <span className="rounded-lg bg-indigo-50 px-2 py-1 font-mono text-xs font-bold text-indigo-700">
                  {row.referralCode ?? "—"}
                </span>
              </td>
              <td className="px-4 py-3 text-center font-bold text-gray-900">{row.referredCount}</td>
              <td className="px-4 py-3 text-center font-semibold text-emerald-600">{row.activeCount}</td>
              <td className="px-4 py-3 text-center font-semibold text-red-500">{row.inactiveCount}</td>
              <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{fmtDate(row.firstReferralAt)}</td>
              <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{fmtDate(row.lastReferralAt)}</td>
              <td className="px-4 py-3">
                <button
                  type="button"
                  onClick={() => onSelect(row.referrerId)}
                  className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition"
                >
                  Detail →
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Tab 2: Search ──────────────────────────────────────────────────────────────

function SearchTab({ onSelect }: { onSelect: (id: string) => void }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<ReferrerRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = useCallback(async () => {
    if (!q.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const res = await fetch(`/api/admin/referrals?q=${encodeURIComponent(q)}`, { credentials: "include" });
      setResults(res.ok ? await res.json() : []);
    } catch { setResults([]); }
    finally { setLoading(false); }
  }, [q]);

  function handleExport() {
    const url = q.trim()
      ? `/api/admin/referrals/export?q=${encodeURIComponent(q)}`
      : "/api/admin/referrals/export";
    window.open(url, "_blank");
    toast.success("CSV download started");
  }

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={q}
            onChange={e => setQ(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSearch()}
            placeholder="Search by name, email, Student ID, or referral code…"
            className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
          {q && (
            <button type="button" onClick={() => { setQ(""); setResults([]); setSearched(false); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={handleSearch}
          disabled={loading || !q.trim()}
          className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          Search
        </button>
        <button
          type="button"
          onClick={handleExport}
          className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      </div>

      {/* Results */}
      {loading && (
        <div className="flex items-center justify-center py-10 gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />
          <span className="text-sm text-gray-500">Searching…</span>
        </div>
      )}

      {!loading && searched && results.length === 0 && (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 py-10 text-center">
          <p className="text-sm font-semibold text-gray-500">No results found</p>
          <p className="mt-1 text-xs text-gray-400">Try a different name, email, or student ID.</p>
        </div>
      )}

      {!loading && results.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-left">
                {["Referrer", "Student ID", "Referral Code", "Total", "Active", "Inactive", ""].map(h => (
                  <th key={h} className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {results.map(row => (
                <tr key={row.referrerId} className="hover:bg-gray-50/60">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-gray-900">{row.referrerName}</p>
                    <p className="text-xs text-gray-400">{row.referrerEmail}</p>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{row.studentId ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-lg bg-indigo-50 px-2 py-1 font-mono text-xs font-bold text-indigo-700">{row.referralCode ?? "—"}</span>
                  </td>
                  <td className="px-4 py-3 text-center font-bold text-gray-900">{row.referredCount}</td>
                  <td className="px-4 py-3 text-center font-semibold text-emerald-600">{row.activeCount}</td>
                  <td className="px-4 py-3 text-center font-semibold text-red-500">{row.inactiveCount}</td>
                  <td className="px-4 py-3">
                    <button type="button" onClick={() => onSelect(row.referrerId)}
                      className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition">
                      Detail →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Tab 3: Individual Detail ───────────────────────────────────────────────────

function DetailTab({ userId, onBack }: { userId: string; onBack: () => void }) {
  const [data, setData] = useState<DetailData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/admin/referrals/${userId}`, { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) return (
    <div className="flex items-center justify-center py-16 gap-3">
      <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />
      <span className="text-sm text-gray-500">Loading student detail…</span>
    </div>
  );

  if (!data) return (
    <div className="py-10 text-center text-sm text-gray-500">
      Student not found.
      <button type="button" onClick={onBack} className="ml-2 text-indigo-600 hover:underline">← Back</button>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Back button */}
      <button type="button" onClick={onBack}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-800 transition">
        <ArrowLeft className="h-4 w-4" /> Back to list
      </button>

      {/* Student info card */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-lg font-bold text-gray-900">{data.name ?? "—"}</p>
            <p className="text-sm text-gray-500">{data.email}</p>
            <p className="mt-1 font-mono text-xs text-gray-400">ID: {data.studentId ?? data.id}</p>
          </div>
          <div className="flex items-center gap-3">
            {data.referralCode ? (
              <span className="rounded-xl bg-indigo-50 border border-indigo-200 px-4 py-2 font-mono text-sm font-bold text-indigo-700">
                {data.referralCode}
              </span>
            ) : (
              <span className="text-xs text-gray-400">No referral code</span>
            )}
          </div>
        </div>

        {/* Summary stats */}
        <div className="mt-4 grid grid-cols-3 gap-3">
          {[
            { label: "Total Referrals", value: data.totalReferrals, color: "text-indigo-600" },
            { label: "Active",          value: data.activeReferrals, color: "text-emerald-600" },
            { label: "Inactive",        value: data.totalReferrals - data.activeReferrals, color: "text-red-500" },
          ].map(s => (
            <div key={s.label} className="rounded-xl border border-gray-100 bg-gray-50 p-3 text-center">
              <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Referrals list */}
      {data.referrals.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 py-10 text-center">
          <p className="text-sm text-gray-400">No referrals yet for this student.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-left">
                {["#", "Name", "Email", "Student ID", "Join Date", "Status", "Rewarded"].map(h => (
                  <th key={h} className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.referrals.map((r, i) => (
                <tr key={r.id} className="hover:bg-gray-50/60">
                  <td className="px-4 py-3 text-xs text-gray-400">{i + 1}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{r.name ?? "—"}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{r.email}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-400">{r.studentId ?? "—"}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{fmtDate(r.joinedAt)}</td>
                  <td className="px-4 py-3"><Badge active={r.active} /></td>
                  <td className="px-4 py-3">
                    {r.rewarded
                      ? <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">Rewarded</span>
                      : <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">Pending</span>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

type Tab = "overview" | "search" | "detail";

export default function AdminReferralsPage() {
  const [tab, setTab] = useState<Tab>("overview");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  function handleSelect(userId: string) {
    setSelectedUserId(userId);
    setTab("detail");
  }

  function handleBack() {
    setSelectedUserId(null);
    setTab("overview");
  }

  const TABS: { id: Tab; label: string }[] = [
    { id: "overview", label: "All Referrals" },
    { id: "search",   label: "Search" },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 pb-16">

      {/* Page header */}
      <div>
        <Link href="/admin"
          className="mb-3 inline-flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-gray-800 transition">
          <ChevronLeft className="h-3.5 w-3.5" /> Admin
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-extrabold text-gray-900 tracking-tight">
              <UserPlus className="h-6 w-6 text-indigo-500" /> Referral Management
            </h1>
            <p className="mt-0.5 text-sm text-gray-500">Track which students are referring others and monitor referral performance.</p>
          </div>
          <a
            href="/api/admin/referrals/export"
            target="_blank"
            onClick={() => toast.success("CSV download started")}
            className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 shadow-sm transition"
          >
            <Download className="h-4 w-4" /> Export All CSV
          </a>
        </div>
      </div>

      {/* Tabs (hide when showing detail) */}
      {tab !== "detail" && (
        <div className="flex gap-1 rounded-xl border border-gray-200 bg-gray-50 p-1 w-fit">
          {TABS.map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
                tab === t.id
                  ? "bg-white text-indigo-700 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {/* Tab content */}
      {tab === "overview" && <OverviewTab onSelect={handleSelect} />}
      {tab === "search"   && <SearchTab   onSelect={handleSelect} />}
      {tab === "detail"   && selectedUserId && (
        <DetailTab userId={selectedUserId} onBack={handleBack} />
      )}
    </div>
  );
}
