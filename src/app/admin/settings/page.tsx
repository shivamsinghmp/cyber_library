"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Settings, ChevronLeft, Copy, Check,
  MessageCircle, Calendar, Lock, Globe,
  BarChart2, ImageIcon, Bell, Mail,
} from "lucide-react";

type EnvGroup = {
  title: string;
  icon: React.ReactNode;
  vars: { key: string; example: string; note?: string; secret?: boolean }[];
};

const ENV_GROUPS: EnvGroup[] = [
  {
    title: "Core (always required)",
    icon: <Lock className="h-4 w-4" />,
    vars: [
      { key: "DATABASE_URL",     example: "postgresql://user:pass@localhost:5432/cyber", secret: true },
      { key: "AUTH_SECRET",      example: "min-32-char-random-string",                  secret: true },
      { key: "ENCRYPTION_KEY",   example: "min-16-char-key-for-DB-secrets",             secret: true },
    ],
  },
  {
    title: "WhatsApp (Meta Business API)",
    icon: <MessageCircle className="h-4 w-4" />,
    vars: [
      { key: "WHATSAPP_PHONE_NUMBER_ID", example: "1073759989161284" },
      { key: "WHATSAPP_ACCESS_TOKEN",    example: "EAAxxxxx...",        secret: true },
      { key: "WHATSAPP_GROUP_LINK",      example: "https://chat.whatsapp.com/xxx" },
    ],
  },
  {
    title: "Google Calendar",
    icon: <Calendar className="h-4 w-4" />,
    vars: [
      { key: "GOOGLE_SERVICE_ACCOUNT_EMAIL", example: "myapp@myproject.iam.gserviceaccount.com" },
      { key: "GOOGLE_PRIVATE_KEY",           example: "-----BEGIN PRIVATE KEY-----\\n...", secret: true },
      { key: "GOOGLE_CALENDAR_ID",           example: "primary or xxx@group.calendar.google.com" },
    ],
  },
  {
    title: "Google OAuth",
    icon: <Globe className="h-4 w-4" />,
    vars: [
      { key: "AUTH_GOOGLE_ID",     example: "123456789-xxx.apps.googleusercontent.com" },
      { key: "AUTH_GOOGLE_SECRET", example: "GOCSPX-xxx",  secret: true },
      { key: "NEXTAUTH_URL",       example: "https://yourdomain.com", note: "Production URL only" },
    ],
  },
  {
    title: "Razorpay & Payments",
    icon: <Lock className="h-4 w-4" />,
    vars: [
      { key: "RAZORPAY_KEY_ID",     example: "rzp_live_xxx" },
      { key: "RAZORPAY_KEY_SECRET", example: "xxx",          secret: true },
    ],
  },
  {
    title: "Email (SMTP / Resend)",
    icon: <Mail className="h-4 w-4" />,
    vars: [
      { key: "RESEND_API_KEY",  example: "re_xxx",                  secret: true },
      { key: "RESEND_FROM",     example: "no-reply@cyberlib.in" },
      { key: "SMTP_HOST",       example: "smtp.gmail.com",          note: "Optional — if using SMTP" },
      { key: "SMTP_PORT",       example: "587" },
      { key: "SMTP_USER",       example: "you@gmail.com" },
      { key: "SMTP_PASS",       example: "app-password",            secret: true },
      { key: "SMTP_FROM",       example: "CyberLib <you@gmail.com>" },
    ],
  },
  {
    title: "SMS (Fast2SMS)",
    icon: <MessageCircle className="h-4 w-4" />,
    vars: [
      { key: "FAST2SMS_API_KEY", example: "xxx", secret: true },
    ],
  },
  {
    title: "Cron Jobs",
    icon: <Lock className="h-4 w-4" />,
    vars: [
      { key: "CRON_SECRET", example: "random-secret-for-cron-auth", secret: true },
    ],
  },
  {
    title: "Announcement & Support",
    icon: <Bell className="h-4 w-4" />,
    vars: [
      { key: "ANNOUNCEMENT",           example: "🚀 New feature launched! Check it out." },
      { key: "SUPPORT_WHATSAPP_NUMBER", example: "919876543210" },
      { key: "SUPPORT_EMAIL",           example: "support@cyberlib.in" },
    ],
  },
  {
    title: "Site / Branding",
    icon: <ImageIcon className="h-4 w-4" />,
    vars: [
      { key: "SITE_TITLE",       example: "The Cyber Library" },
      { key: "SITE_TAGLINE",     example: "Live 24/7 Focus Hub & Study Rooms" },
      { key: "SITE_HEADLINE",    example: "Study Smarter. Together." },
      { key: "SITE_LOGO_URL",    example: "https://cdn.example.com/logo.svg", note: "Leave empty for /logo.svg" },
      { key: "SITE_FAVICON_URL", example: "https://cdn.example.com/favicon.ico" },
    ],
  },
  {
    title: "Integrations & Tracking",
    icon: <BarChart2 className="h-4 w-4" />,
    vars: [
      { key: "GOOGLE_ANALYTICS_ID",   example: "G-XXXXXXXXXX" },
      { key: "GOOGLE_TAG_MANAGER_ID", example: "GTM-XXXXXXX" },
      { key: "GOOGLE_ADSENSE_ID",     example: "pub-XXXXXXXXXXXXXXXX" },
      { key: "FB_PIXEL_ID",           example: "1234567890" },
      { key: "CUSTOM_HEAD_HTML",      example: "<script>...</script>", note: "Custom scripts in <head>" },
    ],
  },
];

