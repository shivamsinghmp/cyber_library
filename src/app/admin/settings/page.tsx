"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Settings,
  ChevronLeft,
  MessageCircle,
  Calendar,
  Lock,
  Mail,
  Save,
  ImageIcon,
} from "lucide-react";
import toast from "react-hot-toast";

type KeyMeta = { label: string; secret: boolean; value: string | null; hasValue: boolean };
type SettingsMap = Record<string, KeyMeta>;

const SECTIONS: { title: string; keys: string[]; icon: React.ReactNode }[] = [
  {
    title: "WhatsApp",
    keys: ["WHATSAPP_PHONE_NUMBER_ID", "WHATSAPP_ACCESS_TOKEN", "WHATSAPP_GROUP_LINK"],
    icon: <MessageCircle className="h-5 w-5" />,
  },
  {
    title: "Google Calendar",
    keys: ["GOOGLE_SERVICE_ACCOUNT_EMAIL", "GOOGLE_PRIVATE_KEY", "GOOGLE_CALENDAR_ID"],
    icon: <Calendar className="h-5 w-5" />,
  },
  {
    title: "Cron",
    keys: ["CRON_SECRET"],
    icon: <Lock className="h-5 w-5" />,
  },
  {
    title: "Auth (Google OAuth & URL)",
    keys: ["AUTH_GOOGLE_ID", "AUTH_GOOGLE_SECRET", "NEXTAUTH_URL"],
    icon: <Mail className="h-5 w-5" />,
  },
  {
    title: "Announcement & Support",
    keys: ["ANNOUNCEMENT", "SUPPORT_WHATSAPP_NUMBER", "SUPPORT_EMAIL"],
    icon: <MessageCircle className="h-5 w-5" />,
  },
  {
    title: "Site / Branding",
    keys: ["SITE_LOGO_URL", "SITE_FAVICON_URL", "SITE_TITLE", "SITE_TAGLINE", "SITE_HEADLINE"],
    icon: <ImageIcon className="h-5 w-5" />,
  },
];

export default function AdminSettingsPage() {
  const [data, setData] = useState<SettingsMap>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [dirty, setDirty] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch("/api/admin/settings", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : {}))
      .then((map: SettingsMap) => setData(map))
      .catch(() => setData({}))
      .finally(() => setLoading(false));
  }, []);

  function getValue(key: string): string {
    if (dirty[key] !== undefined) return dirty[key];
    const meta = data[key];
    if (meta?.secret) return "";
    return meta?.value ?? "";
  }

  function setValue(key: string, value: string) {
    setDirty((prev) => ({ ...prev, [key]: value }));
  }

  async function saveKey(key: string) {
    const meta = data[key];
    const raw = getValue(key).trim();
    if (meta?.secret && meta.hasValue && !raw) {
      toast.success("Left blank — existing value kept.");
      return;
    }
    setSaving(key);
    try {
      const value = raw || null;
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value: value || null }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(json.error ?? "Save failed");
        setSaving(null);
        return;
      }
      toast.success("Saved. Secrets are stored encrypted in DB.");
      setDirty((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      setData((prev) => ({
        ...prev,
        [key]: {
          ...prev[key],
          value: value ?? null,
          hasValue: !!value,
        },
      }));
    } catch {
      toast.error("Save failed");
    }
    setSaving(null);
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 px-4 py-6">
        <p className="text-[var(--cream-muted)]">Loading settings…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-4 py-6">
      <div>
        <Link
          href="/admin"
          className="inline-flex items-center gap-1 text-sm font-medium text-[var(--cream-muted)] hover:text-[var(--accent)]"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Admin
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-[var(--cream)] flex items-center gap-2">
          <Settings className="h-7 w-7 text-[var(--accent)]" />
          Settings
        </h1>
        <p className="mt-1 text-sm text-[var(--cream-muted)]">
          Saari API keys, secrets, WhatsApp, Google Calendar — sab database mein save hota hai. .env ki zaroorat sirf DATABASE_URL aur AUTH_SECRET / ENCRYPTION_KEY ki hai.
        </p>
      </div>

      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-[var(--cream)]">
        <p className="font-medium">Razorpay & SMTP</p>
        <p className="mt-1 text-[var(--cream-muted)]">
          Razorpay API keys aur SMTP (email) yahan se set karein:{" "}
          <Link href="/admin/razorpay" className="text-[var(--accent)] hover:underline">
            Razorpay / SMTP page
          </Link>
        </p>
      </div>

      {SECTIONS.map((section) => (
        <div
          key={section.title}
          className="rounded-2xl border border-white/10 bg-black/30 p-4 md:p-6"
        >
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-[var(--cream)]">
            {section.icon}
            {section.title}
          </h2>
          <div className="space-y-4">
            {section.keys.map((key) => {
              const meta = data[key];
              if (!meta) return null;
              const isSecret = meta.secret;
              const value = getValue(key);
              const hasValue = meta.hasValue;
              return (
                <div key={key} className="space-y-1.5">
                  <label className="block text-xs font-medium text-[var(--cream-muted)]">
                    {meta.label}
                    {hasValue && isSecret && (
                      <span className="ml-2 text-emerald-400">(set • masked)</span>
                    )}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type={isSecret ? "password" : "text"}
                      value={value}
                      onChange={(e) => setValue(key, e.target.value)}
                      placeholder={isSecret ? (hasValue ? "•••••••• (leave blank to keep)" : "Enter secret") : "Value"}
                      className="flex-1 rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-[var(--cream)] placeholder:text-[var(--cream-muted)]/50"
                    />
                    <button
                      type="button"
                      onClick={() => saveKey(key)}
                      disabled={saving === key}
                      className="flex items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[var(--ink)] hover:opacity-90 disabled:opacity-50"
                    >
                      <Save className="h-4 w-4" />
                      {saving === key ? "Saving…" : "Save"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <p className="text-xs text-[var(--cream-muted)]">
        ENCRYPTION_KEY ya AUTH_SECRET .env mein hona chahiye (min 16 chars) taaki secrets encrypt ho kar DB mein save hon. Pehle .env mein ye set karein, phir yahan se baaki sab.
      </p>
    </div>
  );
}
