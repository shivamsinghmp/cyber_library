"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import "react-quill-new/dist/quill.snow.css";
import {
  ChevronLeft, Save, Eye, Globe, FileText,
  Image, Search, Clock, Loader2, ExternalLink,
  AlertCircle, CheckCircle2,
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

const ReactQuill = dynamic(() => import("react-quill-new"), { ssr: false });

type PostData = {
  id?: string;
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  coverImage: string;
  metaTitle: string;
  metaDescription: string;
  publishedAt: string;
};

const EMPTY: PostData = {
  slug: "", title: "", excerpt: "", body: "",
  coverImage: "", metaTitle: "", metaDescription: "", publishedAt: "",
};

const QUILL_MODULES = {
  toolbar: [
    [{ header: [1, 2, 3, 4, false] }],
    ["bold", "italic", "underline", "strike"],
    [{ color: [] }, { background: [] }],
    [{ list: "ordered" }, { list: "bullet" }],
    [{ indent: "-1" }, { indent: "+1" }],
    ["blockquote", "code-block"],
    ["link", "image", "video"],
    ["clean"],
  ],
};

const QUILL_FORMATS = [
  "header", "bold", "italic", "underline", "strike",
  "color", "background", "list", "indent",
  "blockquote", "code-block", "link", "image", "video",
];

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-");
}

