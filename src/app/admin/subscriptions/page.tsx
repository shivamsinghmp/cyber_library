"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search, Crown, Users, XCircle,
  ChevronDown, MoreHorizontal, RefreshCw, Calendar, ChevronLeft, Plus, X,
} from "lucide-react";
import toast from "react-hot-toast";
import { AdminPageHeader, AdminTable, AdminTh, AdminTd } from "@/components/ui";

type SubRow = {
  id: string;
  userId: string;
  planType: "MONTHLY" | "YEARLY";
  status: "ACTIVE" | "EXPIRED" | "CANCELLED";
  startDate: string;
  endDate: string;
  amountPaid: number;
  transactionId: string | null;
  createdAt: string;
  user: { id: string; name: string | null; email: string; studentId: string | null };
};

type Summary = { active: number; expired: number; cancelled: number };

const STATUS_STYLES: Record<string, string> = {
  ACTIVE:    "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-300",
  EXPIRED:   "bg-amber-100  text-amber-700  ring-1 ring-amber-300",
  CANCELLED: "bg-red-100    text-red-700    ring-1 ring-red-300",
};

function daysLeft(endDate: string) {
  return Math.ceil((new Date(endDate).getTime() - Date.now()) / 86_400_000);
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default function AdminSubscriptionsPage() {
  const [rows, setRows] = useState<SubRow[]>([]);
  const [summary, setSummary] = useState<Summary>({ active: 0, expired: 0, cancelled: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [grantModal, setGrantModal] = useState(false);
  const [grantUserId, setGrantUserId] = useState("");
  const [grantPlan, setGrantPlan] = useState<"MONTHLY" | "YEARLY">("MONTHLY");
  const [grantMonths, setGrantMonths] = useState("1");
  const [granting, setGranting] = useState(false);

  const fetchData = useCallback(async (p = 1, s = search, st = statusFilter) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), search: s, status: st });
      const res = await fetch(`/api/admin/subscriptions?${params}`, { credentials: "include" });
      if (!res.ok) throw new Error();
      const json = await res.json();
      setRows(json.data);
      setHasMore(json.hasMore);
      setSummary(json.summary);
      setPage(p);
    } catch {
      toast.error("Failed to load subscriptions");
    }
    setLoading(false);
  }, [search, statusFilter]);

  useEffect(() => { fetchData(); }, []);

  function applySearch(e: React.FormEvent) {
    e.preventDefault();
    setSearch(searchInput);
    fetchData(1, searchInput, statusFilter);
  }

  function changeStatus(filter: string) {
    setStatusFilter(filter);
    fetchData(1, search, filter);
  }

  async function updateStatus(id: string, status: string) {
    setUpdatingId(id);
    try {
      const res = await fetch("/api/admin/subscriptions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id, status }),
      });
      if (!res.ok) throw new Error();
      toast.success("Status updated");
      setRows((prev) => prev.map((r) => r.id === id ? { ...r, status: status as SubRow["status"] } : r));
      setSummary((prev) => {
        const old = rows.find((r) => r.id === id)?.status;
        if (!old || old === status) return prev;
        const next = { ...prev };
        next[old.toLowerCase() as keyof Summary] = Math.max(0, next[old.toLowerCase() as keyof Summary] - 1);
        next[status.toLowerCase() as keyof Summary] += 1;
        return next;
      });
    } catch {
      toast.error("Failed to update");
    }
    setUpdatingId(null);
    setOpenMenu(null);
  }

  async function grantSubscription(e: React.FormEvent) {
    e.preventDefault();
    if (!grantUserId.trim()) { toast.error("User ID required"); return; }
    setGranting(true);
    try {
      const res = await fetch("/api/admin/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ userId: grantUserId.trim(), planType: grantPlan, months: Number(grantMonths) }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(d.error ?? "Failed"); return; }
      toast.success("Subscription granted!");
      setGrantModal(false);
      setGrantUserId("");
      setGrantMonths("1");
      fetchData(1);
    } catch { toast.error("Network error"); }
    finally { setGranting(false); }
  }

  const total = summary.active + summary.expired + summary.cancelled;

  const summaryCards = [
    { label: "Total", value: total, icon: Users, color: "text-indigo-600", bg: "bg-indigo-50", border: "border-indigo-200" },
    { label: "Active", value: summary.active, icon: Crown, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200" },
    { label: "Expired", value: summary.expired, icon: Calendar, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200" },
    { label: "Cancelled", value: summary.cancelled, icon: XCircle, color: "text-red-600", bg: "bg-red-50", border: "border-red-200" },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6">
      <AdminPageHeader
        title="Subscriptions"
        description="Manage all user plan subscriptions"
        extra={
          <div className="flex gap-2">
            <button
              onClick={() => setGrantModal(true)}
              className="flex items-center gap-1.5 rounded-xl bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-white hover:opacity-90"
            >
              <Plus className="h-4 w-4" /> Grant Access
            </button>
            <button onClick={() => fetchData(page)} className="flex items-center gap-1.5 rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--cream-muted)] hover:text-[var(--accent)]">
              <RefreshCw className="h-4 w-4" /> Refresh
            </button>
          </div>
        }
      />

      {/* Grant Subscription Modal */}
      {grantModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-2xl border border-[var(--border)] bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-bold text-[var(--foreground)]">Grant Subscription</h3>
              <button onClick={() => setGrantModal(false)} className="text-[var(--cream-muted)] hover:text-[var(--foreground)]">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={grantSubscription} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-[var(--cream-muted)]">User ID</label>
                <input
                  type="text"
                  value={grantUserId}
                  onChange={e => setGrantUserId(e.target.value)}
                  placeholder="Paste user ID from Students page"
                  className="w-full rounded-xl border border-[var(--border)] bg-gray-50 px-3 py-2.5 text-sm font-mono text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
                  required
                />
                <p className="mt-1 text-[10px] text-[var(--cream-muted)]">Admin → Students → user row mein ID milega</p>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-[var(--cream-muted)]">Plan</label>
                <div className="flex gap-2">
                  {(["MONTHLY", "YEARLY"] as const).map(p => (
                    <button
                      key={p} type="button"
                      onClick={() => setGrantPlan(p)}
                      className={`flex-1 rounded-xl border py-2 text-xs font-bold transition ${grantPlan === p ? "border-[var(--accent)] bg-[var(--accent)] text-white" : "border-[var(--border)] bg-white text-[var(--foreground)] hover:border-[var(--accent)]"}`}
                    >
                      {p === "MONTHLY" ? "Monthly" : "Yearly"}
                    </button>
                  ))}
                </div>
              </div>
              {grantPlan === "MONTHLY" && (
                <div>
                  <label className="mb-1 block text-xs font-semibold text-[var(--cream-muted)]">Duration (months)</label>
                  <input
                    type="number" min="1" max="24"
                    value={grantMonths}
                    onChange={e => setGrantMonths(e.target.value)}
                    className="w-full rounded-xl border border-[var(--border)] bg-gray-50 px-3 py-2.5 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
                  />
                </div>
              )}
              <button
                type="submit" disabled={granting}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] py-2.5 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50"
              >
                {granting ? "Granting…" : "Grant Free Access"}
              </button>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {summaryCards.map(({ label, value, icon: Icon, color, bg, border }) => (
          <div key={label} className={`rounded-2xl border ${border} ${bg} p-4`}>
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-[var(--cream-muted)] uppercase tracking-wider">{label}</p>
              <Icon className={`h-4 w-4 ${color}`} />
            </div>
            <p className={`mt-1 text-3xl font-extrabold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <form onSubmit={applySearch} className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--cream-muted)]" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search name, email, ID…"
              className="w-64 rounded-xl border border-[var(--border)] bg-white pl-9 pr-4 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
            />
          </div>
          <button type="submit" className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90">
            Search
          </button>
        </form>

        <div className="flex gap-1 rounded-xl border border-[var(--border)] bg-white p-1">
          {["ALL", "ACTIVE", "EXPIRED", "CANCELLED"].map((s) => (
            <button
              key={s}
              onClick={() => changeStatus(s)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                statusFilter === s
                  ? "bg-[var(--accent)] text-white shadow-sm"
                  : "text-[var(--cream-muted)] hover:text-[var(--foreground)]"
              }`}
            >
              {s === "ALL" ? "All" : s[0] + s.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      <AdminTable loading={loading} empty={rows.length === 0} emptyText="No subscriptions found" minWidth="800px">
        <thead>
          <tr className="border-b border-[var(--border)] bg-[var(--background)]">
            {["User", "Plan", "Status", "Amount", "Start", "Expires", "Days Left", ""].map((h) => (
              <AdminTh key={h}>{h}</AdminTh>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border)]">
          {rows.map((row) => {
            const dl = daysLeft(row.endDate);
            const isExpiringSoon = row.status === "ACTIVE" && dl <= 7 && dl >= 0;
            return (
              <tr key={row.id} className="hover:bg-[var(--background)] transition-colors">
                <AdminTd className="text-sm">
                  <p className="font-semibold text-[var(--foreground)]">{row.user.name ?? "—"}</p>
                  <p className="text-xs text-[var(--cream-muted)]">{row.user.email}</p>
                  {row.user.studentId && <p className="text-[10px] text-[var(--cream-muted)]">{row.user.studentId}</p>}
                </AdminTd>
                <AdminTd>
                  <span
                    className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold text-white"
                    style={{ background: row.planType === "MONTHLY" ? "linear-gradient(135deg,#8b5cf6,#6366f1)" : "linear-gradient(135deg,#6366f1,#06b6d4)" }}
                  >
                    <Crown className="h-3 w-3" />
                    {row.planType === "MONTHLY" ? "Monthly" : "Yearly"}
                  </span>
                </AdminTd>
                <AdminTd>
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${STATUS_STYLES[row.status]}`}>
                    {row.status}
                  </span>
                  {isExpiringSoon && <p className="mt-0.5 text-[10px] font-semibold text-orange-500">Expiring soon!</p>}
                </AdminTd>
                <AdminTd className="font-semibold text-[var(--foreground)]">₹{row.amountPaid.toLocaleString("en-IN")}</AdminTd>
                <AdminTd>{fmtDate(row.startDate)}</AdminTd>
                <AdminTd>{fmtDate(row.endDate)}</AdminTd>
                <AdminTd>
                  {row.status === "ACTIVE" ? (
                    <span className={`font-bold ${dl <= 0 ? "text-red-500" : dl <= 7 ? "text-orange-500" : "text-emerald-600"}`}>
                      {dl <= 0 ? "Expired" : `${dl}d`}
                    </span>
                  ) : (
                    <span className="text-[var(--cream-muted)]">—</span>
                  )}
                </AdminTd>
                <AdminTd>
                  <div className="relative">
                    <button
                      onClick={() => setOpenMenu(openMenu === row.id ? null : row.id)}
                      disabled={updatingId === row.id}
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--cream-muted)] hover:bg-[var(--background)] hover:text-[var(--foreground)] disabled:opacity-40"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                    {openMenu === row.id && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setOpenMenu(null)} />
                        <div className="absolute right-0 top-8 z-20 w-40 overflow-hidden rounded-xl border border-[var(--border)] bg-white shadow-lg">
                          {["ACTIVE", "EXPIRED", "CANCELLED"]
                            .filter((s) => s !== row.status)
                            .map((s) => (
                              <button
                                key={s}
                                onClick={() => updateStatus(row.id, s)}
                                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-xs font-semibold text-[var(--foreground)] hover:bg-[var(--background)]"
                              >
                                <span className={`h-2 w-2 rounded-full ${s === "ACTIVE" ? "bg-emerald-500" : s === "EXPIRED" ? "bg-amber-500" : "bg-red-500"}`} />
                                Mark {s[0] + s.slice(1).toLowerCase()}
                              </button>
                            ))}
                        </div>
                      </>
                    )}
                  </div>
                </AdminTd>
              </tr>
            );
          })}
        </tbody>
      </AdminTable>

      {(page > 1 || hasMore) && (
        <div className="flex items-center justify-between">
          <button
            onClick={() => fetchData(page - 1)}
            disabled={page === 1}
            className="flex items-center gap-1 rounded-xl border border-[var(--border)] bg-white px-4 py-2 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--background)] disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" /> Prev
          </button>
          <span className="text-sm text-[var(--cream-muted)]">Page {page}</span>
          <button
            onClick={() => fetchData(page + 1)}
            disabled={!hasMore}
            className="flex items-center gap-1 rounded-xl border border-[var(--border)] bg-white px-4 py-2 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--background)] disabled:opacity-40"
          >
            Next <ChevronDown className="h-4 w-4 -rotate-90" />
          </button>
        </div>
      )}
    </div>
  );
}
