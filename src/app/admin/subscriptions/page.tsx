"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search, Crown, Users, XCircle,
  ChevronDown, MoreHorizontal, RefreshCw, Calendar, ChevronLeft, Plus, X, Gift,
  CheckCircle2, AlertCircle, Loader2, UserCheck,
} from "lucide-react";
import toast from "react-hot-toast";
import { AdminPageHeader, AdminTable, AdminTh, AdminTd } from "@/components/ui";

type FoundStudent = {
  id: string;
  name: string | null;
  email: string;
  studentId: string | null;
  role: string;
  activeSub: { planType: string; endDate: string } | null;
};

type SubRow = {
  id: string;
  userId: string;
  planType: "MONTHLY" | "YEARLY" | "TRIAL";
  status: "ACTIVE" | "EXPIRED" | "CANCELLED";
  startDate: string;
  endDate: string;
  amountPaid: number;
  transactionId: string | null;
  createdAt: string;
  user: { id: string; name: string | null; email: string; studentId: string | null };
};

type Summary = { active: number; expired: number; cancelled: number; trial: number };

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
  const [summary, setSummary] = useState<Summary>({ active: 0, expired: 0, cancelled: 0, trial: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [planFilter, setPlanFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [grantModal, setGrantModal] = useState(false);
  const [grantQuery, setGrantQuery]   = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [foundStudent, setFoundStudent]   = useState<FoundStudent | null | "not-found">(null);
  const [lookupTimer, setLookupTimer]     = useState<ReturnType<typeof setTimeout> | null>(null);
  const [grantPlan, setGrantPlan]   = useState<"MONTHLY" | "YEARLY">("MONTHLY");
  const [grantMonths, setGrantMonths] = useState("1");
  const [granting, setGranting]       = useState(false);

  const fetchData = useCallback(async (p = 1, s = search, st = statusFilter, pt = planFilter) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), search: s, status: st, planType: pt });
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
  }, [search, statusFilter, planFilter]);

  useEffect(() => { fetchData(); }, []);

  function applySearch(e: React.FormEvent) {
    e.preventDefault();
    setSearch(searchInput);
    fetchData(1, searchInput, statusFilter, planFilter);
  }

  function changeStatus(filter: string) {
    setStatusFilter(filter);
    fetchData(1, search, filter, planFilter);
  }

  function changePlan(filter: string) {
    setPlanFilter(filter);
    fetchData(1, search, statusFilter, filter);
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

  function handleGrantQueryChange(val: string) {
    setGrantQuery(val);
    setFoundStudent(null);
    if (lookupTimer) clearTimeout(lookupTimer);
    const q = val.trim();
    if (q.length < 2) return;
    setLookupLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/students/lookup?q=${encodeURIComponent(q)}`, { credentials: "include" });
        const json = await res.json().catch(() => ({}));
        setFoundStudent(json.user ? (json.user as FoundStudent) : "not-found");
      } catch { setFoundStudent("not-found"); }
      finally { setLookupLoading(false); }
    }, 350);
    setLookupTimer(t);
  }

  function closeGrantModal() {
    setGrantModal(false);
    setGrantQuery("");
    setFoundStudent(null);
    setGrantMonths("1");
    setGrantPlan("MONTHLY");
  }

  async function grantSubscription(e: React.FormEvent) {
    e.preventDefault();
    const student = typeof foundStudent === "object" && foundStudent !== null ? foundStudent : null;
    if (!student) { toast.error("Please search for a student first"); return; }
    setGranting(true);
    try {
      const res = await fetch("/api/admin/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ userId: student.id, planType: grantPlan, months: Number(grantMonths) }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(d.error ?? "Failed"); return; }
      const endDate = d.endDate
        ? new Date(d.endDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
        : "";
      toast.success(`✅ Subscription granted to ${student.name ?? student.email}${endDate ? ` — valid till ${endDate}` : ""}`, { duration: 5000 });
      closeGrantModal();
      fetchData(1);
    } catch { toast.error("Network error"); }
    finally { setGranting(false); }
  }

  const total = summary.active + summary.expired + summary.cancelled;

  const summaryCards = [
    { label: "Total", value: total, icon: Users, color: "text-indigo-600", bg: "bg-indigo-50", border: "border-indigo-200" },
    { label: "Active", value: summary.active, icon: Crown, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200" },
    { label: "Trial", value: summary.trial, icon: Gift, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200" },
    { label: "Expired", value: summary.expired, icon: Calendar, color: "text-orange-600", bg: "bg-orange-50", border: "border-orange-200" },
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
          <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-white p-6 shadow-2xl">

            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--accent-pale)] border border-[var(--accent-border)]">
                  <Gift className="h-4 w-4 text-[var(--accent)]" />
                </div>
                <h3 className="text-base font-bold text-[var(--foreground)]">Grant Subscription</h3>
              </div>
              <button onClick={closeGrantModal} className="text-[var(--cream-muted)] hover:text-[var(--foreground)]">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={grantSubscription} className="space-y-4">

              {/* Step 1: Student Search */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-[var(--cream-muted)] uppercase tracking-wider">
                  Student Dhundho
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--cream-muted)]" />
                  <input
                    type="text"
                    value={grantQuery}
                    onChange={e => handleGrantQueryChange(e.target.value)}
                    placeholder="Student ID (VL-...), email, ya internal ID"
                    autoFocus
                    className="w-full rounded-xl border border-[var(--border)] bg-gray-50 py-2.5 pl-9 pr-4 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
                  />
                  {lookupLoading && (
                    <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-[var(--accent)]" />
                  )}
                </div>
                <p className="mt-1 text-[10px] text-[var(--cream-muted)]">
                  Student ID (e.g. VL-2026-03-12345), email address, ya Students page se copy kiya ID dalo
                </p>
              </div>

              {/* Student Preview */}
              {!lookupLoading && foundStudent === "not-found" && grantQuery.trim().length >= 2 && (
                <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-red-700">Student not found</p>
                    <p className="text-xs text-red-500 mt-0.5">
                      Check the Student ID, email, or exact internal ID — search by name is not supported.
                    </p>
                  </div>
                </div>
              )}

              {!lookupLoading && foundStudent && foundStudent !== "not-found" && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                    <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Student Found</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 border border-emerald-200 text-sm font-bold text-emerald-700">
                      {foundStudent.name?.charAt(0)?.toUpperCase() || "?"}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-gray-900 truncate">{foundStudent.name ?? "—"}</p>
                      <p className="text-xs text-gray-600 truncate">{foundStudent.email}</p>
                      {foundStudent.studentId && (
                        <p className="text-[10px] font-mono text-gray-400">{foundStudent.studentId}</p>
                      )}
                    </div>
                  </div>
                  {foundStudent.activeSub ? (
                    <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-1.5">
                      <p className="text-xs font-semibold text-amber-700">
                        ⚠️ Active subscription hai: {foundStudent.activeSub.planType} — expires{" "}
                        {new Date(foundStudent.activeSub.endDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                      <p className="text-[10px] text-amber-600 mt-0.5">Granting will cancel the existing subscription and start a new one.</p>
                    </div>
                  ) : (
                    <p className="text-xs text-emerald-600">No active subscription — a new one will be granted.</p>
                  )}
                </div>
              )}

              {/* Step 2: Plan Selection (show after student found) */}
              {foundStudent && foundStudent !== "not-found" && (
                <>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-[var(--cream-muted)] uppercase tracking-wider">Plan</label>
                    <div className="flex gap-2">
                      {(["MONTHLY", "YEARLY"] as const).map(p => (
                        <button
                          key={p} type="button"
                          onClick={() => setGrantPlan(p)}
                          className={`flex-1 rounded-xl border py-2.5 text-xs font-bold transition ${
                            grantPlan === p
                              ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                              : "border-[var(--border)] bg-white text-[var(--foreground)] hover:border-[var(--accent)]"
                          }`}
                        >
                          {p === "MONTHLY" ? "Monthly" : "Yearly (12 months)"}
                        </button>
                      ))}
                    </div>
                  </div>

                  {grantPlan === "MONTHLY" && (
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-[var(--cream-muted)] uppercase tracking-wider">
                        Duration (months)
                      </label>
                      <input
                        type="number" min="1" max="24"
                        value={grantMonths}
                        onChange={e => setGrantMonths(e.target.value)}
                        className="w-full rounded-xl border border-[var(--border)] bg-gray-50 px-3 py-2.5 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
                      />
                    </div>
                  )}

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={granting}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] py-3 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50 transition"
                  >
                    {granting ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> Granting…</>
                    ) : (
                      <><UserCheck className="h-4 w-4" /> Grant {grantPlan === "MONTHLY" ? `${grantMonths}m` : "1 Year"} to {foundStudent.name?.split(" ")[0] ?? "Student"}</>
                    )}
                  </button>
                </>
              )}

              {/* No student yet — disabled submit placeholder */}
              {(!foundStudent || foundStudent === "not-found") && !lookupLoading && (
                <button type="button" disabled
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gray-100 border border-gray-200 py-3 text-sm font-bold text-gray-400 cursor-not-allowed"
                >
                  <Gift className="h-4 w-4" /> Search for a student first
                </button>
              )}
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
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

      <div className="flex flex-col gap-3">
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

        {/* Plan type filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-[var(--cream-muted)]">Plan:</span>
          <div className="flex gap-1 rounded-xl border border-[var(--border)] bg-white p-1">
            {[
              { key: "ALL", label: "All" },
              { key: "MONTHLY", label: "Monthly" },
              { key: "YEARLY", label: "Yearly" },
              { key: "TRIAL", label: "Trial" },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => changePlan(key)}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                  planFilter === key
                    ? key === "TRIAL"
                      ? "bg-amber-500 text-white shadow-sm"
                      : "bg-[var(--accent)] text-white shadow-sm"
                    : "text-[var(--cream-muted)] hover:text-[var(--foreground)]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
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
                  {row.planType === "TRIAL" ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-700 ring-1 ring-amber-300">
                      <Gift className="h-3 w-3" />
                      Trial
                    </span>
                  ) : (
                    <span
                      className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold text-white"
                      style={{ background: row.planType === "MONTHLY" ? "linear-gradient(135deg,#8b5cf6,#6366f1)" : "linear-gradient(135deg,#6366f1,#06b6d4)" }}
                    >
                      <Crown className="h-3 w-3" />
                      {row.planType === "MONTHLY" ? "Monthly" : "Yearly"}
                    </span>
                  )}
                </AdminTd>
                <AdminTd>
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${STATUS_STYLES[row.status]}`}>
                    {row.status}
                  </span>
                  {isExpiringSoon && <p className="mt-0.5 text-[10px] font-semibold text-orange-500">Expiring soon!</p>}
                </AdminTd>
                <AdminTd className="font-semibold text-[var(--foreground)]">
                  {row.planType === "TRIAL"
                    ? <span className="text-amber-600">Free</span>
                    : `₹${row.amountPaid.toLocaleString("en-IN")}`
                  }
                </AdminTd>
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
