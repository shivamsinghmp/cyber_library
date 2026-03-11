"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Plus, Pencil, Trash2, UserCircle, Search } from "lucide-react";
import { Modal } from "@/components/Modal";
import { AuthorBlogEditor } from "@/components/AuthorBlogEditor";
import toast from "react-hot-toast";

type AuthorProfileFieldDef = { id: string; key: string; label: string; type: string; required: boolean; options: string[] | null };

type AuthorProfile = {
  id: string;
  name: string;
  slug: string;
  bio: string | null;
  imageUrl: string | null;
  _count: { posts: number };
  customFields?: Record<string, string | null> | null;
  fieldDefinitions?: AuthorProfileFieldDef[];
};

type BlogPostRow = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  body: string;
  metaTitle: string | null;
  metaDescription: string | null;
  customCss: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

function toDateOnly(d: string | Date | null): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toISOString().slice(0, 16);
}

export default function AuthorDashboardPage() {
  const [author, setAuthor] = useState<AuthorProfile | null>(null);
  const [posts, setPosts] = useState<BlogPostRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editPost, setEditPost] = useState<BlogPostRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [formSlug, setFormSlug] = useState("");
  const [formTitle, setFormTitle] = useState("");
  const [formExcerpt, setFormExcerpt] = useState("");
  const [formBody, setFormBody] = useState("");
  const [formMetaTitle, setFormMetaTitle] = useState("");
  const [formMetaDescription, setFormMetaDescription] = useState("");
  const [formCustomCss, setFormCustomCss] = useState("");
  const [formPublishedAt, setFormPublishedAt] = useState("");
  const [profileName, setProfileName] = useState("");
  const [profileSlug, setProfileSlug] = useState("");
  const [profileBio, setProfileBio] = useState("");
  const [profileImageUrl, setProfileImageUrl] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileFieldDefinitions, setProfileFieldDefinitions] = useState<AuthorProfileFieldDef[]>([]);
  const [profileCustomFieldsValues, setProfileCustomFieldsValues] = useState<Record<string, string>>({});

  const fetchAuthor = useCallback(async () => {
    try {
      const res = await fetch("/api/author/me");
      if (res.ok) {
        const data = await res.json();
        setAuthor(data);
      } else {
        setAuthor(null);
      }
    } catch {
      setAuthor(null);
    }
  }, []);

  const fetchPosts = useCallback(async () => {
    try {
      const res = await fetch("/api/author/posts");
      if (res.ok) {
        const data = await res.json();
        setPosts(data);
      } else {
        setPosts([]);
      }
    } catch {
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAuthor();
  }, [fetchAuthor]);

  useEffect(() => {
    if (author) {
      setProfileName(author.name);
      setProfileSlug(author.slug);
      setProfileBio(author.bio ?? "");
      setProfileImageUrl(author.imageUrl ?? "");
      setProfileFieldDefinitions(author.fieldDefinitions ?? []);
      const cf = author.customFields && typeof author.customFields === "object" ? author.customFields as Record<string, string | null> : {};
      const init: Record<string, string> = {};
      (author.fieldDefinitions ?? []).forEach((f: AuthorProfileFieldDef) => {
        init[f.key] = (cf[f.key] != null ? String(cf[f.key]) : "") ?? "";
      });
      setProfileCustomFieldsValues(init);
    }
  }, [author]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!profileName.trim()) {
      toast.error("Name is required");
      return;
    }
    setProfileSaving(true);
    try {
      const res = await fetch("/api/author/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: profileName.trim(),
          slug: profileSlug.trim() || profileName.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
          bio: profileBio.trim() || null,
          imageUrl: profileImageUrl.trim() || null,
          customFields: profileFieldDefinitions.length ? profileCustomFieldsValues : undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Failed to update profile");
        setProfileSaving(false);
        return;
      }
      toast.success("Profile updated");
      fetchAuthor();
      setProfileOpen(false);
    } catch {
      toast.error("Something went wrong");
    }
    setProfileSaving(false);
  }

  function openEdit(p: BlogPostRow) {
    setEditPost(p);
    setFormSlug(p.slug);
    setFormTitle(p.title);
    setFormExcerpt(p.excerpt ?? "");
    setFormBody(p.body);
    setFormMetaTitle(p.metaTitle ?? "");
    setFormMetaDescription(p.metaDescription ?? "");
    setFormCustomCss(p.customCss ?? "");
    setFormPublishedAt(p.publishedAt ? toDateOnly(p.publishedAt) : "");
  }

  function closeModals() {
    setEditPost(null);
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editPost) return;
    if (!formSlug.trim() || !formTitle.trim() || !formBody.trim()) {
      toast.error("Slug, title and body are required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/author/posts/${editPost.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: formSlug.trim().toLowerCase().replace(/\s+/g, "-"),
          title: formTitle.trim(),
          excerpt: formExcerpt.trim() || null,
          body: formBody.trim(),
          metaTitle: formMetaTitle.trim() || null,
          metaDescription: formMetaDescription.trim() || null,
          customCss: formCustomCss.trim() || null,
          publishedAt: formPublishedAt ? new Date(formPublishedAt).toISOString() : null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Failed to update");
        setSaving(false);
        return;
      }
      toast.success("Post updated");
      closeModals();
      fetchPosts();
    } catch {
      toast.error("Something went wrong");
    }
    setSaving(false);
  }

  async function handleDelete(p: BlogPostRow) {
    if (!confirm(`Delete post "${p.title}"?`)) return;
    try {
      const res = await fetch(`/api/author/posts/${p.id}`, { method: "DELETE" });
      if (!res.ok) {
        toast.error("Failed to delete");
        return;
      }
      toast.success("Post deleted");
      fetchPosts();
    } catch {
      toast.error("Something went wrong");
    }
  }

  const formFields = (
    <>
      <div>
        <label className="mb-1 block text-xs font-medium text-[var(--cream-muted)]">Slug (URL) *</label>
        <input
          type="text"
          value={formSlug}
          onChange={(e) => setFormSlug(e.target.value.toLowerCase().replace(/\s+/g, "-"))}
          placeholder="how-body-doubling-helps"
          className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-[var(--cream)] placeholder:text-[var(--cream-muted)]/60 focus:border-[var(--accent)]/70 focus:outline-none"
          required
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-[var(--cream-muted)]">Title *</label>
        <input
          type="text"
          value={formTitle}
          onChange={(e) => setFormTitle(e.target.value)}
          placeholder="Post title"
          className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-[var(--cream)] placeholder:text-[var(--cream-muted)]/60 focus:border-[var(--accent)]/70 focus:outline-none"
          required
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-[var(--cream-muted)]">Excerpt (short summary)</label>
        <textarea
          value={formExcerpt}
          onChange={(e) => setFormExcerpt(e.target.value)}
          placeholder="Brief summary for listing"
          rows={2}
          className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-[var(--cream)] placeholder:text-[var(--cream-muted)]/60 focus:border-[var(--accent)]/70 focus:outline-none"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-[var(--cream-muted)]">Body *</label>
        <AuthorBlogEditor
          value={formBody}
          onChange={setFormBody}
          minHeight="320px"
          placeholder="Write your post. Use the toolbar to add links (nofollow/dofollow), images, buttons, code blocks, and video."
        />
      </div>
      <div className="rounded-xl border-2 border-[var(--accent)]/40 bg-[var(--accent)]/10 p-4">
        <p className="mb-1 flex items-center gap-2 text-sm font-semibold text-[var(--cream)]">
          <Search className="h-4 w-4 text-[var(--accent)]" />
          SEO (search engines)
        </p>
        <p className="mb-3 text-[10px] text-[var(--cream-muted)]">Improve how your post appears in Google. Meta title & description show in search results.</p>
        <div className="space-y-3">
          <div>
            <label className="mb-0.5 block text-xs font-medium text-[var(--cream-muted)]">Meta title (max 60 chars recommended)</label>
            <input
              type="text"
              value={formMetaTitle}
              onChange={(e) => setFormMetaTitle(e.target.value)}
              placeholder="e.g. How to Study Better – Tips 2025"
              maxLength={100}
              className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-[var(--cream)] placeholder:text-[var(--cream-muted)]/60 focus:border-[var(--accent)]/70 focus:outline-none"
            />
            <p className="mt-0.5 text-[10px] text-[var(--cream-muted)]/80">{formMetaTitle.length}/100</p>
          </div>
          <div>
            <label className="mb-0.5 block text-xs font-medium text-[var(--cream-muted)]">Meta description (max 155 chars recommended)</label>
            <textarea
              value={formMetaDescription}
              onChange={(e) => setFormMetaDescription(e.target.value)}
              placeholder="Short summary for search results. Include main keyword."
              maxLength={500}
              rows={2}
              className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-[var(--cream)] placeholder:text-[var(--cream-muted)]/60 focus:border-[var(--accent)]/70 focus:outline-none"
            />
            <p className="mt-0.5 text-[10px] text-[var(--cream-muted)]/80">{formMetaDescription.length}/500</p>
          </div>
        </div>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-[var(--cream-muted)]">Custom CSS (optional)</label>
        <textarea
          value={formCustomCss}
          onChange={(e) => setFormCustomCss(e.target.value)}
          placeholder="e.g. p { margin: 1em 0; } a { color: #0ea5e9; } — full rules, scoped to this post's content. No script/expression."
          rows={4}
          className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 font-mono text-xs text-[var(--cream)] placeholder:text-[var(--cream-muted)]/60 focus:border-[var(--accent)]/70 focus:outline-none"
        />
        <p className="mt-0.5 text-[10px] text-[var(--cream-muted)]/80">CSS is sanitized; javascript and expression() are stripped.</p>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-[var(--cream-muted)]">Publish at (leave empty = draft)</label>
        <input
          type="datetime-local"
          value={formPublishedAt}
          onChange={(e) => setFormPublishedAt(e.target.value)}
          className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-[var(--cream)] focus:border-[var(--accent)]/70 focus:outline-none"
        />
      </div>
    </>
  );

  if (loading && !author) {
    return (
      <div className="mx-auto max-w-5xl">
        <p className="rounded-2xl border border-white/10 bg-black/20 px-6 py-8 text-center text-sm text-[var(--cream-muted)]">
          Loading…
        </p>
      </div>
    );
  }

  if (!author) {
    return (
      <div className="mx-auto max-w-5xl">
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-6 py-8 text-center">
          <p className="text-sm font-medium text-amber-200">No author profile linked</p>
          <p className="mt-2 text-xs text-[var(--cream-muted)]">
            Your account is not linked to an author profile. Contact admin to get author access.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--cream)] md:text-3xl">
            Author Dashboard
          </h1>
          <p className="mt-1 text-sm text-[var(--cream-muted)]">
            Hello, {author.name}. Manage your profile and posts below.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setProfileOpen(!profileOpen)}
            className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-medium text-[var(--cream-muted)] transition hover:bg-white/10 hover:text-[var(--cream)]"
          >
            <UserCircle className="h-4 w-4" />
            My profile
          </button>
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-medium text-[var(--cream-muted)] transition hover:bg-white/10 hover:text-[var(--cream)]"
          >
            View blog
          </Link>
          <Link
            href="/author/create"
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[var(--ink)] shadow-lg transition hover:bg-[var(--accent-hover)]"
          >
            <Plus className="h-4 w-4" />
            New post
          </Link>
        </div>
      </div>

      {profileOpen && (
        <div className="rounded-2xl border border-white/10 bg-black/20 p-6">
          <h2 className="mb-4 text-lg font-semibold text-[var(--cream)]">Edit your profile</h2>
          <p className="mb-4 text-xs text-[var(--cream-muted)]">This name, slug, bio and image appear on your blog posts.</p>
          <form onSubmit={handleSaveProfile} className="space-y-4 max-w-xl">
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--cream-muted)]">Display name *</label>
              <input
                type="text"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                placeholder="Your name"
                className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-[var(--cream)] placeholder:text-[var(--cream-muted)]/60 focus:border-[var(--accent)]/70 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--cream-muted)]">Slug (URL)</label>
              <input
                type="text"
                value={profileSlug}
                onChange={(e) => setProfileSlug(e.target.value)}
                placeholder="e.g. jane-doe"
                className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 font-mono text-sm text-[var(--cream)] placeholder:text-[var(--cream-muted)]/60 focus:border-[var(--accent)]/70 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--cream-muted)]">Bio</label>
              <textarea
                value={profileBio}
                onChange={(e) => setProfileBio(e.target.value)}
                placeholder="Short bio..."
                rows={3}
                className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-[var(--cream)] placeholder:text-[var(--cream-muted)]/60 focus:border-[var(--accent)]/70 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--cream-muted)]">Profile image URL</label>
              <input
                type="url"
                value={profileImageUrl}
                onChange={(e) => setProfileImageUrl(e.target.value)}
                placeholder="https://..."
                className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-[var(--cream)] placeholder:text-[var(--cream-muted)]/60 focus:border-[var(--accent)]/70 focus:outline-none"
              />
            </div>
            {profileFieldDefinitions.length > 0 && (
              <div className="space-y-4 border-t border-white/10 pt-4">
                <p className="text-xs font-medium text-[var(--cream-muted)]">Additional details</p>
                {profileFieldDefinitions.map((f) => (
                  <div key={f.id}>
                    <label className="mb-1 block text-xs font-medium text-[var(--cream-muted)]">
                      {f.label}{f.required ? " *" : ""}
                    </label>
                    {f.type === "textarea" ? (
                      <textarea
                        value={profileCustomFieldsValues[f.key] ?? ""}
                        onChange={(e) => setProfileCustomFieldsValues((prev) => ({ ...prev, [f.key]: e.target.value }))}
                        rows={3}
                        className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-[var(--cream)] focus:border-[var(--accent)]/70 focus:outline-none"
                        required={f.required}
                      />
                    ) : f.type === "select" && Array.isArray(f.options) ? (
                      <select
                        value={profileCustomFieldsValues[f.key] ?? ""}
                        onChange={(e) => setProfileCustomFieldsValues((prev) => ({ ...prev, [f.key]: e.target.value }))}
                        className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-[var(--cream)] focus:border-[var(--accent)]/70 focus:outline-none"
                        required={f.required}
                      >
                        <option value="">Select</option>
                        {f.options.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={f.type === "number" ? "number" : f.type === "email" ? "email" : "text"}
                        value={profileCustomFieldsValues[f.key] ?? ""}
                        onChange={(e) => setProfileCustomFieldsValues((prev) => ({ ...prev, [f.key]: e.target.value }))}
                        className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-[var(--cream)] focus:border-[var(--accent)]/70 focus:outline-none"
                        required={f.required}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
            <button type="submit" disabled={profileSaving} className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--ink)] disabled:opacity-70">
              {profileSaving ? "Saving…" : "Save profile"}
            </button>
          </form>
        </div>
      )}

      {loading ? (
        <p className="rounded-2xl border border-white/10 bg-black/20 px-6 py-8 text-center text-sm text-[var(--cream-muted)]">
          Loading posts…
        </p>
      ) : posts.length === 0 ? (
        <p className="rounded-2xl border border-white/10 bg-black/20 px-6 py-8 text-center text-sm text-[var(--cream-muted)]">
          No posts yet. Create one to get started.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white/10 bg-black/20">
          <table className="w-full min-w-[500px]">
            <thead>
              <tr className="border-b border-white/10 text-left">
                <th className="py-2 pr-3 font-medium text-[var(--cream-muted)]">Title</th>
                <th className="py-2 pr-3 font-medium text-[var(--cream-muted)]">Slug</th>
                <th className="py-2 pr-3 font-medium text-[var(--cream-muted)]">Status</th>
                <th className="py-2 font-medium text-[var(--cream-muted)]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((p) => (
                <tr key={p.id} className="border-b border-white/5">
                  <td className="py-2.5 pr-3 font-medium text-[var(--cream)] line-clamp-1">
                    {p.title}
                  </td>
                  <td className="py-2.5 pr-3 font-mono text-xs text-[var(--cream-muted)]">
                    {p.slug}
                  </td>
                  <td className="py-2.5 pr-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        p.publishedAt ? "bg-emerald-500/20 text-emerald-400" : "bg-white/10 text-[var(--cream-muted)]"
                      }`}
                    >
                      {p.publishedAt ? "Published" : "Draft"}
                    </span>
                  </td>
                  <td className="py-2.5">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(p)}
                        className="rounded-lg border border-white/10 bg-white/5 p-1.5 text-[var(--cream-muted)] transition hover:bg-white/10 hover:text-[var(--cream)]"
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(p)}
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

      <Modal isOpen={!!editPost} title="Edit post" onClose={closeModals}>
        {editPost && (
          <form onSubmit={handleUpdate} className="space-y-4 max-h-[80vh] overflow-y-auto">
            {formFields}
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
