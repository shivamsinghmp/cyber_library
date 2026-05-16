"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  CreditCard, ExternalLink, CheckCircle, AlertCircle,
  Mail, Copy, Check, ChevronLeft,
} from "lucide-react";

type RazorpayStatus = { configured: boolean };
type SmtpStatus = { host: string | null; port: number | null; user: string | null; from: string | null; hasPass: boolean };

function CopyBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="relative group">
      <pre className="overflow-x-auto rounded-xl bg-gray-950 p-4 text-[11px] leading-relaxed text-gray-300 font-mono">
        {code}
      </pre>
      <button
        onClick={() => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
        className="absolute right-3 top-3 flex items-center gap-1 rounded-lg bg-gray-800 px-2 py-1 text-[10px] font-semibold text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-700"
      >
        {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

export default function AdminRazorpayPage() {
  const [rzpStatus, setRzpStatus] = useState<RazorpayStatus | null>(null);
  const [smtpStatus, setSmtpStatus] = useState<SmtpStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/razorpay/status", { credentials: "include" })
        .then((r) => r.ok ? r.json() : null)
        .catch(() => null),
      fetch("/api/admin/smtp/settings", { credentials: "include" })
        .then((r) => r.ok ? r.json() : null)
        .catch(() => null),
    ]).then(([rzp, smtp]) => {
      setRzpStatus(rzp);
      setSmtpStatus(smtp);
    }).finally(() => setLoading(false));
  }, []);

  const rzpConfigured = rzpStatus?.configured === true;
  const smtpConfigured = !!(smtpStatus?.host && smtpStatus?.user);

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-4 py-6">
      <div>
        <Link href="/admin" className="inline-flex items-center gap-1 text-sm font-medium text-[var(--cream-muted)] hover:text-[var(--accent)]">
          <ChevronLeft className="h-4 w-4" /> Back to Admin
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-[var(--cream)] flex items-center gap-2">
          <CreditCard className="h-7 w-7 text-[var(--accent)]" />
          Razorpay & SMTP
        </h1>
        <p className="mt-1 text-sm text-[var(--cream-muted)]">
          Yeh keys ab <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs text-gray-900">.env</code> mein set hoti hain. Neeche wale variables apni <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs text-gray-900">.env</code> file mein add karein.
        </p>
      </div>

      {/* ── Razorpay Status ── */}
      <div className={`flex items-center gap-3 rounded-2xl border p-4 ${
        loading ? "border-gray-200 bg-gray-50"
        : rzpConfigured ? "border-emerald-300 bg-emerald-50"
        : "border-amber-300 bg-amber-50"
      }`}>
        {loading ? (
          <span className="text-sm text-[var(--cream-muted)]">Checking…</span>
        ) : rzpConfigured ? (
          <>
            <CheckCircle className="h-5 w-5 shrink-0 text-emerald-600" />
            <div>
              <p className="font-semibold text-gray-900">Razorpay configured ✓</p>
              <p className="text-xs text-[var(--cream-muted)]">Keys set hain — checkout payments kaam karenge.</p>
            </div>
          </>
        ) : (
          <>
            <AlertCircle className="h-5 w-5 shrink-0 text-amber-600" />
            <div>
              <p className="font-semibold text-gray-900">Razorpay not configured</p>
              <p className="text-xs text-[var(--cream-muted)]">
                <code className="font-mono text-xs">RAZORPAY_KEY_ID</code> aur <code className="font-mono text-xs">RAZORPAY_KEY_SECRET</code> .env mein add karein.
              </p>
            </div>
          </>
        )}
      </div>

      {/* ── Razorpay .env ── */}
      <div className="rounded-2xl border border-[var(--border)] bg-white overflow-hidden">
        <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--background)] px-5 py-3">
          <h2 className="flex items-center gap-2 text-sm font-bold text-[var(--foreground)]">
            <CreditCard className="h-4 w-4 text-[var(--accent)]" />
            Razorpay API Keys
          </h2>
          <a
            href="https://dashboard.razorpay.com/app/keys"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs font-semibold text-[var(--accent)] hover:underline"
          >
            Get keys <ExternalLink className="h-3 w-3" />
          </a>
        </div>
        <div className="p-5 space-y-4">
          <div className="divide-y divide-[var(--border)] rounded-xl border border-[var(--border)]">
            {[
              { key: "RAZORPAY_KEY_ID",     example: "rzp_live_xxxxxxxxxxxxxxxx",     secret: false, note: "rzp_test_... for test mode" },
              { key: "RAZORPAY_KEY_SECRET",  example: "your_key_secret_here",          secret: true,  note: "Never share — stored in .env only" },
            ].map((v) => (
              <div key={v.key} className="flex items-start gap-3 px-4 py-3">
                <code className="shrink-0 rounded-lg bg-gray-100 px-2 py-1 font-mono text-xs text-gray-900 mt-0.5">{v.key}</code>
                <div className="flex-1 min-w-0">
                  {v.secret
                    ? <p className="text-xs text-amber-600 font-medium">secret — .env mein rakho</p>
                    : <p className="font-mono text-xs text-[var(--cream-muted)]">{v.example}</p>
                  }
                  {v.note && <p className="mt-0.5 text-[10px] text-[var(--cream-muted)] opacity-70">{v.note}</p>}
                </div>
                {v.secret && <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700 uppercase tracking-wide">secret</span>}
              </div>
            ))}
          </div>
          <CopyBlock code={`RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxxxxxxxx\nRAZORPAY_KEY_SECRET="your_key_secret_here"`} />
        </div>
      </div>

      {/* ── SMTP Status ── */}
      <div className={`flex items-center gap-3 rounded-2xl border p-4 ${
        loading ? "border-gray-200 bg-gray-50"
        : smtpConfigured ? "border-emerald-300 bg-emerald-50"
        : "border-amber-300 bg-amber-50"
      }`}>
        {loading ? (
          <span className="text-sm text-[var(--cream-muted)]">Checking…</span>
        ) : smtpConfigured ? (
          <>
            <CheckCircle className="h-5 w-5 shrink-0 text-emerald-600" />
            <div>
              <p className="font-semibold text-gray-900">SMTP configured ✓</p>
              <p className="text-xs text-[var(--cream-muted)]">
                Host: <code className="font-mono text-xs">{smtpStatus?.host}</code> · User: <code className="font-mono text-xs">{smtpStatus?.user}</code> · From: <code className="font-mono text-xs">{smtpStatus?.from}</code>
              </p>
            </div>
          </>
        ) : (
          <>
            <AlertCircle className="h-5 w-5 shrink-0 text-amber-600" />
            <div>
              <p className="font-semibold text-gray-900">SMTP not configured</p>
              <p className="text-xs text-[var(--cream-muted)]">OTP aur email notifications kaam nahi karenge.</p>
            </div>
          </>
        )}
      </div>

      {/* ── SMTP .env ── */}
      <div className="rounded-2xl border border-[var(--border)] bg-white overflow-hidden">
        <div className="border-b border-[var(--border)] bg-[var(--background)] px-5 py-3">
          <h2 className="flex items-center gap-2 text-sm font-bold text-[var(--foreground)]">
            <Mail className="h-4 w-4 text-[var(--accent)]" />
            Email / SMTP
          </h2>
        </div>
        <div className="p-5 space-y-4">
          <div className="divide-y divide-[var(--border)] rounded-xl border border-[var(--border)]">
            {[
              { key: "SMTP_HOST", example: "smtp.resend.com",              secret: false },
              { key: "SMTP_PORT", example: "587",                           secret: false, note: "465 for SSL, 587 for TLS" },
              { key: "SMTP_USER", example: "resend",                        secret: false, note: "Resend ke liye 'resend'" },
              { key: "SMTP_FROM", example: "admin@cyberlib.in",             secret: false, note: "Ya: CyberLib <no-reply@cyberlib.in>" },
              { key: "SMTP_PASS", example: "re_xxxxxxxxxxxxxxxxxxxxxxxxxxxx", secret: true,  note: "Resend API key ya Gmail app password" },
            ].map((v) => (
              <div key={v.key} className="flex items-start gap-3 px-4 py-3">
                <code className="shrink-0 rounded-lg bg-gray-100 px-2 py-1 font-mono text-xs text-gray-900 mt-0.5">{v.key}</code>
                <div className="flex-1 min-w-0">
                  {v.secret
                    ? <p className="text-xs text-amber-600 font-medium">secret — .env mein rakho</p>
                    : <p className="font-mono text-xs text-[var(--cream-muted)]">{v.example}</p>
                  }
                  {v.note && <p className="mt-0.5 text-[10px] text-[var(--cream-muted)] opacity-70">{v.note}</p>}
                </div>
                {v.secret && <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700 uppercase tracking-wide">secret</span>}
              </div>
            ))}
          </div>

          {/* Resend example */}
          <div>
            <p className="mb-2 text-xs font-semibold text-[var(--cream-muted)] uppercase tracking-wider">Resend ke saath (.env example):</p>
            <CopyBlock code={`SMTP_HOST=smtp.resend.com\nSMTP_PORT=587\nSMTP_USER=resend\nSMTP_FROM=admin@cyberlib.in\nSMTP_PASS="re_xxxxxxxxxxxxxxxxxxxxxxxxxxxx"`} />
          </div>

          {/* Gmail example */}
          <div>
            <p className="mb-2 text-xs font-semibold text-[var(--cream-muted)] uppercase tracking-wider">Gmail App Password ke saath:</p>
            <CopyBlock code={`SMTP_HOST=smtp.gmail.com\nSMTP_PORT=587\nSMTP_USER=you@gmail.com\nSMTP_FROM=you@gmail.com\nSMTP_PASS="xxxx xxxx xxxx xxxx"`} />
          </div>

          <p className="text-[10px] text-[var(--cream-muted)]">
            Gmail use karne ke liye: Google Account → Security → 2FA on → App Passwords → Generate.
          </p>
        </div>
      </div>

      <p className="text-center text-xs text-[var(--cream-muted)] pb-2">
        .env update karne ke baad <code className="rounded bg-gray-100 px-1 font-mono">npm run dev</code> / server restart karein.
      </p>
    </div>
  );
}