function buildEnvExample(): string {
  return ENV_GROUPS.map((g) =>
    `# ── ${g.title} ──\n` +
    g.vars.map((v) => `${v.key}=${v.secret ? `"${v.example}"` : v.example}`).join("\n")
  ).join("\n\n");
}

export default function AdminSettingsPage() {
  const [copied, setCopied] = useState(false);

  function copyTemplate() {
    navigator.clipboard.writeText(buildEnvExample());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-6">
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
          Saari settings ab <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs text-gray-900">.env</code> se padhi jaati hain. Koi bhi value change karne ke liye <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs text-gray-900">.env</code> update karein aur server restart karein.
        </p>
      </div>

      {/* Info banner */}
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm">
        <p className="font-semibold text-amber-900">Razorpay & SMTP</p>
        <p className="mt-0.5 text-amber-800">
          Razorpay aur SMTP keys bhi .env mein rakho. Preview/test ke liye:{" "}
          <Link href="/admin/razorpay" className="font-semibold underline hover:text-amber-900">
            Razorpay / SMTP page
          </Link>
        </p>
      </div>

      {/* Copy .env template */}
      <div className="rounded-2xl border border-[var(--border)] bg-white p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-[var(--foreground)] uppercase tracking-wider">.env Template</h2>
          <button
            onClick={copyTemplate}
            className="flex items-center gap-1.5 rounded-xl border border-[var(--border)] px-3 py-1.5 text-xs font-semibold text-[var(--foreground)] hover:bg-[var(--background)] transition-colors"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Copied!" : "Copy all"}
          </button>
        </div>
        <pre className="overflow-x-auto rounded-xl bg-gray-950 p-4 text-[11px] leading-relaxed text-gray-300 font-mono max-h-60">
          {buildEnvExample()}
        </pre>
      </div>

      {/* Groups */}
      {ENV_GROUPS.map((group) => (
        <div key={group.title} className="rounded-2xl border border-[var(--border)] bg-white overflow-hidden">
          <div className="flex items-center gap-2 border-b border-[var(--border)] bg-[var(--background)] px-5 py-3">
            <span className="text-[var(--accent)]">{group.icon}</span>
            <h2 className="text-sm font-bold text-[var(--foreground)]">{group.title}</h2>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {group.vars.map((v) => (
              <div key={v.key} className="flex items-start gap-4 px-5 py-3">
                <code className="shrink-0 rounded-lg bg-gray-100 px-2 py-1 font-mono text-xs text-gray-900 mt-0.5">
                  {v.key}
                </code>
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-xs text-[var(--cream-muted)] truncate">
                    {v.secret ? <span className="text-amber-600">secret — encrypt karo, .env mein rakho</span> : v.example}
                  </p>
                  {v.note && <p className="mt-0.5 text-[10px] text-[var(--cream-muted)] opacity-70">{v.note}</p>}
                </div>
                {v.secret && (
                  <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700 uppercase tracking-wide">
                    secret
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      <p className="text-center text-xs text-[var(--cream-muted)] pb-4">
        .env mein set karne ke baad <code className="rounded bg-gray-100 px-1 font-mono">npm run dev</code> / server restart zaroori hai.
        Values env se na milein to DB fallback hota hai (purana behavior).
      </p>
    </div>
  );
}
