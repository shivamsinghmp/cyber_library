"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ChevronLeft, Loader2, Plus } from "lucide-react";
import toast from "react-hot-toast";

type PollRow = {
  id: string;
  question: string;
  options: string[];
  isActive: boolean;
  responseCount: number;
  createdAt: string;
};

const defaultForm = { question: "", optionsText: "", durationSeconds: "60" };

export default function PollsClient() {
  const [polls, setPolls] = useState<PollRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/staff/meet-polls", { credentials: "include" });
      if (res.ok) setPolls(await res.json());
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { refetch(); }, [refetch]);

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
      const res = await fetch("/api/staff/meet-polls", {
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
      const res = await fetch(`/api/staff/meet-polls?id=${id}`, { method: "DELETE", credentials: "include" });
      if (res.ok) { toast.success("Poll deleted."); refetch(); }
      else toast.error("Failed to delete poll");
    } catch {
      toast.error("Request failed");
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/staff/library" className="inline-flex items-center gap-1 text-sm text-[var(--cream-muted)] hover:text-[var(--accent)]">
            <ChevronLeft className="h-4 w-4" /> Library
          </Link>
          <h1 className="mt-1 text-2xl font-semibold text-[var(--cream)]">Meet Polls</h1>
          <p className="text-xs text-[var(--cream-muted)]">Polls/quizzes shown to students inside the Google Meet add-on.</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[var(--ink)]">
          <Plus className="h-4 w-4" /> New poll
        </button>
      </div>

      {showForm && (
        <div className="rounded-2xl border border-white/10 bg-black/30 p-6">
          <h2 className="mb-4 text-base font-semibold text-[var(--cream)]">{editingId ? "Edit poll" : "Create poll / quiz"}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--cream-muted)]">Question</label>
              <input type="text" value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} placeholder="e.g. What topic should we revise next?" className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-[var(--cream)]" required />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--cream-muted)]">Options (one per line or comma-separated)</label>
              <textarea value={form.optionsText} onChange={(e) => setForm({ ...form, optionsText: e.target.value })} placeholder={"Option A\nOption B\nOption C"} rows={4} className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-[var(--cream)]" required />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--cream-muted)]">Pop-up Duration (Seconds)</label>
              <input type="number" value={form.durationSeconds} onChange={(e) => setForm({ ...form, durationSeconds: e.target.value })} className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-[var(--cream)]" min="10" max="300" required />
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={saving} className="flex items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--ink)]">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingId ? "Update poll" : "Create poll"}
              </button>
              <button type="button" onClick={closeForm} className="rounded-xl border border-white/10 px-4 py-2 text-sm text-[var(--cream-muted)]">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/30">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-[var(--cream-muted)]">
            <Loader2 className="h-5 w-5 animate-spin" /> Loading…
          </div>
        ) : polls.length === 0 ? (
          <p className="py-12 text-center text-sm text-[var(--cream-muted)]">No polls yet. Create one to show in the Meet add-on.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left">
                {["Question", "Options / Responses", "Actions"].map((h) => (
                  <th key={h} className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-[var(--cream-muted)]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {polls.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3 font-medium text-[var(--cream)]">{p.question}</td>
                  <td className="px-4 py-3 text-[var(--cream-muted)]">{Array.isArray(p.options) ? p.options.join(", ") : ""} · {p.responseCount} response(s)</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(p)} className="text-xs font-semibold text-[var(--accent)] hover:underline">Edit</button>
                      <button onClick={() => handleDelete(p.id)} className="text-xs font-semibold text-red-400 hover:underline">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
