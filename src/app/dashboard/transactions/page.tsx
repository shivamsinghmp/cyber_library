"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Receipt, ChevronDown, ChevronUp, AlertCircle, FileDown } from "lucide-react";
import { generateInvoicePdf } from "@/lib/invoicePdf";

type OrderItem = { slotId: string; name: string; price: number };

type Transaction = {
  id: string;
  transactionId: string;
  amount: number;
  currency: string;
  status: string;
  paymentGatewayId: string | null;
  orderDetails: OrderItem[] | null;
  createdAt: string;
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

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    fetch("/api/user/transactions", { credentials: "include" })
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          if (res.status === 401) {
            setError("Please log in to view transactions.");
            return [];
          }
          setError(data?.error ?? "Could not load transactions.");
          return [];
        }
        return res.json();
      })
      .then((data: Transaction[]) => setTransactions(Array.isArray(data) ? data : []))
      .catch(() => {
        setError("Could not load transactions. Try again.");
        setTransactions([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-IN", {
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

  function handleDownloadInvoice(txn: Transaction) {
    const details = normalizeOrderDetails(txn.orderDetails);
    generateInvoicePdf({
      transactionId: txn.transactionId,
      date: formatDateForPdf(txn.createdAt),
      amount: txn.amount,
      currency: txn.currency,
      status: txn.status,
      paymentId: txn.paymentGatewayId,
      items: details.map((d) => ({ name: d.name, price: d.price })),
    });
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 md:py-8">
      <h1 className="mb-2 text-2xl font-semibold text-[var(--cream)] md:text-3xl">
        Transactions
      </h1>
      <p className="mb-6 text-sm text-[var(--cream-muted)]">
        Your order history with unique transaction IDs.
      </p>

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
          {error.includes("log in") && (
            <Link href="/login" className="ml-2 font-medium text-[var(--accent)] hover:underline">
              Log in
            </Link>
          )}
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-white/10 bg-black/20 px-6 py-12 text-center text-sm text-[var(--cream-muted)]">
          Loading…
        </div>
      ) : transactions.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-black/20 px-6 py-12 text-center">
          <Receipt className="mx-auto h-12 w-12 text-[var(--cream-muted)]/50" />
          <p className="mt-3 text-sm text-[var(--cream-muted)]">No transactions yet.</p>
          <p className="mt-1 text-xs text-[var(--cream-muted)]/80">
            Your purchases will appear here after checkout.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {transactions.map((txn) => {
            const isExpanded = expandedId === txn.id;
            const details = normalizeOrderDetails(txn.orderDetails);
            const hasDetails = details.length > 0;
            return (
              <motion.div
                key={txn.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="overflow-hidden rounded-2xl border border-white/10 bg-black/25 transition hover:border-[var(--accent)]/30"
              >
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : txn.id)}
                  className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left md:px-5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-sm font-semibold text-[var(--accent)]">
                      {txn.transactionId}
                    </p>
                    <p className="mt-0.5 text-xs text-[var(--cream-muted)]">
                      {formatDate(txn.createdAt)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        txn.status === "SUCCESS"
                          ? "bg-emerald-500/15 text-emerald-300"
                          : txn.status === "FAILED"
                            ? "bg-red-500/15 text-red-300"
                            : "bg-amber-500/15 text-amber-300"
                      }`}
                    >
                      {txn.status}
                    </span>
                    <span className="font-semibold text-[var(--cream)]">
                      ₹{txn.amount}
                    </span>
                    {hasDetails ? (
                      isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-[var(--cream-muted)]" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-[var(--cream-muted)]" />
                      )
                    ) : null}
                  </div>
                </button>
                {isExpanded && hasDetails && (
                  <div className="border-t border-white/10 bg-black/20 px-4 py-3 md:px-5">
                    <p className="mb-2 text-xs font-medium text-[var(--cream-muted)]">
                      Order details
                    </p>
                    <ul className="space-y-1.5">
                      {details.map((item, i) => (
                        <li
                          key={item.slotId || i}
                          className="flex justify-between text-sm"
                        >
                          <span className="text-[var(--cream-muted)]">
                            {item.name}
                            {item.price > 0 ? ` · ₹${item.price}` : " · Free"}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {txn.paymentGatewayId && (
                  <div className="border-t border-white/10 px-4 py-2 md:px-5">
                    <p className="text-[10px] text-[var(--cream-muted)]/80">
                      Payment ID: {txn.paymentGatewayId}
                    </p>
                  </div>
                )}
                <div className="border-t border-white/10 px-4 py-3 md:px-5">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownloadInvoice(txn);
                    }}
                    className="flex items-center gap-2 rounded-xl border border-[var(--accent)]/40 bg-[var(--accent)]/10 px-3 py-2 text-sm font-medium text-[var(--accent)] transition hover:bg-[var(--accent)]/20"
                  >
                    <FileDown className="h-4 w-4" />
                    Download Invoice (PDF)
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
