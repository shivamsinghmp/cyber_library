"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Plus, Pencil, Trash2, Eye, MessageSquare } from "lucide-react";
import dynamic from "next/dynamic";
import "react-quill-new/dist/quill.snow.css";

const ReactQuill = dynamic(() => import("react-quill-new"), { ssr: false });
import { Modal } from "@/components/Modal";
import toast from "react-hot-toast";

type BlogPostRow = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  body: string;
  metaTitle: string | null;
  metaDescription: string | null;
  publishedAt: string | null;
  views: number;
  _count: { comments: number };
  createdAt: string;
  updatedAt: string;
};

function toDateOnly(d: string | Date | null): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toISOString().slice(0, 16);
}

export default function AdminBlogPage() {
  const [posts, setPosts] = useState<BlogPostRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editPost, setEditPost] = useState<BlogPostRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [formSlug, setFormSlug] = useState("");
  const [formTitle, setFormTitle] = useState("");
  const [formExcerpt, setFormExcerpt] = useState("");
  const [formBody, setFormBody] = useState("");
  const [formMetaTitle, setFormMetaTitle] = useState("");
  const [formMetaDescription, setFormMetaDescription] = useState("");
  const [formPublishedAt, setFormPublishedAt] = useState("");

  const fetchPosts = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/blog");
      if (res.ok) {
        const data = await res.json();
        setPosts(data);
      }
    } catch {
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  function openCreate() {
    setFormSlug("");
    setFormTitle("");
    setFormExcerpt("");
    setFormBody("");
    setFormMetaTitle("");
    setFormMetaDescription("");
    setFormPublishedAt("");
    setCreateOpen(true);
  }

  function openEdit(p: BlogPostRow) {
    setEditPost(p);
    setFormSlug(p.slug);
    setFormTitle(p.title);
    setFormExcerpt(p.excerpt ?? "");
    setFormBody(p.body);
    setFormMetaTitle(p.metaTitle ?? "");
    setFormMetaDescription(p.metaDescription ?? "");
    setFormPublishedAt(p.publishedAt ? toDateOnly(p.publishedAt) : "");
    setCreateOpen(false);
  }

  function closeModals() {
    setCreateOpen(false);
    setEditPost(null);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!formSlug.trim() || !formTitle.trim() || !formBody.trim()) {
      toast.error("Slug, title and body are required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/blog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: formSlug.trim().toLowerCase().replace(/\s+/g, "-"),
          title: formTitle.trim(),
          excerpt: formExcerpt.trim() || null,
          body: formBody.trim(),
          metaTitle: formMetaTitle.trim() || null,
          metaDescription: formMetaDescription.trim() || null,
          publishedAt: formPublishedAt ? new Date(formPublishedAt).toISOString() : null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Failed to create post");
        setSaving(false);
        return;
      }
      toast.success("Post created");
      closeModals();
      fetchPosts();
    } catch {
      toast.error("Something went wrong");
    }
    setSaving(false);
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
      const res = await fetch(`/api/admin/blog/${editPost.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: formSlug.trim().toLowerCase().replace(/\s+/g, "-"),
          title: formTitle.trim(),
          excerpt: formExcerpt.trim() || null,
          body: formBody.trim(),
          metaTitle: formMetaTitle.trim() || null,
          metaDescription: formMetaDescription.trim() || null,
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
      const res = await fetch(`/api/admin/blog/${p.id}`, { method: "DELETE" });
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
          className="admin-input"
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
          className="admin-input"
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
          className="admin-input"
        />
      </div>
      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden [&_.quill]:bg-white/5 [&_.ql-toolbar]:border-none [&_.ql-toolbar]:border-b [&_.ql-toolbar]:border-white/10 [&_.ql-container]:border-none [&_.ql-editor]:min-h-[200px] [&_.ql-editor]:text-[var(--cream)] [&_.ql-editor]:text-sm [&_.ql-stroke]:stroke-white [&_.ql-fill]:fill-white [&_.ql-picker]:text-white">
        <label className="mb-1 block text-xs font-medium text-[var(--cream-muted)] px-3 pt-3">Body *</label>
        <ReactQuill 
          theme="snow" 
          value={formBody} 
          onChange={setFormBody}
          placeholder="Professional rich text content..."
        />
      </div>
      <div className="rounded-xl border border-[var(--accent)]/30 bg-[var(--accent)]/5 p-3">
        <p className="mb-2 text-xs font-semibold text-[var(--cream)]">SEO</p>
        <div className="space-y-2">
          <div>
            <label className="mb-0.5 block text-xs text-[var(--cream-muted)]">Meta title</label>
            <input
              type="text"
              value={formMetaTitle}
              onChange={(e) => setFormMetaTitle(e.target.value)}
              placeholder="Optional – for search results"
              maxLength={100}
              className="w-full rounded-lg border border-white/10 bg-black/40 px-2.5 py-2 text-sm text-[var(--cream)] placeholder:text-[var(--cream-muted)]/60 focus:border-[var(--accent)]/70 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-0.5 block text-xs text-[var(--cream-muted)]">Meta description</label>
            <textarea
              value={formMetaDescription}
              onChange={(e) => setFormMetaDescription(e.target.value)}
              placeholder="Optional – for search results"
              maxLength={500}
              rows={2}
              className="w-full rounded-lg border border-white/10 bg-black/40 px-2.5 py-2 text-sm text-[var(--cream)] placeholder:text-[var(--cream-muted)]/60 focus:border-[var(--accent)]/70 focus:outline-none"
            />
          </div>
        </div>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-[var(--cream-muted)]">Publish at (leave empty = draft)</label>
        <input
          type="datetime-local"
          value={formPublishedAt}
          onChange={(e) => setFormPublishedAt(e.target.value)}
          className="admin-input"
        />
      </div>
    </>
  );

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--cream)] md:text-3xl">
            Blog (SEO)
          </h1>
          <p className="mt-1 text-sm text-[var(--cream-muted)]">
            Create, edit and delete blog posts with SEO meta title and description.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-medium text-[var(--cream-muted)] transition hover:bg-white/10 hover:text-[var(--cream)]"
          >
            View blog
          </Link>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[var(--ink)] shadow-lg transition hover:bg-[var(--accent-hover)]"
          >
            <Plus className="h-4 w-4" />
            Create post
          </button>
        </div>
      </div>

      {loading ? (
        <p className="rounded-2xl border border-white/10 bg-black/20 px-6 py-8 text-center text-sm text-[var(--cream-muted)]">
          Loading…
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
                <th className="py-2 pr-3 font-medium text-[var(--cream-muted)]">Engagement</th>
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
                    <div className="flex items-center gap-3 text-xs text-[var(--cream-muted)]">
                      <span className="flex items-center gap-1" title="Views">
                        <Eye className="h-3 w-3" /> {p.views}
                      </span>
                      <span className="flex items-center gap-1" title="Comments">
                        <MessageSquare className="h-3 w-3" /> {p._count.comments}
                      </span>
                    </div>
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

      <Modal isOpen={createOpen} title="Create post" onClose={closeModals} className="max-w-4xl">
        <form onSubmit={handleCreate} className="space-y-4">
          {formFields}
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

      <Modal isOpen={!!editPost} title="Edit post" onClose={closeModals} className="max-w-4xl">
        {editPost && (
          <form onSubmit={handleUpdate} className="space-y-4">
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
