"use client";

import { useState, useEffect, useCallback } from "react";
import { Users, Search, Eye, Download, LayoutGrid, ToggleLeft, ToggleRight, Loader2, UserCog, Gift, Activity } from "lucide-react";
import { Modal } from "@/components/Modal";
import toast from "react-hot-toast";
import { useFetch } from "@/hooks/useFetch";
import {
  AdminPageHeader,
  AdminTable,
  AdminTh,
  AdminTd,
  FormActions,
  RowActions,
  FormInput,
  FormTextarea,
  FormSelect,
} from "@/components/ui";

const GOAL_OPTIONS = ["UPSC", "JEE", "NEET", "GATE", "CAT", "Other"];

type Student = {
  id: string;
  studentId: string | null;
  name: string | null;
  email: string;
  goal: string | null;
  createdAt: string;
  profile?: { phone: string | null; whatsappNumber: string | null; whatsappMarketing: boolean | null; studyGoal: string | null; targetExam: string | null; totalStudyHours: number | null; coinBalance: number | null } | null;
};

type StudentDetails = Student & {
  attendanceDays?: number;
  profile?: {
    fullName: string | null; phone: string | null; studyGoal: string | null; targetExam: string | null;
    targetYear: number | null; institution: string | null; currentStreak: number; longestStreak: number;
    totalPoints: number; totalStudyHours: number; coinBalance: number;
  } | null;
};

const defaultCreate = { email: "", password: "", confirmPassword: "", name: "", goal: "" };
const defaultEdit = {
  // Account
  name: "", email: "", goal: "", newPassword: "",
  // Profile
  fullName: "", phone: "", whatsappNumber: "", studyGoal: "",
  targetExam: "", targetYear: "", institution: "", bio: "",
  profilePicUrl: "", dailyMantra: "",
  // Stats (admin override)
  coinBalance: "", totalPoints: "", currentStreak: "", longestStreak: "",
};

