"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Mail, Lock, UserPlus, Users, Activity, Shield } from "lucide-react";
import { Modal } from "@/components/Modal";
import toast from "react-hot-toast";
import { ADMIN_MODULES } from "@/lib/permissions-client";
import { AdminTh, AdminTd, FormActions, FormInput, FormSelect, RowActions } from "@/components/ui";

type StaffUser = { id: string; name: string | null; email: string; role: string; createdAt: string };
type StaffWithActivity = StaffUser & { loginAt: string | null; isActive: boolean; totalHours: number };
type ActiveStaffItem = StaffUser & { loginAt: string; totalHours: number };

function formatTotalTime(totalHours: number): string {
  if (totalHours <= 0 || !Number.isFinite(totalHours)) return "0h 0m 0s";
  const s = Math.round(totalHours * 3600);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return [h > 0 && `${h}h`, `${m}m`, `${sec}s`].filter(Boolean).join(" ");
}

const schema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(1, "Confirm password"),
}).refine((d) => d.password === d.confirmPassword, { message: "Passwords do not match", path: ["confirmPassword"] });

type FormData = z.infer<typeof schema>;

export default function AdminStaffPage() {
  const [success, setSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [staff, setStaff] = useState<StaffWithActivity[]>([]);
  const [activeStaff, setActiveStaff] = useState<ActiveStaffItem[]>([]);
  const [staffLoading, setStaffLoading] = useState(true);
  const [accountType, setAccountType] = useState<"EMPLOYEE" | "INFLUENCER">("EMPLOYEE");

  const [editStaff, setEditStaff] = useState<StaffUser | null>(null);
  const [editForm, setEditForm] = useState({ name: "", email: "", role: "EMPLOYEE" as "EMPLOYEE" | "INFLUENCER", newPassword: "" });
  const [editSaving, setEditSaving] = useState(false);

  const [deleteStaff, setDeleteStaff] = useState<StaffUser | null>(null);
  const [deleteSaving, setDeleteSaving] = useState(false);

  const [permStaff, setPermStaff] = useState<StaffUser | null>(null);
  const [permModules, setPermModules] = useState<string[]>([]);
  const [permLoading, setPermLoading] = useState(false);
  const [permSaving, setPermSaving] = useState(false);

  const fetchStaff = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/staff-activity");
      if (res.ok) {
        const data = await res.json();
        setStaff(data.staff ?? []);
        setActiveStaff(data.activeStaff ?? []);
      } else {
        const listRes = await fetch("/api/admin/staff");
        if (listRes.ok) {
          const listData = await listRes.json();
          setStaff((listData.staff ?? []).map((s: StaffUser) => ({ ...s, loginAt: null, isActive: false, totalHours: 0 })));
        }
        setActiveStaff([]);
      }
    } catch { setStaff([]); setActiveStaff([]); }
    finally { setStaffLoading(false); }
  }, []);

  useEffect(() => { fetchStaff(); }, [fetchStaff]);
  useEffect(() => { const id = setInterval(fetchStaff, 30000); return () => clearInterval(id); }, [fetchStaff]);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "", confirmPassword: "" },
  });

  async function onSubmit(data: FormData) {
    setSuccess(false); setSubmitError(null);
    try {
      const res = await fetch("/api/admin/create-staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.email.trim(), password: data.password, accountType }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = res.status === 403 ? "Only Admin can create staff." : json.error?.email?.[0] ?? (typeof json.error === "string" ? json.error : "Failed to create staff.");
        setSubmitError(msg); toast.error(msg); return;
      }
      toast.success(accountType === "INFLUENCER" ? "Influencer account created." : "Staff account created.");
      setSuccess(true); reset(); fetchStaff();
    } catch { const msg = "Something went wrong."; setSubmitError(msg); toast.error(msg); }
  }

  function openEdit(s: StaffUser) {
    setEditStaff(s);
    setEditForm({ name: s.name ?? "", email: s.email, role: (s.role === "INFLUENCER" ? "INFLUENCER" : "EMPLOYEE"), newPassword: "" });
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editStaff) return;
    setEditSaving(true);
    try {
      const body: Record<string, unknown> = { name: editForm.name.trim() || undefined, email: editForm.email.trim(), role: editForm.role };
      if (editForm.newPassword.trim()) body.newPassword = editForm.newPassword.trim();
      const res = await fetch(`/api/admin/staff/${editStaff.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const json = await res.json().catch(() => ({}));
      if (res.ok) { toast.success("Staff updated."); setEditStaff(null); fetchStaff(); }
      else toast.error(json.error?.email?.[0] ?? json.error ?? "Failed to update.");
    } finally { setEditSaving(false); }
  }

  async function handleDelete() {
    if (!deleteStaff) return;
    setDeleteSaving(true);
    try {
      const res = await fetch(`/api/admin/staff/${deleteStaff.id}`, { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (res.ok) { toast.success("Staff account removed."); setDeleteStaff(null); fetchStaff(); }
      else toast.error(json.error ?? "Failed to delete.");
    } finally { setDeleteSaving(false); }
  }

  async function openPermissions(s: StaffUser) {
    setPermStaff(s); setPermLoading(true); setPermModules([]);
    try {
      const res = await fetch(`/api/admin/staff/permissions?userId=${s.id}`);
      if (res.ok) setPermModules((await res.json()).modules || []);
    } catch { toast.error("Failed to fetch permissions"); }
    finally { setPermLoading(false); }
  }

  async function handleSavePermissions(e: React.FormEvent) {
    e.preventDefault();
    if (!permStaff) return;
    setPermSaving(true);
    try {
      const res = await fetch("/api/admin/staff/permissions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: permStaff.id, modules: permModules }) });
      if (res.ok) { toast.success("Employee permissions updated"); setPermStaff(null); }
      else toast.error("Failed to update permissions");
    } catch { toast.error("Failed to update permissions"); }
    finally { setPermSaving(false); }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--cream)] md:text-3xl">Staff Management</h1>
          <p className="mt-1 text-sm text-[var(--cream-muted)]">Create new staff and influencer accounts</p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-50 px-4 py-2.5">
          <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
          <span className="text-sm font-medium text-emerald-700">{staffLoading ? "…" : activeStaff.length} staff live</span>
        </div>
      </div>

      {/* Active staff */}
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xl">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
          <Activity className="h-5 w-5 text-emerald-500" /> Active Staff — {staffLoading ? "…" : activeStaff.length} online now
        </h2>
        <p className="mt-1 text-xs text-[var(--cream-muted)]">Currently logged-in staff with login time and total active time</p>
        {staffLoading ? <p className="mt-4 text-sm text-[var(--cream-muted)]">Loading…</p> : activeStaff.length === 0 ? (
          <p className="mt-4 text-sm text-[var(--cream-muted)]">No staff currently active.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[400px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left">
                  <AdminTh>Name</AdminTh><AdminTh>Email</AdminTh><AdminTh>Login time</AdminTh><AdminTh>Status</AdminTh><AdminTh>Total active time</AdminTh>
                </tr>
              </thead>
              <tbody>
                {activeStaff.map((s) => (
                  <tr key={s.id} className="border-b border-gray-100">
                    <AdminTd className="text-gray-900">{s.name || "—"}</AdminTd>
                    <AdminTd className="text-gray-900">{s.email}</AdminTd>
                    <AdminTd>{new Date(s.loginAt).toLocaleString()}</AdminTd>
                    <AdminTd><span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">Active</span></AdminTd>
                    <AdminTd className="font-mono text-xs text-gray-900">{formatTotalTime(s.totalHours)}</AdminTd>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Add staff form */}
        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xl">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
            <UserPlus className="h-5 w-5 text-[var(--accent)]" /> Add Staff / Influencer
          </h2>
          <p className="mt-1 text-xs text-[var(--cream-muted)]">New staff or influencer can log in at /login.</p>
          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">Account type</label>
              <select value={accountType} onChange={(e) => setAccountType(e.target.value === "INFLUENCER" ? "INFLUENCER" : "EMPLOYEE")} className="admin-input">
                <option value="EMPLOYEE">Staff</option>
                <option value="INFLUENCER">Influencer</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">User ID (Email)</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--cream-muted)]" />
                <input {...register("email")} type="email" placeholder="staff@example.com" className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm text-[var(--cream)] focus:border-indigo-400 focus:outline-none" />
              </div>
              {errors.email && <p className="mt-1 text-xs text-red-700">{errors.email.message}</p>}
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--cream-muted)]" />
                <input {...register("password")} type="password" placeholder="••••••••" className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm text-[var(--cream)] focus:border-indigo-400 focus:outline-none" />
              </div>
              {errors.password && <p className="mt-1 text-xs text-red-700">{errors.password.message}</p>}
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--cream-muted)]" />
                <input {...register("confirmPassword")} type="password" placeholder="••••••••" className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm text-[var(--cream)] focus:border-indigo-400 focus:outline-none" />
              </div>
              {errors.confirmPassword && <p className="mt-1 text-xs text-red-700">{errors.confirmPassword.message}</p>}
            </div>
            {submitError && <p className="rounded-lg bg-red-100 px-3 py-2 text-xs text-red-700">{submitError}</p>}
            <button type="submit" disabled={isSubmitting} className="w-full rounded-xl bg-[var(--accent)] py-2.5 text-sm font-semibold text-[var(--ink)] shadow-lg transition hover:bg-[var(--accent-hover)] disabled:opacity-60">
              {isSubmitting ? "Creating…" : "Add Staff"}
            </button>
            {success && <p className="text-center text-xs text-emerald-700">Staff created. Form reset for another.</p>}
          </form>
        </section>

        {/* All staff list */}
        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xl">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
            <Users className="h-5 w-5 text-[var(--accent)]" /> All Staff Accounts ({staff.length})
          </h2>
          <p className="mt-1 text-xs text-[var(--cream-muted)]">Staff and Influencer accounts. Edit or remove from the list.</p>
          {staffLoading ? <p className="mt-4 text-sm text-[var(--cream-muted)]">Loading…</p> : staff.length === 0 ? (
            <p className="mt-4 text-sm text-[var(--cream-muted)]">No staff accounts yet.</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[480px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left">
                    <AdminTh>Name</AdminTh><AdminTh>Email</AdminTh><AdminTh>Role</AdminTh><AdminTh>Status</AdminTh><AdminTh>Time</AdminTh><AdminTh>Actions</AdminTh>
                  </tr>
                </thead>
                <tbody>
                  {staff.map((s) => (
                    <tr key={s.id} className="border-b border-gray-100">
                      <AdminTd className="text-gray-900">{s.name || "—"}</AdminTd>
                      <AdminTd className="text-gray-900">{s.email}</AdminTd>
                      <AdminTd>{s.role === "INFLUENCER" ? "Influencer" : "Staff"}</AdminTd>
                      <AdminTd>
                        {"isActive" in s && s.isActive
                          ? <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">Active</span>
                          : <span className="text-[var(--cream-muted)]">—</span>}
                      </AdminTd>
                      <AdminTd className="font-mono text-xs text-gray-900">{"totalHours" in s ? formatTotalTime(Number(s.totalHours)) : "—"}</AdminTd>
                      <AdminTd>
                        <RowActions
                          onEdit={() => openEdit(s)}
                          onDelete={() => setDeleteStaff(s)}
                          extra={s.role === "EMPLOYEE" ? (
                            <button type="button" onClick={() => openPermissions(s)} className="rounded-lg p-1.5 text-blue-400/70 transition hover:bg-blue-50 hover:text-blue-700" title="Manage Permissions">
                              <Shield className="h-4 w-4" />
                            </button>
                          ) : undefined}
                        />
                      </AdminTd>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {/* Edit modal */}
      <Modal isOpen={!!editStaff} title="Edit staff" onClose={() => setEditStaff(null)}>
        {editStaff && (
          <form onSubmit={handleEdit} className="space-y-4">
            <FormInput label="Name" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
            <FormInput label="Email *" type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} required />
            <FormSelect label="Role" value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value as "EMPLOYEE" | "INFLUENCER" })}>
              <option value="EMPLOYEE">Staff</option>
              <option value="INFLUENCER">Influencer</option>
            </FormSelect>
            <FormInput label="New password (leave blank to keep)" type="password" value={editForm.newPassword} onChange={(e) => setEditForm({ ...editForm, newPassword: e.target.value })} minLength={8} placeholder="••••••••" />
            <FormActions onCancel={() => setEditStaff(null)} saving={editSaving} isEdit />
          </form>
        )}
      </Modal>

      {/* Delete modal */}
      <Modal isOpen={!!deleteStaff} title="Delete staff account" onClose={() => !deleteSaving && setDeleteStaff(null)}>
        {deleteStaff && (
          <div className="space-y-4">
            <p className="text-sm text-[var(--cream-muted)]">Remove <strong className="text-gray-900">{deleteStaff.name || deleteStaff.email}</strong>? They will no longer be able to log in.</p>
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => setDeleteStaff(null)} disabled={deleteSaving} className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-900">Cancel</button>
              <button type="button" onClick={handleDelete} disabled={deleteSaving} className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{deleteSaving ? "Deleting…" : "Delete"}</button>
            </div>
          </div>
        )}
      </Modal>

      {/* Permissions modal */}
      <Modal isOpen={!!permStaff} title="Manage Employee Access" onClose={() => !permSaving && setPermStaff(null)}>
        {permStaff && (
          <form onSubmit={handleSavePermissions} className="space-y-4">
            <p className="text-sm text-[var(--cream-muted)]">Select the modules that <strong className="text-gray-900">{permStaff.name || permStaff.email}</strong> is allowed to access:</p>
            {permLoading ? (
              <div className="py-8 text-center text-sm opacity-50">Loading permissions...</div>
            ) : (
              <div className="max-h-[40vh] space-y-2 overflow-auto pr-2">
                {ADMIN_MODULES.map((mod) => {
                  const isChecked = permModules.includes(mod.id);
                  return (
                    <label key={mod.id} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${isChecked ? "border-blue-500/30 bg-blue-50" : "border-gray-100 bg-gray-50 hover:bg-gray-50"}`}>
                      <input type="checkbox" className="mt-1 flex-shrink-0" checked={isChecked} onChange={(e) => { if (e.target.checked) setPermModules([...permModules, mod.id]); else setPermModules(permModules.filter((m) => m !== mod.id)); }} />
                      <div className="flex-1">
                        <p className={`text-sm font-semibold ${isChecked ? "text-blue-400" : "text-[var(--cream)]"}`}>{mod.label}</p>
                        <p className="text-[10px] opacity-60 text-[var(--cream-muted)]">Module ID: {mod.id}</p>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
            <div className="flex gap-2 border-t border-gray-200 pt-4">
              <button type="button" onClick={() => setPermStaff(null)} disabled={permSaving} className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
              <button type="submit" disabled={permSaving || permLoading} className="flex-1 rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-60">{permSaving ? "Saving..." : "Save Privileges"}</button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
