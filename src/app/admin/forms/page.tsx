"use client";

import { useState, useEffect, useCallback } from "react";
import { ClipboardList, Plus, Pencil, Trash2 } from "lucide-react";
import { Modal } from "@/components/Modal";
import toast from "react-hot-toast";

const FIELD_TYPES = ["TEXT", "EMAIL", "NUMBER", "TEXTAREA", "SELECT"] as const;

type FormField = {
  id?: string;
  label: string;
  type: (typeof FIELD_TYPES)[number];
  required: boolean;
  options: string | null;
  order: number;
};

type StudentFormType = {
  id: string;
  title: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  fields: { id: string; label: string; type: string; required: boolean; options: string | null; order: number }[];
  _count?: { submissions: number };
};

export default function AdminFormsPage() {
  const [forms, setForms] = useState<StudentFormType[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [fields, setFields] = useState<FormField[]>([]);
  const [saving, setSaving] = useState(false);

  const fetchForms = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/forms", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setForms(Array.isArray(data) ? data : []);
      }
    } catch {
      setForms([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchForms();
  }, [fetchForms]);

  function openCreate() {
    setEditingId(null);
    setTitle("");
    setDescription("");
    setIsActive(true);
    setFields([{ label: "", type: "TEXT", required: false, options: null, order: 0 }]);
    setModalOpen(true);
  }

  async function openEdit(form: StudentFormType) {
    setEditingId(form.id);
    setTitle(form.title);
    setDescription(form.description ?? "");
    setIsActive(form.isActive);
    setFields(
      form.fields.length
        ? form.fields.map((f) => ({ id: f.id, label: f.label, type: f.type as FormField["type"], required: f.required, options: f.options, order: f.order }))
        : [{ label: "", type: "TEXT", required: false, options: null, order: 0 }]
    );
    setModalOpen(true);
  }

  function addField() {
    setFields((prev) => [...prev, { label: "", type: "TEXT", required: false, options: null, order: prev.length }]);
  }

  function removeField(i: number) {
    setFields((prev) => prev.filter((_, idx) => idx !== i));
  }

  function updateField(i: number, upd: Partial<FormField>) {
    setFields((prev) => prev.map((f, idx) => (idx === i ? { ...f, ...upd } : f)));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Title required");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        isActive,
        fields: fields.filter((f) => f.label.trim()).map((f, i) => ({ ...f, label: f.label.trim(), order: i })),
      };
      if (editingId) {
        const res = await fetch(`/api/admin/forms/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          toast.success("Form updated");
          setModalOpen(false);
          fetchForms();
        } else toast.error("Failed to update");
      } else {
        const res = await fetch("/api/admin/forms", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          toast.success("Form created");
          setModalOpen(false);
          fetchForms();
        } else toast.error("Failed to create");
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this form? All submissions will be lost.")) return;
    const res = await fetch(`/api/admin/forms/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Form deleted");
      fetchForms();
    } else toast.error("Failed to delete");
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8">
        <p className="text-center text-[var(--cream-muted)]">Loading…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-6 md:py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--cream)] md:text-3xl">Student Form</h1>
          <p className="mt-1 text-sm text-[var(--cream-muted)]">
            Create a form; students see it on their dashboard and submit. Only one form can be active at a time.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="flex items-center gap-2 rounded-xl border border-[var(--accent)]/50 bg-[var(--accent)]/10 px-4 py-2.5 text-sm font-medium text-[var(--cream)] transition hover:bg-[var(--accent)]/20"
        >
          <Plus className="h-4 w-4" />
          Create Form
        </button>
      </div>

      <section className="rounded-2xl border border-white/10 bg-black/25 p-6">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-[var(--cream)]">
          <ClipboardList className="h-5 w-5 text-[var(--accent)]" />
          Forms
        </h2>
        {forms.length === 0 ? (
          <p className="py-6 text-center text-sm text-[var(--cream-muted)]">No forms yet. Create one above.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left">
                  <th className="py-2 pr-3 font-medium text-[var(--cream-muted)]">Title</th>
                  <th className="py-2 pr-3 font-medium text-[var(--cream-muted)]">Fields</th>
                  <th className="py-2 pr-3 font-medium text-[var(--cream-muted)]">Submissions</th>
                  <th className="py-2 pr-3 font-medium text-[var(--cream-muted)]">Active</th>
                  <th className="py-2 font-medium text-[var(--cream-muted)]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {forms.map((f) => (
                  <tr key={f.id} className="border-b border-white/5">
                    <td className="py-2.5 pr-3 font-medium text-[var(--cream)]">{f.title}</td>
                    <td className="py-2.5 pr-3 text-[var(--cream-muted)]">{f.fields?.length ?? 0}</td>
                    <td className="py-2.5 pr-3 text-[var(--cream)]">{f._count?.submissions ?? 0}</td>
                    <td className="py-2.5 pr-3">
                      <span className={f.isActive ? "text-emerald-400" : "text-[var(--cream-muted)]"}>{f.isActive ? "Yes" : "No"}</span>
                    </td>
                    <td className="py-2.5">
                      <button type="button" onClick={() => openEdit(f)} className="mr-2 rounded p-1 text-[var(--cream-muted)] hover:bg-white/10 hover:text-[var(--cream)]">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button type="button" onClick={() => handleDelete(f.id)} className="rounded p-1 text-[var(--cream-muted)] hover:bg-white/10 hover:text-red-400">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Modal isOpen={modalOpen} title={editingId ? "Edit form" : "Create form"} onClose={() => setModalOpen(false)}>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--cream-muted)]">Title *</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} required className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-[var(--cream)]" placeholder="e.g. Student Feedback Form" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--cream-muted)]">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-[var(--cream)]" placeholder="Optional" />
          </div>
          <label className="flex items-center gap-2 text-sm text-[var(--cream-muted)]">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            Active (show this form to students on dashboard)
          </label>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium text-[var(--cream-muted)]">Fields</span>
              <button type="button" onClick={addField} className="text-xs text-[var(--accent)] hover:underline">+ Add field</button>
            </div>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {fields.map((field, i) => (
                <div key={i} className="rounded-xl border border-white/10 bg-black/20 p-3 space-y-2">
                  <div className="flex gap-2">
                    <input
                      value={field.label}
                      onChange={(e) => updateField(i, { label: e.target.value })}
                      placeholder="Field label"
                      className="flex-1 rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-sm text-[var(--cream)]"
                    />
                    <select value={field.type} onChange={(e) => updateField(i, { type: e.target.value as FormField["type"] })} className="rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-sm text-[var(--cream)]">
                      {FIELD_TYPES.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                    <label className="flex items-center gap-1 text-xs text-[var(--cream-muted)]">
                      <input type="checkbox" checked={field.required} onChange={(e) => updateField(i, { required: e.target.checked })} />
                      Required
                    </label>
                    <button type="button" onClick={() => removeField(i)} className="rounded p-1 text-red-400 hover:bg-red-500/10">×</button>
                  </div>
                  {field.type === "SELECT" && (
                    <input
                      value={field.options ?? ""}
                      onChange={(e) => updateField(i, { options: e.target.value.trim() || null })}
                      placeholder="Options (comma-separated)"
                      className="w-full rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-sm text-[var(--cream)]"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="flex-1 rounded-xl border border-white/10 py-2.5 text-sm font-medium text-[var(--cream)]">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 rounded-xl bg-[var(--accent)] py-2.5 text-sm font-semibold text-[var(--ink)] disabled:opacity-60">{saving ? "Saving…" : "Save"}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
