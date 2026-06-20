"use client";

import { useState, Fragment } from "react";
import { Receipt, ChevronDown, ChevronUp, FileDown, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { generateInvoicePdf } from "@/lib/invoicePdf";
import { useFetch } from "@/hooks/useFetch";
import { AdminTh } from "@/components/ui";

type OrderItem = { slotId: string; name: string; price: number };

function deriveTxnType(orderDetails: unknown): "coin" | "subscription" | "slot" | "product" | "other" {
  const items = Array.isArray(orderDetails) ? orderDetails : orderDetails ? [orderDetails] : [];
  const name = (items[0] as OrderItem)?.name?.toLowerCase() ?? "";
  if (name.includes("coin")) return "coin";
  if (name.includes("membership") || name.includes("subscription")) return "subscription";
  if (name.includes("slot")) return "slot";
  if (name.includes("pack") && !name.includes("coin")) return "product";
  return "other";
}

const TXN_TYPE_BADGE: Record<string, { label: string; cls: string }> = {
  coin:         { label: "🪙 Coin Pack",    cls: "bg-amber-100 text-amber-700" },
  subscription: { label: "⭐ Subscription", cls: "bg-indigo-100 text-indigo-700" },
  slot:         { label: "🎟️ Slot",          cls: "bg-blue-100 text-blue-700" },
  product:      { label: "📦 Product",      cls: "bg-purple-100 text-purple-700" },
  other:        { label: "📄 Other",        cls: "bg-gray-100 text-gray-600" },
};

type TransactionRow = {
  id: string;
  transactionId: string;
  userId: string;
  amount: number;
  currency: string;
  status: string;
  paymentGatewayId: string | null;
  orderDetails: OrderItem[] | null;
  createdAt: string;
  user: { id: string; name: string | null; email: string; studentId: string | null };
};

function normalizeOrderDetails(details: unknown): OrderItem[] {
  if (Array.isArray(details)) {
    return details
      .filter((d) => d && typeof d === "object" && "name" in d)
      .map((d) => {
        const o = d as OrderItem;
        return { slotId: typeof o.slotId === "string" ? o.slotId : "", name: String(o.name ?? ""), price: Number(o.price ?? 0) };
      });
  }
  if (details && typeof details === "object" && "name" in details) {
    const d = details as OrderItem;
    return [{ slotId: d.slotId ?? "", name: String(d.name ?? ""), price: Number(d.price ?? 0) }];
  }
  return [];
}

const formatDate = (s: string) =>
  new Date(s).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

type TxnResp = { data: TransactionRow[]; total: number; page: number; hasMore: boolean };

export default function AdminTransactionsPage() {
  const [page, setPage]           = useState(1);
  const [typeFilter, setTypeFilter] = useState("all");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch]       = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchUrl = `/api/admin/transactions?page=${page}${search ? `&search=${encodeURIComponent(search)}` : ""}`;
  const { data: resp, loading } = useFetch<TxnResp>(fetchUrl);

  const allTransactions = resp?.data    ?? [];
  const total           = resp?.total   ?? 0;
  const hasMore         = resp?.hasMore ?? false;

  // Type filter is client-side within the current page
  const transactions = typeFilter === "all"
    ? allTransactions
    : allTransactions.filter(t => deriveTxnType(t.orderDetails) === typeFilter);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  }

  function handleTypeFilter(val: string) {
    setTypeFilter(val);
    setPage(1);
  }

  function handleDownloadInvoice(txn: TransactionRow) {
    const details = normalizeOrderDetails(txn.orderDetails);
    generateInvoicePdf({
      transactionId: txn.transactionId,
      date: new Date(txn.createdAt).toLocaleString("en-IN", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }),
      amount: txn.amount,
      currency: txn.currency,
      status: txn.status,
      paymentId: txn.paymentGatewayId,
      items: details.map((d) => ({ name: d.name, price: d.price })),
      customerName: txn.user?.name ?? undefined,
      customerEmail: txn.user?.email,
    });
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:py-8">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--cream)] md:text-3xl">Transactions</h1>
          <p className="mt-1 text-sm text-[var(--cream-muted)]">
            All student orders and payments.
            {total > 0 && <span className="ml-1 font-medium text-[var(--accent)]">{total.toLocaleString("en-IN")} total</span>}
          </p>
        </div>
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <input
              type="text"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="Txn ID, name, email…"
              className="w-52 rounded-xl border border-gray-200 bg-white pl-8 pr-3 py-2 text-xs text-[var(--cream)] outline-none focus:border-[var(--accent)]"
            />
          </div>
          <button type="submit" className="rounded-xl bg-[var(--accent)] px-3 py-2 text-xs font-bold text-white hover:opacity-90">Search</button>
          {search && (
            <button type="button" onClick={() => { setSearchInput(""); setSearch(""); setPage(1); }} className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50">Clear</button>
          )}
        </form>
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        {[["all", "All"], ["coin", "🪙 Coin Packs"], ["subscription", "⭐ Subscriptions"], ["slot", "🎟️ Slots"], ["product", "📦 Products"]].map(([val, label]) => (
          <button key={val} onClick={() => handleTypeFilter(val)} className={`rounded-full px-3 py-1 text-xs font-medium transition ${typeFilter === val ? "bg-[var(--foreground)] text-white" : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"}`}>
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="rounded-2xl border border-gray-200 bg-gray-50 px-6 py-12 text-center text-sm text-[var(--cream-muted)]">Loading…</div>
      ) : transactions.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-gray-50 px-6 py-12 text-center">
          <Receipt className="mx-auto h-12 w-12 text-gray-300" />
          <p className="mt-3 text-sm text-[var(--cream-muted)]">No transactions yet.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white">
          <table className="w-full min-w-[700px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-white">
                <AdminTh>Transaction ID</AdminTh>
                <AdminTh>User</AdminTh>
                <AdminTh>Type</AdminTh>
                <AdminTh>Amount</AdminTh>
                <AdminTh>Status</AdminTh>
                <AdminTh>Date</AdminTh>
                <th className="w-10 px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {transactions.filter((txn) => typeFilter === "all" || deriveTxnType(txn.orderDetails) === typeFilter).map((txn) => {
                const isExpanded = expandedId === txn.id;
                const details = normalizeOrderDetails(txn.orderDetails);
                const hasDetails = details.length > 0;
                return (
                  <Fragment key={txn.id}>
                    <tr className="border-b border-gray-100 transition hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs font-medium text-[var(--accent)]">{txn.transactionId}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{txn.user?.name || "—"}</p>
                        <p className="text-xs text-[var(--cream-muted)]">{txn.user?.email}</p>
                        {txn.user?.studentId && <p className="text-[10px] text-gray-400">{txn.user.studentId}</p>}
                      </td>
                      <td className="px-4 py-3">
                        {(() => { const t = deriveTxnType(txn.orderDetails); const b = TXN_TYPE_BADGE[t]; return <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${b.cls}`}>{b.label}</span>; })()}
                      </td>
                      <td className="px-4 py-3 font-semibold text-gray-900">₹{txn.amount}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${txn.status === "SUCCESS" ? "bg-emerald-100 text-emerald-700" : txn.status === "FAILED" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
                          {txn.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-[var(--cream-muted)]">{formatDate(txn.createdAt)}</td>
                      <td className="px-4 py-3">
                        {(hasDetails || txn.paymentGatewayId) && (
                          <button type="button" onClick={() => setExpandedId(isExpanded ? null : txn.id)} className="rounded-lg p-1.5 text-[var(--cream-muted)] transition hover:bg-gray-100 hover:text-gray-900">
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </button>
                        )}
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="bg-gray-50">
                        <td colSpan={6} className="px-4 py-3">
                          <div className="space-y-2 text-xs">
                            {hasDetails && (
                              <div>
                                <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-500">Order details</p>
                                <ul className="space-y-0.5">
                                  {details.map((item, i) => (
                                    <li key={item.slotId || i} className="text-[var(--cream-muted)]">{item.name}{item.price > 0 ? ` · ₹${item.price}` : " · Free"}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {txn.paymentGatewayId && <p className="text-gray-400">Payment ID: {txn.paymentGatewayId}</p>}
                            <button type="button" onClick={() => handleDownloadInvoice(txn)} className="mt-3 flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-medium text-[var(--accent)] hover:bg-indigo-100">
                              <FileDown className="h-3.5 w-3.5" /> Download Invoice (PDF)
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
          {/* Pagination */}
          <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
            <button
              onClick={() => setPage(p => p - 1)}
              disabled={page === 1 || loading}
              className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40"
            >
              <ChevronLeft className="h-3 w-3" /> Prev
            </button>
            <span className="text-xs text-[var(--cream-muted)]">
              Page {page}
              {total > 0 && (
                <> · {(page - 1) * 50 + 1}–{Math.min(page * 50, total)} of {total.toLocaleString("en-IN")}</>
              )}
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
