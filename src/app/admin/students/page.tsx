"use client";

import { useState, useEffect, useCallback } from "react";
import { Users, Search, Plus, Eye, Pencil, Trash2, Download } from "lucide-react";
import { Modal } from "@/components/Modal";
import toast from "react-hot-toast";

const GOAL_OPTIONS = ["", "UPSC", "JEE", "NEET", "GATE", "CAT", "Other"];

type Student = {
  id: string;
  studentId: string | null;
  name: string | null;
  email: string;
  goal: string | null;
  createdAt: string;
  profile?: {
    phone: string | null;
    whatsappNumber: string | null;
    studyGoal: string | null;
    targetExam: string | null;
    totalStudyHours: number | null;
  } | null;
};

type StudentDetails = Student & {
  attendanceDays?: number;
  profile?: {
    fullName: string | null;
    phone: string | null;
    studyGoal: string | null;
    targetExam: string | null;
    targetYear: number | null;
    institution: string | null;
    currentStreak: number;
    longestStreak: number;
    totalPoints: number;
    totalStudyHours: number;
  } | null;
};

export default function AdminStudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [detailsStudent, setDetailsStudent] = useState<StudentDetails | null>(null);
  const [editStudent, setEditStudent] = useState<Student | null>(null);
  const [deleteStudent, setDeleteStudent] = useState<Student | null>(null);

  const [createEmail, setCreateEmail] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [createConfirmPassword, setCreateConfirmPassword] = useState("");
  const [createName, setCreateName] = useState("");
  const [createGoal, setCreateGoal] = useState("");
  const [createSaving, setCreateSaving] = useState(false);

  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editGoal, setEditGoal] = useState("");
  const [editNewPassword, setEditNewPassword] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  const [deleteSaving, setDeleteSaving] = useState(false);

  const fetchStudents = useCallback(async (query: string) => {
    setLoading(true);
    try {
      const url = query
        ? `/api/admin/students?search=${encodeURIComponent(query)}`
        : "/api/admin/students";
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setStudents(data);
      } else {
        setStudents([]);
      }
    } catch {
      setStudents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStudents(search);
  }, [search, fetchStudents]);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  async function fetchStudentDetails(id: string) {
    try {
      const res = await fetch(`/api/admin/students/${id}`);
      if (res.ok) {
        const data = await res.json();
        setDetailsStudent(data);
      } else {
        toast.error("Could not load student details.");
      }
    } catch {
      toast.error("Could not load student details.");
    }
  }

  function downloadCSV() {
    if (students.length === 0) {
      toast.error("No students to export");
      return;
    }

    const headers = ["Unique ID", "Name", "Email", "WhatsApp Number", "Joined Date"];
    const rows = students.map(s => [
      s.studentId || "N/A",
      s.name || "N/A",
      s.email,
      s.profile?.whatsappNumber || s.profile?.phone || "N/A",
      new Date(s.createdAt).toLocaleDateString()
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `virtual_library_students_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function openCreate() {
    setCreateEmail("");
    setCreatePassword("");
    setCreateConfirmPassword("");
    setCreateName("");
    setCreateGoal("");
    setCreateOpen(true);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (createPassword !== createConfirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }
    setCreateSaving(true);
    try {
      const res = await fetch("/api/admin/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: createEmail,
          password: createPassword,
          name: createName.trim() || undefined,
          goal: createGoal.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        toast.success("Student account created.");
        setCreateOpen(false);
        fetchStudents(search);
      } else {
        toast.error(data?.error ?? "Failed to create student.");
      }
    } catch {
      toast.error("Failed to create student.");
    } finally {
      setCreateSaving(false);
    }
  }

  function openEdit(s: Student) {
    setEditStudent(s);
    setEditName(s.name ?? "");
    setEditEmail(s.email);
    setEditGoal(s.goal ?? "");
    setEditNewPassword("");
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editStudent) return;
    setEditSaving(true);
    try {
      const body: { name?: string; email?: string; goal?: string | null; newPassword?: string } = {
        name: editName.trim() || undefined,
        email: editEmail.trim(),
        goal: editGoal.trim() || null,
      };
      if (editNewPassword.trim()) body.newPassword = editNewPassword.trim();
      const res = await fetch(`/api/admin/students/${editStudent.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        toast.success("Student updated.");
        setEditStudent(null);
        fetchStudents(search);
      } else {
        toast.error(data?.error ?? "Failed to update student.");
      }
    } catch {
      toast.error("Failed to update student.");
    } finally {
      setEditSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteStudent) return;
    setDeleteSaving(true);
    try {
      const res = await fetch(`/api/admin/students/${deleteStudent.id}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        toast.success("Student account deleted.");
        setDeleteStudent(null);
        setDetailsStudent((prev) => (prev?.id === deleteStudent.id ? null : prev));
        fetchStudents(search);
      } else {
        toast.error(data?.error ?? "Failed to delete student.");
      }
    } catch {
      toast.error("Failed to delete student.");
    } finally {
      setDeleteSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--cream)] md:text-3xl">
            Student Management
          </h1>
          <p className="mt-1 text-sm text-[var(--cream-muted)]">
            Create, view, edit, and delete student accounts
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={downloadCSV}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-[var(--cream)] transition hover:bg-white/10"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
          <button
            type="button"
            onClick={openCreate}
            className="flex items-center gap-2 rounded-xl border border-[var(--accent)]/50 bg-[var(--accent)]/10 px-4 py-2.5 text-sm font-medium text-[var(--cream)] transition hover:bg-[var(--accent)]/20"
          >
            <Plus className="h-4 w-4" />
            Create student
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-black/30 p-6 shadow-xl">
        <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-[var(--cream)]">
            <Users className="h-5 w-5 text-[var(--accent)]" />
            Students ({students.length})
          </h2>
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--cream-muted)]" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by Unique ID, email, or name..."
              className="w-full rounded-xl border border-white/10 bg-black/40 py-2.5 pl-10 pr-3 text-sm text-[var(--cream)] placeholder:text-[var(--cream-muted)]/60 focus:border-[var(--accent)]/70 focus:outline-none"
            />
          </div>
        </div>

        {loading ? (
          <p className="py-8 text-center text-sm text-[var(--cream-muted)]">
            Loading…
          </p>
        ) : students.length === 0 ? (
          <p className="py-8 text-center text-sm text-[var(--cream-muted)]">
            {search ? "No students match your search." : "No students yet."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[500px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left">
                  <th className="py-3 pr-3 font-medium text-[var(--cream-muted)]">
                    Unique ID
                  </th>
                  <th className="py-3 pr-3 font-medium text-[var(--cream-muted)]">Name</th>
                  <th className="py-3 pr-3 font-medium text-[var(--cream-muted)]">Email</th>
                  <th className="py-3 pr-3 font-medium text-[var(--cream-muted)]">Goal</th>
                  <th className="py-3 pr-3 font-medium text-[var(--cream-muted)]">Study hrs</th>
                  <th className="py-3 pr-3 font-medium text-[var(--cream-muted)]">Joined</th>
                  <th className="py-3 font-medium text-[var(--cream-muted)]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s.id} className="border-b border-white/5">
                    <td className="py-2.5 pr-3 font-mono text-sm font-medium text-[var(--cream)]">
                      {s.studentId ?? "—"}
                    </td>
                    <td className="py-2.5 pr-3 font-medium text-[var(--cream)]">
                      {s.name || "—"}
                    </td>
                    <td className="py-2.5 pr-3 text-[var(--cream)]">{s.email}</td>
                    <td className="py-2.5 pr-3 text-[var(--cream-muted)]">
                      {s.goal || "—"}
                    </td>
                    <td className="py-2.5 pr-3 font-medium text-[var(--accent)]">
                      {(s.profile?.totalStudyHours ?? 0)}h
                    </td>
                    <td className="py-2.5 pr-3 text-[var(--cream-muted)]">
                      {new Date(s.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-2.5">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => fetchStudentDetails(s.id)}
                          className="rounded-lg p-1.5 text-[var(--cream-muted)] transition hover:bg-white/10 hover:text-[var(--cream)]"
                          title="View details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openEdit(s)}
                          className="rounded-lg p-1.5 text-[var(--cream-muted)] transition hover:bg-white/10 hover:text-[var(--cream)]"
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteStudent(s)}
                          className="rounded-lg p-1.5 text-[var(--cream-muted)] transition hover:bg-white/10 hover:text-red-400"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create student modal */}
      <Modal
        isOpen={createOpen}
        title="Create student account"
        onClose={() => setCreateOpen(false)}
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--cream-muted)]">
              Email *
            </label>
            <input
              type="email"
              value={createEmail}
              onChange={(e) => setCreateEmail(e.target.value)}
              required
              className="admin-input-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--cream-muted)]">
              Password *
            </label>
            <input
              type="password"
              value={createPassword}
              onChange={(e) => setCreatePassword(e.target.value)}
              required
              minLength={8}
              className="admin-input-sm"
            />
            <p className="mt-0.5 text-[10px] text-[var(--cream-muted)]">
              Min 8 characters
            </p>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--cream-muted)]">
              Confirm password *
            </label>
            <input
              type="password"
              value={createConfirmPassword}
              onChange={(e) => setCreateConfirmPassword(e.target.value)}
              required
              minLength={8}
              className="admin-input-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--cream-muted)]">
              Name
            </label>
            <input
              type="text"
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              className="admin-input-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--cream-muted)]">
              Goal
            </label>
            <select
              value={createGoal}
              onChange={(e) => setCreateGoal(e.target.value)}
              className="admin-input-sm"
            >
              <option value="">Select goal</option>
              {GOAL_OPTIONS.filter(Boolean).map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => setCreateOpen(false)}
              className="flex-1 rounded-xl border border-white/10 py-2.5 text-sm font-medium text-[var(--cream)] hover:bg-white/5"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createSaving}
              className="flex-1 rounded-xl bg-[var(--accent)] py-2.5 text-sm font-semibold text-[var(--ink)] transition hover:opacity-90 disabled:opacity-60"
            >
              {createSaving ? "Creating…" : "Create"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Student details modal */}
      <Modal
        isOpen={!!detailsStudent}
        title="Student details"
        onClose={() => setDetailsStudent(null)}
      >
        {detailsStudent && (
          <div className="space-y-4 text-sm">
            <div>
              <p className="text-xs font-medium text-[var(--cream-muted)]">Unique ID</p>
              <p className="font-mono text-[var(--cream)]">{detailsStudent.studentId ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-[var(--cream-muted)]">Name</p>
              <p className="text-[var(--cream)]">{detailsStudent.name || "—"}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-[var(--cream-muted)]">Email</p>
              <p className="text-[var(--cream)]">{detailsStudent.email}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-[var(--cream-muted)]">Goal (account)</p>
              <p className="text-[var(--cream)]">{detailsStudent.goal || "—"}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-[var(--cream-muted)]">Joined</p>
              <p className="text-[var(--cream)]">
                {new Date(detailsStudent.createdAt).toLocaleString()}
              </p>
            </div>
            {detailsStudent.profile && (
              <>
                <div className="border-t border-white/10 pt-3">
                  <p className="mb-2 text-xs font-medium text-[var(--cream-muted)]">
                    Profile
                  </p>
                  <div className="space-y-1.5 text-[var(--cream-muted)]">
                    <p>Full name: {detailsStudent.profile.fullName || "—"}</p>
                    <p>Phone: {detailsStudent.profile.phone || "—"}</p>
                    <p>Study goal: {detailsStudent.profile.studyGoal || "—"}</p>
                    <p>Target exam: {detailsStudent.profile.targetExam || "—"}</p>
                    <p>Target year: {detailsStudent.profile.targetYear ?? "—"}</p>
                    <p>Institution: {detailsStudent.profile.institution || "—"}</p>
                    <p>Streak: {detailsStudent.profile.currentStreak} · Best: {detailsStudent.profile.longestStreak} · Points: {detailsStudent.profile.totalPoints}</p>
                    <p>Total study hours: {detailsStudent.profile.totalStudyHours ?? 0}h</p>
                    <p>Attendance: {detailsStudent.attendanceDays ?? 0} days (days with ≥30 min study)</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setDetailsStudent(null);
                    openEdit(detailsStudent);
                  }}
                  className="w-full rounded-xl border border-[var(--accent)]/50 py-2 text-sm font-medium text-[var(--accent)] hover:bg-[var(--accent)]/10"
                >
                  Edit account
                </button>
              </>
            )}
            {!detailsStudent.profile && (
              <button
                type="button"
                onClick={() => {
                  setDetailsStudent(null);
                  openEdit(detailsStudent);
                }}
                className="w-full rounded-xl border border-[var(--accent)]/50 py-2 text-sm font-medium text-[var(--accent)] hover:bg-[var(--accent)]/10"
              >
                Edit account
              </button>
            )}
          </div>
        )}
      </Modal>

      {/* Edit student modal */}
      <Modal
        isOpen={!!editStudent}
        title="Edit student"
        onClose={() => setEditStudent(null)}
      >
        {editStudent && (
          <form onSubmit={handleEdit} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--cream-muted)]">
                Unique ID
              </label>
              <p className="font-mono text-sm text-[var(--cream)]">{editStudent.studentId ?? "—"}</p>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--cream-muted)]">
                Name
              </label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="admin-input-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--cream-muted)]">
                Email *
              </label>
              <input
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                required
                className="admin-input-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--cream-muted)]">
                Goal
              </label>
              <select
                value={editGoal}
                onChange={(e) => setEditGoal(e.target.value)}
                className="admin-input-sm"
              >
                <option value="">Select goal</option>
                {GOAL_OPTIONS.filter(Boolean).map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--cream-muted)]">
                New password (leave blank to keep current)
              </label>
              <input
                type="password"
                value={editNewPassword}
                onChange={(e) => setEditNewPassword(e.target.value)}
                minLength={8}
                className="admin-input-sm"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditStudent(null)}
                className="flex-1 rounded-xl border border-white/10 py-2.5 text-sm font-medium text-[var(--cream)] hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={editSaving}
                className="flex-1 rounded-xl bg-[var(--accent)] py-2.5 text-sm font-semibold text-[var(--ink)] transition hover:opacity-90 disabled:opacity-60"
              >
                {editSaving ? "Saving…" : "Save"}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Delete confirmation modal */}
      <Modal
        isOpen={!!deleteStudent}
        title="Delete student account"
        onClose={() => !deleteSaving && setDeleteStudent(null)}
      >
        {deleteStudent && (
          <div className="space-y-4">
            <p className="text-sm text-[var(--cream-muted)]">
              The account will be moved to Bin. You can restore it from Admin → Bin within 30 days.
              After 30 days it will be permanently deleted.
            </p>
            <p className="font-medium text-[var(--cream)]">
              {deleteStudent.name || "—"} · {deleteStudent.email}
            </p>
            <p className="font-mono text-xs text-[var(--cream-muted)]">
              {deleteStudent.studentId}
            </p>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteStudent(null)}
                disabled={deleteSaving}
                className="flex-1 rounded-xl border border-white/10 py-2.5 text-sm font-medium text-[var(--cream)] hover:bg-white/5 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleteSaving}
                className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
              >
                {deleteSaving ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
