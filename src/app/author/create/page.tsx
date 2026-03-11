"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Search } from "lucide-react";
import { AuthorBlogEditor } from "@/components/AuthorBlogEditor";
import toast from "react-hot-toast";

type AuthorProfile = {
  id: string;
  name: string;
  slug: string;
  bio: string | null;
  imageUrl: string | null;
  _count: { posts: number };
};

export default function AuthorCreatePostPage() {
  const router = useRouter();
  const [author, setAuthor] = useState<AuthorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formSlug, setFormSlug] = useState("");
  const [formTitle, setFormTitle] = useState("");
  const [formExcerpt, setFormExcerpt] = useState("");
  const [formBody, setFormBody] = useState("");
  const [formMetaTitle, setFormMetaTitle] = useState("");
  const [formMetaDescription, setFormMetaDescription] = useState("");
  const [formCustomCss, setFormCustomCss] = useState("");
  const [formPublishedAt, setFormPublishedAt] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/author/me");
        if (cancelled) return;
        if (res.ok) {
          const data = await res.json();
          setAuthor(data);
        } else {
          setAuthor(null);
        }
      } catch {
        if (!cancelled) setAuthor(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formSlug.trim() || !formTitle.trim() || !formBody.trim()) {
      toast.error("Slug, title and body are required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/author/posts", {
        method: "POST",
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
        toast.error(data.error ?? "Failed to create post");
        setSaving(false);
        return;
      }
      toast.success("Post created");
      setSaving(false);
      router.push("/author");
    } catch {
      toast.error("Something went wrong");
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm text-[var(--cream-muted)]">Loading…</p>
      </div>
    );
  }

  if (!author) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-6 py-8 text-center">
          <p className="text-sm font-medium text-amber-200">No author profile linked</p>
          <p className="mt-2 text-xs text-[var(--cream-muted)]">
            Your account is not linked to an author profile. Contact admin to get author access.
          </p>
          <Link href="/author" className="mt-4 inline-block text-sm text-[var(--accent)] hover:underline">
            ← Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-b border-white/10 px-4 py-3">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4">
          <Link
            href="/author"
            className="inline-flex items-center gap-2 text-sm text-[var(--cream-muted)] transition hover:text-[var(--cream)]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to My Posts
          </Link>
          <h1 className="text-lg font-semibold text-[var(--cream)]">Create blog post</h1>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => router.push("/author")}
              className="rounded-xl border border-white/10 px-4 py-2 text-sm text-[var(--cream)] hover:bg-white/5"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="author-create-form"
              disabled={saving}
              className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--ink)] disabled:opacity-70"
            >
              {saving ? "Saving…" : "Publish / Save draft"}
            </button>
          </div>
        </div>
      </div>

      <form
        id="author-create-form"
        onSubmit={handleSubmit}
        className="flex-1 overflow-y-auto"
      >
        <div className="mx-auto max-w-4xl space-y-6 px-4 py-6">
          <div className="grid gap-4 sm:grid-cols-2">
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
              <label className="mb-1 block text-xs font-medium text-[var(--cream-muted)]">Publish at (leave empty = draft)</label>
              <input
                type="datetime-local"
                value={formPublishedAt}
                onChange={(e) => setFormPublishedAt(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-[var(--cream)] focus:border-[var(--accent)]/70 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--cream-muted)]">Title *</label>
            <input
              type="text"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="Post title"
              className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-lg text-[var(--cream)] placeholder:text-[var(--cream-muted)]/60 focus:border-[var(--accent)]/70 focus:outline-none"
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
              minHeight="min(60vh, 600px)"
              placeholder="Write your post. Use the toolbar to add links (nofollow/dofollow), images, buttons, code blocks, and video."
            />
          </div>

          <div className="rounded-xl border-2 border-[var(--accent)]/40 bg-[var(--accent)]/10 p-4">
            <p className="mb-1 flex items-center gap-2 text-sm font-semibold text-[var(--cream)]">
              <Search className="h-4 w-4 text-[var(--accent)]" />
              SEO (search engines)
            </p>
            <p className="mb-3 text-[10px] text-[var(--cream-muted)]">Meta title & description show in search results.</p>
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
                  placeholder="Short summary for search results."
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
              placeholder="e.g. p { margin: 1em 0; } — full rules, scoped to this post. No script/expression."
              rows={4}
              className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 font-mono text-xs text-[var(--cream)] placeholder:text-[var(--cream-muted)]/60 focus:border-[var(--accent)]/70 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 border-t border-white/10 pt-6">
            <button
              type="button"
              onClick={() => router.push("/author")}
              className="rounded-xl border border-white/10 px-4 py-2 text-sm text-[var(--cream)] hover:bg-white/5"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--ink)] disabled:opacity-70"
            >
              {saving ? "Saving…" : "Publish / Save draft"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
