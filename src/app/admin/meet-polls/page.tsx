"use client";

import { useState, useEffect, useCallback } from "react";
import { Video, Plus, Loader2, Pencil, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

type PollRow = {
  id: string;
  question: string;
  options: string[];
  isActive: boolean;
  responseCount: number;
  createdAt: string;
};

export default function AdminMeetPollsPage() {
  const [polls, setPolls] = useState<PollRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [optionsText, setOptionsText] = useState("");
  const [durationSeconds, setDurationSeconds] = useState("60");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchPolls = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/meet-polls", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setPolls(Array.isArray(data) ? data : []);
      }
    } catch {
      setPolls([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPolls();
  }, [fetchPolls]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = question.trim();
    const opts = optionsText
      .split(/[\n,]+/)
      .map((o) => o.trim())
      .filter(Boolean);
    if (!q || opts.length < 2) {
      toast.error("Enter a question and at least 2 options (comma or newline separated).");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/meet-polls", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ 
           id: editingId || undefined, 
           question: q, 
           options: opts, 
           durationSeconds: parseInt(durationSeconds) || 60 
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(editingId ? "Poll updated." : "Poll created. It will appear in the Meet add-on.");
        setCreateOpen(false);
        setEditingId(null);
        setQuestion("");
        setOptionsText("");
        fetchPolls();
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
    if (!confirm("Are you sure you want to delete this poll?")) return;
    try {
      const res = await fetch(`/api/admin/meet-polls?id=${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        toast.success("Poll deleted.");
        fetchPolls();
      } else {
        toast.error("Failed to delete poll");
      }
    } catch {
      toast.error("Request failed");
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-[var(--cream)] md:text-2xl flex items-center gap-2">
            <Video className="h-5 w-5 text-[var(--accent)]" />
            Meet add-on – Polls
          </h1>
          <p className="mt-1 text-sm text-[var(--cream-muted)]">
            Create polls/quizzes that students see and answer in the Google Meet add-on. Answers show on their dashboard.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setCreateOpen(true);
            setQuestion("");
            setOptionsText("");
          }}
          className="flex items-center gap-2 rounded-xl border border-[var(--accent)]/40 bg-[var(--accent)]/10 px-4 py-2.5 text-sm font-medium text-[var(--cream)] hover:bg-[var(--accent)]/20"
        >
          <Plus className="h-4 w-4" />
          New poll
        </button>
      </div>

      {createOpen && (
        <div className="rounded-2xl border border-white/10 bg-black/30 p-4 md:p-6">
          <h2 className="text-base font-semibold text-[var(--cream)] mb-4">{editingId ? "Edit poll" : "Create poll / quiz"}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[var(--cream-muted)] mb-1">Question</label>
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="e.g. What topic should we revise next?"
                className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-[var(--cream)]"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--cream-muted)] mb-1">
                Options (one per line or comma-separated)
              </label>
              <textarea
                value={optionsText}
                onChange={(e) => setOptionsText(e.target.value)}
                placeholder="Option A&#10;Option B&#10;Option C"
                rows={4}
                className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-[var(--cream)]"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--cream-muted)] mb-1">Pop-up Duration (Seconds)</label>
              <input
                type="number"
                value={durationSeconds}
                onChange={(e) => setDurationSeconds(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-[var(--cream)]"
                min="10"
                max="300"
                required
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white flex items-center gap-2"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {editingId ? "Update poll" : "Create poll"}
              </button>
              <button
                type="button"
                onClick={() => {
                   setCreateOpen(false);
                   setEditingId(null);
                }}
                className="rounded-lg border border-white/10 px-4 py-2 text-sm text-[var(--cream-muted)]"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="rounded-2xl border border-white/10 bg-black/30 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-[var(--cream-muted)]">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading…
          </div>
        ) : polls.length === 0 ? (
          <p className="py-12 text-center text-[var(--cream-muted)] text-sm">
            No polls yet. Create one to show in the Meet add-on.
          </p>
        ) : (
          <ul className="divide-y divide-white/5">
            {polls.map((p) => (
              <li key={p.id} className="p-4 flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium text-[var(--cream)]">{p.question}</p>
                  <p className="text-xs text-[var(--cream-muted)] mt-1">
                    {Array.isArray(p.options) ? p.options.join(", ") : ""} · {p.responseCount} response(s)
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                   <button 
                     onClick={() => {
                        setEditingId(p.id);
                        setQuestion(p.question);
                        setOptionsText(p.options.join("\n"));
                        setCreateOpen(true);
                     }}
                     className="p-2 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 rounded-lg transition-colors border border-blue-500/20"
                     title="Edit Poll"
                   >
                     <Pencil className="w-4 h-4" />
                   </button>
                   <button 
                     onClick={() => handleDelete(p.id)}
                     className="p-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors border border-red-500/20"
                     title="Delete Poll"
                   >
                     <Trash2 className="w-4 h-4" />
                   </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
