"use client";

import { useState } from "react";
import { ShoppingBag, Receipt, Coins } from "lucide-react";
import { Modal } from "@/components/Modal";
import { useAdminCRUD } from "@/hooks/useAdminCRUD";
import { useFetch } from "@/hooks/useFetch";
import {
  AdminPageHeader,
  AdminTable,
  AdminTh,
  AdminTd,
  FormActions,
  StatusBadge,
  RowActions,
  FormInput,
  FormTextarea,
  FormCheckbox,
} from "@/components/ui";

type Product = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  coinPrice: number | null;
  imageUrl: string | null;
  downloadUrl: string | null;
  isActive: boolean;
  createdAt: string;
  _count?: { purchases: number };
};

type Purchase = {
  id: string;
  productName: string;
  productPrice: number;
  userName: string | null;
  userEmail: string;
  studentId: string | null;
  transactionId: string | null;
  purchasedAt: string;
};

const defaultForm = { name: "", description: "", price: 0, coinPrice: "", imageUrl: "", downloadUrl: "", isActive: true };

export default function AdminProductsPage() {
  const crud = useAdminCRUD<Product>({
    listUrl: "/api/admin/products",
    onCreateSuccess: "Product created.",
    onUpdateSuccess: "Product updated.",
    onDeleteSuccess: "Product deleted.",
    confirmDeleteMessage: (p) => `Delete "${p.name}"? Existing purchases will keep access.`,
  });

  const { data: purchases, loading: purchasesLoading } = useFetch<Purchase[]>("/api/admin/products/purchases");

  const [form, setForm] = useState(defaultForm);

  function openCreate() {
    setForm(defaultForm);
    crud.openCreate();
  }

  function openEdit(p: Product) {
    setForm({ name: p.name, description: p.description ?? "", price: p.price, coinPrice: p.coinPrice?.toString() ?? "", imageUrl: p.imageUrl ?? "", downloadUrl: p.downloadUrl ?? "", isActive: p.isActive });
    crud.openEdit(p);
  }

  function buildPayload() {
    return {
      name: form.name.trim(),
      description: form.description.trim() || null,
      price: Number(form.price) || 0,
      coinPrice: form.coinPrice.trim() ? Number(form.coinPrice) : null,
      imageUrl: form.imageUrl.trim() || null,
      downloadUrl: form.downloadUrl.trim() || null,
      isActive: form.isActive,
    };
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-6 md:py-8">
      <AdminPageHeader
        title="Digital Store"
        description="Sell digital products (PDFs, courses, etc.). Students buy from /store."
        addLabel="Add Product"
        onAdd={openCreate}
      />

      <section className="rounded-2xl border border-gray-200 bg-white p-6">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
          <ShoppingBag className="h-5 w-5 text-[var(--accent)]" /> Products
        </h2>
        <AdminTable loading={crud.loading} empty={crud.items.length === 0} emptyText="No products yet. Add one above.">
          <thead>
            <tr className="border-b border-gray-200 text-left">
              <AdminTh>Name</AdminTh>
              <AdminTh>Price (₹)</AdminTh>
              <AdminTh>Coin Price</AdminTh>
              <AdminTh>Purchases</AdminTh>
              <AdminTh>Active</AdminTh>
              <AdminTh>Actions</AdminTh>
            </tr>
          </thead>
          <tbody>
            {crud.items.map((p) => (
              <tr key={p.id} className="border-b border-gray-100">
                <AdminTd className="font-medium text-gray-900">{p.name}</AdminTd>
                <AdminTd className="text-[var(--accent)]">₹{p.price}</AdminTd>
                <AdminTd>
                  {p.coinPrice ? (
                    <span className="flex items-center gap-1 text-amber-600 font-semibold text-xs">
                      <Coins className="h-3 w-3" />{p.coinPrice}
                    </span>
                  ) : "—"}
                </AdminTd>
                <AdminTd>{p._count?.purchases ?? 0}</AdminTd>
                <AdminTd><StatusBadge active={p.isActive} /></AdminTd>
                <AdminTd>
                  <RowActions onEdit={() => openEdit(p)} onDelete={() => crud.handleDelete(p)} />
                </AdminTd>
              </tr>
            ))}
          </tbody>
        </AdminTable>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-6">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
          <Receipt className="h-5 w-5 text-[var(--accent)]" /> Purchase details
        </h2>
        <p className="mb-4 text-xs text-[var(--cream-muted)]">All digital product purchases with buyer and product details.</p>
        <AdminTable loading={purchasesLoading} empty={(purchases ?? []).length === 0} emptyText="No purchases yet." minWidth="520px">
          <thead>
            <tr className="border-b border-gray-200 text-left">
              <AdminTh>Product</AdminTh>
              <AdminTh>Price</AdminTh>
              <AdminTh>Buyer</AdminTh>
              <AdminTh>Email</AdminTh>
              <AdminTh>Student ID</AdminTh>
              <AdminTh>Transaction ID</AdminTh>
              <AdminTh>Date</AdminTh>
            </tr>
          </thead>
          <tbody>
            {(purchases ?? []).map((row) => (
              <tr key={row.id} className="border-b border-gray-100">
                <AdminTd className="font-medium text-gray-900">{row.productName}</AdminTd>
                <AdminTd className="text-[var(--accent)]">₹{row.productPrice}</AdminTd>
                <AdminTd className="text-gray-900">{row.userName || "—"}</AdminTd>
                <AdminTd>{row.userEmail}</AdminTd>
                <AdminTd className="font-mono text-xs">{row.studentId || "—"}</AdminTd>
                <AdminTd className="font-mono text-xs" title={row.transactionId ?? undefined}>{row.transactionId ? `${row.transactionId.slice(0, 12)}…` : "—"}</AdminTd>
                <AdminTd>{new Date(row.purchasedAt).toLocaleString()}</AdminTd>
              </tr>
            ))}
          </tbody>
        </AdminTable>
      </section>

      <Modal isOpen={crud.createOpen || !!crud.editItem} title={crud.editItem ? "Edit product" : "Add product"} onClose={crud.closeModals}>
        <form onSubmit={async (e) => { e.preventDefault(); crud.editItem ? await crud.handleUpdate(buildPayload()) : await crud.handleCreate(buildPayload()); }} className="space-y-4">
          <FormInput label="Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <FormTextarea label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
          <div className="grid grid-cols-2 gap-3">
            <FormInput label="Price (₹) *" type="number" min={0} value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) || 0 })} />
            <div>
              <FormInput label="Coin Price" type="number" min={0} value={form.coinPrice} onChange={(e) => setForm({ ...form, coinPrice: e.target.value })} placeholder="e.g. 500" />
              <p className="mt-0.5 text-[10px] text-[var(--cream-muted)]">Leave empty = not buyable with coins</p>
            </div>
          </div>
          <FormInput label="Image URL" value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} placeholder="https://..." />
          <div>
            <FormInput label="Download URL" value={form.downloadUrl} onChange={(e) => setForm({ ...form, downloadUrl: e.target.value })} placeholder="https://... or /api/download/..." />
            <p className="mt-0.5 text-[10px] text-[var(--cream-muted)]">Link shown to customer after purchase.</p>
          </div>
          <FormCheckbox id="prod-active" label="Active (visible in store)" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
          <FormActions onCancel={crud.closeModals} saving={crud.saving} isEdit={!!crud.editItem} />
        </form>
      </Modal>
    </div>
  );
}
