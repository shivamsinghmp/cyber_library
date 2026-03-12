"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ChevronLeft, Plus, Pencil, Trash2, UserCircle } from "lucide-react";
import toast from "react-hot-toast";

const ROLES = [
  { value: "STUDENT", label: "Student" },
  { value: "EMPLOYEE", label: "Staff" },
  { value: "AUTHOR", label: "Author" },
  { value: "LEAD", label: "Landing form (new student)" },
] as const;

const TYPES = [
  { value: "text", label: "Text" },
  { value: "number", label: "Number" },
  { value: "email", label: "Email" },
  { value: "textarea", label: "Long text" },
  { value: "select", label: "Dropdown (select)" },
] as const;

type FieldDef = {
  id: string;
  role: string;
  key: string;
  label: string;
  type: string;
  required: boolean;
  options: string[] | null;
  sortOrder: number;
};

export default function AdminProfileFieldsPage() {
  const [roleFilter, setRoleFilter] = useState<string>("STUDENT");
  const [fields, setFields] = useState<FieldDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<FieldDef | null>(null);
  const [formKey, setFormKey] = useState("");
  const [formLabel, setFormLabel] = useState("");
  const [formType, setFormType] = useState("text");
  const [formRequired, setFormRequired] = useState(false);
  const [formOptions, setFormOptions] = useState("");
  const [formSortOrder, setFormSortOrder] = useState(0);
  const [saving, setSaving] = useState(false);

  const fetchFields = () => {
    setLoading(true);
    fetch(`/api/admin/profile-fields?role=${encodeURIComponent(roleFilter)}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data: FieldDef[]) => setFields(data))
      .catch(() => setFields([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchFields();
  }, [roleFilter]);

  function openCreate() {
    setEditing(null);
    setFormKey("");
    setFormLabel("");
    setFormType("text");
    setFormRequired(false);
    setFormOptions("");
    setFormSortOrder(fields.length);
    setModalOpen(true);
  }

  function openEdit(f: FieldDef) {
    setEditing(f);
    setFormKey(f.key);
    setFormLabel(f.label);
    setFormType(f.type);
    setFormRequired(f.required);
    setFormOptions(Array.isArray(f.options) ? f.options.join("\n") : "");
    setFormSortOrder(f.sortOrder);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const key = formKey.trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
    if (!key) {
      toast.error("Key is required (only letters, numbers, underscore)");
      return;
    }
    if (!formLabel.trim()) {
      toast.error("Label is required");
      return;
    }
    const options = formType === "select"
      ? formOptions.split("\n").map((s) => s.trim()).filter(Boolean)
      : null;
    setSaving(true);
    try {
      if (editing) {
        const res = await fetch(`/api/admin/profile-fields/${editing.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            label: formLabel.trim(),
            type: formType,
            required: formRequired,
            options,
            sortOrder: formSortOrder,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          toast.error(data.error?.label?.[0] || data.error || "Update failed");
          setSaving(false);
          return;
        }
        toast.success("Field updated");
      } else {
        const res = await fetch("/api/admin/profile-fields", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            role: roleFilter,
            key,
            label: formLabel.trim(),
            type: formType,
            required: formRequired,
            options,
            sortOrder: formSortOrder,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          toast.error(data.error?.key?.[0] || data.error || "Create failed");
          setSaving(false);
          return;
        }
        toast.success("Field added");
      }
      closeModal();
      fetchFields();
    } catch {
      toast.error("Something went wrong");
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Remove this field? Existing values in profiles will be ignored.")) return;
    try {
      const res = await fetch(`/api/admin/profile-fields/${id}`, { method: "DELETE" });
      if (!res.ok) {
        toast.error("Delete failed");
        return;
      }
      toast.success("Field removed");
      fetchFields();
    } catch {
      toast.error("Something went wrong");
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-6">
      <div>
        <Link
          href="/admin"
          className="inline-flex items-center gap-1 text-sm font-medium text-[var(--cream-muted)] hover:text-[var(--accent)]"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Admin
        </Link>
        <h1 className="mt-2 flex items-center gap-2 text-2xl font-bold text-[var(--cream)]">
          <UserCircle className="h-7 w-7 text-[var(--accent)]" />
          Profile fields
        </h1>
        <p className="mt-1 text-sm text-[var(--cream-muted)]">
          Add custom fields to Student, Staff, or Author profiles. They will appear on the user’s
          profile form. Use the “Landing form (new student)” role to configure fields for the public
          join page.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <label className="text-sm font-medium text-[var(--cream-muted)]">Role:</label>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-[var(--cream)] focus:border-[var(--accent)]/70 focus:outline-none"
        >
          {ROLES.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--ink)]"
        >
          <Plus className="h-4 w-4" />
          Add field
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-[var(--cream-muted)]">Loading…</p>
      ) : fields.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-black/20 p-8 text-center">
          <p className="text-sm text-[var(--cream-muted)]">
            No custom fields for {ROLES.find((r) => r.value === roleFilter)?.label}. Add one above.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white/10 bg-black/20">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10 text-left">
                <th className="p-3 text-xs font-medium text-[var(--cream-muted)]">Key</th>
                <th className="p-3 text-xs font-medium text-[var(--cream-muted)]">Label</th>
                <th className="p-3 text-xs font-medium text-[var(--cream-muted)]">Type</th>
                <th className="p-3 text-xs font-medium text-[var(--cream-muted)]">Required</th>
                <th className="p-3 text-xs font-medium text-[var(--cream-muted)]">Order</th>
                <th className="p-3 text-xs font-medium text-[var(--cream-muted)]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {fields.map((f) => (
                <tr key={f.id} className="border-b border-white/5">
                  <td className="p-3 font-mono text-sm text-[var(--cream)]">{f.key}</td>
                  <td className="p-3 text-sm text-[var(--cream)]">{f.label}</td>
                  <td className="p-3 text-sm text-[var(--cream-muted)]">{f.type}</td>
                  <td className="p-3 text-sm">{f.required ? "Yes" : "No"}</td>
                  <td className="p-3 text-sm text-[var(--cream-muted)]">{f.sortOrder}</td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(f)}
                        className="rounded-lg border border-white/10 p-1.5 text-[var(--cream-muted)] hover:bg-white/5 hover:text-[var(--cream)]"
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(f.id)}
                        className="rounded-lg border border-white/10 p-1.5 text-red-400/80 hover:bg-red-500/20"
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

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[var(--ink)] p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-[var(--cream)]">
              {editing ? "Edit field" : "Add field"}
            </h2>
            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--cream-muted)]">Key (e.g. father_name)</label>
                <input
                  type="text"
                  value={formKey}
                  onChange={(e) => setFormKey(e.target.value.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, ""))}
                  placeholder="father_name"
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-[var(--cream)]"
                  disabled={!!editing}
                />
                {editing && <p className="mt-0.5 text-[10px] text-[var(--cream-muted)]">Key cannot be changed after create.</p>}
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--cream-muted)]">Label (display name)</label>
                <input
                  type="text"
                  value={formLabel}
                  onChange={(e) => setFormLabel(e.target.value)}
                  placeholder="Father's name"
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-[var(--cream)]"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--cream-muted)]">Type</label>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-[var(--cream)]"
                >
                  {TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              {formType === "select" && (
                <div>
                  <label className="mb-1 block text-xs font-medium text-[var(--cream-muted)]">Options (one per line)</label>
                  <textarea
                    value={formOptions}
                    onChange={(e) => setFormOptions(e.target.value)}
                    rows={3}
                    placeholder="Option A&#10;Option B"
                    className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-[var(--cream)]"
                  />
                </div>
              )}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="required"
                  checked={formRequired}
                  onChange={(e) => setFormRequired(e.target.checked)}
                  className="rounded border-white/20"
                />
                <label htmlFor="required" className="text-sm text-[var(--cream-muted)]">Required</label>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--cream-muted)]">Sort order (lower = first)</label>
                <input
                  type="number"
                  value={formSortOrder}
                  onChange={(e) => setFormSortOrder(parseInt(e.target.value, 10) || 0)}
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-[var(--cream)]"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={closeModal} className="rounded-xl border border-white/10 px-4 py-2 text-sm text-[var(--cream)]">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--ink)] disabled:opacity-70">
                  {saving ? "Saving…" : editing ? "Update" : "Add"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
