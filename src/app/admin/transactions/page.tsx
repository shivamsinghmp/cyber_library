"use client";

import { useState, Fragment } from "react";
import { Receipt, ChevronDown, ChevronUp, FileDown } from "lucide-react";
import { generateInvoicePdf } from "@/lib/invoicePdf";
import { useFetch } from "@/hooks/useFetch";
import { AdminTh } from "@/components/ui";

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

export default function AdminTransactionsPage() {
  const { data, loading } = useFetch<TransactionRow[]>("/api/admin/transactions");
  const transactions = data ?? [];
  const [expandedId, setExpandedId] = useState<string | null>(null);

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
      <h1 className="mb-2 text-2xl font-semibold text-[var(--cream)] md:text-3xl">Transactions</h1>
      <p className="mb-6 text-sm text-[var(--cream-muted)]">All student orders and subscription payments processed through The Cyber Library.</p>

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
                <AdminTh>Amount</AdminTh>
                <AdminTh>Status</AdminTh>
                <AdminTh>Date</AdminTh>
                <th className="w-10 px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {transactions.map((txn) => {
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
        </div>
      )}
    </div>
  );
}
