"use client";

import { useState } from "react";
import { Search, User, Receipt, BookOpen, ShoppingBag } from "lucide-react";

type StudentDetail = {
  id: string;
  studentId: string | null;
  name: string | null;
  email: string;
  goal: string | null;
  createdAt: string;
  profile: {
    fullName: string | null;
    phone: string | null;
    whatsappNumber: string | null;
    studyGoal: string | null;
    targetExam: string | null;
    targetYear: string | null;
    institution: string | null;
    totalStudyHours: number;
    currentStreak: number;
    longestStreak: number;
    attendanceDays?: number;
  } | null;
  attendanceDays: number;
  transactions: {
    id: string;
    transactionId: string;
    amount: number;
    currency: string;
    status: string;
    orderDetails: unknown;
    createdAt: string;
  }[];
  subscriptions: {
    id: string;
    slotName: string;
    timeLabel: string;
    roomId: string | null;
    createdAt: string;
  }[];
  digitalPurchases: {
    id: string;
    productName: string;
    productPrice: number;
    purchasedAt: string;
    transactionId: string | null;
  }[];
};

export function StaffStudentLookup() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [student, setStudent] = useState<StudentDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    setError(null);
    setStudent(null);
    setSearched(true);
    try {
      const res = await fetch(`/api/staff/student-search?q=${encodeURIComponent(q)}`, { credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Search failed.");
        return;
      }
      if (data.student) {
        setStudent(data.student);
      } else {
        setError(data.message ?? "No student found.");
      }
    } catch {
      setError("Search failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 p-6 shadow-xl">
      <h2 className="mb-2 flex items-center gap-2 text-lg font-semibold text-[var(--cream)]">
        <Search className="h-5 w-5 text-[var(--accent)]" />
        Student lookup
      </h2>
      <p className="mb-4 text-xs text-[var(--cream-muted)]">
        Search by Student ID, email, or mobile number to see full profile, transactions, subscriptions, and digital purchases.
      </p>
      <form onSubmit={handleSearch} className="mb-6 flex flex-wrap gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Student ID, email, or mobile..."
          className="min-w-[200px] flex-1 rounded-xl border border-white/10 bg-black/40 px-4 py-2.5 text-sm text-[var(--cream)] placeholder:text-[var(--cream-muted)]/60 focus:border-[var(--accent)]/70 focus:outline-none"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-[var(--ink)] disabled:opacity-60"
        >
          {loading ? "Searching…" : "Search"}
        </button>
      </form>

      {error && (
        <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          {error}
        </div>
      )}

      {student && (
        <div className="space-y-6">
          {/* Profile */}
          <div className="rounded-xl border border-white/10 bg-black/20 p-4">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--cream)]">
              <User className="h-4 w-4 text-[var(--accent)]" />
              Profile
            </h3>
            <div className="grid gap-2 text-sm sm:grid-cols-2">
              <p><span className="text-[var(--cream-muted)]">Student ID:</span> <span className="font-mono text-[var(--cream)]">{student.studentId ?? "—"}</span></p>
              <p><span className="text-[var(--cream-muted)]">Name:</span> <span className="text-[var(--cream)]">{student.name || student.profile?.fullName || "—"}</span></p>
              <p><span className="text-[var(--cream-muted)]">Email:</span> <span className="text-[var(--cream)]">{student.email}</span></p>
              <p><span className="text-[var(--cream-muted)]">Phone / WhatsApp:</span> <span className="text-[var(--cream)]">{student.profile?.whatsappNumber || student.profile?.phone || "—"}</span></p>
              <p><span className="text-[var(--cream-muted)]">Goal:</span> <span className="text-[var(--cream)]">{student.goal || student.profile?.studyGoal || "—"}</span></p>
              <p><span className="text-[var(--cream-muted)]">Target exam:</span> <span className="text-[var(--cream)]">{student.profile?.targetExam ?? "—"}</span></p>
              <p><span className="text-[var(--cream-muted)]">Total study hours:</span> <span className="text-[var(--cream)]">{student.profile?.totalStudyHours ?? 0}h</span></p>
              <p><span className="text-[var(--cream-muted)]">Attendance (days ≥30 min):</span> <span className="text-[var(--cream)]">{student.attendanceDays ?? 0}</span></p>
              <p><span className="text-[var(--cream-muted)]">Joined:</span> <span className="text-[var(--cream)]">{new Date(student.createdAt).toLocaleString()}</span></p>
            </div>
          </div>

          {/* Transactions / Invoices */}
          <div className="rounded-xl border border-white/10 bg-black/20 p-4">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--cream)]">
              <Receipt className="h-4 w-4 text-[var(--accent)]" />
              Transactions / Invoices ({student.transactions?.length ?? 0})
            </h3>
            {!student.transactions?.length ? (
              <p className="text-sm text-[var(--cream-muted)]">No transactions.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-white/10 text-left">
                      <th className="py-1.5 pr-2 font-medium text-[var(--cream-muted)]">Txn ID</th>
                      <th className="py-1.5 pr-2 font-medium text-[var(--cream-muted)]">Amount</th>
                      <th className="py-1.5 pr-2 font-medium text-[var(--cream-muted)]">Status</th>
                      <th className="py-1.5 font-medium text-[var(--cream-muted)]">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {student.transactions.map((t) => (
                      <tr key={t.id} className="border-b border-white/5">
                        <td className="py-1.5 pr-2 font-mono text-[var(--cream)]">{t.transactionId}</td>
                        <td className="py-1.5 pr-2 text-[var(--accent)]">₹{t.amount}</td>
                        <td className="py-1.5 pr-2">{t.status}</td>
                        <td className="py-1.5 text-[var(--cream-muted)]">{new Date(t.createdAt).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Subscriptions */}
          <div className="rounded-xl border border-white/10 bg-black/20 p-4">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--cream)]">
              <BookOpen className="h-4 w-4 text-[var(--accent)]" />
              Subscriptions ({student.subscriptions?.length ?? 0})
            </h3>
            {!student.subscriptions?.length ? (
              <p className="text-sm text-[var(--cream-muted)]">No subscriptions.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {student.subscriptions.map((s) => (
                  <li key={s.id} className="flex justify-between rounded-lg border border-white/5 bg-black/20 px-3 py-2">
                    <span className="text-[var(--cream)]">{s.slotName}</span>
                    <span className="text-[var(--cream-muted)]">{s.timeLabel} · {new Date(s.createdAt).toLocaleDateString()}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Digital products */}
          <div className="rounded-xl border border-white/10 bg-black/20 p-4">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--cream)]">
              <ShoppingBag className="h-4 w-4 text-[var(--accent)]" />
              Digital products bought ({student.digitalPurchases?.length ?? 0})
            </h3>
            {!student.digitalPurchases?.length ? (
              <p className="text-sm text-[var(--cream-muted)]">None.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {student.digitalPurchases.map((p) => (
                  <li key={p.id} className="flex justify-between rounded-lg border border-white/5 bg-black/20 px-3 py-2">
                    <span className="text-[var(--cream)]">{p.productName}</span>
                    <span className="text-[var(--cream-muted)]">₹{p.productPrice} · {new Date(p.purchasedAt).toLocaleDateString()}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {searched && !student && !error && (
        <p className="text-sm text-[var(--cream-muted)]">No student found. Try another search.</p>
      )}
    </div>
  );
}
