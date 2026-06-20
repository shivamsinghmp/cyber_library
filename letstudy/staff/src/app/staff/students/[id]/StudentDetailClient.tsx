"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ChevronLeft, Save, User, Receipt } from "lucide-react";
import toast from "react-hot-toast";

type StudentDetail = {
  id: string;
  studentId: string | null;
  name: string | null;
  email: string;
  goal: string | null;
  createdAt: string;
  attendanceDays: number;
  profile: {
    fullName: string | null;
    phone: string | null;
    whatsappNumber: string | null;
    studyGoal: string | null;
    targetExam: string | null;
    targetYear: string | null;
    institution: string | null;
    bio: string | null;
    dailyMantra: string | null;
    totalStudyHours: number;
    coinBalance: number;
  } | null;
};

const EDITABLE_FIELDS = [
  "name", "email", "goal", "fullName", "phone", "whatsappNumber",
  "studyGoal", "targetExam", "targetYear", "institution", "bio", "dailyMantra",
] as const;

export default function StudentDetailClient({ id }: { id: string }) {
  const [student, setStudent] = useState<StudentDetail | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/staff/students/${id}`, { credentials: "include" });
      if (res.ok) {
        const data: StudentDetail = await res.json();
        setStudent(data);
        setForm({
          name: data.name ?? "",
          email: data.email ?? "",
          goal: data.goal ?? "",
          fullName: data.profile?.fullName ?? "",
          phone: data.profile?.phone ?? "",
          whatsappNumber: data.profile?.whatsappNumber ?? "",
          studyGoal: data.profile?.studyGoal ?? "",
          targetExam: data.profile?.targetExam ?? "",
          targetYear: data.profile?.targetYear ?? "",
          institution: data.profile?.institution ?? "",
          bio: data.profile?.bio ?? "",
          dailyMantra: data.profile?.dailyMantra ?? "",
        });
      } else {
        toast.error("Student not found");
      }
    } finally { setLoading(false); }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/staff/students/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (res.ok) {
        toast.success("Student updated");
        load();
      } else {
        toast.error(typeof json.error === "string" ? json.error : "Failed to save");
      }
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--accent)] border-t-transparent" />
      </div>
    );
  }
  if (!student) {
    return <p className="text-sm text-[var(--cream-muted)]">Student not found.</p>;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href="/staff/students" className="inline-flex items-center gap-1 text-sm text-[var(--cream-muted)] hover:text-[var(--accent)]">
          <ChevronLeft className="h-4 w-4" /> Students
        </Link>
        <h1 className="mt-1 flex items-center gap-2 text-2xl font-semibold text-[var(--cream)]">
          <User className="h-5 w-5 text-[var(--accent)]" />
          {student.name || student.email}
        </h1>
        <p className="text-xs text-[var(--cream-muted)]">
          {student.studentId ?? student.id} · Joined {new Date(student.createdAt).toLocaleDateString()} ·
          {" "}{student.attendanceDays} attendance days
        </p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-black/30 p-5 text-sm text-[var(--cream-muted)]">
        <Receipt className="mb-1 inline h-4 w-4 text-[var(--accent)]" /> Coin balance: <span className="text-[var(--cream)]">{student.profile?.coinBalance ?? 0}</span>
        {" · "}Study hours: <span className="text-[var(--cream)]">{Math.floor(student.profile?.totalStudyHours ?? 0)}</span>
        <p className="mt-1 text-xs">Balance/streak overrides and password resets are admin-only — manage from portal.</p>
      </div>

      <div className="space-y-4 rounded-2xl border border-white/10 bg-black/30 p-6">
        {EDITABLE_FIELDS.map((key) => (
          <label key={key} className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--cream-muted)]">
              {key.replace(/([A-Z])/g, " $1")}
            </span>
            <input
              value={form[key] ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
              className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-[var(--cream)] focus:border-[var(--accent)]/70 focus:outline-none"
            />
          </label>
        ))}
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="flex items-center gap-2 rounded-xl bg-[var(--accent)] px-5 py-2.5 text-sm font-bold text-[var(--ink)] disabled:opacity-60"
      >
        <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save changes"}
      </button>
    </div>
  );
}
