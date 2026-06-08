"use client";

import { useState } from "react";
import { Plus, Trash2, Star, Edit3, Check } from "lucide-react";
import DOMPurify from "isomorphic-dompurify";
import toast from "react-hot-toast";
import type { EmailSignature } from "./types";

type Props = {
  signatures: EmailSignature[];
  onRefresh: () => void;
};

const DEFAULT_SIG_HTML = `<div style="margin-top:32px;padding-top:16px;border-top:1px solid #e4e4e7;font-family:Inter,sans-serif;font-size:12px;color:#71717a;">
  <p style="margin:0;font-weight:700;color:#09090b;">Let's Study</p>
  <p style="margin:4px 0 0;">support@cyberlib.in · cyberlib.in</p>
</div>`;

export function EmailSignaturesTab({ signatures, onRefresh }: Props) {
  const [editing,  setEditing]  = useState<EmailSignature | null>(null);
  const [creating, setCreating] = useState(false);
  const [form,     setForm]     = useState({ name: "", html: DEFAULT_SIG_HTML, isDefault: false });
  const [saving,   setSaving]   = useState(false);

  function openCreate() { setForm({ name: "", html: DEFAULT_SIG_HTML, isDefault: false }); setCreating(true); setEditing(null); }
  function openEdit(s: EmailSignature) { setForm({ name: s.name, html: s.html, isDefault: s.isDefault }); setEditing(s); setCreating(false); }
  function cancel() { setCreating(false); setEditing(null); }

  async function handleSave() {
    if (!form.name.trim() || !form.html.trim()) { toast.error("Name and HTML are required"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/email/signatures", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(editing ? { id: editing.id, ...form } : form),
      });
      if (!res.ok) { toast.error("Save failed"); return; }
      toast.success(editing ? "Signature updated" : "Signature created");
      cancel();
      onRefresh();
    } catch { toast.error("Error"); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this signature?")) return;
    await fetch("/api/admin/email/signatures", {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      credentials: "include", body: JSON.stringify({ id }),
    });
    toast.success("Deleted");
    onRefresh();
  }

  async function setDefault(id: string) {
    await fetch("/api/admin/email/signatures", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      credentials: "include", body: JSON.stringify({ id, isDefault: true }),
    });
    toast.success("Default signature set");
    onRefresh();
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--cream-muted)]">Signatures are automatically attached to OTP/verify emails. You can manually select one in bulk send.</p>
        <button onClick={openCreate} className="flex items-center gap-1.5 rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--ink)] hover:opacity-90">
          <Plus className="h-4 w-4" /> New Signature
        </button>
      </div>

      {(creating || editing) && (
        <div className="rounded-2xl border border-[var(--border)] bg-white p-5 space-y-4">
          <h3 className="font-bold text-[var(--foreground)]">{editing ? "Edit Signature" : "New Signature"}</h3>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--cream-muted)] mb-1.5">Name</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Main Signature" className="w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)]" />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--cream-muted)] mb-1.5">HTML</label>
            <textarea value={form.html} onChange={(e) => setForm({ ...form, html: e.target.value })} rows={8} className="w-full rounded-xl border border-[var(--border)] bg-gray-50 px-3 py-2.5 text-sm font-mono outline-none focus:border-[var(--accent)] resize-y" />
          </div>
          {form.html && (
            <details className="rounded-xl border border-[var(--border)] overflow-hidden">
              <summary className="cursor-pointer px-4 py-2 text-xs font-semibold text-[var(--cream-muted)] bg-[var(--background)]">Preview</summary>
              <div className="p-4 bg-white" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(form.html) }} />
            </details>
          )}
          <label className="flex items-center gap-2 cursor-pointer text-sm">
            <input type="checkbox" checked={form.isDefault} onChange={(e) => setForm({ ...form, isDefault: e.target.checked })} className="rounded" />
            <span className="text-[var(--foreground)]">Default signature (auto-attach to all emails)</span>
          </label>
          <div className="flex gap-3">
            <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[var(--ink)] hover:opacity-90 disabled:opacity-50">
              <Check className="h-4 w-4" />{saving ? "Saving…" : "Save"}
            </button>
            <button onClick={cancel} className="rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm text-[var(--cream-muted)] hover:text-[var(--foreground)]">Cancel</button>
          </div>
        </div>
      )}

      {signatures.length === 0 && !creating ? (
        <div className="rounded-2xl border border-[var(--border)] bg-white py-14 text-center text-sm text-[var(--cream-muted)]">
          No signatures yet. Create one with &quot;New Signature&quot;.
        </div>
      ) : (
        <div className="space-y-3">
          {signatures.map((s) => (
            <div key={s.id} className="rounded-2xl border border-[var(--border)] bg-white p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-[var(--foreground)]">{s.name}</p>
                  {s.isDefault && <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700"><Star className="h-3 w-3" /> Default</span>}
                </div>
                <div className="flex items-center gap-1.5">
                  {!s.isDefault && <button onClick={() => setDefault(s.id)} className="rounded-lg border border-[var(--border)] px-2 py-1 text-[10px] font-semibold text-[var(--cream-muted)] hover:text-amber-600">Set default</button>}
                  <button onClick={() => openEdit(s)} className="rounded-lg p-1.5 text-[var(--cream-muted)] hover:text-[var(--accent)]"><Edit3 className="h-3.5 w-3.5" /></button>
                  <button onClick={() => handleDelete(s.id)} className="rounded-lg p-1.5 text-[var(--cream-muted)] hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
              <div className="rounded-xl border border-[var(--border)] bg-gray-50 p-3" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(s.html) }} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
