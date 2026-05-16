"use client";

import { useState, useEffect } from "react";
import { Plus, Save, Eye, Code, Trash2 } from "lucide-react";
import DOMPurify from "isomorphic-dompurify";
import toast from "react-hot-toast";
import type { EmailDraft } from "./types";

type Props = {
  drafts: EmailDraft[];
  loading: boolean;
  onRefresh: () => void;
};

export function EmailDraftsTab({ drafts, loading, onRefresh }: Props) {
  const [selectedId, setSelectedId] = useState("");
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    const existing = drafts.find((d) => d.id === selectedId);
    if (existing) {
      setName(existing.name);
      setSubject(existing.subject);
      setBodyHtml(existing.bodyHtml);
    } else {
      setName("");
      setSubject("");
      setBodyHtml("");
    }
  }, [selectedId, drafts]);

  async function saveDraft(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/admin/email/drafts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: selectedId || undefined, name, subject, bodyHtml }),
    });
    if (res.ok) {
      toast.success("Draft saved");
      onRefresh();
      if (!selectedId) {
        const newer = await res.json();
        setSelectedId(newer.id);
      }
    } else {
      toast.error("Failed to save draft");
    }
  }

  async function deleteDraft(id: string) {
    if (!confirm("Delete this draft?")) return;
    const res = await fetch(`/api/admin/email/drafts?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Draft deleted");
      if (selectedId === id) setSelectedId("");
      onRefresh();
    } else {
      toast.error("Failed to delete draft");
    }
  }

  return (
    <div className="flex flex-col gap-6 md:flex-row">
      <div className="w-full space-y-4 md:w-1/3">
        <button
          onClick={() => setSelectedId("")}
          className={`flex w-full items-center justify-center gap-2 rounded-xl border border-dashed py-3 text-sm font-semibold transition ${
            !selectedId
              ? "border-[var(--accent)] bg-indigo-50 text-[var(--accent)]"
              : "border-gray-300 text-[var(--cream-muted)] hover:bg-gray-50"
          }`}
        >
          <Plus className="h-4 w-4" /> Create New Draft
        </button>

        <div className="space-y-2">
          {loading ? (
            <div className="py-4 text-center text-sm opacity-50">Loading drafts...</div>
          ) : drafts.length === 0 ? (
            <div className="py-4 text-center text-sm opacity-50">No drafts saved yet.</div>
          ) : (
            drafts.map((d) => (
              <div key={d.id} className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedId(d.id)}
                  className={`flex-1 truncate rounded-xl border px-4 py-3 text-left transition ${
                    selectedId === d.id
                      ? "border-[var(--accent)] bg-indigo-50 text-[var(--accent)]"
                      : "border-gray-200 bg-gray-50 text-[var(--cream-muted)] hover:bg-gray-50"
                  }`}
                >
                  <div className="truncate text-sm font-semibold">{d.name}</div>
                  <div className="mt-1 truncate text-[10px] opacity-60">Subj: {d.subject}</div>
                </button>
                <button onClick={() => deleteDraft(d.id)} className="rounded-xl border border-gray-100 p-3 text-red-400 transition hover:border-red-500/50 hover:bg-red-50">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="w-full md:w-2/3">
        <form onSubmit={saveDraft} className="space-y-4 rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-6">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">{selectedId ? "Edit Draft" : "New Blank Draft"}</h2>
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowPreview(!showPreview)} className="flex items-center gap-2 rounded-xl bg-gray-100 px-4 py-2 text-sm font-semibold text-[var(--cream)] hover:bg-white/20">
                {showPreview ? <Code className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                {showPreview ? "Code" : "Preview"}
              </button>
              <button type="submit" className="flex items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--ink)] hover:opacity-90">
                <Save className="h-4 w-4" /> Save Draft
              </button>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs text-[var(--cream-muted)]">Draft Internal Name</label>
            <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Diwali Special Promo" className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-[var(--cream-muted)]">Email Subject Line</label>
            <input required value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Happy Diwali!" className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-[var(--cream-muted)]">Email HTML Body</label>
            {showPreview ? (
              <div className="min-h-[300px] w-full overflow-auto rounded-xl border border-gray-200 bg-white p-4 text-black shadow-inner" style={{ fontFamily: "Arial, sans-serif" }} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(bodyHtml || "<p style='color:gray'>No HTML content...</p>") }} />
            ) : (
              <textarea required value={bodyHtml} onChange={(e) => setBodyHtml(e.target.value)} placeholder="<h1>Hello World</h1>" className="min-h-[300px] w-full rounded-xl border border-[var(--wood)]/20 bg-white px-3 py-3 font-mono text-sm text-[var(--cream)] outline-none transition focus:border-[var(--accent)]" />
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
