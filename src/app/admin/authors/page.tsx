"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Pencil, Trash2, UserCircle, KeyRound, Copy } from "lucide-react";
import { Modal } from "@/components/Modal";
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
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

export default function AdminAuthorsPage() {
  const [authors, setAuthors] = useState<AuthorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editAuthor, setEditAuthor] = useState<AuthorRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [formName, setFormName] = useState("");
  const [formSlug, setFormSlug] = useState("");
  const [formBio, setFormBio] = useState("");
  const [formImageUrl, setFormImageUrl] = useState("");
  const [formUserId, setFormUserId] = useState("");
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [regeneratePassword, setRegeneratePassword] = useState("");
  const [generatedCredentials, setGeneratedCredentials] = useState<{ email: string; password: string } | null>(null);
  const [generateLoginLoading, setGenerateLoginLoading] = useState(false);

  const fetchAuthors = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/authors");
      if (res.ok) {
        const data = await res.json();
        setAuthors(data);
      }
    } catch {
      setAuthors([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAuthors();
  }, [fetchAuthors]);

  useEffect(() => {
    if (editAuthor) {
      fetch("/api/admin/authors/users")
        .then((r) => (r.ok ? r.json() : []))
        .then(setUsers)
        .catch(() => setUsers([]));
    }
  }, [editAuthor]);

  function openCreate() {
    setFormName("");
    setFormSlug("");
    setFormBio("");
    setFormImageUrl("");
    setCreateOpen(true);
  }

  function openEdit(a: AuthorRow) {
    setEditAuthor(a);
    setFormName(a.name);
    setFormSlug(a.slug);
    setFormBio(a.bio ?? "");
    setFormImageUrl(a.imageUrl ?? "");
    setFormUserId(a.userId ?? a.user?.id ?? "");
    setLoginEmail("");
    setLoginPassword("");
    setRegeneratePassword("");
    setGeneratedCredentials(null);
  }

  function closeModals() {
    setCreateOpen(false);
    setEditAuthor(null);
  }

  function onNameChange(name: string) {
    setFormName(name);
    if (!editAuthor) setFormSlug(slugFromName(name));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!formName.trim()) {
      toast.error("Name is required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/authors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName.trim(),
          slug: formSlug.trim() || slugFromName(formName),
          bio: formBio.trim() || null,
          imageUrl: formImageUrl.trim() || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Failed to create author");
        setSaving(false);
        return;
      }
      toast.success("Author created. Edit this author, enter email & password, and click \"Create login account\".");
      closeModals();
      fetchAuthors();
    } catch {
      toast.error("Something went wrong");
    }
    setSaving(false);
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editAuthor) return;
    if (!formName.trim()) {
      toast.error("Name is required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/authors/${editAuthor.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName.trim(),
          slug: formSlug.trim() || slugFromName(formName),
          bio: formBio.trim() || null,
          imageUrl: formImageUrl.trim() || null,
          userId: formUserId.trim() || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Failed to update");
        setSaving(false);
        return;
      }
      toast.success("Author updated");
      closeModals();
      fetchAuthors();
    } catch {
      toast.error("Something went wrong");
    }
    setSaving(false);
  }

  async function handleCreateLogin(useManual: boolean) {
    if (!editAuthor) return;
    if (useManual && (!loginEmail.trim() || !loginPassword)) {
      toast.error("Enter email and password (min 8 characters)");
      return;
    }
    if (loginPassword.length > 0 && loginPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setGenerateLoginLoading(true);
    setGeneratedCredentials(null);
    try {
      const body = useManual
        ? { email: loginEmail.trim(), password: loginPassword }
        : {};
      const res = await fetch(`/api/admin/authors/${editAuthor.id}/generate-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Failed to create login");
        setGenerateLoginLoading(false);
        return;
      }
      if (data.password) setGeneratedCredentials({ email: data.email, password: data.password });
      toast.success(data.message ?? "Login account created");
      fetchAuthors();
      setFormUserId(data.userId ?? editAuthor.userId ?? "");
      if (useManual) {
        setLoginEmail("");
        setLoginPassword("");
      }
    } catch {
      toast.error("Something went wrong");
    }
    setGenerateLoginLoading(false);
  }

  async function handleRegeneratePassword() {
    if (!editAuthor) return;
    if (regeneratePassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setGenerateLoginLoading(true);
    setGeneratedCredentials(null);
    try {
      const res = await fetch(`/api/admin/authors/${editAuthor.id}/generate-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword: regeneratePassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Failed to update password");
        setGenerateLoginLoading(false);
        return;
      }
      toast.success(data.message ?? "Password updated");
      setRegeneratePassword("");
      if (data.password) setGeneratedCredentials({ email: data.email, password: data.password });
    } catch {
      toast.error("Something went wrong");
    }
    setGenerateLoginLoading(false);
  }

  async function handleGenerateLogin() {
    if (!editAuthor) return;
    setGenerateLoginLoading(true);
    setGeneratedCredentials(null);
    try {
      const res = await fetch(`/api/admin/authors/${editAuthor.id}/generate-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Failed to generate login");
        setGenerateLoginLoading(false);
        return;
      }
      setGeneratedCredentials({ email: data.email, password: data.password });
      toast.success(data.message ?? "Credentials generated");
      fetchAuthors();
      setFormUserId(data.userId ?? editAuthor.userId ?? "");
    } catch {
      toast.error("Something went wrong");
    }
    setGenerateLoginLoading(false);
  }

  function copyCredentials() {
    if (!generatedCredentials) return;
    const text = `Login ID (Email): ${generatedCredentials.email}\nPassword: ${generatedCredentials.password}\n\nLogin at: ${typeof window !== "undefined" ? window.location.origin : ""}/login as Author.`;
    navigator.clipboard.writeText(text).then(() => toast.success("Copied to clipboard")).catch(() => toast.error("Copy failed"));
  }

  async function handleDelete(a: AuthorRow) {
    if (!confirm(`Delete author "${a.name}"? Blog posts linked to this author will have the author unset.`)) return;
    try {
      const res = await fetch(`/api/admin/authors/${a.id}`, { method: "DELETE" });
      if (!res.ok) {
        toast.error("Failed to delete");
        return;
      }
      toast.success("Author deleted");
      fetchAuthors();
    } catch {
      toast.error("Something went wrong");
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--cream)] md:text-3xl">
            Author Management
          </h1>
          <p className="mt-1 text-sm text-[var(--cream-muted)]">
            Create authors, then edit and enter email + password to create their login. Author fills their own profile after login.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[var(--ink)] shadow-lg transition hover:bg-[var(--accent-hover)]"
        >
          <Plus className="h-4 w-4" />
          Add author
        </button>
      </div>

      {loading ? (
        <p className="rounded-2xl border border-white/10 bg-black/20 px-6 py-8 text-center text-sm text-[var(--cream-muted)]">
          Loading…
        </p>
      ) : authors.length === 0 ? (
        <p className="rounded-2xl border border-white/10 bg-black/20 px-6 py-8 text-center text-sm text-[var(--cream-muted)]">
          No authors yet. Add one to get started.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white/10 bg-black/20">
          <table className="w-full min-w-[500px]">
            <thead>
              <tr className="border-b border-white/10 text-left">
                <th className="py-2 pr-3 font-medium text-[var(--cream-muted)]">Author</th>
                <th className="py-2 pr-3 font-medium text-[var(--cream-muted)]">Slug</th>
                <th className="py-2 pr-3 font-medium text-[var(--cream-muted)]">Posts</th>
                <th className="py-2 pr-3 font-medium text-[var(--cream-muted)]">Linked user</th>
                <th className="py-2 font-medium text-[var(--cream-muted)]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {authors.map((a) => (
                <tr key={a.id} className="border-b border-white/5">
                  <td className="py-2.5 pr-3">
                    <div className="flex items-center gap-3">
                      {a.imageUrl ? (
                        <img
                          src={a.imageUrl}
                          alt={a.name}
                          className="h-10 w-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10">
                          <UserCircle className="h-5 w-5 text-[var(--cream-muted)]" />
                        </div>
                      )}
                      <div>
                        <span className="font-medium text-[var(--cream)]">{a.name}</span>
                        {a.bio && (
                          <p className="line-clamp-1 text-xs text-[var(--cream-muted)]">{a.bio}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-2.5 pr-3 font-mono text-sm text-[var(--cream-muted)]">
                    {a.slug}
                  </td>
                  <td className="py-2.5 pr-3 text-sm text-[var(--cream-muted)]">
                    {a._count?.posts ?? 0}
                  </td>
                  <td className="py-2.5 pr-3 text-xs text-[var(--cream-muted)]">
                    {a.user ? `${a.user.name || a.user.email} (${a.user.email})` : "—"}
                  </td>
                  <td className="py-2.5">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(a)}
                        className="rounded-lg border border-white/10 bg-white/5 p-1.5 text-[var(--cream-muted)] transition hover:bg-white/10 hover:text-[var(--cream)]"
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(a)}
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

      <Modal isOpen={createOpen} title="Add author" onClose={closeModals}>
        <p className="mb-3 rounded-lg bg-[var(--accent)]/10 px-3 py-2 text-xs text-[var(--cream-muted)]">
          After saving, edit this author and enter their email + password, then click &quot;Create login account&quot;. They will log in and fill their own profile.
        </p>
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--cream-muted)]">Name *</label>
            <input
              type="text"
              value={formName}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="e.g. Jane Doe"
              className="admin-input"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--cream-muted)]">Slug (URL)</label>
            <input
              type="text"
              value={formSlug}
              onChange={(e) => setFormSlug(e.target.value)}
              placeholder="e.g. jane-doe"
              className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 font-mono text-sm text-[var(--cream)] placeholder:text-[var(--cream-muted)]/60 focus:border-[var(--accent)]/70 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--cream-muted)]">Bio (optional)</label>
            <textarea
              value={formBio}
              onChange={(e) => setFormBio(e.target.value)}
              placeholder="Short bio..."
              rows={3}
              className="admin-input"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--cream-muted)]">Image URL (optional)</label>
            <input
              type="url"
              value={formImageUrl}
              onChange={(e) => setFormImageUrl(e.target.value)}
              placeholder="https://..."
              className="admin-input"
            />
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

      <Modal isOpen={!!editAuthor} title="Edit author" onClose={closeModals}>
        {editAuthor && (
          <form onSubmit={handleUpdate} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--cream-muted)]">Name *</label>
              <input
                type="text"
                value={formName}
                onChange={(e) => onNameChange(e.target.value)}
                placeholder="e.g. Jane Doe"
                className="admin-input"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--cream-muted)]">Slug (URL)</label>
              <input
                type="text"
                value={formSlug}
                onChange={(e) => setFormSlug(e.target.value)}
                placeholder="e.g. jane-doe"
                className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 font-mono text-sm text-[var(--cream)] placeholder:text-[var(--cream-muted)]/60 focus:border-[var(--accent)]/70 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--cream-muted)]">Bio (optional)</label>
              <textarea
                value={formBio}
                onChange={(e) => setFormBio(e.target.value)}
                placeholder="Short bio..."
                rows={3}
                className="admin-input"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--cream-muted)]">Image URL (optional)</label>
              <input
                type="url"
                value={formImageUrl}
                onChange={(e) => setFormImageUrl(e.target.value)}
                placeholder="https://..."
                className="admin-input"
              />
            </div>
            <div className="rounded-xl border border-[var(--accent)]/30 bg-[var(--accent)]/5 p-3">
              <p className="mb-2 text-xs font-semibold text-[var(--cream)] flex items-center gap-1.5">
                <KeyRound className="h-3.5 w-3.5" />
                Author login — author will use this to log in and fill their own profile
              </p>
              {editAuthor.user ? (
                <>
                  <p className="text-xs text-[var(--cream-muted)] mb-2">
                    Linked: <span className="font-mono text-[var(--cream)]">{editAuthor.user.email}</span>
                  </p>
                  <div className="flex flex-wrap items-end gap-2">
                    <div>
                      <label className="mb-0.5 block text-[10px] text-[var(--cream-muted)]">New password</label>
                      <input
                        type="password"
                        value={regeneratePassword}
                        onChange={(e) => setRegeneratePassword(e.target.value)}
                        placeholder="Min 8 characters"
                        className="w-40 rounded-lg border border-white/10 bg-black/40 px-2.5 py-1.5 text-sm text-[var(--cream)] placeholder:text-[var(--cream-muted)]/60"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleRegeneratePassword}
                      disabled={generateLoginLoading || regeneratePassword.length < 8}
                      className="rounded-lg bg-amber-500/20 px-3 py-1.5 text-xs font-medium text-amber-200 hover:bg-amber-500/30 disabled:opacity-60"
                    >
                      {generateLoginLoading ? "…" : "Update password"}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-[10px] text-[var(--cream-muted)] mb-2">Enter email and password. Author will log in with these and fill their profile.</p>
                  <div className="space-y-2 mb-2">
                    <input
                      type="email"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="Author login email"
                      className="w-full rounded-lg border border-white/10 bg-black/40 px-2.5 py-1.5 text-sm text-[var(--cream)] placeholder:text-[var(--cream-muted)]/60"
                    />
                    <input
                      type="password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="Password (min 8 characters)"
                      className="w-full rounded-lg border border-white/10 bg-black/40 px-2.5 py-1.5 text-sm text-[var(--cream)] placeholder:text-[var(--cream-muted)]/60"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleCreateLogin(true)}
                      disabled={generateLoginLoading || !loginEmail.trim() || loginPassword.length < 8}
                      className="rounded-lg bg-[var(--accent)]/20 px-3 py-1.5 text-xs font-medium text-[var(--cream)] hover:bg-[var(--accent)]/30 disabled:opacity-60"
                    >
                      {generateLoginLoading ? "…" : "Create login account"}
                    </button>
                    <button
                      type="button"
                      onClick={handleGenerateLogin}
                      disabled={generateLoginLoading}
                      className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-[var(--cream-muted)] hover:bg-white/5"
                    >
                      Or auto-generate credentials
                    </button>
                  </div>
                </>
              )}
              {generatedCredentials && (
                <div className="mt-3 rounded-lg border border-white/10 bg-black/30 p-2.5 text-xs">
                  <p className="text-[var(--cream-muted)] mb-1.5">Save and share with author:</p>
                  <p className="font-mono text-[var(--cream)] break-all">Email: {generatedCredentials.email}</p>
                  {generatedCredentials.password && (
                    <p className="font-mono text-[var(--cream)] break-all mt-1">Password: {generatedCredentials.password}</p>
                  )}
                  <button type="button" onClick={copyCredentials} className="mt-2 flex items-center gap-1 rounded bg-white/10 px-2 py-1 text-[var(--cream)] hover:bg-white/15">
                    <Copy className="h-3 w-3" /> Copy
                  </button>
                </div>
              )}
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--cream-muted)]">Or link existing user</label>
              <p className="mb-1.5 text-[10px] text-[var(--cream-muted)]">Select an existing user to give them author access.</p>
              <select
                value={formUserId}
                onChange={(e) => setFormUserId(e.target.value)}
                className="admin-input"
              >
                <option value="">— No user linked —</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name || u.email} ({u.email}) {u.role === "AUTHOR" ? "• Author" : ""}
                  </option>
                ))}
              </select>
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
