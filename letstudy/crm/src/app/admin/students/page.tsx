"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, User, Receipt, BookOpen, ShoppingBag, GraduationCap, UserPlus, ArrowRight } from "lucide-react";
import toast from "react-hot-toast";

type StudentDetail = {
  id: string;
  studentId: string | null;
  name: string | null;
  email: string;
  goal: string | null;
  createdAt: string;
  crmContactId: string | null;
  profile: {
    fullName: string | null;
    phone: string | null;
    whatsappNumber: string | null;
    targetExam: string | null;
    totalStudyHours: number;
    currentStreak: number;
    coinBalance: number;
  } | null;
  attendanceDays: number;
  transactions: { id: string; transactionId: string; amount: number; status: string; createdAt: string }[];
  subscriptions: { slotName: string; timeLabel: string }[];
  digitalPurchases: { productName: string; productPrice: number }[];
};

export default function StudentLookupPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
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
      const res = await fetch(`/api/admin/students/search?q=${encodeURIComponent(q)}`, { credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error ?? "Search failed."); return; }
      if (data.student) setStudent(data.student);
      else setError(data.message ?? "No student found.");
    } catch { setError("Search failed."); }
    finally { setLoading(false); }
  }

  async function handleAddToPipeline() {
    if (!student) return;
    setAdding(true);
    try {
      const res = await fetch("/api/admin/students/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: student.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        toast.success("Added to pipeline.");
        router.push(`/admin/pipeline/${data.id}`);
      } else toast.error(data.error ?? "Failed to add.");
    } catch { toast.error("Failed to add."); }
    finally { setAdding(false); }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 md:text-3xl">Student Lookup</h1>
        <p className="mt-1 text-sm text-gray-500">
          Find any registered student by Student ID, email, name, or mobile number — whether or not they're already in the pipeline.
        </p>
      </div>

      <form onSubmit={handleSearch} className="flex flex-wrap gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Student ID, email, name, or mobile…"
          className="min-w-[240px] flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none focus:ring-2"
        />
        <button type="submit" disabled={loading}
          className="flex items-center gap-1.5 rounded-xl px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          style={{ background: "linear-gradient(135deg, #9A3412, #C2410C)" }}>
          <Search className="h-4 w-4" /> {loading ? "Searching…" : "Search"}
        </button>
      </form>

      {error && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">{error}</div>
      )}

      {student && (
        <div className="space-y-5 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-gray-500">
              <GraduationCap className="h-4 w-4 text-orange-600" /> Student Profile
            </h2>
            {student.crmContactId ? (
              <Link href={`/admin/pipeline/${student.crmContactId}`}
                className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50">
                View in Pipeline <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            ) : (
              <button onClick={handleAddToPipeline} disabled={adding}
                className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                style={{ background: "linear-gradient(135deg, #9A3412, #C2410C)" }}>
                <UserPlus className="h-3.5 w-3.5" /> {adding ? "Adding…" : "Add to Pipeline"}
              </button>
            )}
          </div>

          <div className="grid gap-2 text-sm sm:grid-cols-2">
            <p><span className="text-gray-500">Student ID:</span> <span className="font-mono text-gray-900">{student.studentId ?? "—"}</span></p>
            <p><span className="text-gray-500">Name:</span> <span className="text-gray-900">{student.name || student.profile?.fullName || "—"}</span></p>
            <p><span className="text-gray-500">Email:</span> <span className="text-gray-900">{student.email}</span></p>
            <p><span className="text-gray-500">Phone / WhatsApp:</span> <span className="text-gray-900">{student.profile?.whatsappNumber || student.profile?.phone || "—"}</span></p>
            <p><span className="text-gray-500">Target exam:</span> <span className="text-gray-900">{student.profile?.targetExam || student.goal || "—"}</span></p>
            <p><span className="text-gray-500">Joined:</span> <span className="text-gray-900">{new Date(student.createdAt).toLocaleDateString()}</span></p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-center">
              <p className="text-lg font-bold text-amber-700">{student.profile?.coinBalance ?? 0}</p>
              <p className="text-[10px] font-semibold text-amber-600">COINS</p>
            </div>
            <div className="rounded-xl border border-orange-200 bg-orange-50 p-3 text-center">
              <p className="text-lg font-bold text-orange-700">{student.profile?.currentStreak ?? 0}</p>
              <p className="text-[10px] font-semibold text-orange-600">DAY STREAK</p>
            </div>
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-center">
              <p className="text-lg font-bold text-blue-700">{Math.round(student.profile?.totalStudyHours ?? 0)}h</p>
              <p className="text-[10px] font-semibold text-blue-600">STUDY TIME</p>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-center">
              <p className="text-lg font-bold text-emerald-700">{student.attendanceDays}</p>
              <p className="text-[10px] font-semibold text-emerald-600">ATTENDANCE DAYS</p>
            </div>
          </div>

          <div>
            <h3 className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-500">
              <Receipt className="h-3.5 w-3.5" /> Transactions ({student.transactions.length})
            </h3>
            {student.transactions.length === 0 ? (
              <p className="text-sm text-gray-400">No transactions.</p>
            ) : (
              <div className="space-y-1.5">
                {student.transactions.slice(0, 5).map(t => (
                  <div key={t.id} className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-xs">
                    <span className="font-mono text-gray-700">{t.transactionId}</span>
                    <span className="font-semibold text-orange-700">₹{t.amount}</span>
                    <span className="text-gray-500">{t.status}</span>
                    <span className="text-gray-400">{new Date(t.createdAt).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <h3 className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-500">
                <BookOpen className="h-3.5 w-3.5" /> Subscriptions ({student.subscriptions.length})
              </h3>
              {student.subscriptions.length === 0 ? (
                <p className="text-sm text-gray-400">None.</p>
              ) : (
                <ul className="space-y-1.5 text-xs">
                  {student.subscriptions.map((s, i) => (
                    <li key={i} className="flex justify-between rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                      <span className="text-gray-700">{s.slotName}</span>
                      <span className="text-gray-400">{s.timeLabel}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <h3 className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-500">
                <ShoppingBag className="h-3.5 w-3.5" /> Digital Purchases ({student.digitalPurchases.length})
              </h3>
              {student.digitalPurchases.length === 0 ? (
                <p className="text-sm text-gray-400">None.</p>
              ) : (
                <ul className="space-y-1.5 text-xs">
                  {student.digitalPurchases.map((p, i) => (
                    <li key={i} className="flex justify-between rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                      <span className="text-gray-700">{p.productName}</span>
                      <span className="text-gray-400">₹{p.productPrice}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {searched && !student && !error && (
        <p className="text-sm text-gray-400">No student found. Try another search.</p>
      )}

      {!searched && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 py-16 text-center">
          <User className="mb-3 h-8 w-8 text-gray-300" />
          <p className="text-sm text-gray-400">Search for a student to see their full profile.</p>
        </div>
      )}
    </div>
  );
}
