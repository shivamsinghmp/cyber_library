"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Mail, Lock, UserPlus, Users, Activity, Pencil, Trash2, Shield } from "lucide-react";
import { Modal } from "@/components/Modal";
import toast from "react-hot-toast";
import { ADMIN_MODULES } from "@/lib/permissions-client";

type StaffUser = {
  id: string;
  name: string | null;
  email: string;
  role: string;
  createdAt: string;
};

type StaffWithActivity = StaffUser & {
  loginAt: string | null;
  isActive: boolean;
  totalHours: number;
};

type ActiveStaffItem = StaffUser & {
  loginAt: string;
  totalHours: number;
};

function formatTotalTime(totalHours: number): string {
  if (totalHours <= 0 || !Number.isFinite(totalHours)) return "0h 0m 0s";
  const totalSeconds = Math.round(totalHours * 3600);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const parts: string[] = [];
  if (h > 0) parts.push(`${h}h`);
  parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(" ");
}

const schema = z
  .object({
    email: z.string().email("Invalid email"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Confirm password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type FormData = z.infer<typeof schema>;

export default function AdminStaffPage() {
  const [success, setSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [staff, setStaff] = useState<StaffWithActivity[]>([]);
  const [activeStaff, setActiveStaff] = useState<ActiveStaffItem[]>([]);
  const [staffLoading, setStaffLoading] = useState(true);
  const [accountType, setAccountType] = useState<"EMPLOYEE" | "INFLUENCER">("EMPLOYEE");
  const [editStaff, setEditStaff] = useState<StaffUser | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRole, setEditRole] = useState<"EMPLOYEE" | "INFLUENCER">("EMPLOYEE");
  const [editNewPassword, setEditNewPassword] = useState("");
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
          const base = listData.staff ?? [];
          setStaff(base.map((s: StaffUser) => ({ ...s, loginAt: null, isActive: false, totalHours: 0 })));
        }
        setActiveStaff([]);
      }
    } catch {
      setStaff([]);
      setActiveStaff([]);
    } finally {
      setStaffLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  useEffect(() => {
    const interval = setInterval(fetchStaff, 30000);
    return () => clearInterval(interval);
  }, [fetchStaff]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "", confirmPassword: "" },
  });

  async function onSubmit(data: FormData) {
    setSuccess(false);
    setSubmitError(null);
    try {
      const res = await fetch("/api/admin/create-staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: data.email.trim(),
          password: data.password,
          accountType,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg =
          res.status === 403
            ? "Only Admin can create staff. Please log in as Admin."
            : json.error?.email
              ? Array.isArray(json.error.email)
                ? json.error.email[0]
                : json.error.email
              : typeof json.error === "string"
                ? json.error
                : "Failed to create staff.";
        setSubmitError(msg);
        toast.error(msg);
        return;
      }
      toast.success(
        accountType === "INFLUENCER"
          ? "Influencer account created. They can log in at /login."
          : "Staff account created. They can log in at /login."
      );
      setSuccess(true);
      setSubmitError(null);
      reset();
      fetchStaff();
    } catch (e) {
      const msg = "Something went wrong. Try again.";
      setSubmitError(msg);
      toast.error(msg);
    }
  }

  function openEdit(s: StaffUser) {
    setEditStaff(s);
    setEditName(s.name ?? "");
    setEditEmail(s.email);
    setEditRole((s.role === "INFLUENCER" ? "INFLUENCER" : "EMPLOYEE") as "EMPLOYEE" | "INFLUENCER");
    setEditNewPassword("");
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editStaff) return;
    setEditSaving(true);
    try {
      const body: { name?: string; email?: string; role?: string; newPassword?: string } = {
        name: editName.trim() || undefined,
        email: editEmail.trim(),
        role: editRole,
      };
      if (editNewPassword.trim()) body.newPassword = editNewPassword.trim();
      const res = await fetch(`/api/admin/staff/${editStaff.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        toast.success("Staff updated.");
        setEditStaff(null);
        fetchStaff();
      } else {
        const msg = json.error?.email?.[0] ?? json.error ?? "Failed to update.";
        toast.error(msg);
      }
    } finally {
      setEditSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteStaff) return;
    setDeleteSaving(true);
    try {
      const res = await fetch(`/api/admin/staff/${deleteStaff.id}`, { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        toast.success("Staff account removed.");
        setDeleteStaff(null);
        fetchStaff();
      } else {
        toast.error(json.error ?? "Failed to delete.");
      }
    } finally {
      setDeleteSaving(false);
    }
  }

  async function openPermissions(s: StaffUser) {
    setPermStaff(s);
    setPermLoading(true);
    setPermModules([]);
    try {
      const res = await fetch(`/api/admin/staff/permissions?userId=${s.id}`);
      if (res.ok) {
        const data = await res.json();
        setPermModules(data.modules || []);
      }
    } catch {
      toast.error("Failed to fetch permissions");
    } finally {
      setPermLoading(false);
    }
  }

  async function handleSavePermissions(e: React.FormEvent) {
    e.preventDefault();
    if (!permStaff) return;
    setPermSaving(true);
    try {
      const res = await fetch(`/api/admin/staff/permissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: permStaff.id, modules: permModules }),
      });
      if (res.ok) {
        toast.success("Employee permissions updated");
        setPermStaff(null);
      } else {
        toast.error("Failed to update permissions");
      }
    } catch {
      toast.error("Failed to update permissions");
    } finally {
      setPermSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--cream)] md:text-3xl">
            Staff Management
          </h1>
          <p className="mt-1 text-sm text-[var(--cream-muted)]">
            Create new staff and influencer accounts (User ID = email, password)
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5">
          <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
          <span className="text-sm font-medium text-emerald-300">
            {staffLoading ? "…" : activeStaff.length} staff live
          </span>
        </div>
      </div>

      {/* Active staff: login time, logout (Active), total hours */}
      <section className="rounded-2xl border border-white/10 bg-black/30 p-6 shadow-xl">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-[var(--cream)]">
          <Activity className="h-5 w-5 text-emerald-500" />
          Active Staff — {staffLoading ? "…" : activeStaff.length} online now
        </h2>
        <p className="mt-1 text-xs text-[var(--cream-muted)]">
          Currently logged-in staff with login time and total active time (h m s)
        </p>
        {staffLoading ? (
          <p className="mt-4 text-sm text-[var(--cream-muted)]">Loading…</p>
        ) : activeStaff.length === 0 ? (
          <p className="mt-4 text-sm text-[var(--cream-muted)]">
            No staff currently active.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[400px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left">
                  <th className="py-2 pr-3 font-medium text-[var(--cream-muted)]">Name</th>
                  <th className="py-2 pr-3 font-medium text-[var(--cream-muted)]">Email</th>
                  <th className="py-2 pr-3 font-medium text-[var(--cream-muted)]">Login time</th>
                  <th className="py-2 pr-3 font-medium text-[var(--cream-muted)]">Logout</th>
                  <th className="py-2 font-medium text-[var(--cream-muted)]">Total active time</th>
                </tr>
              </thead>
              <tbody>
                {activeStaff.map((s) => (
                  <tr key={s.id} className="border-b border-white/5">
                    <td className="py-2.5 pr-3 text-[var(--cream)]">{s.name || "—"}</td>
                    <td className="py-2.5 pr-3 text-[var(--cream)]">{s.email}</td>
                    <td className="py-2.5 pr-3 text-[var(--cream-muted)]">
                      {new Date(s.loginAt).toLocaleString()}
                    </td>
                    <td className="py-2.5 pr-3">
                      <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-medium text-emerald-400">
                        Active
                      </span>
                    </td>
                    <td className="py-2.5 text-[var(--cream)] font-mono text-xs">
                      {formatTotalTime(s.totalHours)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Add Staff / Influencer form - one side */}
        <section className="rounded-2xl border border-white/10 bg-black/30 p-6 shadow-xl">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-[var(--cream)]">
            <UserPlus className="h-5 w-5 text-[var(--accent)]" />
            Add Staff / Influencer
          </h2>
          <p className="mt-1 text-xs text-[var(--cream-muted)]">
            New staff or influencer can log in at /login. Influencer accounts see the Affiliate Dashboard.
          </p>
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="mt-6 space-y-4"
          >
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--cream-muted)]">
                Account type
              </label>
              <select
                value={accountType}
                onChange={(e) =>
                  setAccountType(e.target.value === "INFLUENCER" ? "INFLUENCER" : "EMPLOYEE")
                }
                className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-[var(--cream)] focus:border-[var(--accent)]/70 focus:outline-none"
              >
                <option value="EMPLOYEE">Staff</option>
                <option value="INFLUENCER">Influencer</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--cream-muted)]">
                User ID (Email)
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--cream-muted)]" />
                <input
                  {...register("email")}
                  type="email"
                  placeholder="staff@example.com"
                  className="w-full rounded-xl border border-white/10 bg-black/40 py-2.5 pl-10 pr-3 text-sm text-[var(--cream)] placeholder:text-[var(--cream-muted)]/60 focus:border-[var(--accent)]/70 focus:outline-none"
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-xs text-red-400">{errors.email.message}</p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--cream-muted)]">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--cream-muted)]" />
                <input
                  {...register("password")}
                  type="password"
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-white/10 bg-black/40 py-2.5 pl-10 pr-3 text-sm text-[var(--cream)] placeholder:text-[var(--cream-muted)]/60 focus:border-[var(--accent)]/70 focus:outline-none"
                />
              </div>
              {errors.password && (
                <p className="mt-1 text-xs text-red-400">{errors.password.message}</p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--cream-muted)]">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--cream-muted)]" />
                <input
                  {...register("confirmPassword")}
                  type="password"
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-white/10 bg-black/40 py-2.5 pl-10 pr-3 text-sm text-[var(--cream)] placeholder:text-[var(--cream-muted)]/60 focus:border-[var(--accent)]/70 focus:outline-none"
                />
              </div>
              {errors.confirmPassword && (
                <p className="mt-1 text-xs text-red-400">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>
            {submitError && (
              <p className="rounded-lg bg-red-500/15 px-3 py-2 text-xs text-red-300">
                {submitError}
              </p>
            )}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-xl bg-[var(--accent)] py-2.5 text-sm font-semibold text-[var(--ink)] shadow-lg transition hover:bg-[var(--accent-hover)] disabled:opacity-60"
            >
              {isSubmitting ? "Creating…" : "Add Staff"}
            </button>
            {success && (
              <p className="text-center text-xs text-emerald-400">
                Staff created. Form reset for another.
              </p>
            )}
          </form>
        </section>

        {/* All staff accounts list */}
        <section className="rounded-2xl border border-white/10 bg-black/30 p-6 shadow-xl">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-[var(--cream)]">
            <Users className="h-5 w-5 text-[var(--accent)]" />
            All Staff Accounts ({staff.length})
          </h2>
          <p className="mt-1 text-xs text-[var(--cream-muted)]">
            Staff and Influencer accounts. Edit or remove from the list.
          </p>
          {staffLoading ? (
            <p className="mt-4 text-sm text-[var(--cream-muted)]">Loading…</p>
          ) : staff.length === 0 ? (
            <p className="mt-4 text-sm text-[var(--cream-muted)]">
              No staff accounts yet. Use the form to add one.
            </p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[480px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-left">
                    <th className="py-2 pr-3 font-medium text-[var(--cream-muted)]">Name</th>
                    <th className="py-2 pr-3 font-medium text-[var(--cream-muted)]">Email</th>
                    <th className="py-2 pr-3 font-medium text-[var(--cream-muted)]">Role</th>
                    <th className="py-2 pr-3 font-medium text-[var(--cream-muted)]">Status</th>
                    <th className="py-2 pr-3 font-medium text-[var(--cream-muted)]">Total active time</th>
                    <th className="py-2 pr-3 font-medium text-[var(--cream-muted)]">Created</th>
                    <th className="py-2 font-medium text-[var(--cream-muted)]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {staff.map((s) => (
                    <tr key={s.id} className="border-b border-white/5">
                      <td className="py-2.5 pr-3 text-[var(--cream)]">
                        {s.name || "—"}
                      </td>
                      <td className="py-2.5 pr-3 text-[var(--cream)]">{s.email}</td>
                      <td className="py-2.5 pr-3 text-[var(--cream-muted)]">
                        {s.role === "INFLUENCER" ? "Influencer" : "Staff"}
                      </td>
                      <td className="py-2.5 pr-3">
                        {"isActive" in s && s.isActive ? (
                          <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-medium text-emerald-400">
                            Active
                          </span>
                        ) : (
                          <span className="text-[var(--cream-muted)]">—</span>
                        )}
                      </td>
                      <td className="py-2.5 pr-3 font-mono text-xs text-[var(--cream)]">
                        {"totalHours" in s ? formatTotalTime(Number(s.totalHours)) : "—"}
                      </td>
                      <td className="py-2.5 pr-3 text-[var(--cream-muted)]">
                        {new Date(s.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-2.5">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEdit(s)}
                            className="rounded-lg p-1.5 text-[var(--cream-muted)] transition hover:bg-white/10 hover:text-[var(--cream)]"
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          {s.role === "EMPLOYEE" && (
                            <button
                              type="button"
                              onClick={() => openPermissions(s)}
                              className="rounded-lg p-1.5 text-blue-400/70 transition hover:bg-blue-500/10 hover:text-blue-400"
                              title="Manage Permissions"
                            >
                              <Shield className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setDeleteStaff(s)}
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
        </section>
      </div>

      {/* Edit staff modal */}
      <Modal
        isOpen={!!editStaff}
        title="Edit staff"
        onClose={() => setEditStaff(null)}
      >
        {editStaff && (
          <form onSubmit={handleEdit} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--cream-muted)]">Name</label>
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-[var(--cream)] focus:border-[var(--accent)]/70 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--cream-muted)]">Email *</label>
              <input
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                required
                className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-[var(--cream)] focus:border-[var(--accent)]/70 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--cream-muted)]">Role</label>
              <select
                value={editRole}
                onChange={(e) => setEditRole(e.target.value as "EMPLOYEE" | "INFLUENCER")}
                className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-[var(--cream)] focus:border-[var(--accent)]/70 focus:outline-none"
              >
                <option value="EMPLOYEE">Staff</option>
                <option value="INFLUENCER">Influencer</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--cream-muted)]">New password (leave blank to keep)</label>
              <input
                type="password"
                value={editNewPassword}
                onChange={(e) => setEditNewPassword(e.target.value)}
                minLength={8}
                placeholder="••••••••"
                className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-[var(--cream)] focus:border-[var(--accent)]/70 focus:outline-none"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditStaff(null)}
                className="flex-1 rounded-xl border border-white/10 py-2.5 text-sm font-medium text-[var(--cream)]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={editSaving}
                className="flex-1 rounded-xl bg-[var(--accent)] py-2.5 text-sm font-semibold text-[var(--ink)] disabled:opacity-60"
              >
                {editSaving ? "Saving…" : "Save"}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Delete staff modal */}
      <Modal
        isOpen={!!deleteStaff}
        title="Delete staff account"
        onClose={() => !deleteSaving && setDeleteStaff(null)}
      >
        {deleteStaff && (
          <div className="space-y-4">
            <p className="text-sm text-[var(--cream-muted)]">
              Remove <strong className="text-[var(--cream)]">{deleteStaff.name || deleteStaff.email}</strong>? They will no longer be able to log in.
            </p>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteStaff(null)}
                disabled={deleteSaving}
                className="flex-1 rounded-xl border border-white/10 py-2.5 text-sm font-medium text-[var(--cream)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleteSaving}
                className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
              >
                {deleteSaving ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Permissions Modal */}
      <Modal
        isOpen={!!permStaff}
        title="Manage Employee Access"
        onClose={() => !permSaving && setPermStaff(null)}
      >
        {permStaff && (
          <form onSubmit={handleSavePermissions} className="space-y-4">
            <p className="text-sm text-[var(--cream-muted)]">
              Select the modules that <strong className="text-[var(--cream)]">{permStaff.name || permStaff.email}</strong> is allowed to access:
            </p>

            {permLoading ? (
              <div className="py-8 text-center text-sm opacity-50">Loading permissions...</div>
            ) : (
              <div className="space-y-2 max-h-[40vh] overflow-auto pr-2">
                {ADMIN_MODULES.map((mod) => {
                  const isChecked = permModules.includes(mod.id);
                  return (
                    <label 
                      key={mod.id} 
                      className={`flex items-start gap-3 cursor-pointer p-3 rounded-xl border transition ${isChecked ? 'bg-blue-500/10 border-blue-500/30' : 'bg-black/20 border-white/5 hover:bg-white/5'}`}
                    >
                      <input 
                        type="checkbox" 
                        className="mt-1 flex-shrink-0"
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.target.checked) setPermModules([...permModules, mod.id]);
                          else setPermModules(permModules.filter(m => m !== mod.id));
                        }}
                      />
                      <div className="flex-1">
                        <p className={`text-sm font-semibold ${isChecked ? 'text-blue-400' : 'text-[var(--cream)]'}`}>{mod.label}</p>
                        <p className="text-[10px] text-[var(--cream-muted)] opacity-60">Module ID: {mod.id}</p>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}

            <div className="flex gap-2 pt-4 border-t border-white/10">
              <button
                type="button"
                onClick={() => setPermStaff(null)}
                disabled={permSaving}
                className="flex-1 rounded-xl border border-white/10 py-2.5 text-sm font-medium text-[var(--cream)] hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={permSaving || permLoading}
                className="flex-1 rounded-xl bg-blue-600 hover:bg-blue-500 py-2.5 text-sm font-semibold text-white disabled:opacity-60 transition"
              >
                {permSaving ? "Saving..." : "Save Privileges"}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
