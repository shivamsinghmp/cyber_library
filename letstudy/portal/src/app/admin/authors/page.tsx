"use client";

import { useState, useEffect, useCallback } from "react";
import { UserCircle, KeyRound, Copy } from "lucide-react";
import { Modal } from "@/components/Modal";
import {
  AdminPageHeader,
  AdminTable,
  AdminTh,
  AdminTd,
  FormActions,
  RowActions,
  FormInput,
  FormTextarea,
} from "@/components/ui";
import { useAdminCRUD } from "@/hooks/useAdminCRUD";
import toast from "react-hot-toast";

type AuthorRow = {
  id: string;
  name: string;
  slug: string;
  bio: string | null;
  imageUrl: string | null;
  userId: string | null;
  createdAt: string;
  _count?: { posts: number };
  user?: { id: string; name: string | null; email: string } | null;
};

type UserOption = { id: string; name: string | null; email: string; role: string };

function slugFromName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

const defaultForm = { name: "", slug: "", bio: "", imageUrl: "", userId: "" };

export default function AdminAuthorsPage() {
  const crud = useAdminCRUD<AuthorRow>({
    listUrl: "/api/admin/authors",
    onCreateSuccess:
      'Author created. Edit this author, enter email & password, and click "Create login account".',
    onUpdateSuccess: "Author updated",
    onDeleteSuccess: "Author deleted",
    confirmDeleteMessage: (a) =>
      `Delete author "${a.name}"? Blog posts linked to this author will have the author unset.`,
  });

  const [form, setForm] = useState(defaultForm);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [regeneratePassword, setRegeneratePassword] = useState("");
  const [generatedCredentials, setGeneratedCredentials] = useState<{ email: string; password: string } | null>(null);
  const [generateLoading, setGenerateLoading] = useState(false);

  useEffect(() => {
    if (crud.editItem) {
      fetch("/api/admin/authors/users")
        .then((r) => (r.ok ? r.json() : []))
        .then(setUsers)
        .catch(() => setUsers([]));
    }
  }, [crud.editItem]);

  function openCreate() {
    setForm(defaultForm);
    crud.openCreate();
  }

  function openEdit(a: AuthorRow) {
    setForm({ name: a.name, slug: a.slug, bio: a.bio ?? "", imageUrl: a.imageUrl ?? "", userId: a.userId ?? a.user?.id ?? "" });
    setLoginEmail("");
    setLoginPassword("");
    setRegeneratePassword("");
    setGeneratedCredentials(null);
    crud.openEdit(a);
  }

  function onNameChange(name: string) {
    setForm((f) => ({ ...f, name, slug: crud.editItem ? f.slug : slugFromName(name) }));
  }

  function buildPayload(isEdit = false) {
    const payload: Record<string, unknown> = {
      name: form.name.trim(),
      slug: form.slug.trim() || slugFromName(form.name),
      bio: form.bio.trim() || null,
      imageUrl: form.imageUrl.trim() || null,
    };
    if (isEdit) payload.userId = form.userId.trim() || null;
    return payload;
  }

  async function runGenerateLogin(body: Record<string, unknown>) {
    if (!crud.editItem) return;
    setGenerateLoading(true);
    setGeneratedCredentials(null);
    try {
      const res = await fetch(`/api/admin/authors/${crud.editItem.id}/generate-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(data.error ?? "Failed"); return; }
      if (data.password) setGeneratedCredentials({ email: data.email, password: data.password });
      toast.success(data.message ?? "Done");
      crud.refetch();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setGenerateLoading(false);
    }
  }

  function copyCredentials() {
    if (!generatedCredentials) return;
    const text = `Login ID (Email): ${generatedCredentials.email}\nPassword: ${generatedCredentials.password}`;
    navigator.clipboard
      .writeText(text)
      .then(() => toast.success("Copied to clipboard"))
      .catch(() => toast.error("Copy failed"));
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <AdminPageHeader
        title="Author Management"
        description='Create authors, then edit and enter email + password to create their login. Author fills their own profile after login.'
        addLabel="Add author"
        onAdd={openCreate}
      />

      <AdminTable
        loading={crud.loading}
        empty={crud.items.length === 0}
        emptyText="No authors yet. Add one to get started."
        minWidth="500px"
      >
        <thead>
          <tr className="border-b border-gray-200 text-left">
            <AdminTh>Author</AdminTh>
            <AdminTh>Slug</AdminTh>
            <AdminTh>Posts</AdminTh>
            <AdminTh>Linked user</AdminTh>
            <AdminTh>Actions</AdminTh>
          </tr>
        </thead>
        <tbody>
          {crud.items.map((a) => (
            <tr key={a.id} className="border-b border-gray-100">
              <AdminTd>
                <div className="flex items-center gap-3">
                  {a.imageUrl ? (
                    <img src={a.imageUrl} alt={a.name} className="h-10 w-10 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
                      <UserCircle className="h-5 w-5 text-[var(--cream-muted)]" />
                    </div>
                  )}
                  <div>
                    <span className="font-medium text-gray-900">{a.name}</span>
                    {a.bio && <p className="line-clamp-1 text-xs text-[var(--cream-muted)]">{a.bio}</p>}
                  </div>
                </div>
              </AdminTd>
              <AdminTd className="font-mono text-sm text-[var(--cream-muted)]">{a.slug}</AdminTd>
              <AdminTd>{a._count?.posts ?? 0}</AdminTd>
              <AdminTd className="text-xs text-[var(--cream-muted)]">
                {a.user ? `${a.user.name || a.user.email} (${a.user.email})` : "—"}
              </AdminTd>
              <AdminTd>
                <RowActions onEdit={() => openEdit(a)} onDelete={() => crud.handleDelete(a)} />
              </AdminTd>
            </tr>
          ))}
        </tbody>
      </AdminTable>

      <Modal isOpen={crud.createOpen} title="Add author" onClose={crud.closeModals}>
        <p className="mb-3 rounded-lg bg-indigo-50 px-3 py-2 text-xs text-[var(--cream-muted)]">
          After saving, edit this author and enter their email + password, then click &quot;Create login account&quot;.
        </p>
        <form onSubmit={(e) => { e.preventDefault(); crud.handleCreate(buildPayload()); }} className="space-y-4">
          <FormInput label="Name *" value={form.name} onChange={(e) => onNameChange(e.target.value)} placeholder="e.g. Jane Doe" required />
          <FormInput label="Slug (URL)" value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} placeholder="e.g. jane-doe" className="font-mono" />
          <FormTextarea label="Bio (optional)" value={form.bio} onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))} placeholder="Short bio..." rows={3} />
          <FormInput label="Image URL (optional)" type="url" value={form.imageUrl} onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))} placeholder="https://..." />
          <FormActions onCancel={crud.closeModals} saving={crud.saving} />
        </form>
      </Modal>

      <Modal isOpen={!!crud.editItem} title="Edit author" onClose={crud.closeModals}>
        {crud.editItem && (
          <form onSubmit={(e) => { e.preventDefault(); crud.handleUpdate(buildPayload(true)); }} className="space-y-4">
            <FormInput label="Name *" value={form.name} onChange={(e) => onNameChange(e.target.value)} placeholder="e.g. Jane Doe" required />
            <FormInput label="Slug (URL)" value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} placeholder="e.g. jane-doe" className="font-mono" />
            <FormTextarea label="Bio (optional)" value={form.bio} onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))} placeholder="Short bio..." rows={3} />
            <FormInput label="Image URL (optional)" type="url" value={form.imageUrl} onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))} placeholder="https://..." />

            <div className="rounded-xl border border-[var(--accent)]/30 bg-[var(--accent)]/5 p-3">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-[var(--cream)]">
                <KeyRound className="h-3.5 w-3.5" />
                Author login
              </p>
              {crud.editItem.user ? (
                <>
                  <p className="mb-2 text-xs text-[var(--cream-muted)]">
                    Linked: <span className="font-mono text-gray-900">{crud.editItem.user.email}</span>
                  </p>
                  <div className="flex flex-wrap items-end gap-2">
                    <div>
                      <label className="mb-0.5 block text-[10px] text-[var(--cream-muted)]">New password</label>
                      <input type="password" value={regeneratePassword} onChange={(e) => setRegeneratePassword(e.target.value)} placeholder="Min 8 characters" className="w-40 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-sm text-[var(--cream)]" />
                    </div>
                    <button type="button" onClick={() => runGenerateLogin({ newPassword: regeneratePassword })} disabled={generateLoading || regeneratePassword.length < 8} className="rounded-lg bg-amber-100 px-3 py-1.5 text-xs font-medium text-amber-200 hover:bg-amber-500/30 disabled:opacity-60">
                      {generateLoading ? "…" : "Update password"}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="mb-2 text-[10px] text-[var(--cream-muted)]">Enter email and password. Author will log in with these and fill their profile.</p>
                  <div className="mb-2 space-y-2">
                    <input type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} placeholder="Author login email" className="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-sm text-[var(--cream)]" />
                    <input type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} placeholder="Password (min 8 characters)" className="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-sm text-[var(--cream)]" />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => runGenerateLogin({ email: loginEmail.trim(), password: loginPassword })} disabled={generateLoading || !loginEmail.trim() || loginPassword.length < 8} className="rounded-lg bg-indigo-100 px-3 py-1.5 text-xs font-medium text-[var(--cream)] hover:bg-[var(--accent)]/30 disabled:opacity-60">
                      {generateLoading ? "…" : "Create login account"}
                    </button>
                    <button type="button" onClick={() => runGenerateLogin({})} disabled={generateLoading} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-[var(--cream-muted)] hover:bg-gray-50">
                      Or auto-generate credentials
                    </button>
                  </div>
                </>
              )}
              {generatedCredentials && (
                <div className="mt-3 rounded-lg border border-gray-200 bg-white p-2.5 text-xs">
                  <p className="mb-1.5 text-[var(--cream-muted)]">Save and share with author:</p>
                  <p className="break-all font-mono text-[var(--cream)]">Email: {generatedCredentials.email}</p>
                  {generatedCredentials.password && (
                    <p className="mt-1 break-all font-mono text-[var(--cream)]">Password: {generatedCredentials.password}</p>
                  )}
                  <button type="button" onClick={copyCredentials} className="mt-2 flex items-center gap-1 rounded bg-gray-100 px-2 py-1 text-[var(--cream)] hover:bg-gray-200">
                    <Copy className="h-3 w-3" /> Copy
                  </button>
                </div>
              )}
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">Or link existing user</label>
              <p className="mb-1.5 text-[10px] text-[var(--cream-muted)]">Select an existing user to give them author access.</p>
              <select value={form.userId} onChange={(e) => setForm((f) => ({ ...f, userId: e.target.value }))} className="admin-input">
                <option value="">— No user linked —</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name || u.email} ({u.email}) {u.role === "AUTHOR" ? "• Author" : ""}
                  </option>
                ))}
              </select>
            </div>

            <FormActions onCancel={crud.closeModals} saving={crud.saving} isEdit />
          </form>
        )}
      </Modal>
    </div>
  );
}
