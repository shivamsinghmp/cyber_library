"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, Receipt, Coins, Ticket, Search } from "lucide-react";

type Txn = {
  id: string; transactionId: string; amount: number; currency: string;
  status: string; createdAt: string; user: { name: string | null; email: string };
};
type CoinStudent = { id: string; studentId: string | null; name: string | null; email: string; profile: { fullName: string | null; coinBalance: number } | null };
type CoinLog = { id: string; coins: number; reason: string; balanceAfter: number | null; createdAt: string };
type CouponResult = {
  found: boolean; code?: string; discountType?: string; discountValue?: number;
  currentlyValid?: boolean; usedCount?: number; maxTotalUses?: number | null; description?: string | null;
};

export default function FinanceClient() {
  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <Link href="/staff" className="inline-flex items-center gap-1 text-sm text-[var(--cream-muted)] hover:text-[var(--accent)]">
          <ChevronLeft className="h-4 w-4" /> Dashboard
        </Link>
        <h1 className="mt-1 text-2xl font-semibold text-[var(--cream)]">Finance Lookup</h1>
        <p className="text-xs text-[var(--cream-muted)]">Read-only — payments, coin balances, and coupon validation for support queries.</p>
      </div>

      <TransactionLookup />
      <CoinLookup />
      <CouponLookup />
    </div>
  );
}

function Card({ title, icon: Icon, children }: { title: string; icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 p-6 shadow-xl">
      <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-[var(--cream)]">
        <Icon className="h-5 w-5 text-[var(--accent)]" /> {title}
      </h2>
      {children}
    </div>
  );
}

function SearchBox({ value, onChange, onSubmit, placeholder }: { value: string; onChange: (v: string) => void; onSubmit: () => void; placeholder: string }) {
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }} className="mb-4 flex gap-2">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--cream-muted)]" />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-xl border border-white/10 bg-black/40 pl-9 pr-4 py-2.5 text-sm text-[var(--cream)] placeholder:text-[var(--cream-muted)]/60 focus:border-[var(--accent)]/70 focus:outline-none"
        />
      </div>
      <button type="submit" className="rounded-xl bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-[var(--ink)]">
        Search
      </button>
    </form>
  );
}

