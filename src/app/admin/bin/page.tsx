"use client";

import { useState, useEffect, useCallback } from "react";
import { Trash2, RotateCcw, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";

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

export default function AdminBinPage() {
  const [items, setItems] = useState<BinItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBin = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/bin", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setItems(Array.isArray(data) ? data : []);
      } else {
        setItems([]);
      }
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBin();
  }, [fetchBin]);

  async function handleRestore(item: BinItem) {
    try {
      const res = await fetch("/api/admin/bin/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: item.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        toast.success("Restored. The account is active again.");
        fetchBin();
      } else {
        toast.error(data?.error ?? "Failed to restore.");
      }
    } catch {
      toast.error("Failed to restore.");
    }
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:py-8">
      <h1 className="mb-2 text-2xl font-semibold text-[var(--cream)] md:text-3xl">
        Bin
      </h1>
      <p className="mb-6 text-sm text-[var(--cream-muted)]">
        Deleted items are kept here for {BIN_DAYS} days. Restore to undo, or they will be permanently removed after {BIN_DAYS} days.
      </p>

      <div className="mb-4 flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
        <AlertCircle className="h-4 w-4 shrink-0" />
        <span>Items not restored within {BIN_DAYS} days are automatically deleted forever.</span>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-white/10 bg-black/20 px-6 py-12 text-center text-sm text-[var(--cream-muted)]">
          Loading…
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-black/20 px-6 py-12 text-center">
          <Trash2 className="mx-auto h-12 w-12 text-[var(--cream-muted)]/50" />
          <p className="mt-3 text-sm text-[var(--cream-muted)]">Bin is empty.</p>
          <p className="mt-1 text-xs text-[var(--cream-muted)]/80">
            Deleted students (or other items) will appear here.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white/10 bg-black/25">
          <table className="w-full min-w-[600px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-black/30">
                <th className="px-4 py-3 font-medium text-[var(--cream-muted)]">Type</th>
                <th className="px-4 py-3 font-medium text-[var(--cream-muted)]">Name / Email</th>
                <th className="px-4 py-3 font-medium text-[var(--cream-muted)]">Unique ID</th>
                <th className="px-4 py-3 font-medium text-[var(--cream-muted)]">Deleted at</th>
                <th className="px-4 py-3 font-medium text-[var(--cream-muted)]">Action</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-white/5 hover:bg-white/5">
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs font-medium text-[var(--cream-muted)]">
                      {item.type === "USER" ? (item.role === "STUDENT" ? "Student" : item.role) : item.type}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-[var(--cream)]">{item.name || "—"}</p>
                    <p className="text-xs text-[var(--cream-muted)]">{item.email}</p>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-[var(--cream-muted)]">
                    {item.studentId ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-[var(--cream-muted)]">
                    {formatDate(item.deletedAt)}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => handleRestore(item)}
                      className="flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-300 transition hover:bg-emerald-500/20"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      Restore
                    </button>
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
