"use client";

import { useState, useEffect, useCallback } from "react";
import { Modal } from "@/components/Modal";
import { useAdminCRUD } from "@/hooks/useAdminCRUD";
import {
  AdminPageHeader,
  AdminTable,
  AdminTh,
  AdminTd,
  FormActions,
  StatusBadge,
  RowActions,
  FormInput,
  FormSelect,
  FormCheckbox,
} from "@/components/ui";

// ─── Types ────────────────────────────────────────────────────────────────────

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
  isPublic: boolean;
  description: string | null;
  ownerId: string | null;
  commissionRate: number;
  owner: { id: string; name: string | null; email: string } | null;
  createdAt: string;
  _count?: { redemptions: number };
};

type InfluencerOption = { id: string; name: string | null; email: string };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toDateOnly(d: string | Date | null): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toISOString().slice(0, 10);
}

// ─── Form State ───────────────────────────────────────────────────────────────

const defaultForm = {
  code: "",
  discountType: "PERCENT" as "PERCENT" | "FIXED",
  discountValue: 10,
  minOrder: "",
  maxUses: "",
  validFrom: "",
  validUntil: "",
  isActive: true,
  isPublic: false,
  description: "",
  ownerId: "",
  commissionRate: 0,
};

type FormState = typeof defaultForm;

// ─── CouponForm ───────────────────────────────────────────────────────────────

