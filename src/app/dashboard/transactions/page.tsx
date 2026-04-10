"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Receipt, ChevronDown, ChevronUp, AlertCircle, FileDown, ArrowLeft, Loader2, Sparkles, CreditCard } from "lucide-react";
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
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
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
      customerName: txn.customerName,
      customerEmail: txn.customerEmail,
      customerPhone: txn.customerPhone,
      items: details.map((d) => ({ name: d.name, price: d.price })),
    });
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } },
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="flex h-[60vh] flex-col items-center justify-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-[var(--accent)]" />
          <p className="text-sm font-semibold uppercase tracking-widest text-[var(--cream-muted)] animate-pulse">Loading Ledger...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 relative">
      <div className="absolute top-0 right-0 h-64 w-64 rounded-full bg-[var(--accent)]/5 blur-[80px] pointer-events-none"></div>

      <Link href="/dashboard" className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-[var(--cream-muted)] transition-colors hover:text-[var(--accent)]">
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboard
      </Link>
      
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-10 flex flex-col gap-2">
         <h1 className="flex items-center gap-3 text-3xl font-extrabold text-[var(--cream)] md:text-4xl tracking-tight">
           <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20 shadow-[0_0_20px_rgba(var(--accent-rgb),0.2)]">
              <CreditCard className="h-6 w-6" />
           </div>
           Transactions
         </h1>
         <p className="text-sm font-medium text-[var(--cream-muted)] lg:text-base">
           Your complete order history, associated invoices, and payment statuses.
         </p>
      </motion.div>

      {error && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8 flex items-center gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-5 py-4 text-sm font-medium text-amber-200 backdrop-blur-md">
          <AlertCircle className="h-5 w-5 shrink-0 text-amber-400" />
          <span className="flex-1">{error}</span>
          {error.includes("log in") && (
            <Link href="/login" className="rounded-lg bg-amber-500/20 px-4 py-1.5 font-bold text-amber-400 transition hover:bg-amber-500/30">
              Log in
            </Link>
          )}
        </motion.div>
      )}

      {transactions.length === 0 && !error ? (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col relative overflow-hidden rounded-[2.5rem] border border-white/5 bg-black/40 p-12 text-center shadow-2xl backdrop-blur-xl">
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent)]/5 to-transparent opacity-50 pointer-events-none"></div>
          <div className="relative z-10 flex flex-col items-center justify-center">
             <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-white/5 mb-6 border border-white/10 shadow-inner">
                 <Receipt className="h-10 w-10 text-[var(--cream-muted)] opacity-60" />
             </div>
             <h3 className="text-xl font-bold text-[var(--cream)] md:text-2xl">Ledger is Empty</h3>
             <p className="mt-2 text-sm text-[var(--cream-muted)] max-w-md">No transactions found. Your purchases and payments will appear here securely after checkout.</p>
             <Link href="/store" className="mt-8 flex items-center gap-2 rounded-xl bg-[var(--accent)] px-6 py-3 font-bold text-[var(--ink)] shadow-[0_0_15px_rgba(var(--accent-rgb),0.3)] transition-transform hover:scale-105 active:scale-95">
               <Sparkles className="h-4 w-4" /> Browse Plans
             </Link>
          </div>
        </motion.div>
      ) : (
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-4">
          <AnimatePresence>
            {transactions.map((txn) => {
              const isExpanded = expandedId === txn.id;
              const details = normalizeOrderDetails(txn.orderDetails);
              const hasDetails = details.length > 0;
              return (
                <motion.div
                  key={txn.id}
                  variants={itemVariants}
                  className={`overflow-hidden rounded-[1.5rem] border transition-all duration-300 backdrop-blur-md ${isExpanded ? 'border-[var(--accent)]/40 bg-black/60 shadow-lg' : 'border-white/5 bg-black/30 hover:border-white/10 hover:bg-black/40'}`}
                >
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : txn.id)}
                    className="flex w-full flex-col gap-4 px-5 py-5 text-left sm:flex-row sm:items-center sm:justify-between sm:px-6"
                  >
                    <div className="flex flex-1 items-center gap-4 min-w-0">
                      <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/5 border border-white/10 sm:flex">
                        <Receipt className={`h-5 w-5 ${isExpanded ? 'text-[var(--accent)]' : 'text-[var(--cream-muted)]'}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-mono text-[13px] font-bold tracking-wide text-[var(--cream)] truncate">
                          {txn.transactionId}
                        </p>
                        <p className="mt-1 flex items-center gap-2 text-xs font-medium text-[var(--cream-muted)]">
                          {formatDate(txn.createdAt)}
                          <span className="h-1 w-1 rounded-full bg-white/20"></span>
                          {txn.paymentGatewayId ? `PG: ${txn.paymentGatewayId.substring(0, 8)}...` : 'Internal'}
                        </p>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center justify-between sm:justify-end gap-5 w-full sm:w-auto mt-2 sm:mt-0">
                      <div className="flex items-center gap-3">
                        <span
                          className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider border ${
                            txn.status === "SUCCESS"
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              : txn.status === "FAILED"
                                ? "bg-red-500/10 text-red-400 border-red-500/20"
                                : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                          }`}
                        >
                          {txn.status}
                        </span>
                        <span className="text-lg font-extrabold text-[var(--cream)] tabular-nums tracking-tight">
                          ₹{txn.amount.toLocaleString('en-IN')}
                        </span>
                      </div>
                      
                      {hasDetails && (
                        <div className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${isExpanded ? 'bg-[var(--accent)]/10 text-[var(--accent)]' : 'bg-white/5 text-[var(--cream-muted)] group-hover:bg-white/10'}`}>
                          <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
                            <ChevronDown className="h-4 w-4" />
                          </motion.div>
                        </div>
                      )}
                    </div>
                  </button>

                  <AnimatePresence>
                    {isExpanded && hasDetails && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="border-t border-white/5 bg-black/40 px-5 py-5 sm:px-6">
                          <h4 className="mb-3 text-[10px] font-bold uppercase tracking-wider text-[var(--cream-muted)]">
                            Order Items Summary
                          </h4>
                          <div className="space-y-2 mb-5">
                            {details.map((item, i) => (
                              <div
                                key={item.slotId || i}
                                className="flex items-center justify-between rounded-xl border border-white/5 bg-white/5 px-4 py-3"
                              >
                                <span className="text-sm font-medium text-[var(--cream)]">
                                  {item.name}
                                </span>
                                <span className="font-mono text-sm font-semibold text-[var(--accent)]">
                                  {item.price > 0 ? `₹${item.price.toLocaleString('en-IN')}` : "FREE"}
                                </span>
                              </div>
                            ))}
                          </div>
                          
                          <div className="flex justify-end pt-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDownloadInvoice(txn);
                              }}
                              className="group flex flex-1 sm:flex-none items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-6 py-2.5 text-sm font-bold tracking-wide text-[var(--ink)] shadow-[0_0_15px_rgba(var(--accent-rgb),0.3)] transition-all hover:scale-[1.02] active:scale-95"
                            >
                              <FileDown className="h-4 w-4 transition-transform group-hover:-translate-y-0.5" />
                              Download Invoice PDF
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}
