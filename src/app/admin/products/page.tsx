"use client";

import { useState, useEffect, useCallback } from "react";
import { ShoppingBag, Plus, Pencil, Trash2, Receipt } from "lucide-react";
import { Modal } from "@/components/Modal";
import toast from "react-hot-toast";

type Product = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  downloadUrl: string | null;
  isActive: boolean;
  createdAt: string;
  _count?: { purchases: number };
};

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState(0);
  const [imageUrl, setImageUrl] = useState("");
  const [downloadUrl, setDownloadUrl] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteSaving, setDeleteSaving] = useState(false);
  const [purchases, setPurchases] = useState<
    { id: string; productName: string; productPrice: number; userName: string | null; userEmail: string; studentId: string | null; transactionId: string | null; purchasedAt: string }[]
  >([]);
  const [purchasesLoading, setPurchasesLoading] = useState(false);

  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/products", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setProducts(Array.isArray(data) ? data : []);
      }
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    setPurchasesLoading(true);
    fetch("/api/admin/products/purchases", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setPurchases(Array.isArray(data) ? data : []))
      .catch(() => setPurchases([]))
      .finally(() => setPurchasesLoading(false));
  }, []);

  function openCreate() {
    setEditing(null);
    setName("");
    setDescription("");
    setPrice(0);
    setImageUrl("");
    setDownloadUrl("");
    setIsActive(true);
    setModalOpen(true);
  }

  function openEdit(p: Product) {
    setEditing(p);
    setName(p.name);
    setDescription(p.description ?? "");
    setPrice(p.price);
    setImageUrl(p.imageUrl ?? "");
    setDownloadUrl(p.downloadUrl ?? "");
    setIsActive(p.isActive);
    setModalOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        price: Number(price) || 0,
        imageUrl: imageUrl.trim() || null,
        downloadUrl: downloadUrl.trim() || null,
        isActive,
      };
      if (editing) {
        const res = await fetch(`/api/admin/products/${editing.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          toast.success("Product updated.");
          setModalOpen(false);
          fetchProducts();
        } else toast.error("Failed to update.");
      } else {
        const res = await fetch("/api/admin/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          toast.success("Product created.");
          setModalOpen(false);
          fetchProducts();
        } else toast.error("Failed to create.");
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    setDeleteSaving(true);
    try {
      const res = await fetch(`/api/admin/products/${deleteId}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Product deleted.");
        setDeleteId(null);
        fetchProducts();
      } else toast.error("Failed to delete.");
    } finally {
      setDeleteSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8">
        <p className="text-center text-[var(--cream-muted)]">Loading…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-6 md:py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--cream)] md:text-3xl">Digital Store</h1>
          <p className="mt-1 text-sm text-[var(--cream-muted)]">Sell digital products (PDFs, courses, etc.). Students buy from /store.</p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="flex items-center gap-2 rounded-xl border border-[var(--accent)]/50 bg-[var(--accent)]/10 px-4 py-2.5 text-sm font-medium text-[var(--cream)] transition hover:bg-[var(--accent)]/20"
        >
          <Plus className="h-4 w-4" />
          Add Product
        </button>
      </div>

      <section className="rounded-2xl border border-white/10 bg-black/25 p-6">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-[var(--cream)]">
          <ShoppingBag className="h-5 w-5 text-[var(--accent)]" />
          Products
        </h2>
        {products.length === 0 ? (
          <p className="py-6 text-center text-sm text-[var(--cream-muted)]">No products yet. Add one above.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left">
                  <th className="py-2 pr-3 font-medium text-[var(--cream-muted)]">Name</th>
                  <th className="py-2 pr-3 font-medium text-[var(--cream-muted)]">Price</th>
                  <th className="py-2 pr-3 font-medium text-[var(--cream-muted)]">Purchases</th>
                  <th className="py-2 pr-3 font-medium text-[var(--cream-muted)]">Active</th>
                  <th className="py-2 font-medium text-[var(--cream-muted)]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id} className="border-b border-white/5">
                    <td className="py-2.5 pr-3 font-medium text-[var(--cream)]">{p.name}</td>
                    <td className="py-2.5 pr-3 text-[var(--accent)]">₹{p.price}</td>
                    <td className="py-2.5 pr-3 text-[var(--cream-muted)]">{p._count?.purchases ?? 0}</td>
                    <td className="py-2.5 pr-3">{p.isActive ? "Yes" : "No"}</td>
                    <td className="py-2.5">
                      <button type="button" onClick={() => openEdit(p)} className="mr-2 rounded p-1 text-[var(--cream-muted)] hover:bg-white/10 hover:text-[var(--cream)]">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button type="button" onClick={() => setDeleteId(p.id)} className="rounded p-1 text-[var(--cream-muted)] hover:bg-white/10 hover:text-red-400">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-white/10 bg-black/25 p-6">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-[var(--cream)]">
          <Receipt className="h-5 w-5 text-[var(--accent)]" />
          Purchase details — who bought which product
        </h2>
        <p className="mb-4 text-xs text-[var(--cream-muted)]">
          List of all digital product purchases with buyer and product details.
        </p>
        {purchasesLoading ? (
          <p className="py-6 text-center text-sm text-[var(--cream-muted)]">Loading…</p>
        ) : purchases.length === 0 ? (
          <p className="py-6 text-center text-sm text-[var(--cream-muted)]">No purchases yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left">
                  <th className="py-2 pr-3 font-medium text-[var(--cream-muted)]">Product</th>
                  <th className="py-2 pr-3 font-medium text-[var(--cream-muted)]">Price</th>
                  <th className="py-2 pr-3 font-medium text-[var(--cream-muted)]">Buyer</th>
                  <th className="py-2 pr-3 font-medium text-[var(--cream-muted)]">Email</th>
                  <th className="py-2 pr-3 font-medium text-[var(--cream-muted)]">Student ID</th>
                  <th className="py-2 pr-3 font-medium text-[var(--cream-muted)]">Transaction ID</th>
                  <th className="py-2 font-medium text-[var(--cream-muted)]">Date</th>
                </tr>
              </thead>
              <tbody>
                {purchases.map((row) => (
                  <tr key={row.id} className="border-b border-white/5">
                    <td className="py-2.5 pr-3 font-medium text-[var(--cream)]">{row.productName}</td>
                    <td className="py-2.5 pr-3 text-[var(--accent)]">₹{row.productPrice}</td>
                    <td className="py-2.5 pr-3 text-[var(--cream)]">{row.userName || "—"}</td>
                    <td className="py-2.5 pr-3 text-[var(--cream-muted)]">{row.userEmail}</td>
                    <td className="py-2.5 pr-3 font-mono text-xs text-[var(--cream-muted)]">{row.studentId || "—"}</td>
                    <td className="py-2.5 pr-3 font-mono text-xs text-[var(--cream-muted)]" title={row.transactionId ?? undefined}>{row.transactionId ? `${row.transactionId.slice(0, 12)}…` : "—"}</td>
                    <td className="py-2.5 text-[var(--cream-muted)]">{new Date(row.purchasedAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Modal isOpen={modalOpen} title={editing ? "Edit product" : "Add product"} onClose={() => setModalOpen(false)}>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--cream-muted)]">Name *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-[var(--cream)]" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--cream-muted)]">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-[var(--cream)]" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--cream-muted)]">Price (₹) *</label>
            <input type="number" min={0} value={price} onChange={(e) => setPrice(Number(e.target.value) || 0)} className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-[var(--cream)]" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--cream-muted)]">Image URL</label>
            <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-[var(--cream)]" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--cream-muted)]">Download URL</label>
            <input value={downloadUrl} onChange={(e) => setDownloadUrl(e.target.value)} placeholder="https://... or /api/download/..." className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-[var(--cream)]" />
            <p className="mt-0.5 text-[10px] text-[var(--cream-muted)]">Link shown to customer after purchase.</p>
          </div>
          <label className="flex items-center gap-2 text-sm text-[var(--cream-muted)]">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            Active (visible in store)
          </label>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="flex-1 rounded-xl border border-white/10 py-2.5 text-sm font-medium text-[var(--cream)]">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 rounded-xl bg-[var(--accent)] py-2.5 text-sm font-semibold text-[var(--ink)] disabled:opacity-60">{saving ? "Saving…" : "Save"}</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={!!deleteId} title="Delete product" onClose={() => !deleteSaving && setDeleteId(null)}>
        {deleteId && (
          <div className="space-y-4">
            <p className="text-sm text-[var(--cream-muted)]">Remove this product? Existing purchases will keep their access.</p>
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => setDeleteId(null)} disabled={deleteSaving} className="flex-1 rounded-xl border border-white/10 py-2.5 text-sm font-medium text-[var(--cream)]">Cancel</button>
              <button type="button" onClick={handleDelete} disabled={deleteSaving} className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{deleteSaving ? "Deleting…" : "Delete"}</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
