"use client";

import { useState } from "react";
import { Search, RefreshCw, Mail } from "lucide-react";
import type { EmailLog } from "./types";
import { STATUS_META } from "./types";

type Props = {
  logs: EmailLog[];
  loading: boolean;
  statsMap: Record<string, number>;
  total: number;
  onRefresh: () => void;
};

function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const STATUS_OPTS  = ["all", "SENT", "DELIVERED", "OPENED", "BOUNCED", "FAILED"];
const PURPOSE_OPTS = ["all", "OTP", "MAGIC_LINK", "RECEIPT", "MANUAL", "BULK", "GENERAL"];

export function EmailLogsTab({ logs, loading, statsMap, total, onRefresh }: Props) {
  const [search,        setSearch]        = useState("");
  const [statusFilter,  setStatusFilter]  = useState("all");
  const [purposeFilter, setPurposeFilter] = useState("all");

  const totalSent      = Object.values(statsMap).reduce((a, b) => a + b, 0);
  const totalDelivered = (statsMap["DELIVERED"] ?? 0) + (statsMap["OPENED"] ?? 0);
  const totalOpened    = statsMap["OPENED"] ?? 0;
  const totalBounced   = (statsMap["BOUNCED"] ?? 0) + (statsMap["FAILED"] ?? 0);
  const deliveryRate   = totalSent > 0 ? Math.round((totalDelivered / totalSent) * 100) : 0;
  const openRate       = totalDelivered > 0 ? Math.round((totalOpened / totalDelivered) * 100) : 0;

  const filtered = logs.filter((l) => {
    if (statusFilter  !== "all" && l.status  !== statusFilter)  return false;
    if (purposeFilter !== "all" && l.purpose !== purposeFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return l.toEmail.toLowerCase().includes(q) || (l.toName ?? "").toLowerCase().includes(q) || l.subject.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Sent",     value: totalSent,           sub: "all time" },
          { label: "Delivery Rate",  value: `${deliveryRate}%`,  sub: `${totalDelivered} delivered` },
          { label: "Open Rate",      value: `${openRate}%`,      sub: `${totalOpened} opened` },
          { label: "Bounce/Failed",  value: totalBounced,        sub: "check config" },
        ].map(({ label, value, sub }) => (
          <div key={label} className="rounded-2xl border border-[var(--border)] bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--cream-muted)]">{label}</p>
            <p className="mt-1 text-2xl font-black text-[var(--foreground)]">{value}</p>
            <p className="text-[10px] text-[var(--cream-muted)]">{sub}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[160px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--cream-muted)]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search email, name, subject…"
            className="w-full rounded-xl border border-[var(--border)] bg-white pl-8 pr-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
          />
        </div>
        <select value={statusFilter}  onChange={(e) => setStatusFilter(e.target.value)}  className="rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm">
          {STATUS_OPTS.map( (s) => <option key={s} value={s}>{s === "all" ? "All Status"  : s}</option>)}
        </select>
        <select value={purposeFilter} onChange={(e) => setPurposeFilter(e.target.value)} className="rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm">
          {PURPOSE_OPTS.map((p) => <option key={p} value={p}>{p === "all" ? "All Purpose" : p}</option>)}
        </select>
        <button onClick={onRefresh} className="flex items-center gap-1.5 rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--cream-muted)] hover:text-[var(--accent)]">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-white">
        {loading ? (
          <div className="flex items-center justify-center py-14">
            <div className="h-7 w-7 animate-spin rounded-full border-4 border-[var(--accent)] border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-14 text-center text-sm text-[var(--cream-muted)]">
            <Mail className="h-8 w-8 mx-auto mb-3 opacity-30" />No logs found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ minWidth: "820px" }}>
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--background)]">
                  {["To", "Subject", "Purpose", "Status", "Delivered", "Opened", "Clicked", "Sent"].map((h) => (
                    <th key={h} className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--cream-muted)]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filtered.map((log) => {
                  const meta = STATUS_META[log.status] ?? STATUS_META["SENT"];
                  return (
                    <tr key={log.id} className="hover:bg-[var(--background)] transition-colors">
                      <td className="px-3 py-2.5">
                        <p className="font-medium text-[var(--foreground)] text-xs">{log.toName || log.toEmail}</p>
                        {log.toName && <p className="text-[10px] text-[var(--cream-muted)]">{log.toEmail}</p>}
                      </td>
                      <td className="px-3 py-2.5 max-w-[180px]">
                        <p className="truncate text-xs text-[var(--foreground)]">{log.subject}</p>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-600 uppercase">{log.purpose}</span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${meta.bg} ${meta.color}`}>{meta.label}</span>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-[var(--cream-muted)]">{log.deliveredAt ? timeAgo(log.deliveredAt) : "—"}</td>
                      <td className="px-3 py-2.5 text-xs">{log.openedAt  ? <span className="font-semibold text-violet-600">{timeAgo(log.openedAt)}</span>  : "—"}</td>
                      <td className="px-3 py-2.5 text-xs">{log.clickedAt ? <span className="font-semibold text-emerald-600">{timeAgo(log.clickedAt)}</span> : "—"}</td>
                      <td className="px-3 py-2.5 text-[10px] text-[var(--cream-muted)]">{timeAgo(log.createdAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <p className="text-center text-xs text-[var(--cream-muted)]">Showing {filtered.length} of {total} logs · Delivery/open data via Resend webhook</p>
    </div>
  );
}
