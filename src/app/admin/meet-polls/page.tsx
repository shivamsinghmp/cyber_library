"use client";

import { useState } from "react";
import { Video, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { useFetch } from "@/hooks/useFetch";
import { AdminPageHeader, AdminTh, AdminTd, RowActions } from "@/components/ui";

type PollRow = {
  id: string;
  question: string;
  options: string[];
  isActive: boolean;
  responseCount: number;
  createdAt: string;
};

const defaultForm = { question: "", optionsText: "", durationSeconds: "60" };

export default function AdminMeetPollsPage() {
  const { data, loading, refetch } = useFetch<PollRow[]>("/api/admin/meet-polls");
  const polls = data ?? [];

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);

  function openCreate() {
    setEditingId(null);
    setForm(defaultForm);
    setShowForm(true);
  }

  function openEdit(p: PollRow) {
    setEditingId(p.id);
    setForm({ question: p.question, optionsText: p.options.join("\n"), durationSeconds: "60" });
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const question = form.question.trim();
    const options = form.optionsText.split(/[\n,]+/).map((o) => o.trim()).filter(Boolean);
    if (!question || options.length < 2) {
      toast.error("Enter a question and at least 2 options.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/meet-polls", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id: editingId || undefined, question, options, durationSeconds: parseInt(form.durationSeconds) || 60 }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(editingId ? "Poll updated." : "Poll created.");
        closeForm();
        refetch();
      } else {
        toast.error(data.error || "Failed to save poll");
      }
    } catch {
      toast.error("Request failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this poll?")) return;
    try {
      const res = await fetch(`/api/admin/meet-polls?id=${id}`, { method: "DELETE", credentials: "include" });
      if (res.ok) { toast.success("Poll deleted."); refetch(); }
      else toast.error("Failed to delete poll");
    } catch {
      toast.error("Request failed");
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <AdminPageHeader
        title="Meet add-on – Polls"
        description="Create polls/quizzes that students see and answer in the Google Meet add-on."
        addLabel="New poll"
        onAdd={openCreate}
      />

      {showForm && (
        <div className="rounded-2xl border border-gray-200 bg-white p-4 md:p-6">
          <h2 className="mb-4 text-base font-semibold text-[var(--cream)]">{editingId ? "Edit poll" : "Create poll / quiz"}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--cream-muted)]">Question</label>
              <input type="text" value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} placeholder="e.g. What topic should we revise next?" className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900" required />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--cream-muted)]">Options (one per line or comma-separated)</label>
              <textarea value={form.optionsText} onChange={(e) => setForm({ ...form, optionsText: e.target.value })} placeholder={"Option A\nOption B\nOption C"} rows={4} className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900" required />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--cream-muted)]">Pop-up Duration (Seconds)</label>
              <input type="number" value={form.durationSeconds} onChange={(e) => setForm({ ...form, durationSeconds: e.target.value })} className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900" min="10" max="300" required />
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={saving} className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white flex items-center gap-2">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingId ? "Update poll" : "Create poll"}
              </button>
              <button type="button" onClick={closeForm} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-[var(--cream-muted)]">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-[var(--cream-muted)]">
            <Loader2 className="h-5 w-5 animate-spin" /> Loading…
          </div>
        ) : polls.length === 0 ? (
          <p className="py-12 text-center text-sm text-[var(--cream-muted)]">No polls yet. Create one to show in the Meet add-on.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left">
                <AdminTh>Question</AdminTh>
                <AdminTh>Options / Responses</AdminTh>
                <AdminTh>Actions</AdminTh>
              </tr>
            </thead>
            <tbody>
              {polls.map((p) => (
                <tr key={p.id} className="border-b border-gray-100">
                  <AdminTd className="font-medium text-gray-900">{p.question}</AdminTd>
                  <AdminTd>{Array.isArray(p.options) ? p.options.join(", ") : ""} · {p.responseCount} response(s)</AdminTd>
                  <AdminTd>
                    <RowActions onEdit={() => openEdit(p)} onDelete={() => handleDelete(p.id)} />
                  </AdminTd>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
