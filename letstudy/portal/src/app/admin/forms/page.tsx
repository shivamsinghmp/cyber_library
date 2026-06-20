"use client";

import { useState } from "react";
import { ClipboardList } from "lucide-react";
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
  FormTextarea,
  FormCheckbox,
} from "@/components/ui";

const FIELD_TYPES = ["TEXT", "EMAIL", "NUMBER", "TEXTAREA", "SELECT"] as const;

type FormField = {
  id?: string;
  label: string;
  type: (typeof FIELD_TYPES)[number];
  required: boolean;
  options: string | null;
  order: number;
};

type StudentForm = {
  id: string;
  title: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  fields: { id: string; label: string; type: string; required: boolean; options: string | null; order: number }[];
  _count?: { submissions: number };
};

const defaultMeta = { title: "", description: "", isActive: true };
const defaultFieldRow: FormField = { label: "", type: "TEXT", required: false, options: null, order: 0 };

export default function AdminFormsPage() {
  const crud = useAdminCRUD<StudentForm>({
    listUrl: "/api/admin/forms",
    onCreateSuccess: "Form created",
    onUpdateSuccess: "Form updated",
    onDeleteSuccess: "Form deleted",
    confirmDeleteMessage: () => "Delete this form? All submissions will be lost.",
  });

  const [meta, setMeta] = useState(defaultMeta);
  const [fields, setFields] = useState<FormField[]>([defaultFieldRow]);

  function openCreate() {
    setMeta(defaultMeta);
    setFields([{ ...defaultFieldRow }]);
    crud.openCreate();
  }

  function openEdit(form: StudentForm) {
    setMeta({ title: form.title, description: form.description ?? "", isActive: form.isActive });
    setFields(
      form.fields.length
        ? form.fields.map((f) => ({ id: f.id, label: f.label, type: f.type as FormField["type"], required: f.required, options: f.options, order: f.order }))
        : [{ ...defaultFieldRow }]
    );
    crud.openEdit(form);
  }

  function addField() {
    setFields((prev) => [...prev, { ...defaultFieldRow, order: prev.length }]);
  }

  function removeField(i: number) {
    setFields((prev) => prev.filter((_, idx) => idx !== i));
  }

  function updateField(i: number, upd: Partial<FormField>) {
    setFields((prev) => prev.map((f, idx) => (idx === i ? { ...f, ...upd } : f)));
  }

  function buildPayload() {
    return {
      title: meta.title.trim(),
      description: meta.description.trim() || null,
      isActive: meta.isActive,
      fields: fields.filter((f) => f.label.trim()).map((f, i) => ({ ...f, label: f.label.trim(), order: i })),
    };
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-6 md:py-8">
      <AdminPageHeader
        title="Student Form"
        description="Create a form; students see it on their dashboard and submit. Only one form can be active at a time."
        addLabel="Create Form"
        onAdd={openCreate}
      />

      <section className="rounded-2xl border border-gray-200 bg-white p-6">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
          <ClipboardList className="h-5 w-5 text-[var(--accent)]" /> Forms
        </h2>
        <AdminTable loading={crud.loading} empty={crud.items.length === 0} emptyText="No forms yet. Create one above.">
          <thead>
            <tr className="border-b border-gray-200 text-left">
              <AdminTh>Title</AdminTh>
              <AdminTh>Fields</AdminTh>
              <AdminTh>Submissions</AdminTh>
              <AdminTh>Active</AdminTh>
              <AdminTh>Actions</AdminTh>
            </tr>
          </thead>
          <tbody>
            {crud.items.map((f) => (
              <tr key={f.id} className="border-b border-gray-100">
                <AdminTd className="font-medium text-gray-900">{f.title}</AdminTd>
                <AdminTd>{f.fields?.length ?? 0}</AdminTd>
                <AdminTd className="text-gray-900">{f._count?.submissions ?? 0}</AdminTd>
                <AdminTd><StatusBadge active={f.isActive} /></AdminTd>
                <AdminTd>
                  <RowActions onEdit={() => openEdit(f)} onDelete={() => crud.handleDelete(f)} />
                </AdminTd>
              </tr>
            ))}
          </tbody>
        </AdminTable>
      </section>

      <Modal isOpen={crud.createOpen || !!crud.editItem} title={crud.editItem ? "Edit form" : "Create form"} onClose={crud.closeModals}>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            crud.editItem ? await crud.handleUpdate(buildPayload()) : await crud.handleCreate(buildPayload());
          }}
          className="space-y-4"
        >
          <FormInput label="Title *" value={meta.title} onChange={(e) => setMeta({ ...meta, title: e.target.value })} required placeholder="e.g. Student Feedback Form" />
          <FormTextarea label="Description" value={meta.description} onChange={(e) => setMeta({ ...meta, description: e.target.value })} rows={2} placeholder="Optional" />
          <FormCheckbox id="form-active" label="Active (show this form to students on dashboard)" checked={meta.isActive} onChange={(e) => setMeta({ ...meta, isActive: e.target.checked })} />

          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Fields</span>
              <button type="button" onClick={addField} className="text-xs text-[var(--accent)] hover:underline">+ Add field</button>
            </div>
            <div className="max-h-64 space-y-3 overflow-y-auto">
              {fields.map((field, i) => (
                <div key={i} className="space-y-2 rounded-xl border border-gray-200 bg-gray-50 p-3">
                  <div className="flex gap-2">
                    <input value={field.label} onChange={(e) => updateField(i, { label: e.target.value })} placeholder="Field label" className="flex-1 rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-900" />
                    <select value={field.type} onChange={(e) => updateField(i, { type: e.target.value as FormField["type"] })} className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-900">
                      {FIELD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <label className="flex items-center gap-1 text-xs text-[var(--cream-muted)]">
                      <input type="checkbox" checked={field.required} onChange={(e) => updateField(i, { required: e.target.checked })} />
                      Required
                    </label>
                    <button type="button" onClick={() => removeField(i)} className="rounded p-1 text-red-400 hover:bg-red-50">×</button>
                  </div>
                  {field.type === "SELECT" && (
                    <input value={field.options ?? ""} onChange={(e) => updateField(i, { options: e.target.value.trim() || null })} placeholder="Options (comma-separated)" className="w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-900" />
                  )}
                </div>
              ))}
            </div>
          </div>

          <FormActions onCancel={crud.closeModals} saving={crud.saving} isEdit={!!crud.editItem} />
        </form>
      </Modal>
    </div>
  );
}
