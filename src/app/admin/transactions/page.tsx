"use client";

import { useState, useEffect, Fragment } from "react";
import { Receipt, ChevronDown, ChevronUp, FileDown } from "lucide-react";
import { generateInvoicePdf } from "@/lib/invoicePdf";

type OrderItem = { slotId: string; name: string; price: number };

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
        return {
          slotId: typeof o.slotId === "string" ? o.slotId : "",
          name: String(o.name ?? ""),
          price: Number(o.price ?? 0),
        };
      });
  }
  if (details && typeof details === "object" && "name" in details) {
    const d = details as OrderItem;
    return [{ slotId: d.slotId ?? "", name: String(d.name ?? ""), price: Number(d.price ?? 0) }];
  }
  return [];
}

export default function AdminTransactionsPage() {
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/transactions", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : []))
      .then((data: TransactionRow[]) => setTransactions(Array.isArray(data) ? data : []))
      .catch(() => setTransactions([]))
      .finally(() => setLoading(false));
  }, []);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDateForPdf = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("en-IN", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  function handleDownloadInvoice(txn: TransactionRow) {
    const details = normalizeOrderDetails(txn.orderDetails);
    generateInvoicePdf({
      transactionId: txn.transactionId,
      date: formatDateForPdf(txn.createdAt),
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
      <h1 className="mb-2 text-2xl font-semibold text-[var(--cream)] md:text-3xl">
        Transactions
      </h1>
      <p className="mb-6 text-sm text-[var(--cream-muted)]">
        All student orders and subscription payments processed through The Cyber Library.
      </p>

      {loading ? (
        <div className="rounded-2xl border border-white/10 bg-black/20 px-6 py-12 text-center text-sm text-[var(--cream-muted)]">
          Loading…
        </div>
      ) : transactions.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-black/20 px-6 py-12 text-center">
          <Receipt className="mx-auto h-12 w-12 text-[var(--cream-muted)]/50" />
          <p className="mt-3 text-sm text-[var(--cream-muted)]">No transactions yet.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white/10 bg-black/25">
          <table className="w-full min-w-[700px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-black/30">
                <th className="px-4 py-3 font-medium text-[var(--cream-muted)]">Transaction ID</th>
                <th className="px-4 py-3 font-medium text-[var(--cream-muted)]">User</th>
                <th className="px-4 py-3 font-medium text-[var(--cream-muted)]">Amount</th>
                <th className="px-4 py-3 font-medium text-[var(--cream-muted)]">Status</th>
                <th className="px-4 py-3 font-medium text-[var(--cream-muted)]">Date</th>
                <th className="px-4 py-3 font-medium text-[var(--cream-muted)] w-10" />
              </tr>
            </thead>
            <tbody>
              {transactions.map((txn) => {
                const isExpanded = expandedId === txn.id;
                const details = normalizeOrderDetails(txn.orderDetails);
                const hasDetails = details.length > 0;
                return (
                  <Fragment key={txn.id}>
                  <tr
                    className="border-b border-white/5 transition hover:bg-white/5"
                  >
                    <td className="px-4 py-3 font-mono text-xs font-medium text-[var(--accent)]">
                      {txn.transactionId}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-[var(--cream)]">
                        {txn.user?.name || "—"}
                      </p>
                      <p className="text-xs text-[var(--cream-muted)]">
                        {txn.user?.email}
                      </p>
                      {txn.user?.studentId && (
                        <p className="text-[10px] text-[var(--cream-muted)]/80">
                          {txn.user.studentId}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 font-semibold text-[var(--cream)]">
                      ₹{txn.amount}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          txn.status === "SUCCESS"
                            ? "bg-emerald-500/15 text-emerald-300"
                            : txn.status === "FAILED"
                              ? "bg-red-500/15 text-red-300"
                              : "bg-amber-500/15 text-amber-300"
                        }`}
                      >
                        {txn.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--cream-muted)]">
                      {formatDate(txn.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      {(hasDetails || txn.paymentGatewayId) && (
                        <button
                          type="button"
                          onClick={() => setExpandedId(isExpanded ? null : txn.id)}
                          className="rounded-lg p-1.5 text-[var(--cream-muted)] transition hover:bg-white/10 hover:text-[var(--cream)]"
                          aria-label={isExpanded ? "Collapse" : "Expand"}
                        >
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </button>
                      )}
                    </td>
                  </tr>
                    {isExpanded && (
                      <tr key={`${txn.id}-exp`} className="bg-black/20">
                        <td colSpan={6} className="px-4 py-3">
                          <div className="space-y-2 text-xs">
                            {hasDetails && (
                              <div>
                                <p className="mb-1 font-medium text-[var(--cream-muted)]">
                                  Order details
                                </p>
                                <ul className="space-y-0.5">
                                  {details.map((item, i) => (
                                    <li
                                      key={item.slotId || i}
                                      className="text-[var(--cream-muted)]"
                                    >
                                      {item.name}
                                      {item.price > 0 ? ` · ₹${item.price}` : " · Free"}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {txn.paymentGatewayId && (
                              <p className="text-[var(--cream-muted)]/80">
                                Payment ID: {txn.paymentGatewayId}
                              </p>
                            )}
                            <button
                              type="button"
                              onClick={() => handleDownloadInvoice(txn)}
                              className="mt-3 flex items-center gap-2 rounded-lg border border-[var(--accent)]/40 bg-[var(--accent)]/10 px-3 py-1.5 text-xs font-medium text-[var(--accent)] hover:bg-[var(--accent)]/20"
                            >
                              <FileDown className="h-3.5 w-3.5" />
                              Download Invoice (PDF)
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
        </div>
      )}
    </div>
  );
}