export default function AdminStudentsPage() {
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const { data, loading, refetch } = useFetch<Student[]>(
    search ? `/api/admin/students?search=${encodeURIComponent(search)}` : "/api/admin/students"
  );
  const students = data ?? [];

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const [createOpen, setCreateOpen] = useState(false);
  const [detailsStudent, setDetailsStudent] = useState<StudentDetails | null>(null);
  const [editStudent, setEditStudent] = useState<Student | null>(null);
  const [deleteStudent, setDeleteStudent] = useState<Student | null>(null);
  const [modulesStudent, setModulesStudent] = useState<Student | null>(null);
  const [trialStudent, setTrialStudent] = useState<Student | null>(null);
  const [trialSaving, setTrialSaving] = useState(false);
  const [activityStudent, setActivityStudent] = useState<Student | null>(null);
  const [activityEvents, setActivityEvents] = useState<{ id: string; event: string; page: string | null; meta: Record<string, unknown> | null; createdAt: string }[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);

  const [createForm, setCreateForm] = useState(defaultCreate);
  const [createSaving, setCreateSaving] = useState(false);
  const [editForm, setEditForm] = useState(defaultEdit);
  const [editSaving, setEditSaving] = useState(false);
  const [deleteSaving, setDeleteSaving] = useState(false);

  function openCreate() { setCreateForm(defaultCreate); setCreateOpen(true); }
  async function openEdit(s: Student) {
    setEditStudent(s);
    // Load full profile to pre-fill all fields
    try {
      const res = await fetch(`/api/admin/students/${s.id}`);
      if (res.ok) {
        const full = await res.json();
        const p = full.profile;
        setEditForm({
          name: full.name ?? "", email: full.email, goal: full.goal ?? "", newPassword: "",
          fullName:       p?.fullName       ?? "",
          phone:          p?.phone          ?? "",
          whatsappNumber: p?.whatsappNumber ?? "",
          studyGoal:      p?.studyGoal      ?? "",
          targetExam:     p?.targetExam     ?? "",
          targetYear:     p?.targetYear     ?? "",
          institution:    p?.institution    ?? "",
          bio:            p?.bio            ?? "",
          profilePicUrl:  p?.profilePicUrl  ?? "",
          dailyMantra:    p?.dailyMantra    ?? "",
          coinBalance:    String(p?.coinBalance   ?? ""),
          totalPoints:    String(p?.totalPoints   ?? ""),
          currentStreak:  String(p?.currentStreak ?? ""),
          longestStreak:  String(p?.longestStreak ?? ""),
        });
        return;
      }
    } catch {}
    setEditForm({ ...defaultEdit, name: s.name ?? "", email: s.email, goal: s.goal ?? "" });
  }

  async function fetchDetails(id: string) {
    try {
      const res = await fetch(`/api/admin/students/${id}`);
      if (res.ok) setDetailsStudent(await res.json());
      else toast.error("Could not load student details.");
    } catch { toast.error("Could not load student details."); }
  }

  function downloadCSV() {
    if (!students.length) { toast.error("No students to export"); return; }
    const headers = ["Unique ID", "Name", "Email", "WhatsApp Number", "WA Marketing Consent", "Joined Date"];
    const rows = students.map((s) => [s.studentId || "N/A", s.name || "N/A", s.email, s.profile?.whatsappNumber || s.profile?.phone || "N/A", s.profile?.whatsappMarketing ? "Yes" : "No", new Date(s.createdAt).toLocaleDateString()]);
    const csv = [headers.join(","), ...rows.map((r) => r.map((c) => `"${c}"`).join(","))].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    a.download = `students_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (createForm.password !== createForm.confirmPassword) { toast.error("Passwords do not match."); return; }
    setCreateSaving(true);
    try {
      const res = await fetch("/api/admin/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: createForm.email, password: createForm.password, name: createForm.name.trim() || undefined, goal: createForm.goal.trim() || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) { toast.success("Student account created."); setCreateOpen(false); refetch(); }
      else toast.error(data?.error ?? "Failed to create student.");
    } catch { toast.error("Failed to create student."); }
    finally { setCreateSaving(false); }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editStudent) return;
    setEditSaving(true);
    try {
      const f = editForm;
      const body: Record<string, unknown> = {
        name: f.name.trim() || undefined,
        email: f.email.trim(),
        goal: f.goal.trim() || null,
        // Profile
        fullName:       f.fullName.trim()       || null,
        phone:          f.phone.trim()           || null,
        whatsappNumber: f.whatsappNumber.trim()  || null,
        studyGoal:      f.studyGoal.trim()       || null,
        targetExam:     f.targetExam.trim()      || null,
        targetYear:     f.targetYear.trim()      || null,
        institution:    f.institution.trim()     || null,
        bio:            f.bio.trim()             || null,
        profilePicUrl:  f.profilePicUrl.trim()   || null,
        dailyMantra:    f.dailyMantra.trim()     || null,
      };
      if (f.newPassword.trim())  body.newPassword   = f.newPassword.trim();
      if (f.coinBalance.trim())  body.coinBalance   = parseInt(f.coinBalance);
      if (f.totalPoints.trim())  body.totalPoints   = parseInt(f.totalPoints);
      if (f.currentStreak.trim()) body.currentStreak = parseInt(f.currentStreak);
      if (f.longestStreak.trim()) body.longestStreak = parseInt(f.longestStreak);

      const res = await fetch(`/api/admin/students/${editStudent.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) { toast.success("Student updated."); setEditStudent(null); refetch(); }
      else toast.error(data?.error ?? "Failed to update student.");
    } catch { toast.error("Failed to update student."); }
    finally { setEditSaving(false); }
  }

  async function handleDelete() {
    if (!deleteStudent) return;
    setDeleteSaving(true);
    try {
      const res = await fetch(`/api/admin/students/${deleteStudent.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (res.ok) { toast.success("Student account deleted."); setDeleteStudent(null); if (detailsStudent?.id === deleteStudent.id) setDetailsStudent(null); refetch(); }
      else toast.error(data?.error ?? "Failed to delete student.");
    } catch { toast.error("Failed to delete student."); }
    finally { setDeleteSaving(false); }
  }

  async function openActivity(s: Student) {
    setActivityStudent(s);
    setActivityEvents([]);
    setActivityLoading(true);
    try {
      const res = await fetch(`/api/admin/students/${s.id}/events`);
      if (res.ok) setActivityEvents(await res.json());
    } catch {}
    finally { setActivityLoading(false); }
  }

  async function handleGrantTrial() {
    if (!trialStudent) return;
    setTrialSaving(true);
    try {
      const res = await fetch(`/api/admin/grant-trial/${trialStudent.id}`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        toast.success(`7-day trial granted to ${trialStudent.name || trialStudent.email}!`);
        setTrialStudent(null);
      } else {
        toast.error(data?.error ?? "Trial grant nahi hua.");
      }
    } catch { toast.error("Trial grant nahi hua."); }
    finally { setTrialSaving(false); }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <AdminPageHeader
        title="Student Management"
        description="Create, view, edit, and delete student accounts"
        addLabel="Create student"
        onAdd={openCreate}
        extra={
          <button type="button" onClick={downloadCSV} className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-medium text-[var(--cream)] transition hover:bg-gray-100">
            <Download className="h-4 w-4" /> Export CSV
          </button>
        }
      />

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xl">
        <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
            <Users className="h-5 w-5 text-[var(--accent)]" /> Students ({students.length})
          </h2>
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--cream-muted)]" />
            <input type="text" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Search by ID, email, or name..." className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm text-[var(--cream)] focus:border-indigo-400 focus:outline-none" />
          </div>
        </div>

        <AdminTable loading={loading} empty={students.length === 0} emptyText={search ? "No students match your search." : "No students yet."} minWidth="500px">
          <thead>
            <tr className="border-b border-gray-200 text-left">
              <AdminTh>Unique ID</AdminTh><AdminTh>Name</AdminTh><AdminTh>Email</AdminTh><AdminTh>Goal</AdminTh><AdminTh>WA Mktg</AdminTh><AdminTh>Study hrs</AdminTh><AdminTh>Coins 🪙</AdminTh><AdminTh>Joined</AdminTh><AdminTh>Actions</AdminTh>
            </tr>
          </thead>
          <tbody>
            {students.map((s) => (
              <tr key={s.id} className="border-b border-gray-100">
                <AdminTd className="font-mono text-sm font-medium text-gray-900">{s.studentId ?? "—"}</AdminTd>
                <AdminTd className="font-medium text-gray-900">{s.name || "—"}</AdminTd>
                <AdminTd className="text-gray-900">{s.email}</AdminTd>
                <AdminTd>{s.goal || "—"}</AdminTd>
                <AdminTd>
                  {s.profile?.whatsappMarketing
                    ? <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-[11px] font-bold text-green-700 border border-green-200">📲 Yes</span>
                    : <span className="inline-flex items-center gap-1 rounded-full bg-gray-50 px-2 py-0.5 text-[11px] font-bold text-gray-400 border border-gray-200">No</span>
                  }
                </AdminTd>
                <AdminTd className="font-medium text-[var(--accent)]">{(s.profile?.totalStudyHours ?? 0)}h</AdminTd>
                <AdminTd className="font-medium text-amber-600">{s.profile?.coinBalance ?? 0}</AdminTd>
                <AdminTd>{new Date(s.createdAt).toLocaleDateString()}</AdminTd>
                <AdminTd>
                  <RowActions
                    onEdit={() => openEdit(s)}
                    onDelete={() => setDeleteStudent(s)}
                    extra={
                      <>
                        <button type="button" onClick={() => fetchDetails(s.id)} className="rounded-lg p-1.5 text-[var(--cream-muted)] transition hover:bg-gray-100 hover:text-gray-900" title="View details">
                          <Eye className="h-4 w-4" />
                        </button>
                        <button type="button" onClick={() => setModulesStudent(s)} className="rounded-lg p-1.5 text-[var(--cream-muted)] transition hover:bg-indigo-50 hover:text-indigo-600" title="Manage modules">
                          <LayoutGrid className="h-4 w-4" />
                        </button>
                        <button type="button" onClick={() => setTrialStudent(s)} className="rounded-lg p-1.5 text-[var(--cream-muted)] transition hover:bg-amber-50 hover:text-amber-600" title="Grant 7-day free trial">
                          <Gift className="h-4 w-4" />
                        </button>
                        <button type="button" onClick={() => openActivity(s)} className="rounded-lg p-1.5 text-[var(--cream-muted)] transition hover:bg-violet-50 hover:text-violet-600" title="View activity timeline">
                          <Activity className="h-4 w-4" />
                        </button>
                      </>
                    }
                  />
                </AdminTd>
              </tr>
            ))}
          </tbody>
        </AdminTable>
      </div>

      {/* Create modal */}
      <Modal isOpen={createOpen} title="Create student account" onClose={() => setCreateOpen(false)}>
        <form onSubmit={handleCreate} className="space-y-4">
          <FormInput label="Email *" type="email" value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })} required />
          <div>
            <FormInput label="Password *" type="password" value={createForm.password} onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })} required minLength={8} />
            <p className="mt-0.5 text-[10px] text-[var(--cream-muted)]">Min 8 characters</p>
          </div>
          <FormInput label="Confirm password *" type="password" value={createForm.confirmPassword} onChange={(e) => setCreateForm({ ...createForm, confirmPassword: e.target.value })} required minLength={8} />
          <FormInput label="Name" value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} />
          <FormSelect label="Goal" value={createForm.goal} onChange={(e) => setCreateForm({ ...createForm, goal: e.target.value })}>
            <option value="">Select goal</option>
            {GOAL_OPTIONS.map((g) => <option key={g} value={g}>{g}</option>)}
          </FormSelect>
          <FormActions onCancel={() => setCreateOpen(false)} saving={createSaving} />
        </form>
      </Modal>

      {/* Details modal */}
      <Modal isOpen={!!detailsStudent} title="Student details" onClose={() => setDetailsStudent(null)}>
        {detailsStudent && (
          <div className="space-y-4 text-sm">
            {[
              { label: "Unique ID", value: <span className="font-mono">{detailsStudent.studentId ?? "—"}</span> },
              { label: "Name", value: detailsStudent.name || "—" },
              { label: "Email", value: detailsStudent.email },
              { label: "Goal", value: detailsStudent.goal || "—" },
              { label: "Joined", value: new Date(detailsStudent.createdAt).toLocaleString() },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">{label}</p>
                <p className="text-gray-900">{value}</p>
              </div>
            ))}
            {detailsStudent.profile && (
              <div className="border-t border-gray-200 pt-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">Profile</p>
                <div className="space-y-1.5 text-[var(--cream-muted)]">
                  <p>Full name: {detailsStudent.profile.fullName || "—"}</p>
                  <p>Phone: {detailsStudent.profile.phone || "—"}</p>
                  <p>Target exam: {detailsStudent.profile.targetExam || "—"} · Year: {detailsStudent.profile.targetYear ?? "—"}</p>
                  <p>Institution: {detailsStudent.profile.institution || "—"}</p>
                  <p>Streak: {detailsStudent.profile.currentStreak} · Best: {detailsStudent.profile.longestStreak} · Points: {detailsStudent.profile.totalPoints}</p>
                  <p>Study hours: {detailsStudent.profile.totalStudyHours ?? 0}h · Attendance: {detailsStudent.attendanceDays ?? 0} days</p>
                  <div className="mt-2 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                    <span className="text-base">🪙</span>
                    <span className="text-sm font-semibold text-amber-800">Coin Wallet: {detailsStudent.profile.coinBalance ?? 0} coins</span>
                  </div>
                </div>
              </div>
            )}
            <button type="button" onClick={() => { setDetailsStudent(null); openEdit(detailsStudent); }} className="w-full rounded-xl border border-indigo-300 py-2 text-sm font-medium text-[var(--accent)] hover:bg-indigo-50">
              Edit account
            </button>
          </div>
        )}
      </Modal>

      {/* Edit modal — full profile */}
      <Modal isOpen={!!editStudent} title={`Edit — ${editStudent?.name || editStudent?.email || ""}`} onClose={() => setEditStudent(null)}>
        {editStudent && (
          <form onSubmit={handleEdit} className="space-y-5 max-h-[75vh] overflow-y-auto pr-1">
            {/* ID */}
            <div className="rounded-lg bg-gray-50 border border-gray-200 px-3 py-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Student ID</p>
              <p className="font-mono text-sm text-gray-900">{editStudent.studentId ?? "—"}</p>
            </div>

            {/* Account section */}
            <div>
              <p className="mb-2.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-[var(--accent)]">
                <UserCog className="h-3.5 w-3.5" /> Account
              </p>
              <div className="space-y-3">
                <FormInput label="Name" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
                <FormInput label="Email *" type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} required />
                <FormSelect label="Goal" value={editForm.goal} onChange={(e) => setEditForm({ ...editForm, goal: e.target.value })}>
                  <option value="">Select goal</option>
                  {GOAL_OPTIONS.map((g) => <option key={g} value={g}>{g}</option>)}
                </FormSelect>
                <div>
                  <FormInput label="New Password" type="password" value={editForm.newPassword} onChange={(e) => setEditForm({ ...editForm, newPassword: e.target.value })} placeholder="Leave blank to keep current" minLength={8} />
                  <p className="mt-0.5 text-[10px] text-[var(--cream-muted)]">Min 8 characters. Leave blank to keep current password.</p>
                </div>
              </div>
            </div>

            <hr className="border-gray-100" />

            {/* Profile section */}
            <div>
              <p className="mb-2.5 text-xs font-bold uppercase tracking-widest text-[var(--accent)]">Profile</p>
              <div className="space-y-3">
                <FormInput label="Full Name" value={editForm.fullName} onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })} />
                <div className="grid grid-cols-2 gap-3">
                  <FormInput label="Phone" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} placeholder="+919876543210" />
                  <FormInput label="WhatsApp Number" value={editForm.whatsappNumber} onChange={(e) => setEditForm({ ...editForm, whatsappNumber: e.target.value })} placeholder="+919876543210" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <FormInput label="Target Exam" value={editForm.targetExam} onChange={(e) => setEditForm({ ...editForm, targetExam: e.target.value })} placeholder="UPSC, JEE…" />
                  <FormInput label="Target Year" value={editForm.targetYear} onChange={(e) => setEditForm({ ...editForm, targetYear: e.target.value })} placeholder="2025" />
                </div>
                <FormInput label="Institution" value={editForm.institution} onChange={(e) => setEditForm({ ...editForm, institution: e.target.value })} />
                <FormInput label="Study Goal" value={editForm.studyGoal} onChange={(e) => setEditForm({ ...editForm, studyGoal: e.target.value })} placeholder="e.g. Clear UPSC 2026" />
                <FormTextarea label="Bio" value={editForm.bio} onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })} rows={2} />
                <FormInput label="Profile Picture URL" value={editForm.profilePicUrl} onChange={(e) => setEditForm({ ...editForm, profilePicUrl: e.target.value })} placeholder="https://..." />
                <FormInput label="Daily Mantra" value={editForm.dailyMantra} onChange={(e) => setEditForm({ ...editForm, dailyMantra: e.target.value })} />
              </div>
            </div>

            <hr className="border-gray-100" />

            {/* Stats override */}
            <div>
              <p className="mb-1 text-xs font-bold uppercase tracking-widest text-[var(--accent)]">Stats Override</p>
              <p className="mb-2.5 text-[10px] text-[var(--cream-muted)]">Leave blank to keep current values. Admin manual override.</p>
              <div className="grid grid-cols-2 gap-3">
                <FormInput label="Coin Balance" type="number" min={0} value={editForm.coinBalance} onChange={(e) => setEditForm({ ...editForm, coinBalance: e.target.value })} placeholder="e.g. 500" />
                <FormInput label="Total Points" type="number" min={0} value={editForm.totalPoints} onChange={(e) => setEditForm({ ...editForm, totalPoints: e.target.value })} placeholder="e.g. 1200" />
                <FormInput label="Current Streak (days)" type="number" min={0} value={editForm.currentStreak} onChange={(e) => setEditForm({ ...editForm, currentStreak: e.target.value })} placeholder="e.g. 7" />
                <FormInput label="Longest Streak (days)" type="number" min={0} value={editForm.longestStreak} onChange={(e) => setEditForm({ ...editForm, longestStreak: e.target.value })} placeholder="e.g. 30" />
              </div>
            </div>

            <FormActions onCancel={() => setEditStudent(null)} saving={editSaving} isEdit />
          </form>
        )}
      </Modal>

      {/* Delete modal */}
      <Modal isOpen={!!deleteStudent} title="Delete student account" onClose={() => !deleteSaving && setDeleteStudent(null)}>
        {deleteStudent && (
          <div className="space-y-4">
            <p className="text-sm text-[var(--cream-muted)]">The account will be moved to Bin. You can restore it from Admin → Bin within 30 days.</p>
            <p className="font-medium text-gray-900">{deleteStudent.name || "—"} · {deleteStudent.email}</p>
            <p className="font-mono text-xs text-[var(--cream-muted)]">{deleteStudent.studentId}</p>
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => setDeleteStudent(null)} disabled={deleteSaving} className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">Cancel</button>
              <button type="button" onClick={handleDelete} disabled={deleteSaving} className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60">{deleteSaving ? "Deleting…" : "Delete"}</button>
            </div>
          </div>
        )}
      </Modal>

      {/* Grant Trial modal */}
      <Modal isOpen={!!trialStudent} title="Grant 7-Day Free Trial" onClose={() => !trialSaving && setTrialStudent(null)}>
        {trialStudent && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
              <Gift className="h-5 w-5 text-amber-500 flex-shrink-0" />
              <p className="text-sm text-amber-800">
                This will give <strong>{trialStudent.name || trialStudent.email}</strong> a fresh 7-day free trial — any existing trial will be cancelled.
              </p>
            </div>
            <p className="text-sm text-[var(--cream-muted)]">Student: <span className="font-medium text-gray-900">{trialStudent.email}</span></p>
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={() => setTrialStudent(null)} disabled={trialSaving} className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">Cancel</button>
              <button type="button" onClick={handleGrantTrial} disabled={trialSaving} className="flex-1 rounded-xl bg-amber-500 py-2.5 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-60">
                {trialSaving ? "Granting…" : "Grant Trial"}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Per-student modules modal */}
      <Modal isOpen={!!modulesStudent} title={`Modules — ${modulesStudent?.name || modulesStudent?.email || ""}`} onClose={() => setModulesStudent(null)}>
        {modulesStudent && <StudentModulesPanel userId={modulesStudent.id} />}
      </Modal>

      {/* Activity Timeline modal */}
      <Modal isOpen={!!activityStudent} title={`Activity — ${activityStudent?.name || activityStudent?.email || ""}`} onClose={() => setActivityStudent(null)}>
        <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
          {activityLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-violet-500" /></div>
          ) : activityEvents.length === 0 ? (
            <p className="py-8 text-center text-sm text-[var(--cream-muted)]">Abhi koi activity nahi hai.</p>
          ) : (
            <div className="relative">
              <div className="absolute left-[7px] top-0 bottom-0 w-px bg-gray-100" />
              {activityEvents.map((ev) => (
                <div key={ev.id} className="relative flex gap-3 pb-4 pl-5">
                  <div className={`absolute left-0 mt-1 h-3.5 w-3.5 rounded-full border-2 border-white shadow-sm ${
                    ev.event === "PAGE_VIEW" ? "bg-blue-400" :
                    ev.event === "PAYMENT_SUCCESS" ? "bg-emerald-500" :
                    ev.event === "PAYMENT_FAILED" || ev.event === "ERROR" ? "bg-red-500" :
                    ev.event === "FEATURE_USED" ? "bg-violet-500" :
                    ev.event === "BUTTON_CLICK" ? "bg-amber-400" :
                    "bg-gray-400"
                  }`} />
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-xs font-bold ${
                        ev.event === "PAGE_VIEW" ? "text-blue-600" :
                        ev.event === "PAYMENT_SUCCESS" ? "text-emerald-600" :
                        ev.event === "PAYMENT_FAILED" || ev.event === "ERROR" ? "text-red-600" :
                        ev.event === "FEATURE_USED" ? "text-violet-600" :
                        "text-gray-600"
                      }`}>{ev.event.replace(/_/g, " ")}</span>
                      <span className="text-[10px] text-[var(--cream-muted)] whitespace-nowrap">
                        {new Date(ev.createdAt).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    {ev.page && <p className="text-xs text-[var(--cream-muted)] truncate">{ev.page}</p>}
                    {ev.meta && Object.keys(ev.meta).length > 0 && (
                      <p className="mt-0.5 text-[10px] text-gray-400 font-mono truncate">{JSON.stringify(ev.meta)}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}

// ─── Per-student module panel ──────────────────────────────────────────────────

type ModuleRow = {
  id: string; label: string; section: string;
  globallyDisabled: boolean; studentDisabled: boolean; accessible: boolean;
};

function StudentModulesPanel({ userId }: { userId: string }) {
  const [modules, setModules] = useState<ModuleRow[]>([]);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/student-modules/${userId}`);
      if (res.ok) setModules((await res.json()).modules);
    } catch {}
    finally { setLoading(false); }
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  async function toggle(moduleId: string, currentlyDisabled: boolean) {
    const updated = modules.map(m =>
      m.id === moduleId ? { ...m, studentDisabled: !currentlyDisabled, accessible: !m.accessible || m.globallyDisabled } : m
    );
    setModules(updated);
    const disabled = updated.filter(m => m.studentDisabled).map(m => m.id);
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/student-modules/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ disabled }),
      });
      if (!res.ok) throw new Error();
      toast.success("Saved!");
    } catch {
      toast.error("Save nahi hua.");
      load();
    } finally { setSaving(false); }
  }

  if (loading) return (
    <div className="flex items-center justify-center py-10">
      <Loader2 className="h-5 w-5 animate-spin text-gray-300" />
    </div>
  );

  const sections = ["Main", "Study", "Account"];
  return (
    <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
      <p className="text-xs text-gray-400">Globally disabled modules are shown but cannot be re-enabled here.</p>
      {sections.map(section => {
        const items = modules.filter(m => m.section === section);
        if (!items.length) return null;
        return (
          <div key={section}>
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400 mb-1.5">{section}</p>
            <div className="divide-y divide-gray-50 rounded-xl border border-gray-100 overflow-hidden">
              {items.map(m => (
                <div key={m.id} className={`flex items-center justify-between px-4 py-3 ${m.globallyDisabled ? "bg-gray-50/60 opacity-60" : "bg-white"}`}>
                  <div>
                    <p className={`text-sm font-medium ${!m.accessible ? "text-gray-400 line-through" : "text-gray-900"}`}>{m.label}</p>
                    {m.globallyDisabled && <p className="text-[10px] text-red-400 mt-0.5">Globally disabled — admin panel se enable karo</p>}
                  </div>
                  <button
                    onClick={() => !m.globallyDisabled && toggle(m.id, m.studentDisabled)}
                    disabled={saving || m.globallyDisabled}
                    className="disabled:opacity-40">
                    {m.studentDisabled || m.globallyDisabled
                      ? <ToggleLeft className="h-7 w-7 text-gray-300" />
                      : <ToggleRight className="h-7 w-7 text-indigo-600" />
                    }
                  </button>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
