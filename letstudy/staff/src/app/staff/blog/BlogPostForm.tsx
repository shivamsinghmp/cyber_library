"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Save } from "lucide-react";
import toast from "react-hot-toast";

type BlogPostData = {
  id?: string;
  slug: string;
  title: string;
  excerpt: string | null;
  body: string;
  coverImage: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  publishedAt: string | null;
};

const EMPTY: BlogPostData = {
  slug: "", title: "", excerpt: "", body: "",
  coverImage: "", metaTitle: "", metaDescription: "", publishedAt: "",
};

export function BlogPostForm({ initial }: { initial?: BlogPostData }) {
  const router = useRouter();
  const isEdit = !!initial?.id;
  const [form, setForm] = useState<BlogPostData>(initial ?? EMPTY);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  function update<K extends keyof BlogPostData>(key: K, value: BlogPostData[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(publish: boolean) {
    setSaving(true);
    setErrors({});
    try {
      const payload = {
        ...form,
        publishedAt: publish ? (form.publishedAt || new Date().toISOString()) : null,
      };
      const url = isEdit ? `/api/staff/blog/${initial!.id}` : "/api/staff/blog";
      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (res.ok) {
        toast.success(isEdit ? "Post updated" : "Post created");
        router.push("/staff/blog");
      } else {
        if (json.error && typeof json.error === "object") setErrors(json.error);
        toast.error(typeof json.error === "string" ? json.error : "Failed to save post");
      }
    } catch {
      toast.error("Failed to save post");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-6">
      <div>
        <Link href="/staff/blog" className="inline-flex items-center gap-1 text-sm text-[var(--cream-muted)] hover:text-[var(--accent)]">
          <ChevronLeft className="h-4 w-4" /> Blog Posts
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-[var(--foreground)]">{isEdit ? "Edit Post" : "New Post"}</h1>
      </div>

      <div className="space-y-4 rounded-2xl border border-[var(--border)] bg-white p-6">
        <Field label="Title" error={errors.title}>
          <input
            value={form.title}
            onChange={(e) => update("title", e.target.value)}
            className="input"
            placeholder="How to ace your next exam"
          />
        </Field>

        <Field label="Slug" error={errors.slug}>
          <input
            value={form.slug}
            onChange={(e) => update("slug", e.target.value)}
            className="input"
            placeholder="how-to-ace-your-next-exam"
          />
        </Field>

        <Field label="Excerpt" error={errors.excerpt}>
          <textarea
            value={form.excerpt ?? ""}
            onChange={(e) => update("excerpt", e.target.value)}
            className="input min-h-[60px]"
            placeholder="Short summary shown in the blog listing"
          />
        </Field>

        <Field label="Body (HTML)" error={errors.body}>
          <textarea
            value={form.body}
            onChange={(e) => update("body", e.target.value)}
            className="input min-h-[280px] font-mono text-xs"
            placeholder="<p>Post content…</p>"
          />
        </Field>

        <Field label="Cover image URL" error={errors.coverImage}>
          <input
            value={form.coverImage ?? ""}
            onChange={(e) => update("coverImage", e.target.value)}
            className="input"
            placeholder="https://…"
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Meta title" error={errors.metaTitle}>
            <input
              value={form.metaTitle ?? ""}
              onChange={(e) => update("metaTitle", e.target.value)}
              className="input"
            />
          </Field>
          <Field label="Meta description" error={errors.metaDescription}>
            <input
              value={form.metaDescription ?? ""}
              onChange={(e) => update("metaDescription", e.target.value)}
              className="input"
            />
          </Field>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3">
        <button
          onClick={() => handleSubmit(false)}
          disabled={saving}
          className="rounded-xl border border-[var(--border)] bg-white px-5 py-2.5 text-sm font-bold text-[var(--foreground)] disabled:opacity-50"
        >
          Save as draft
        </button>
        <button
          onClick={() => handleSubmit(true)}
          disabled={saving}
          className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white shadow-sm disabled:opacity-50"
          style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}
        >
          <Save className="h-4 w-4" /> {isEdit ? "Update & Publish" : "Publish"}
        </button>
      </div>

      <style jsx global>{`
        .input {
          width: 100%;
          border-radius: 0.75rem;
          border: 1px solid var(--border);
          background: white;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          color: var(--foreground);
          outline: none;
        }
        .input:focus {
          border-color: var(--accent);
          box-shadow: 0 0 0 2px var(--accent-pale);
        }
      `}</style>
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string[]; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--cream-muted)]">{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs text-red-500">{error.join(", ")}</span>}
    </label>
  );
}