function readingTime(html: string) {
  const text = html.replace(/<[^>]+>/g, " ");
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

type Props = {
  postId?: string; // undefined = new post
};

export function BlogCmsEditor({ postId }: Props) {
  const router = useRouter();
  const [form, setForm] = useState<PostData>(EMPTY);
  const [loading, setLoading] = useState(!!postId);
  const [saving, setSaving] = useState(false);
  const [slugManual, setSlugManual] = useState(false);
  const [activeTab, setActiveTab] = useState<"content" | "seo">("content");
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Load existing post
  useEffect(() => {
    if (!postId) return;
    fetch(`/api/admin/blog/${postId}`, { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (!d) { toast.error("Post not found"); router.push("/admin/blog"); return; }
        setForm({
          id: d.id,
          slug: d.slug ?? "",
          title: d.title ?? "",
          excerpt: d.excerpt ?? "",
          body: d.body ?? "",
          coverImage: d.coverImage ?? "",
          metaTitle: d.metaTitle ?? "",
          metaDescription: d.metaDescription ?? "",
          publishedAt: d.publishedAt ? new Date(d.publishedAt).toISOString().slice(0, 16) : "",
        });
        setSlugManual(true);
      })
      .catch(() => toast.error("Failed to load post"))
      .finally(() => setLoading(false));
  }, [postId, router]);

  // Auto-slug from title
  function handleTitleChange(val: string) {
    setForm((p) => ({
      ...p,
      title: val,
      slug: slugManual ? p.slug : slugify(val),
      metaTitle: p.metaTitle || val,
    }));
  }

  const set = useCallback((key: keyof PostData) => (val: string) => {
    setForm((p) => ({ ...p, [key]: val }));
  }, []);

  async function handleSave(publish?: boolean) {
    if (!form.title.trim()) { toast.error("Title is required"); return; }
    if (!form.slug.trim()) { toast.error("Slug is required"); return; }
    if (!form.body.replace(/<[^>]+>/g, "").trim()) { toast.error("Body cannot be empty"); return; }

    setSaving(true);
    try {
      const payload = {
        title: form.title,
        slug: form.slug,
        excerpt: form.excerpt || null,
        body: form.body,
        coverImage: form.coverImage || null,
        metaTitle: form.metaTitle || null,
        metaDescription: form.metaDescription || null,
        publishedAt: publish
          ? new Date().toISOString()
          : form.publishedAt
            ? new Date(form.publishedAt).toISOString()
            : null,
      };

      let res: Response;
      if (postId) {
        res = await fetch(`/api/admin/blog/${postId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("/api/admin/blog", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();
      if (!res.ok) {
        const err = typeof data.error === "object" ? JSON.stringify(data.error) : data.error;
        toast.error(err ?? "Save failed");
        return;
      }

      setLastSaved(new Date());
      toast.success(publish ? "Published!" : "Saved!");

      if (!postId) {
        router.replace(`/admin/blog/${data.id}/edit`);
      } else if (publish) {
        setForm((p) => ({ ...p, publishedAt: new Date().toISOString().slice(0, 16) }));
      }
    } catch {
      toast.error("Save failed");
    }
    setSaving(false);
  }

  const isPublished = !!form.publishedAt && new Date(form.publishedAt) <= new Date();
  const minRead = readingTime(form.body);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--accent)]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* ── Top Bar ── */}
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-[var(--border)] bg-white/95 px-6 py-3 backdrop-blur">
        <div className="flex items-center gap-3">
          <Link href="/admin/blog" className="flex items-center gap-1 text-sm text-[var(--cream-muted)] hover:text-[var(--accent)]">
            <ChevronLeft className="h-4 w-4" /> All Posts
          </Link>
          <span className="text-[var(--border)]">/</span>
          <span className="text-sm font-medium text-[var(--foreground)]">
            {postId ? "Edit Post" : "New Post"}
          </span>

          {/* Status pill */}
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold ${
            isPublished
              ? "bg-emerald-100 text-emerald-700"
              : "bg-amber-100 text-amber-700"
          }`}>
            {isPublished ? <><CheckCircle2 className="h-3 w-3" /> Published</> : <><AlertCircle className="h-3 w-3" /> Draft</>}
          </span>

          {lastSaved && (
            <span className="text-xs text-[var(--cream-muted)]">
              Saved {lastSaved.toLocaleTimeString()}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isPublished && (
            <a
              href={`/blog/${form.slug}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 rounded-xl border border-[var(--border)] px-3 py-1.5 text-xs font-semibold text-[var(--foreground)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
            >
              <ExternalLink className="h-3.5 w-3.5" /> View
            </a>
          )}
          <button
            onClick={() => handleSave(false)}
            disabled={saving}
            className="flex items-center gap-1.5 rounded-xl border border-[var(--border)] bg-white px-4 py-1.5 text-xs font-semibold text-[var(--foreground)] hover:bg-[var(--background)] disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Save Draft
          </button>
          {!isPublished && (
            <button
              onClick={() => handleSave(true)}
              disabled={saving}
              className="flex items-center gap-1.5 rounded-xl px-4 py-1.5 text-xs font-bold text-white disabled:opacity-60"
              style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}
            >
              <Globe className="h-3.5 w-3.5" /> Publish
            </button>
          )}
        </div>
      </div>

      {/* ── Body ── */}
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-0 lg:grid-cols-[1fr_320px]">

        {/* ── Left: Main Editor ── */}
        <div className="min-h-screen border-r border-[var(--border)] px-6 py-8 lg:px-10">

          {/* Cover image preview */}
          {form.coverImage && (
            <div className="mb-6 overflow-hidden rounded-2xl border border-[var(--border)]" style={{ height: 200 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={form.coverImage} alt="Cover" className="h-full w-full object-cover" />
            </div>
          )}

          {/* Title */}
          <textarea
            value={form.title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="Post title…"
            rows={2}
            className="mb-2 w-full resize-none border-0 bg-transparent text-4xl font-extrabold leading-tight text-[var(--foreground)] outline-none placeholder:text-[var(--border)]"
          />

          {/* Reading time */}
          <p className="mb-6 flex items-center gap-1.5 text-xs text-[var(--cream-muted)]">
            <Clock className="h-3.5 w-3.5" />
            ~{minRead} min read · {form.body.replace(/<[^>]+>/g, " ").trim().split(/\s+/).filter(Boolean).length} words
          </p>

          {/* Excerpt */}
          <textarea
            value={form.excerpt}
            onChange={(e) => set("excerpt")(e.target.value)}
            placeholder="Short excerpt / summary (shown in blog listing)…"
            rows={2}
            className="mb-6 w-full resize-none rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-2.5 text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--cream-muted)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
          />

          {/* Rich text editor */}
          <div className="blog-quill-wrapper rounded-xl border border-[var(--border)] overflow-hidden">
            <ReactQuill
              theme="snow"
              value={form.body}
              onChange={set("body")}
              modules={QUILL_MODULES}
              formats={QUILL_FORMATS}
              placeholder="Start writing your post…"
              style={{ minHeight: 500 }}
            />
          </div>
        </div>

        {/* ── Right: Sidebar ── */}
        <div className="px-5 py-6 space-y-5">

          {/* Tabs */}
          <div className="flex rounded-xl border border-[var(--border)] bg-[var(--background)] p-1">
            {(["content", "seo"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setActiveTab(t)}
                className={`flex-1 rounded-lg py-1.5 text-xs font-bold capitalize transition-all ${
                  activeTab === t
                    ? "bg-white shadow-sm text-[var(--foreground)]"
                    : "text-[var(--cream-muted)] hover:text-[var(--foreground)]"
                }`}
              >
                {t === "content" ? <><FileText className="mr-1 inline h-3 w-3" />Content</> : <><Search className="mr-1 inline h-3 w-3" />SEO</>}
              </button>
            ))}
          </div>

          {activeTab === "content" && (
            <>
              {/* Publish settings */}
              <section className="rounded-2xl border border-[var(--border)] bg-white p-4 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--cream-muted)]">Publish</h3>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-[var(--foreground)]">Status</span>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${isPublished ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                    {isPublished ? "Published" : "Draft"}
                  </span>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-[var(--cream-muted)]">Publish date & time</label>
                  <input
                    type="datetime-local"
                    value={form.publishedAt}
                    onChange={(e) => set("publishedAt")(e.target.value)}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-xs text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
                  />
                  <p className="mt-1 text-[10px] text-[var(--cream-muted)]">Leave empty for draft</p>
                </div>

                {isPublished && (
                  <button
                    onClick={() => set("publishedAt")("")}
                    className="w-full rounded-xl border border-red-200 bg-red-50 py-2 text-xs font-semibold text-red-600 hover:bg-red-100"
                  >
                    Unpublish (revert to draft)
                  </button>
                )}
              </section>

              {/* Slug */}
              <section className="rounded-2xl border border-[var(--border)] bg-white p-4 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--cream-muted)]">URL Slug</h3>
                <div>
                  <div className="flex items-center rounded-xl border border-[var(--border)] bg-[var(--background)] overflow-hidden">
                    <span className="bg-[var(--background)] px-3 py-2 text-xs text-[var(--cream-muted)] border-r border-[var(--border)]">/blog/</span>
                    <input
                      type="text"
                      value={form.slug}
                      onChange={(e) => { setSlugManual(true); set("slug")(e.target.value); }}
                      className="flex-1 bg-transparent px-3 py-2 text-xs text-[var(--foreground)] outline-none"
                      placeholder="your-post-slug"
                    />
                  </div>
                </div>
              </section>

              {/* Cover Image */}
              <section className="rounded-2xl border border-[var(--border)] bg-white p-4 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--cream-muted)]">
                  <Image className="inline mr-1 h-3 w-3" />Cover Image
                </h3>
                <input
                  type="url"
                  value={form.coverImage}
                  onChange={(e) => set("coverImage")(e.target.value)}
                  placeholder="https://…"
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-xs text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
                />
                {form.coverImage && (
                  <div className="overflow-hidden rounded-xl border border-[var(--border)]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={form.coverImage} alt="Preview" className="h-32 w-full object-cover" />
                  </div>
                )}
              </section>
            </>
          )}

          {activeTab === "seo" && (
            <>
              <section className="rounded-2xl border border-[var(--border)] bg-white p-4 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--cream-muted)]">SEO Settings</h3>

                {/* Preview */}
                <div className="rounded-xl bg-[var(--background)] p-3 space-y-0.5">
                  <p className="text-xs text-[#1a0dab] font-medium truncate">
                    {form.metaTitle || form.title || "Post Title"}
                  </p>
                  <p className="text-[10px] text-[#006621] truncate">
                    yoursite.com/blog/{form.slug || "slug"}
                  </p>
                  <p className="text-[10px] text-[#545454] line-clamp-2">
                    {form.metaDescription || form.excerpt || "Post description will appear here…"}
                  </p>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-[var(--foreground)]">
                    Meta Title <span className="text-[var(--cream-muted)]">({(form.metaTitle || form.title).length}/60)</span>
                  </label>
                  <input
                    type="text"
                    value={form.metaTitle}
                    onChange={(e) => set("metaTitle")(e.target.value)}
                    maxLength={60}
                    placeholder="SEO title (leave blank to use post title)"
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-xs text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-[var(--foreground)]">
                    Meta Description <span className="text-[var(--cream-muted)]">({form.metaDescription.length}/160)</span>
                  </label>
                  <textarea
                    value={form.metaDescription}
                    onChange={(e) => set("metaDescription")(e.target.value)}
                    maxLength={160}
                    rows={3}
                    placeholder="Short description for search engines…"
                    className="w-full resize-none rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-xs text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
                  />
                </div>
              </section>

              {/* SEO score */}
              <section className="rounded-2xl border border-[var(--border)] bg-white p-4 space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--cream-muted)]">SEO Checklist</h3>
                {[
                  { label: "Title set", ok: !!form.title.trim() },
                  { label: "Slug set", ok: !!form.slug.trim() },
                  { label: "Excerpt added", ok: !!form.excerpt.trim() },
                  { label: "Meta description", ok: !!form.metaDescription.trim() },
                  { label: "Cover image", ok: !!form.coverImage.trim() },
                  { label: "Body > 300 words", ok: form.body.replace(/<[^>]+>/g, " ").trim().split(/\s+/).filter(Boolean).length >= 300 },
                ].map(({ label, ok }) => (
                  <div key={label} className="flex items-center gap-2 text-xs">
                    <span className={`h-4 w-4 flex-shrink-0 rounded-full flex items-center justify-center text-[9px] font-bold ${ok ? "bg-emerald-100 text-emerald-700" : "bg-[var(--background)] text-[var(--cream-muted)]"}`}>
                      {ok ? "✓" : "○"}
                    </span>
                    <span className={ok ? "text-[var(--foreground)]" : "text-[var(--cream-muted)]"}>{label}</span>
                  </div>
                ))}
              </section>
            </>
          )}

          {/* Save button at bottom */}
          <button
            onClick={() => handleSave(false)}
            disabled={saving}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-white py-2.5 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--background)] disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Draft
          </button>
          {!isPublished && (
            <button
              onClick={() => handleSave(true)}
              disabled={saving}
              className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold text-white disabled:opacity-60"
              style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}
            >
              <Globe className="h-4 w-4" /> Publish Now
            </button>
          )}
        </div>
      </div>

      {/* Quill height fix */}
      <style>{`
        .blog-quill-wrapper .ql-editor { min-height: 500px; font-size: 16px; line-height: 1.75; }
        .blog-quill-wrapper .ql-toolbar { border-bottom: 1px solid var(--border); }
        .blog-quill-wrapper .ql-container { border: none; }
      `}</style>
    </div>
  );
}