function CouponForm({
  form,
  setForm,
  isEdit,
  onSubmit,
  onCancel,
  saving,
  influencers,
}: {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  isEdit?: boolean;
  onSubmit: () => Promise<unknown>;
  onCancel: () => void;
  saving: boolean;
  influencers: InfluencerOption[];
}) {
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        await onSubmit();
      }}
      className="space-y-4"
    >
      <FormInput
        label="Code *"
        value={form.code}
        onChange={(e) => setForm((p) => ({ ...p, code: e.target.value.toUpperCase() }))}
        placeholder="e.g. SAVE10"
        required
      />
      <div className="grid grid-cols-2 gap-4">
        <FormSelect
          label="Discount type"
          value={form.discountType}
          onChange={(e) =>
            setForm((p) => ({ ...p, discountType: e.target.value as "PERCENT" | "FIXED" }))
          }
        >
          <option value="PERCENT">Percent (%)</option>
          <option value="FIXED">Fixed (₹)</option>
        </FormSelect>
        <FormInput
          label={`Value ${form.discountType === "PERCENT" ? "(%)" : "(₹)"}`}
          type="number"
          min={0}
          max={form.discountType === "PERCENT" ? 100 : undefined}
          value={form.discountValue}
          onChange={(e) => setForm((p) => ({ ...p, discountValue: Number(e.target.value) }))}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <FormInput
          label="Min order (₹)"
          type="number"
          min={0}
          value={form.minOrder}
          onChange={(e) => setForm((p) => ({ ...p, minOrder: e.target.value }))}
          placeholder="Optional"
        />
        <FormInput
          label="Max total uses"
          type="number"
          min={0}
          value={form.maxUses}
          onChange={(e) => setForm((p) => ({ ...p, maxUses: e.target.value }))}
          placeholder="Unlimited"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <FormInput
          label="Valid from"
          type="date"
          value={form.validFrom}
          onChange={(e) => setForm((p) => ({ ...p, validFrom: e.target.value }))}
        />
        <FormInput
          label="Valid until"
          type="date"
          value={form.validUntil}
          onChange={(e) => setForm((p) => ({ ...p, validUntil: e.target.value }))}
        />
      </div>
      <FormInput
        label="Description (optional)"
        value={form.description}
        onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
        placeholder="e.g. 10% off"
      />

      {/* Owner (Influencer) field */}
      <FormSelect
        label="Owner (Influencer) — Optional"
        value={form.ownerId}
        onChange={(e) =>
          setForm((p) => ({
            ...p,
            ownerId: e.target.value === "none" ? "" : e.target.value,
            commissionRate: e.target.value === "none" ? 0 : p.commissionRate,
          }))
        }
      >
        <option value="none">None (General Coupon)</option>
        {influencers.map((inf) => (
          <option key={inf.id} value={inf.id}>
            {inf.name ? `${inf.name} (${inf.email})` : inf.email}
          </option>
        ))}
      </FormSelect>

      {/* Commission Rate — only show if owner selected */}
      {form.ownerId && (
        <FormInput
          label="Commission Rate (%)"
          type="number"
          min={0}
          max={50}
          value={form.commissionRate}
          onChange={(e) =>
            setForm((p) => ({ ...p, commissionRate: Number(e.target.value) }))
          }
        />
      )}

      <div className="flex gap-6">
        <FormCheckbox
          id={`active-${isEdit ? "edit" : "create"}`}
          label="Active"
          checked={form.isActive}
          onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))}
        />
        <FormCheckbox
          id={`public-${isEdit ? "edit" : "create"}`}
          label="Show publicly on checkout"
          checked={form.isPublic}
          onChange={(e) => setForm((p) => ({ ...p, isPublic: e.target.checked }))}
        />
      </div>
      <FormActions onCancel={onCancel} saving={saving} isEdit={isEdit} />
    </form>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminCouponsPage() {
  const crud = useAdminCRUD<CouponRow>({
    listUrl: "/api/admin/coupons",
    onCreateSuccess: "Coupon created. Each user can use it only once.",
    onDeleteSuccess: "Coupon deleted",
    confirmDeleteMessage: (c) => `Delete coupon "${c.code}"?`,
  });

  const [form, setForm] = useState(defaultForm);
  const [influencers, setInfluencers] = useState<InfluencerOption[]>([]);

  // Fetch influencers list on mount
  const fetchInfluencers = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/coupons?influencers=true");
      if (!res.ok) return;
      const json = (await res.json()) as { data: InfluencerOption[] };
      setInfluencers(json.data ?? []);
    } catch {
      // silently ignore
    }
  }, []);

  useEffect(() => {
    void fetchInfluencers();
  }, [fetchInfluencers]);

  function openCreate() {
    setForm(defaultForm);
    crud.openCreate();
  }

  function openEdit(c: CouponRow) {
    setForm({
      code: c.code,
      discountType: c.discountType as "PERCENT" | "FIXED",
      discountValue: c.discountValue,
      minOrder: c.minOrderAmount != null ? String(c.minOrderAmount) : "",
      maxUses: c.maxTotalUses != null ? String(c.maxTotalUses) : "",
      validFrom: toDateOnly(c.validFrom),
      validUntil: toDateOnly(c.validUntil),
      isActive: c.isActive,
      isPublic: c.isPublic ?? false,
      description: c.description ?? "",
      ownerId: c.ownerId ?? "",
      commissionRate: c.commissionRate ?? 0,
    });
    crud.openEdit(c);
  }

  function buildPayload() {
    return {
      code: form.code.trim().toUpperCase(),
      discountType: form.discountType,
      discountValue: form.discountValue,
      minOrderAmount: form.minOrder.trim() ? Number(form.minOrder) : null,
      maxTotalUses: form.maxUses.trim() ? Number(form.maxUses) : null,
      validFrom: form.validFrom || null,
      validUntil: form.validUntil || null,
      isActive: form.isActive,
      isPublic: form.isPublic,
      description: form.description.trim() || null,
      ownerId: form.ownerId.trim() || null,
      commissionRate: form.ownerId.trim() ? form.commissionRate : 0,
    };
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <AdminPageHeader
        title="Coupons"
        description="Create and manage coupons. Each user can apply a coupon only once per account."
        addLabel="Create coupon"
        onAdd={openCreate}
      />

      <AdminTable
        loading={crud.loading}
        empty={crud.items.length === 0}
        emptyText="No coupons yet. Create one to get started."
        minWidth="700px"
      >
        <thead>
          <tr className="border-b border-gray-200 text-left">
            <AdminTh>Code</AdminTh>
            <AdminTh>Discount</AdminTh>
            <AdminTh>Min order</AdminTh>
            <AdminTh>Valid</AdminTh>
            <AdminTh>Uses</AdminTh>
            <AdminTh>Owner</AdminTh>
            <AdminTh>Commission</AdminTh>
            <AdminTh>Status</AdminTh>
            <AdminTh>Visibility</AdminTh>
            <AdminTh>Actions</AdminTh>
          </tr>
        </thead>
        <tbody>
          {crud.items.map((c) => (
            <tr key={c.id} className="border-b border-gray-100">
              <AdminTd className="font-mono text-sm font-medium text-gray-900">{c.code}</AdminTd>
              <AdminTd>
                {c.discountType === "PERCENT" ? `${c.discountValue}%` : `₹${c.discountValue}`}
              </AdminTd>
              <AdminTd>{c.minOrderAmount != null ? `₹${c.minOrderAmount}` : "—"}</AdminTd>
              <AdminTd className="text-xs text-[var(--cream-muted)]">
                {c.validFrom || c.validUntil
                  ? `${c.validFrom ? toDateOnly(c.validFrom) : "…"} → ${c.validUntil ? toDateOnly(c.validUntil) : "…"}`
                  : "—"}
              </AdminTd>
              <AdminTd>
                {c._count?.redemptions ?? 0}
                {c.maxTotalUses != null ? ` / ${c.maxTotalUses}` : ""}
              </AdminTd>
              <AdminTd>
                {c.owner ? (
                  <div>
                    <p className="text-xs font-medium text-gray-800">
                      {c.owner.name ?? "—"}
                    </p>
                    <p className="text-[10px] text-gray-400">{c.owner.email}</p>
                  </div>
                ) : (
                  <span className="text-xs text-gray-400">—</span>
                )}
              </AdminTd>
              <AdminTd>
                {c.ownerId ? (
                  <span className="inline-flex rounded-full bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-[10px] font-bold text-indigo-600">
                    {c.commissionRate}%
                  </span>
                ) : (
                  <span className="text-xs text-gray-400">—</span>
                )}
              </AdminTd>
              <AdminTd>
                <StatusBadge active={c.isActive} />
              </AdminTd>
              <AdminTd>
                {c.isPublic ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-[10px] font-bold text-indigo-600">
                    Public
                  </span>
                ) : (
                  <span className="text-xs text-gray-400">Private</span>
                )}
              </AdminTd>
              <AdminTd>
                <RowActions onEdit={() => openEdit(c)} onDelete={() => crud.handleDelete(c)} />
              </AdminTd>
            </tr>
          ))}
        </tbody>
      </AdminTable>

      <Modal isOpen={crud.createOpen} title="Create coupon" onClose={crud.closeModals}>
        <CouponForm
          form={form}
          setForm={setForm}
          onSubmit={async () => crud.handleCreate(buildPayload())}
          onCancel={crud.closeModals}
          saving={crud.saving}
          influencers={influencers}
        />
      </Modal>

      <Modal isOpen={!!crud.editItem} title="Edit coupon" onClose={crud.closeModals}>
        <CouponForm
          form={form}
          setForm={setForm}
          isEdit
          onSubmit={async () => crud.handleUpdate(buildPayload())}
          onCancel={crud.closeModals}
          saving={crud.saving}
          influencers={influencers}
        />
      </Modal>
    </div>
  );
}
