"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ChevronLeft, ImageIcon, Save } from "lucide-react";
import toast from "react-hot-toast";

const BRANDING_KEYS = ["SITE_LOGO_URL", "SITE_FAVICON_URL", "SITE_TITLE", "SITE_TAGLINE", "SITE_HEADLINE", "FOOTER_TEXT"] as const;

const LABELS: Record<string, string> = {
  SITE_LOGO_URL: "Logo URL",
  SITE_FAVICON_URL: "Favicon URL",
  SITE_TITLE: "Site title",
  SITE_TAGLINE: "Tagline",
  SITE_HEADLINE: "Main headline (homepage hero)",
   FOOTER_TEXT: "Footer text",
};

export default function AdminVirtualLibraryPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({
    SITE_LOGO_URL: "",
    SITE_FAVICON_URL: "",
    SITE_TITLE: "",
    SITE_TAGLINE: "",
    SITE_HEADLINE: "",
    FOOTER_TEXT: "",
  });

  useEffect(() => {
    fetch("/api/admin/settings", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : {}))
      .then((data: Record<string, { value: string | null }>) => {
        const next: Record<string, string> = {};
          next[key] = data[key]?.value ?? ""
      .catch((e) => console.error("Fetch error:", e));

        });
        setValues(next);
      })
      .catch(() => toast.error("Could not load settings"))
      .finally(() => setLoading(false));
  }, []);

  function setValue(key: string, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await Promise.all(
        BRANDING_KEYS.map((key) =>
          fetch("/api/admin/settings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ key, value: values[key]?.trim() || null }),
          })
        )
      );
      toast.success("The Cyber Library settings saved");
    } catch {
      toast.error("Failed to save");
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <p className="text-[var(--cream-muted)]">Loading…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-6">
      <div>
        <Link
          href="/admin"
          className="inline-flex items-center gap-1 text-sm font-medium text-[var(--cream-muted)] hover:text-[var(--accent)]"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Admin
        </Link>
        <h1 className="mt-2 flex items-center gap-2 text-2xl font-bold text-[var(--cream)]">
          <ImageIcon className="h-7 w-7 text-[var(--accent)]" />
          Edit The Cyber Library
        </h1>
        <p className="mt-1 text-sm text-[var(--cream-muted)]">
          Logo, favicon, site title, tagline and main headline. Leave blank to use defaults.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-white/10 bg-black/20 p-6 space-y-5"
      >
        <div>
          <label className="mb-1.5 block text-xs font-medium text-[var(--cream-muted)]">
            {LABELS.SITE_LOGO_URL}
          </label>
          <input
            type="text"
            value={values.SITE_LOGO_URL}
            onChange={(e) => setValue("SITE_LOGO_URL", e.target.value)}
            placeholder="/logo.svg or https://..."
            className="admin-input"
          />
          <p className="mt-1 text-[10px] text-[var(--cream-muted)]">Shown in navbar, login, sidebar. Empty = /logo.svg</p>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-[var(--cream-muted)]">
            {LABELS.FOOTER_TEXT}
          </label>
          <textarea
            value={values.FOOTER_TEXT}
            onChange={(e) => setValue("FOOTER_TEXT", e.target.value)}
            placeholder="© 2026 The Cyber Library – The Focus Hub."
            rows={2}
            className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-[var(--cream)] placeholder:text-[var(--cream-muted)]/50 focus:border-[var(--accent)]/70 focus:outline-none resize-none"
          />
          <p className="mt-1 text-[10px] text-[var(--cream-muted)]">Shown at the very bottom of all public pages.</p>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-[var(--cream-muted)]">
            {LABELS.SITE_FAVICON_URL}
          </label>
          <input
            type="text"
            value={values.SITE_FAVICON_URL}
            onChange={(e) => setValue("SITE_FAVICON_URL", e.target.value)}
            placeholder="https://... or /favicon.ico"
            className="admin-input"
          />
          <p className="mt-1 text-[10px] text-[var(--cream-muted)]">Browser tab icon</p>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-[var(--cream-muted)]">
            {LABELS.SITE_TITLE}
          </label>
          <input
            type="text"
            value={values.SITE_TITLE}
            onChange={(e) => setValue("SITE_TITLE", e.target.value)}
            placeholder="The Cyber Library"
            className="admin-input"
          />
          <p className="mt-1 text-[10px] text-[var(--cream-muted)]">Browser title and name next to logo</p>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-[var(--cream-muted)]">
            {LABELS.SITE_TAGLINE}
          </label>
          <input
            type="text"
            value={values.SITE_TAGLINE}
            onChange={(e) => setValue("SITE_TAGLINE", e.target.value)}
            placeholder="The Focus Hub"
            className="admin-input"
          />
          <p className="mt-1 text-[10px] text-[var(--cream-muted)]">Line under the site name in navbar</p>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-[var(--cream-muted)]">
            {LABELS.SITE_HEADLINE}
          </label>
          <textarea
            value={values.SITE_HEADLINE}
            onChange={(e) => setValue("SITE_HEADLINE", e.target.value)}
            placeholder="Transform Your Study Habits with Live Body Doubling."
            rows={3}
            className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-[var(--cream)] placeholder:text-[var(--cream-muted)]/50 focus:border-[var(--accent)]/70 focus:outline-none resize-none"
          />
          <p className="mt-1 text-[10px] text-[var(--cream-muted)]">Big hero text on the homepage</p>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[var(--ink)] disabled:opacity-70"
          >
            <Save className="h-4 w-4" />
            {saving ? "Saving…" : "Save"}
          </button>
          <Link
            href="/admin"
            className="rounded-xl border border-white/10 px-4 py-2.5 text-sm text-[var(--cream)] hover:bg-white/5"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
