"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Edit2, Check, X, ShieldAlert } from "lucide-react";
import toast from "react-hot-toast";

type Faq = {
  id: string;
  question: string;
  answer: string;
  order: number;
  isActive: boolean;
};

export default function AdminFaqsPage() {
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Create / Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<{ question: string; answer: string; order: number; isActive: boolean }>({
    question: "",
    answer: "",
    order: 0,
    isActive: true,
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchFaqs();
  }, []);

  async function fetchFaqs() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/faqs");
      const data = await res.json();
      if (res.ok) setFaqs(data);
      else toast.error(data.error || "Failed to load FAQs");
    } catch {
      toast.error("Failed to load FAQs");
    } finally {
      setLoading(false);
    }
  }

  function handleEdit(faq: Faq) {
    setEditingId(faq.id);
    setFormData({ question: faq.question, answer: faq.answer, order: faq.order, isActive: faq.isActive });
  }

  function handleCancel() {
    setEditingId(null);
    setFormData({ question: "", answer: "", order: 0, isActive: true });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.question || !formData.answer) return toast.error("Question and answer required");
    
    setIsSubmitting(true);
    try {
      const method = editingId ? "PUT" : "POST";
      const url = editingId ? `/api/admin/faqs/${editingId}` : "/api/admin/faqs";
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      
      if (res.ok) {
        toast.success(editingId ? "FAQ updated" : "FAQ created");
        handleCancel();
        fetchFaqs();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to save");
      }
    } catch {
      toast.error("Failed to save");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this FAQ permanently?")) return;
    try {
      const res = await fetch(`/api/admin/faqs/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Deleted");
        fetchFaqs();
      } else {
        const data = await res.json();
        toast.error(data.error || "Delete failed");
      }
    } catch {
      toast.error("Delete failed");
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--cream)]">Dynamic FAQs</h1>
        <p className="mt-1 text-sm text-[var(--cream-muted)]">
          Manage the public Frequently Asked Questions displayed on the Home Page.
        </p>
      </div>

      {/* Editing / Creating Form */}
      <form onSubmit={handleSubmit} className="rounded-2xl border border-white/10 bg-black/30 p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-[var(--cream)] mb-4">
          {editingId ? "Edit FAQ" : "Create New FAQ"}
        </h2>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--cream)]">Question</label>
            <input
              type="text"
              value={formData.question}
              onChange={(e) => setFormData({ ...formData, question: e.target.value })}
              className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-2.5 text-sm text-[var(--cream)] outline-none focus:border-[var(--accent)]"
              placeholder="e.g., Do I need to buy books?"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--cream)]">Answer</label>
            <textarea
              value={formData.answer}
              onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
              rows={3}
              className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-2.5 text-sm text-[var(--cream)] outline-none focus:border-[var(--accent)]"
              placeholder="e.g., No, all resources are available online..."
            />
          </div>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1">
              <label className="mb-1 block text-sm font-medium text-[var(--cream)]">Order Priority</label>
              <input
                type="number"
                value={formData.order}
                onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
                className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-2.5 text-sm text-[var(--cream)] outline-none focus:border-[var(--accent)]"
              />
              <p className="mt-1 text-xs text-[var(--cream-muted)]">Lower numbers appear first.</p>
            </div>
            <div className="flex items-center gap-2 pt-6">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="h-4 w-4 rounded border-white/20 bg-black/40 text-[var(--accent)] focus:ring-[var(--accent)]"
              />
              <label htmlFor="isActive" className="text-sm font-medium text-[var(--cream)]">Visible Publicly</label>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            {editingId && (
              <button
                type="button"
                onClick={handleCancel}
                className="rounded-xl px-4 py-2 text-sm font-semibold text-[var(--cream-muted)] hover:text-white hover:bg-white/5"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-bold text-[var(--ink)] shadow-md transition-all hover:bg-amber-400 disabled:opacity-50"
            >
              <Check className="h-4 w-4" />
              {isSubmitting ? "Saving..." : editingId ? "Update" : "Create"}
            </button>
          </div>
        </div>
      </form>

      {/* List Existing FAQs */}
      <div className="rounded-2xl border border-white/10 bg-black/30 p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-[var(--cream)] mb-4 flex items-center gap-2">
          Current FAQs 
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-[var(--cream-muted)]">{faqs.length}</span>
        </h2>
        
        {loading ? (
          <p className="text-sm text-[var(--cream-muted)]">Loading FAQs...</p>
        ) : faqs.length === 0 ? (
          <p className="text-sm text-[var(--cream-muted)]">No FAQs created yet.</p>
        ) : (
          <ul className="space-y-4">
            {faqs.map(faq => (
              <li key={faq.id} className={`rounded-xl border border-white/10 bg-black/40 p-4 transition-colors hover:border-white/20 ${!faq.isActive && "opacity-60"}`}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-bold text-[var(--cream)] flex items-center gap-2">
                      {faq.question}
                      {!faq.isActive && <span className="rounded bg-red-500/20 px-1.5 py-0.5 text-[10px] uppercase font-bold text-red-400">Hidden</span>}
                    </h3>
                    <p className="mt-2 text-sm text-[var(--cream-muted)] whitespace-pre-wrap">{faq.answer}</p>
                    <p className="mt-3 text-xs text-[var(--wood)] font-medium">Order: {faq.order}</p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      onClick={() => handleEdit(faq)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors"
                      title="Edit"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(faq.id)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
