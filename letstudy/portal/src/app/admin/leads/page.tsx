"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, ClipboardList, Search } from "lucide-react";
import { useFetch } from "@/hooks/useFetch";

type LeadRow = {
  id: string;
  data: Record<string, unknown>;
  source?: string | null;
  createdAt: string;
};

function extractField(data: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    if (typeof data[key] === "string" && data[key]) return data[key] as string;
  }
  return "";
}

type LeadsResp = { data: LeadRow[]; total: number; page: number; hasMore: boolean };

export default function AdminLeadsPage() {
  const [page, setPage]             = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch]         = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchUrl = `/api/admin/leads?page=${page}${search ? `&search=${encodeURIComponent(search)}` : ""}`;
  const { data: resp, loading } = useFetch<LeadsResp>(fetchUrl);
  const items   = resp?.data    ?? [];
  const total   = resp?.total   ?? 0;
  const hasMore = resp?.hasMore ?? false;

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6">
      <div>
        <Link href="/admin" className="inline-flex items-center gap-1 text-sm font-medium text-[var(--cream-muted)] hover:text-[var(--accent)]">
          <ChevronLeft className="h-4 w-4" />
          Back to Admin
        </Link>
        <h1 className="mt-2 flex items-center gap-2 text-2xl font-bold text-gray-900">
          <ClipboardList className="h-7 w-7 text-[var(--accent)]" />
          Leads (Join form submissions)
        </h1>
        <p className="mt-1 text-sm text-[var(--cream-muted)]">
          All submissions from the public join page. Fields are configured via Profile Fields → Landing form (new student).
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-[var(--cream-muted)]">
          Total leads: <span className="font-semibold text-gray-900">{total}</span>
        </p>
        <div className="flex items-center gap-2">
          <form onSubmit={handleSearch} className="flex gap-1.5">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <input
                type="text"
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                placeholder="Search by source…"
                className="w-44 rounded-xl border border-gray-200 bg-white pl-8 pr-3 py-1.5 text-xs text-[var(--cream)] outline-none focus:border-[var(--accent)]"
              />
            </div>
            <button type="submit" className="rounded-xl bg-[var(--accent)] px-3 py-1.5 text-xs font-bold text-white hover:opacity-90">Go</button>
            {search && (
              <button type="button" onClick={() => { setSearchInput(""); setSearch(""); setPage(1); }} className="rounded-xl border border-gray-200 px-2.5 py-1.5 text-xs text-gray-500 hover:bg-gray-50">✕</button>
            )}
          </form>
          <Link href="/api/admin/export/leads" className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-[var(--cream)] hover:bg-gray-100">
            Export CSV
          </Link>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-[var(--cream-muted)]">Loading…</p>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-sm text-[var(--cream-muted)]">
          No leads yet. Share the <code className="rounded bg-white px-1.5 py-0.5 text-xs">/join</code> link in your ads to collect new students.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-gray-50">
          <table className="w-full min-w-[700px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-white">
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 bg-gray-50">Created at</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 bg-gray-50">Name</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 bg-gray-50">Email</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 bg-gray-50">Details</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 bg-gray-50">Source</th>
              </tr>
            </thead>
            <tbody>
              {items.map((lead) => {
                const data = lead.data || {};
                const name = extractField(data, "full_name", "name", "student_name");
                const email = extractField(data, "email", "student_email", "contact_email");
                const mobile = extractField(data, "mobile", "phone", "whatsapp");
                const exam = extractField(data, "prepation", "preparation", "exam", "goal");
                const isExpanded = expandedId === lead.id;

                return (
                  <tr key={lead.id} className="border-b border-gray-100 align-top">
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-[var(--cream-muted)]">
                      {new Date(lead.createdAt).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-[var(--cream)]">{name || "—"}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-[var(--cream-muted)]">{email || "—"}</td>
                    <td className="px-4 py-3 text-[11px] text-[var(--cream-muted)] align-top">
                      <div className="space-y-2 rounded-xl bg-white p-2">
                        <div className="space-y-1">
                          <p><span className="font-semibold text-gray-900">Mobile:</span> {mobile || "—"}</p>
                          <p><span className="font-semibold text-gray-900">Exam / Goal:</span> {exam || "—"}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setExpandedId(isExpanded ? null : lead.id)}
                          className="mt-1 rounded-full border border-gray-200 px-2 py-0.5 text-[10px] text-[var(--cream-muted)] hover:bg-gray-100 hover:text-gray-900"
                        >
                          {isExpanded ? "Hide full details" : "View full details"}
                        </button>
                        {isExpanded && (
                          <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-gray-100 p-2 text-[10px] text-[var(--cream-muted)]">
                            {JSON.stringify(data, null, 2)}
                          </pre>
                        )}
                      </div>
                    </td>
                    <td className="max-w-[160px] break-words px-4 py-3 text-xs text-[var(--cream-muted)]">{lead.source || "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {/* Pagination */}
          <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 rounded-b-2xl">
            <button
              onClick={() => setPage(p => p - 1)}
              disabled={page === 1 || loading}
              className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40"
            >
              <ChevronLeft className="h-3 w-3" /> Prev
            </button>
            <span className="text-xs text-[var(--cream-muted)]">
              Page {page}
              {total > 0 && <> · {(page - 1) * 50 + 1}–{Math.min(page * 50, total)} of {total}</>}
            </span>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={!hasMore || loading}
              className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40"
            >
              Next <ChevronRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