function TransactionLookup() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Txn[]>([]);
  const [loading, setLoading] = useState(false);

  async function search() {
    setLoading(true);
    try {
      const res = await fetch(`/api/staff/finance/transactions?search=${encodeURIComponent(q)}`, { credentials: "include" });
      if (res.ok) setResults((await res.json()).data);
    } finally { setLoading(false); }
  }

  return (
    <Card title="Transactions" icon={Receipt}>
      <SearchBox value={q} onChange={setQ} onSubmit={search} placeholder="Txn ID, student name, or email…" />
      {loading ? (
        <p className="text-sm text-[var(--cream-muted)]">Searching…</p>
      ) : results.length === 0 ? (
        <p className="text-sm text-[var(--cream-muted)]">No results yet — search above.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/10 text-left text-[var(--cream-muted)]">
                <th className="py-1.5 pr-2">Txn ID</th><th className="py-1.5 pr-2">Student</th>
                <th className="py-1.5 pr-2">Amount</th><th className="py-1.5 pr-2">Status</th><th className="py-1.5">Date</th>
              </tr>
            </thead>
            <tbody>
              {results.map((t) => (
                <tr key={t.id} className="border-b border-white/5">
                  <td className="py-1.5 pr-2 font-mono text-[var(--cream)]">{t.transactionId}</td>
                  <td className="py-1.5 pr-2 text-[var(--cream)]">{t.user.name || t.user.email}</td>
                  <td className="py-1.5 pr-2 text-[var(--accent)]">₹{t.amount}</td>
                  <td className="py-1.5 pr-2 text-[var(--cream-muted)]">{t.status}</td>
                  <td className="py-1.5 text-[var(--cream-muted)]">{new Date(t.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function CoinLookup() {
  const [q, setQ] = useState("");
  const [students, setStudents] = useState<CoinStudent[]>([]);
  const [passbook, setPassbook] = useState<CoinLog[]>([]);
  const [loading, setLoading] = useState(false);

  async function search() {
    setLoading(true);
    try {
      const res = await fetch(`/api/staff/finance/coins?q=${encodeURIComponent(q)}`, { credentials: "include" });
      if (res.ok) {
        const json = await res.json();
        setStudents(json.students);
        setPassbook(json.passbook ?? []);
      }
    } finally { setLoading(false); }
  }

  return (
    <Card title="Coin Balance / Passbook" icon={Coins}>
      <SearchBox value={q} onChange={setQ} onSubmit={search} placeholder="Student ID, email, or name…" />
      {loading ? (
        <p className="text-sm text-[var(--cream-muted)]">Searching…</p>
      ) : students.length === 0 ? (
        <p className="text-sm text-[var(--cream-muted)]">No results yet — search above.</p>
      ) : (
        <div className="space-y-3">
          {students.map((s) => (
            <div key={s.id} className="flex items-center justify-between rounded-xl border border-white/5 bg-black/20 px-4 py-2.5">
              <div>
                <p className="text-sm font-medium text-[var(--cream)]">{s.name || s.profile?.fullName || s.email}</p>
                <p className="text-xs text-[var(--cream-muted)]">{s.studentId ?? s.id}</p>
              </div>
              <p className="text-sm font-bold text-[var(--accent)]">{s.profile?.coinBalance ?? 0} coins</p>
            </div>
          ))}
          {passbook.length > 0 && (
            <div className="overflow-x-auto pt-2">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-left text-[var(--cream-muted)]">
                    <th className="py-1.5 pr-2">Change</th><th className="py-1.5 pr-2">Reason</th><th className="py-1.5 pr-2">Balance after</th><th className="py-1.5">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {passbook.map((p) => (
                    <tr key={p.id} className="border-b border-white/5">
                      <td className={`py-1.5 pr-2 font-semibold ${p.coins >= 0 ? "text-emerald-400" : "text-red-400"}`}>{p.coins >= 0 ? "+" : ""}{p.coins}</td>
                      <td className="py-1.5 pr-2 text-[var(--cream)]">{p.reason}</td>
                      <td className="py-1.5 pr-2 text-[var(--cream-muted)]">{p.balanceAfter ?? "—"}</td>
                      <td className="py-1.5 text-[var(--cream-muted)]">{new Date(p.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

function CouponLookup() {
  const [code, setCode] = useState("");
  const [result, setResult] = useState<CouponResult | null>(null);
  const [loading, setLoading] = useState(false);

  async function search() {
    if (!code.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/staff/finance/coupons?code=${encodeURIComponent(code.trim())}`, { credentials: "include" });
      setResult(res.ok ? await res.json() : { found: false });
    } finally { setLoading(false); }
  }

  return (
    <Card title="Coupon Validation" icon={Ticket}>
      <SearchBox value={code} onChange={setCode} onSubmit={search} placeholder="Coupon code, e.g. SAVE10…" />
      {loading ? (
        <p className="text-sm text-[var(--cream-muted)]">Checking…</p>
      ) : !result ? (
        <p className="text-sm text-[var(--cream-muted)]">Enter a code above.</p>
      ) : !result.found ? (
        <p className="text-sm text-amber-400">No coupon found with that code.</p>
      ) : (
        <div className="rounded-xl border border-white/5 bg-black/20 px-4 py-3 text-sm">
          <p className="font-mono font-bold text-[var(--cream)]">{result.code}</p>
          <p className="text-[var(--cream-muted)]">
            {result.discountType === "PERCENT" ? `${result.discountValue}% off` : `₹${result.discountValue} off`}
            {result.description ? ` — ${result.description}` : ""}
          </p>
          <p className="mt-1 text-xs text-[var(--cream-muted)]">
            Used {result.usedCount}{result.maxTotalUses ? ` / ${result.maxTotalUses}` : ""} times
          </p>
          <span className={`mt-2 inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${
            result.currentlyValid ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
          }`}>
            {result.currentlyValid ? "Valid now" : "Not currently valid"}
          </span>
        </div>
      )}
    </Card>
  );
}
