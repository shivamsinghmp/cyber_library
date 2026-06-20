"use client";

import { useState } from "react";
import { Trash2, Edit2, Check } from "lucide-react";
import toast from "react-hot-toast";
import { useAdminCRUD } from "@/hooks/useAdminCRUD";
import { AdminPageHeader } from "@/components/ui";

type Faq = {
  id: string;
  question: string;
  answer: string;
  order: number;
  isActive: boolean;
};

const defaultForm = { question: "", answer: "", order: 0, isActive: true };

export default function AdminFaqsPage() {
  const crud = useAdminCRUD<Faq>({
    listUrl: "/api/admin/faqs",
    onCreateSuccess: "FAQ created",
    onUpdateSuccess: "FAQ updated",
    onDeleteSuccess: "Deleted",
    confirmDeleteMessage: () => "Delete this FAQ permanently?",
  });

  const [form, setForm] = useState(defaultForm);

  function handleEdit(faq: Faq) {
    setForm({ question: faq.question, answer: faq.answer, order: faq.order, isActive: faq.isActive });
    crud.openEdit(faq);
  }

  function handleCancel() {
    crud.closeModals();
    setForm(defaultForm);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.question || !form.answer) {
      toast.error("Question and answer required");
      return;
    }
    if (crud.editItem) {
      await crud.handleUpdate(form);
    } else {
      await crud.handleCreate(form);
    }
    setForm(defaultForm);
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <AdminPageHeader
        title="Dynamic FAQs"
        description="Manage the public Frequently Asked Questions displayed on the Home Page."
      />

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xl"
      >
        <h2 className="mb-4 text-lg font-semibold text-[var(--cream)]">
          {crud.editItem ? "Edit FAQ" : "Create New FAQ"}
        </h2>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-900">Question</label>
            <input
              type="text"
              value={form.question}
              onChange={(e) => setForm({ ...form, question: e.target.value })}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-[var(--cream)] outline-none focus:border-[var(--accent)]"
              placeholder="e.g., Do I need to buy books?"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-900">Answer</label>
            <textarea
              value={form.answer}
              onChange={(e) => setForm({ ...form, answer: e.target.value })}
              rows={3}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-[var(--cream)] outline-none focus:border-[var(--accent)]"
              placeholder="e.g., No, all resources are available online..."
            />
          </div>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1">
              <label className="mb-1 block text-sm font-medium text-gray-900">Order Priority</label>
              <input
                type="number"
                value={form.order}
                onChange={(e) =>
                  setForm({ ...form, order: parseInt(e.target.value) || 0 })
                }
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-[var(--cream)] outline-none focus:border-[var(--accent)]"
              />
              <p className="mt-1 text-xs text-[var(--cream-muted)]">Lower numbers appear first.</p>
            </div>
            <div className="flex items-center gap-2 pt-6">
              <input
                type="checkbox"
                id="isActive"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 bg-white text-[var(--accent)] focus:ring-[var(--accent)]"
              />
              <label htmlFor="isActive" className="text-sm font-medium text-gray-900">
                Visible Publicly
              </label>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            {crud.editItem && (
              <button
                type="button"
                onClick={handleCancel}
                className="rounded-xl px-4 py-2 text-sm font-semibold text-[var(--cream-muted)] hover:bg-gray-50 hover:text-white"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={crud.saving}
              className="flex items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-bold text-[var(--ink)] shadow-md transition-all hover:bg-amber-400 disabled:opacity-50"
            >
              <Check className="h-4 w-4" />
              {crud.saving ? "Saving..." : crud.editItem ? "Update" : "Create"}
            </button>
          </div>
        </div>
      </form>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xl">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-[var(--cream)]">
          Current FAQs
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-[var(--cream-muted)]">
            {crud.items.length}
          </span>
        </h2>

        {crud.loading ? (
          <p className="text-sm text-[var(--cream-muted)]">Loading FAQs...</p>
        ) : crud.items.length === 0 ? (
          <p className="text-sm text-[var(--cream-muted)]">No FAQs created yet.</p>
        ) : (
          <ul className="space-y-4">
            {crud.items.map((faq) => (
              <li
                key={faq.id}
                className={`rounded-xl border border-gray-200 bg-white p-4 transition-colors hover:border-gray-300 ${
                  !faq.isActive && "opacity-60"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="flex items-center gap-2 font-bold text-[var(--cream)]">
                      {faq.question}
                      {!faq.isActive && (
                        <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-red-700">
                          Hidden
                        </span>
                      )}
                    </h3>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-[var(--cream-muted)]">
                      {faq.answer}
                    </p>
                    <p className="mt-3 text-xs font-medium text-[var(--wood)]">
                      Order: {faq.order}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      onClick={() => handleEdit(faq)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-400 transition-colors hover:bg-blue-100"
                      title="Edit"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => crud.handleDelete(faq)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-400 transition-colors hover:bg-red-100"
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
