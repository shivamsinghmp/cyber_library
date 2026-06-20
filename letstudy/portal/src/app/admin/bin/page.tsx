"use client";

import { Trash2, RotateCcw, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";
import { useFetch } from "@/hooks/useFetch";
import { AdminTh } from "@/components/ui";

type BinItem = {
  id: string;
  type: "USER";
  studentId: string | null;
  name: string | null;
  email: string;
  goal: string | null;
  role: string;
  deletedAt: string | null;
  createdAt: string;
};

const BIN_DAYS = 30;

const formatDate = (s: string | null) =>
  s ? new Date(s).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

export default function AdminBinPage() {
  const { data, loading, refetch } = useFetch<BinItem[]>("/api/admin/bin");
  const items = data ?? [];

  async function handleRestore(item: BinItem) {
    try {
      const res = await fetch("/api/admin/bin/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: item.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) { toast.success("Restored. The account is active again."); refetch(); }
      else toast.error(data?.error ?? "Failed to restore.");
    } catch { toast.error("Failed to restore."); }
  }

  async function handlePermanentDelete(item: BinItem) {
    if (!confirm(`Permanently delete "${item.email}"? This cannot be undone.`)) return;
    try {
      const res = await fetch("/api/admin/bin/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: item.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) { toast.success("User permanently deleted."); refetch(); }
      else toast.error(data?.error ?? "Failed to delete permanently.");
    } catch { toast.error("Failed to delete permanently."); }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:py-8">
      <h1 className="mb-2 text-2xl font-semibold text-[var(--cream)] md:text-3xl">Bin</h1>
      <p className="mb-6 text-sm text-[var(--cream-muted)]">Deleted items are kept here for {BIN_DAYS} days. Restore to undo, or they will be permanently removed after {BIN_DAYS} days.</p>

      <div className="mb-4 flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-50 px-4 py-3 text-sm text-amber-200">
        <AlertCircle className="h-4 w-4 shrink-0" />
        <span>Items not restored within {BIN_DAYS} days are automatically deleted forever.</span>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-gray-200 bg-gray-50 px-6 py-12 text-center text-sm text-[var(--cream-muted)]">Loading…</div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-gray-50 px-6 py-12 text-center">
          <Trash2 className="mx-auto h-12 w-12 text-gray-300" />
          <p className="mt-3 text-sm text-[var(--cream-muted)]">Bin is empty.</p>
          <p className="mt-1 text-xs text-gray-400">Deleted students (or other items) will appear here.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white">
          <table className="w-full min-w-[600px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-white">
                <AdminTh>Type</AdminTh>
                <AdminTh>Name / Email</AdminTh>
                <AdminTh>Unique ID</AdminTh>
                <AdminTh>Deleted at</AdminTh>
                <AdminTh>Actions</AdminTh>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold uppercase tracking-wider text-gray-500">
                      {item.type === "USER" ? (item.role === "STUDENT" ? "Student" : item.role) : item.type}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{item.name || "—"}</p>
                    <p className="text-xs text-[var(--cream-muted)]">{item.email}</p>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-[var(--cream-muted)]">{item.studentId ?? "—"}</td>
                  <td className="px-4 py-3 text-xs text-[var(--cream-muted)]">{formatDate(item.deletedAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <button type="button" onClick={() => handleRestore(item)} className="flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 transition hover:bg-emerald-100">
                        <RotateCcw className="h-3.5 w-3.5" /> Restore
                      </button>
                      <button type="button" onClick={() => handlePermanentDelete(item)} className="flex items-center gap-1.5 rounded-lg border border-red-500/40 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-100">
                        <Trash2 className="h-3.5 w-3.5" /> Delete forever
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
