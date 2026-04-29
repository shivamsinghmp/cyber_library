"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Modal } from "@/components/Modal";
import toast from "react-hot-toast";

type CouponRow = {
  id: string;
  code: string;
  discountType: string;
  discountValue: number;
  minOrderAmount: number | null;
  maxTotalUses: number | null;
  validFrom: string | null;
  validUntil: string | null;
  isActive: boolean;
  description: string | null;
  createdAt: string;
  _count?: { redemptions: number };
};

function toDateOnly(d: string | Date | null): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toISOString().slice(0, 10);
}

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<CouponRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editCoupon, setEditCoupon] = useState<CouponRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [formCode, setFormCode] = useState("");
  const [formDiscountType, setFormDiscountType] = useState<"PERCENT" | "FIXED">("PERCENT");
  const [formDiscountValue, setFormDiscountValue] = useState(10);
  const [formMinOrder, setFormMinOrder] = useState<string>("");
  const [formMaxUses, setFormMaxUses] = useState<string>("");
  const [formValidFrom, setFormValidFrom] = useState("");
  const [formValidUntil, setFormValidUntil] = useState("");
  const [formActive, setFormActive] = useState(true);
  const [formDescription, setFormDescription] = useState("");

  const fetchCoupons = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/coupons");
      if (res.ok) {
        const data = await res.json();
        setCoupons(data);
      }
    } catch {
      setCoupons([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCoupons();
  }, [fetchCoupons]);

  function openCreate() {
    setFormCode("");
    setFormDiscountType("PERCENT");
    setFormDiscountValue(10);
    setFormMinOrder("");
    setFormMaxUses("");
    setFormValidFrom("");
    setFormValidUntil("");
    setFormActive(true);
    setFormDescription("");
    setCreateOpen(true);
  }

  function openEdit(c: CouponRow) {
    setEditCoupon(c);
    setFormCode(c.code);
    setFormDiscountType(c.discountType as "PERCENT" | "FIXED");
    setFormDiscountValue(c.discountValue);
    setFormMinOrder(c.minOrderAmount != null ? String(c.minOrderAmount) : "");
    setFormMaxUses(c.maxTotalUses != null ? String(c.maxTotalUses) : "");
    setFormValidFrom(toDateOnly(c.validFrom));
    setFormValidUntil(toDateOnly(c.validUntil));
    setFormActive(c.isActive);
    setFormDescription(c.description ?? "");
  }

  function closeModals() {
    setCreateOpen(false);
    setEditCoupon(null);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!formCode.trim()) {
      toast.error("Code is required");
      return;
    }
    if (formDiscountType === "PERCENT" && formDiscountValue > 100) {
      toast.error("Percent cannot exceed 100");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: formCode.trim().toUpperCase(),
          discountType: formDiscountType,
          discountValue: formDiscountValue,
          minOrderAmount: formMinOrder.trim() ? Number(formMinOrder) : null,
          maxTotalUses: formMaxUses.trim() ? Number(formMaxUses) : null,
          validFrom: formValidFrom || null,
          validUntil: formValidUntil || null,
          isActive: formActive,
          description: formDescription.trim() || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Failed to create coupon");
        setSaving(false);
        return;
      }
      toast.success("Coupon created. Each user can use it only once.");
      closeModals();
      fetchCoupons();
    } catch {
      toast.error("Something went wrong");
    }
    setSaving(false);
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editCoupon) return;
    if (!formCode.trim()) {
      toast.error("Code is required");
      return;
    }
    if (formDiscountType === "PERCENT" && formDiscountValue > 100) {
      toast.error("Percent cannot exceed 100");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/coupons/${editCoupon.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: formCode.trim().toUpperCase(),
          discountType: formDiscountType,
          discountValue: formDiscountValue,
          minOrderAmount: formMinOrder.trim() ? Number(formMinOrder) : null,
          maxTotalUses: formMaxUses.trim() ? Number(formMaxUses) : null,
          validFrom: formValidFrom || null,
          validUntil: formValidUntil || null,
          isActive: formActive,
          description: formDescription.trim() || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Failed to update");
        setSaving(false);
        return;
      }
      toast.success("Coupon updated");
      closeModals();
      fetchCoupons();
    } catch {
      toast.error("Something went wrong");
    }
    setSaving(false);
  }

  async function handleDelete(c: CouponRow) {
    if (!confirm(`Delete coupon "${c.code}"?`)) return;
    try {
      const res = await fetch(`/api/admin/coupons/${c.id}`, { method: "DELETE" });
      if (!res.ok) {
        toast.error("Failed to delete");
        return;
      }
      toast.success("Coupon deleted");
      fetchCoupons();
    } catch {
      toast.error("Something went wrong");
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--cream)] md:text-3xl">
            Coupons
          </h1>
          <p className="mt-1 text-sm text-[var(--cream-muted)]">
            Create and manage coupons. Each user can apply a coupon only once per account.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[var(--ink)] shadow-lg transition hover:bg-[var(--accent-hover)]"
        >
          <Plus className="h-4 w-4" />
          Create coupon
        </button>
      </div>

      {loading ? (
        <p className="rounded-2xl border border-white/10 bg-black/20 px-6 py-8 text-center text-sm text-[var(--cream-muted)]">
          Loading…
        </p>
      ) : coupons.length === 0 ? (
        <p className="rounded-2xl border border-white/10 bg-black/20 px-6 py-8 text-center text-sm text-[var(--cream-muted)]">
          No coupons yet. Create one to get started.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white/10 bg-black/20">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="border-b border-white/10 text-left">
                <th className="py-2 pr-3 font-medium text-[var(--cream-muted)]">Code</th>
                <th className="py-2 pr-3 font-medium text-[var(--cream-muted)]">Discount</th>
                <th className="py-2 pr-3 font-medium text-[var(--cream-muted)]">Min order</th>
                <th className="py-2 pr-3 font-medium text-[var(--cream-muted)]">Valid</th>
                <th className="py-2 pr-3 font-medium text-[var(--cream-muted)]">Uses</th>
                <th className="py-2 pr-3 font-medium text-[var(--cream-muted)]">Status</th>
                <th className="py-2 font-medium text-[var(--cream-muted)]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {coupons.map((c) => (
                <tr key={c.id} className="border-b border-white/5">
                  <td className="py-2.5 pr-3 font-mono text-sm font-medium text-[var(--cream)]">
                    {c.code}
                  </td>
                  <td className="py-2.5 pr-3 text-sm text-[var(--cream-muted)]">
                    {c.discountType === "PERCENT" ? `${c.discountValue}%` : `₹${c.discountValue}`}
                  </td>
                  <td className="py-2.5 pr-3 text-sm text-[var(--cream-muted)]">
                    {c.minOrderAmount != null ? `₹${c.minOrderAmount}` : "—"}
                  </td>
                  <td className="py-2.5 pr-3 text-xs text-[var(--cream-muted)]">
                    {c.validFrom || c.validUntil
                      ? `${c.validFrom ? toDateOnly(c.validFrom) : "…"} → ${c.validUntil ? toDateOnly(c.validUntil) : "…"}`
                      : "—"}
                  </td>
                  <td className="py-2.5 pr-3 text-sm text-[var(--cream-muted)]">
                    {c._count?.redemptions ?? 0}
                    {c.maxTotalUses != null ? ` / ${c.maxTotalUses}` : ""}
                  </td>
                  <td className="py-2.5 pr-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        c.isActive ? "bg-emerald-500/20 text-emerald-400" : "bg-white/10 text-[var(--cream-muted)]"
                      }`}
                    >
                      {c.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="py-2.5">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(c)}
                        className="rounded-lg border border-white/10 bg-white/5 p-1.5 text-[var(--cream-muted)] transition hover:bg-white/10 hover:text-[var(--cream)]"
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(c)}
                        className="rounded-lg border border-white/10 bg-white/5 p-1.5 text-red-400/80 transition hover:bg-red-500/20 hover:text-red-400"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={createOpen} title="Create coupon" onClose={closeModals}>
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--cream-muted)]">Code *</label>
            <input
              type="text"
              value={formCode}
              onChange={(e) => setFormCode(e.target.value.toUpperCase())}
              placeholder="e.g. SAVE10"
              className="admin-input"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--cream-muted)]">Discount type</label>
              <select
                value={formDiscountType}
                onChange={(e) => setFormDiscountType(e.target.value as "PERCENT" | "FIXED")}
                className="admin-input"
              >
                <option value="PERCENT">Percent (%)</option>
                <option value="FIXED">Fixed (₹)</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--cream-muted)]">
                Value {formDiscountType === "PERCENT" ? "(%)" : "(₹)"}
              </label>
              <input
                type="number"
                min={0}
                max={formDiscountType === "PERCENT" ? 100 : undefined}
                value={formDiscountValue}
                onChange={(e) => setFormDiscountValue(Number(e.target.value))}
                className="admin-input"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--cream-muted)]">Min order (₹)</label>
              <input
                type="number"
                min={0}
                value={formMinOrder}
                onChange={(e) => setFormMinOrder(e.target.value)}
                placeholder="Optional"
                className="admin-input"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--cream-muted)]">Max total uses</label>
              <input
                type="number"
                min={0}
                value={formMaxUses}
                onChange={(e) => setFormMaxUses(e.target.value)}
                placeholder="Unlimited"
                className="admin-input"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--cream-muted)]">Valid from</label>
              <input
                type="date"
                value={formValidFrom}
                onChange={(e) => setFormValidFrom(e.target.value)}
                className="admin-input"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--cream-muted)]">Valid until</label>
              <input
                type="date"
                value={formValidUntil}
                onChange={(e) => setFormValidUntil(e.target.value)}
                className="admin-input"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--cream-muted)]">Description (optional)</label>
            <input
              type="text"
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="e.g. 10% off"
              className="admin-input"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="create-active"
              checked={formActive}
              onChange={(e) => setFormActive(e.target.checked)}
              className="rounded border-white/20 bg-black/40 text-[var(--accent)] focus:ring-[var(--accent)]"
            />
            <label htmlFor="create-active" className="text-sm text-[var(--cream-muted)]">Active</label>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={closeModals} className="rounded-xl border border-white/10 px-4 py-2 text-sm text-[var(--cream)]">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--ink)] disabled:opacity-70">
              {saving ? "Creating…" : "Create"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={!!editCoupon} title="Edit coupon" onClose={closeModals}>
        {editCoupon && (
          <form onSubmit={handleUpdate} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--cream-muted)]">Code *</label>
              <input
                type="text"
                value={formCode}
                onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                placeholder="e.g. SAVE10"
                className="admin-input"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--cream-muted)]">Discount type</label>
                <select
                  value={formDiscountType}
                  onChange={(e) => setFormDiscountType(e.target.value as "PERCENT" | "FIXED")}
                  className="admin-input"
                >
                  <option value="PERCENT">Percent (%)</option>
                  <option value="FIXED">Fixed (₹)</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--cream-muted)]">Value</label>
                <input
                  type="number"
                  min={0}
                  max={formDiscountType === "PERCENT" ? 100 : undefined}
                  value={formDiscountValue}
                  onChange={(e) => setFormDiscountValue(Number(e.target.value))}
                  className="admin-input"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--cream-muted)]">Min order (₹)</label>
                <input
                  type="number"
                  min={0}
                  value={formMinOrder}
                  onChange={(e) => setFormMinOrder(e.target.value)}
                  placeholder="Optional"
                  className="admin-input"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--cream-muted)]">Max total uses</label>
                <input
                  type="number"
                  min={0}
                  value={formMaxUses}
                  onChange={(e) => setFormMaxUses(e.target.value)}
                  placeholder="Unlimited"
                  className="admin-input"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--cream-muted)]">Valid from</label>
                <input
                  type="date"
                  value={formValidFrom}
                  onChange={(e) => setFormValidFrom(e.target.value)}
                  className="admin-input"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--cream-muted)]">Valid until</label>
                <input
                  type="date"
                  value={formValidUntil}
                  onChange={(e) => setFormValidUntil(e.target.value)}
                  className="admin-input"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--cream-muted)]">Description (optional)</label>
              <input
                type="text"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="e.g. 10% off"
                className="admin-input"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="edit-active"
                checked={formActive}
                onChange={(e) => setFormActive(e.target.checked)}
                className="rounded border-white/20 bg-black/40 text-[var(--accent)] focus:ring-[var(--accent)]"
              />
              <label htmlFor="edit-active" className="text-sm text-[var(--cream-muted)]">Active</label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={closeModals} className="rounded-xl border border-white/10 px-4 py-2 text-sm text-[var(--cream)]">
                Cancel
              </button>
              <button type="submit" disabled={saving} className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--ink)] disabled:opacity-70">
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
