"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Receipt, ChevronDown, AlertCircle, FileDown, Loader2, Sparkles, CreditCard, CheckCircle2, Clock, XCircle, RefreshCw } from "lucide-react";
import { generateInvoicePdf } from "@/lib/invoicePdf";

type OrderItem = { slotId: string; name: string; price: number };
type Transaction = {
  id: string; transactionId: string; amount: number; currency: string;
  status: string; paymentGatewayId: string | null;
  orderDetails: OrderItem[] | null; createdAt: string;
  customerName?: string; customerEmail?: string; customerPhone?: string;
};

function normalizeOrderDetails(details: unknown): OrderItem[] {
  if (Array.isArray(details))
    return details.filter(d => d && typeof d === "object" && "name" in d)
      .map(d => ({ slotId: typeof (d as any).slotId === "string" ? (d as any).slotId : "", name: String((d as any).name ?? ""), price: Number((d as any).price ?? 0) }));
  if (details && typeof details === "object" && "name" in details) {
    const d = details as any;
    return [{ slotId: d.slotId ?? "", name: String(d.name ?? ""), price: Number(d.price ?? 0) }];
  }
  return [];
}

const STATUS_STYLE: Record<string, { icon: any; cls: string; badge: string }> = {
  SUCCESS: { icon: CheckCircle2, cls: "text-emerald-600", badge: "bg-emerald-50 border-emerald-200 text-emerald-600" },
  FAILED:  { icon: XCircle,     cls: "text-rose-600",    badge: "bg-rose-50 border-rose-200 text-rose-600" },
  PENDING: { icon: Clock,       cls: "text-amber-600",   badge: "bg-amber-50 border-amber-200 text-amber-600" },
};

