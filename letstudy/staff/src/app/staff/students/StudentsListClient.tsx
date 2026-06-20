"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Search, ChevronLeft, ChevronRight, User } from "lucide-react";

type StudentRow = {
  id: string;
  studentId: string | null;
  name: string | null;
  email: string;
  goal: string | null;
  createdAt: string;
  profile: {
    phone: string | null;
    whatsappNumber: string | null;
    studyGoal: string | null;
    targetExam: string | null;
  } | null;
};

export default function StudentsListClient() {
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const fetchStudents = useCallback(async (q: string, p: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/staff/students?search=${encodeURIComponent(q)}&page=${p}`, { credentials: "include" });
      if (res.ok) {
        const json = await res.json();
        setStudents(json.data);
        setHasMore(json.hasMore);
      }
    } catch { setStudents([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchStudents(search, page); }, [fetchStudents, search, page]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <Link href="/staff" className="inline-flex items-center gap-1 text-sm text-[var(--cream-muted)] hover:text-[var(--accent)]">
          <ChevronLeft className="h-4 w-4" /> Dashboard
        </Link>
        <h1 className="mt-1 text-2xl font-semibold text-[var(--cream)]">Students</h1>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--cream-muted)]" />
        <input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search by ID, email, or name…"
          className="w-full rounded-xl border border-white/10 bg-black/40 pl-9 pr-4 py-2.5 text-sm text-[var(--cream)] placeholder:text-[var(--cream-muted)]/60 focus:border-[var(--accent)]/70 focus:outline-none"
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/30 shadow-xl">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--accent)] border-t-transparent" />
          </div>
        ) : students.length === 0 ? (
          <p className="py-16 text-center text-sm text-[var(--cream-muted)]">No students found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left">
                  {["Student", "Email", "Phone", "Goal", ""].map((h) => (
                    <th key={h} className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-[var(--cream-muted)]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {students.map((s) => (
                  <tr key={s.id} className="hover:bg-black/20">
                    <td className="px-4 py-3">
                      <p className="font-medium text-[var(--cream)]">{s.name || "—"}</p>
                      <p className="font-mono text-xs text-[var(--cream-muted)]">{s.studentId ?? s.id.slice(0, 10)}</p>
                    </td>
                    <td className="px-4 py-3 text-[var(--cream)]">{s.email}</td>
                    <td className="px-4 py-3 text-[var(--cream-muted)]">{s.profile?.whatsappNumber || s.profile?.phone || "—"}</td>
                    <td className="px-4 py-3 text-[var(--cream-muted)]">{s.goal || s.profile?.studyGoal || "—"}</td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/staff/students/${s.id}`}
                        className="flex items-center gap-1 text-xs font-semibold text-[var(--accent)] hover:underline"
                      >
                        <User className="h-3.5 w-3.5" /> View / Edit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1}
          className="flex items-center gap-1 rounded-lg border border-white/10 px-3 py-1.5 text-sm text-[var(--cream-muted)] disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" /> Prev
        </button>
        <span className="text-xs text-[var(--cream-muted)]">Page {page}</span>
        <button
          onClick={() => setPage((p) => p + 1)}
          disabled={!hasMore}
          className="flex items-center gap-1 rounded-lg border border-white/10 px-3 py-1.5 text-sm text-[var(--cream-muted)] disabled:opacity-40"
        >
          Next <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
