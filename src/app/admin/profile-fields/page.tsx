"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, UserCircle } from "lucide-react";
import { Modal } from "@/components/Modal";
import { useAdminCRUD } from "@/hooks/useAdminCRUD";
import {
  AdminTable,
  AdminTh,
  AdminTd,
  FormActions,
  RowActions,
  FormInput,
  FormTextarea,
  FormSelect,
  FormCheckbox,
} from "@/components/ui";
import toast from "react-hot-toast";

const ROLES = [
  { value: "STUDENT", label: "Student" },
  { value: "EMPLOYEE", label: "Staff" },
  { value: "AUTHOR", label: "Author" },
  { value: "LEAD", label: "Landing form (new student)" },
] as const;

const TYPES = [
  { value: "text", label: "Text" },
  { value: "number", label: "Number" },
  { value: "email", label: "Email" },
  { value: "textarea", label: "Long text" },
  { value: "select", label: "Dropdown (select)" },
] as const;

type FieldDef = {
  id: string;
  role: string;
  key: string;
  label: string;
  type: string;
  required: boolean;
  options: string[] | null;
  sortOrder: number;
};

const defaultForm = { key: "", label: "", type: "text", required: false, options: "", sortOrder: 0 };

export default function AdminProfileFieldsPage() {
  const [roleFilter, setRoleFilter] = useState("STUDENT");

  const crud = useAdminCRUD<FieldDef>({
    listUrl: `/api/admin/profile-fields?role=${encodeURIComponent(roleFilter)}`,
    onCreateSuccess: "Field added",
    onUpdateSuccess: "Field updated",
    onDeleteSuccess: "Field removed",
    confirmDeleteMessage: () => "Remove this field? Existing values in profiles will be ignored.",
  });

  const [form, setForm] = useState(defaultForm);

  function openCreate() {
    setForm({ ...defaultForm, sortOrder: crud.items.length });
    crud.openCreate();
  }

  function openEdit(f: FieldDef) {
    setForm({ key: f.key, label: f.label, type: f.type, required: f.required, options: Array.isArray(f.options) ? f.options.join("\n") : "", sortOrder: f.sortOrder });
    crud.openEdit(f);
  }

  function buildPayload(isEdit: boolean) {
    const key = form.key.trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
    if (!key) { toast.error("Key is required"); return null; }
    if (!form.label.trim()) { toast.error("Label is required"); return null; }
    const options = form.type === "select" ? form.options.split("\n").map((s) => s.trim()).filter(Boolean) : null;
    const base = { label: form.label.trim(), type: form.type, required: form.required, options, sortOrder: form.sortOrder };
    return isEdit ? base : { ...base, role: roleFilter, key };
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-6">
      <div>
        <Link href="/admin" className="inline-flex items-center gap-1 text-sm font-medium text-[var(--cream-muted)] hover:text-[var(--accent)]">
          <ChevronLeft className="h-4 w-4" /> Back to Admin
        </Link>
        <h1 className="mt-2 flex items-center gap-2 text-2xl font-bold text-gray-900">
          <UserCircle className="h-7 w-7 text-[var(--accent)]" /> Profile fields
        </h1>
        <p className="mt-1 text-sm text-[var(--cream-muted)]">
          Add custom fields to Student, Staff, or Author profiles. Use "Landing form (new student)" role to configure fields for the public join page.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Role:</label>
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-[var(--cream)] focus:border-indigo-400 focus:outline-none">
          {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
        <button type="button" onClick={openCreate} className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--ink)]">
          + Add field
        </button>
      </div>

      <AdminTable loading={crud.loading} empty={crud.items.length === 0} emptyText={`No custom fields for ${ROLES.find((r) => r.value === roleFilter)?.label}. Add one above.`}>
        <thead>
          <tr className="border-b border-gray-200 text-left">
            <AdminTh>Key</AdminTh>
            <AdminTh>Label</AdminTh>
            <AdminTh>Type</AdminTh>
            <AdminTh>Required</AdminTh>
            <AdminTh>Order</AdminTh>
            <AdminTh>Actions</AdminTh>
          </tr>
        </thead>
        <tbody>
          {crud.items.map((f) => (
            <tr key={f.id} className="border-b border-gray-100">
              <AdminTd className="font-mono text-sm text-gray-900">{f.key}</AdminTd>
              <AdminTd className="text-gray-900">{f.label}</AdminTd>
              <AdminTd>{f.type}</AdminTd>
              <AdminTd>{f.required ? "Yes" : "No"}</AdminTd>
              <AdminTd>{f.sortOrder}</AdminTd>
              <AdminTd>
                <RowActions onEdit={() => openEdit(f)} onDelete={() => crud.handleDelete(f)} />
              </AdminTd>
            </tr>
          ))}
        </tbody>
      </AdminTable>

      <Modal isOpen={crud.createOpen || !!crud.editItem} title={crud.editItem ? "Edit field" : "Add field"} onClose={crud.closeModals}>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const isEdit = !!crud.editItem;
            const payload = buildPayload(isEdit);
            if (!payload) return;
            isEdit ? await crud.handleUpdate(payload) : await crud.handleCreate(payload);
          }}
          className="space-y-4"
        >
          <div>
            <FormInput
              label="Key (e.g. father_name)"
              value={form.key}
              onChange={(e) => setForm({ ...form, key: e.target.value.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "") })}
              placeholder="father_name"
              disabled={!!crud.editItem}
            />
            {crud.editItem && <p className="mt-0.5 text-[10px] text-[var(--cream-muted)]">Key cannot be changed after create.</p>}
          </div>
          <FormInput label="Label (display name)" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Father's name" />
          <FormSelect label="Type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </FormSelect>
          {form.type === "select" && (
            <FormTextarea label="Options (one per line)" value={form.options} onChange={(e) => setForm({ ...form, options: e.target.value })} rows={3} placeholder={"Option A\nOption B"} />
          )}
          <FormCheckbox id="pf-required" label="Required" checked={form.required} onChange={(e) => setForm({ ...form, required: e.target.checked })} />
          <FormInput label="Sort order (lower = first)" type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: parseInt(e.target.value, 10) || 0 })} />
          <FormActions onCancel={crud.closeModals} saving={crud.saving} isEdit={!!crud.editItem} createLabel="Add" updateLabel="Update" />
        </form>
      </Modal>
    </div>
  );
}