export default function TransactionsPage() {
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/user/transactions", { credentials: "include" })
      .then(async res => {
        if (!res.ok) {
          if (res.status === 401) {
            // Session expired or invalid — redirect to login after brief delay
            setSessionExpired(true);
            setTimeout(() => router.push("/login"), 2500);
            return [];
          }
          const data = await res.json().catch(() => ({}));
          setError(data?.error ?? "Could not load transactions.");
          return [];
        }
        return res.json();
      })
      .then((data: Transaction[]) => setTransactions(Array.isArray(data) ? data : []))
      .catch(() => { setError("Could not load transactions. Try again."); })
      .finally(() => setLoading(false));
  }, []);

  function fmtDate(d: string) {
    return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  function handleDownload(txn: Transaction) {
    const items = normalizeOrderDetails(txn.orderDetails);
    generateInvoicePdf({
      transactionId: txn.transactionId, date: new Date(txn.createdAt).toLocaleString("en-IN", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }),
      amount: txn.amount, currency: txn.currency, status: txn.status, paymentId: txn.paymentGatewayId,
      customerName: txn.customerName, customerEmail: txn.customerEmail, customerPhone: txn.customerPhone,
      items: items.map(d => ({ name: d.name, price: d.price })),
    });
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl flex h-[60vh] flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
        <p className="text-sm text-[var(--muted-text)] animate-pulse">Loading transactions…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">

      {/* Header */}
      <div className="bg-white rounded-2xl border border-[var(--border)] shadow-[var(--shadow-sm)] px-6 py-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[var(--accent-pale)] border border-[var(--accent-border)] flex items-center justify-center">
          <CreditCard className="w-5 h-5 text-[var(--accent)]" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-[var(--foreground)]">Transactions</h1>
          <p className="text-xs text-[var(--muted-text)]">Complete order history and payment statuses</p>
        </div>
        {transactions.length > 0 && (
          <span className="ml-auto text-xs font-semibold text-[var(--muted-text)] bg-[var(--page-bg)] border border-[var(--border)] px-2.5 py-1 rounded-full">
            {transactions.length} transactions
          </span>
        )}
      </div>

      {/* Session expired — auto-redirect */}
      {sessionExpired && (
        <div className="bg-white rounded-2xl border border-amber-200 shadow-[var(--shadow-sm)] px-6 py-8 text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto">
            <RefreshCw className="w-6 h-6 text-amber-500 animate-spin" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[var(--foreground)] mb-1">Session Expired</h3>
            <p className="text-sm text-[var(--muted-text)]">
              Your session has expired. Redirecting to the login page…
            </p>
          </div>
          <Link href="/login"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 text-white font-bold text-sm hover:bg-amber-600 transition-all">
            Log In →
          </Link>
        </div>
      )}

      {/* Error */}
      {error && !sessionExpired && (
        <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-700">
          <AlertCircle className="w-5 h-5 shrink-0 text-amber-500" />
          <span className="flex-1">{error}</span>
        </div>
      )}

      {/* Empty */}
      {transactions.length === 0 && !error && !sessionExpired && (
        <div className="bg-white rounded-3xl border border-[var(--border)] shadow-[var(--shadow-sm)] px-6 py-16 text-center">
          <div className="w-20 h-20 rounded-2xl bg-[var(--page-bg)] border border-[var(--border)] flex items-center justify-center mx-auto mb-5">
            <Receipt className="w-9 h-9 text-[var(--muted-text)] opacity-50" />
          </div>
          <h3 className="text-xl font-bold text-[var(--foreground)] mb-2">No Transactions Yet</h3>
          <p className="text-sm text-[var(--muted-text)] max-w-sm mx-auto mb-6">Your purchases and payments will appear here after checkout.</p>
          <Link href="/store" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[var(--accent)] text-white font-bold text-sm hover:bg-[var(--accent-hover)] transition-all shadow-[var(--shadow-brand)]">
            <Sparkles className="w-4 h-4" /> Browse Plans
          </Link>
        </div>
      )}

      {/* Transaction list */}
      {transactions.length > 0 && (
        <div className="space-y-3">
          {transactions.map(txn => {
            const isExpanded = expandedId === txn.id;
            const details = normalizeOrderDetails(txn.orderDetails);
            const st = STATUS_STYLE[txn.status] ?? STATUS_STYLE.PENDING;
            const StatusIcon = st.icon;
            return (
              <motion.div key={txn.id} layout
                className={`bg-white rounded-2xl border shadow-[var(--shadow-sm)] overflow-hidden transition-all ${isExpanded ? "border-[var(--accent-border)]" : "border-[var(--border)]"}`}>
                <button type="button" onClick={() => setExpandedId(isExpanded ? null : txn.id)}
                  className="w-full flex flex-col sm:flex-row sm:items-center gap-3 px-6 py-4 text-left hover:bg-[var(--page-bg)] transition-colors">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${isExpanded ? "bg-[var(--accent-pale)] border border-[var(--accent-border)]" : "bg-[var(--page-bg)] border border-[var(--border)]"}`}>
                      <Receipt className={`w-5 h-5 ${isExpanded ? "text-[var(--accent)]" : "text-[var(--muted-text)]"}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-mono text-sm font-bold text-[var(--foreground)] truncate">{txn.transactionId}</p>
                      <p className="text-xs text-[var(--muted-text)] mt-0.5">{fmtDate(txn.createdAt)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${st.badge}`}>
                      <StatusIcon className="w-3 h-3" />{txn.status}
                    </span>
                    <span className="text-lg font-black text-[var(--foreground)] tabular-nums">₹{txn.amount.toLocaleString("en-IN")}</span>
                    {details.length > 0 && (
                      <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}
                        className={`w-7 h-7 rounded-full flex items-center justify-center ${isExpanded ? "bg-[var(--accent-pale)] text-[var(--accent)]" : "bg-[var(--page-bg)] text-[var(--muted-text)]"}`}>
                        <ChevronDown className="w-4 h-4" />
                      </motion.div>
                    )}
                  </div>
                </button>

                <AnimatePresence>
                  {isExpanded && details.length > 0 && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}>
                      <div className="border-t border-[var(--border)] bg-[var(--page-bg)] px-6 py-5">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted-text)] mb-3">Order Items</p>
                        <div className="space-y-2 mb-5">
                          {details.map((item, i) => (
                            <div key={item.slotId || i} className="flex items-center justify-between bg-white rounded-xl border border-[var(--border)] px-4 py-3">
                              <span className="text-sm font-semibold text-[var(--foreground)]">{item.name}</span>
                              <span className="text-sm font-bold text-[var(--accent)]">{item.price > 0 ? `₹${item.price.toLocaleString("en-IN")}` : "FREE"}</span>
                            </div>
                          ))}
                        </div>
                        <button type="button" onClick={e => { e.stopPropagation(); handleDownload(txn); }}
                          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--accent)] text-white text-sm font-bold hover:bg-[var(--accent-hover)] transition-all shadow-[var(--shadow-brand)]">
                          <FileDown className="w-4 h-4" /> Download Invoice PDF
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
