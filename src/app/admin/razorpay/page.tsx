"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  CreditCard, ExternalLink, CheckCircle, AlertCircle,
  Mail, Copy, Check, ChevronLeft,
} from "lucide-react";

function CopyBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="relative group">
      <pre className="overflow-x-auto rounded-xl bg-gray-950 p-4 text-[11px] leading-relaxed text-gray-300 font-mono whitespace-pre">
        {code}
      </pre>
      <button
        onClick={() => {
          navigator.clipboard.writeText(code);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }}
        className="absolute right-3 top-3 flex items-center gap-1 rounded-lg bg-gray-800 px-2 py-1 text-[10px] font-semibold text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-700"
      >
        {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

type RzpStatus  = { keyId: string | null; hasSecret: boolean; configured: boolean };
type SmtpStatus = { host: string | null; port: number | null; user: string | null; from: string | null; hasPass: boolean };

export default function AdminRazorpayPage() {
  const [rzp,  setRzp]  = useState<RzpStatus  | null>(null);
  const [smtp, setSmtp] = useState<SmtpStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/razorpay/settings", { credentials: "include" })
        .then((r) => r.ok ? r.json() : null).catch(() => null),
      fetch("/api/admin/smtp/settings", { credentials: "include" })
        .then((r) => r.ok ? r.json() : null).catch(() => null),
    ]).then(([r, s]) => { setRzp(r); setSmtp(s); }).finally(() => setLoading(false));
  }, []);

  const rzpOk  = rzp?.configured === true;
  const smtpOk = !!(smtp?.host && smtp?.user && smtp?.hasPass);

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-4 py-6">
      {/* Header */}
      <div>
        <Link href="/admin" className="inline-flex items-center gap-1 text-sm font-medium text-[var(--cream-muted)] hover:text-[var(--accent)]">
          <ChevronLeft className="h-4 w-4" /> Back to Admin
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-[var(--cream)] flex items-center gap-2">
          <CreditCard className="h-7 w-7 text-[var(--accent)]" />
          Razorpay &amp; SMTP
        </h1>
        <p className="mt-1 text-sm text-[var(--cream-muted)]">
          Saari credentials sirf <code className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-xs">.env</code> file se read hoti hain.
          Neeche diye format ke hisaab se set karo aur server restart karo.
        </p>
      </div>

      {/* ── Razorpay status ── */}
      <StatusCard
        loading={loading}
        ok={rzpOk}
        okTitle="Razorpay configured ✓"
        okDesc={`Key ID: ${rzp?.keyId ?? "—"} · Secret set: ${rzp?.hasSecret ? "yes" : "no"}`}
        failTitle="Razorpay not configured"
        failDesc="RAZORPAY_KEY_ID aur RAZORPAY_KEY_SECRET .env mein set karo"
        icon={<CreditCard className="h-5 w-5 shrink-0" />}
      />

      {/* ── Razorpay .env guide ── */}
      <EnvCard
        title="Razorpay Keys"
        icon={<CreditCard className="h-4 w-4 text-[var(--accent)]" />}
        href="https://dashboard.razorpay.com/app/keys"
        hrefLabel="Get keys"
        rows={[
          { key: "RAZORPAY_KEY_ID",     example: "rzp_test_xxxxxxxxxxxx",  secret: false, note: "rzp_test_... for test · rzp_live_... for production" },
          { key: "RAZORPAY_KEY_SECRET", example: "your_key_secret_here",   secret: true,  note: "Razorpay dashboard → API Keys → Secret" },
        ]}
        copyCode={"RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxx\nRAZORPAY_KEY_SECRET=\"your_key_secret_here\""}
      />

      {/* ── SMTP status ── */}
      <StatusCard
        loading={loading}
        ok={smtpOk}
        okTitle="SMTP configured ✓"
        okDesc={`Host: ${smtp?.host} · Port: ${smtp?.port} · From: ${smtp?.from}`}
        failTitle="SMTP not configured"
        failDesc="OTP aur receipt emails kaam nahi karenge"
        icon={<Mail className="h-5 w-5 shrink-0" />}
      />

      {/* ── SMTP .env guide ── */}
      <EnvCard
        title="Email / SMTP"
        icon={<Mail className="h-4 w-4 text-[var(--accent)]" />}
        rows={[
          { key: "SMTP_HOST", example: "smtp.resend.com",              secret: false },
          { key: "SMTP_PORT", example: "587",                           secret: false, note: "465 for SSL · 587 for TLS" },
          { key: "SMTP_USER", example: "resend",                        secret: false, note: "Resend ke liye sirf 'resend'" },
          { key: "SMTP_FROM", example: "admin@cyberlib.in",             secret: false },
          { key: "SMTP_PASS", example: "re_xxxxxxxxxxxxxxxxxxxxxxxxxxxx", secret: true, note: "Resend API key ya Gmail app password" },
        ]}
        copyCode={"# Resend\nSMTP_HOST=smtp.resend.com\nSMTP_PORT=587\nSMTP_USER=resend\nSMTP_FROM=admin@cyberlib.in\nSMTP_PASS=\"re_xxxx\"\n\n# Gmail App Password\n# SMTP_HOST=smtp.gmail.com\n# SMTP_USER=you@gmail.com\n# SMTP_PASS=\"xxxx xxxx xxxx xxxx\""}
      />

      <p className="text-center text-xs text-[var(--cream-muted)] pb-2">
        .env update ke baad <code className="rounded bg-white/10 px-1 font-mono">npm run dev</code> ya server restart zaroori hai.
      </p>
    </div>
  );
}

function StatusCard({ loading, ok, okTitle, okDesc, failTitle, failDesc, icon }: {
  loading: boolean; ok: boolean;
  okTitle: string; okDesc: string;
  failTitle: string; failDesc: string;
  icon: React.ReactNode;
}) {
  return (
    <div className={`flex items-center gap-3 rounded-2xl border p-4 ${
      loading ? "border-white/10 bg-white/5"
      : ok    ? "border-emerald-500/30 bg-emerald-500/10"
               : "border-amber-500/30 bg-amber-500/10"
    }`}>
      {loading ? (
        <span className="text-sm text-[var(--cream-muted)]">Checking…</span>
      ) : ok ? (
        <>
          <CheckCircle className="h-5 w-5 shrink-0 text-emerald-400" />
          <div>
            <p className="font-semibold text-[var(--cream)]">{okTitle}</p>
            <p className="text-xs text-[var(--cream-muted)] font-mono mt-0.5">{okDesc}</p>
          </div>
        </>
      ) : (
        <>
          <AlertCircle className="h-5 w-5 shrink-0 text-amber-400" />
          <div>
            <p className="font-semibold text-[var(--cream)]">{failTitle}</p>
            <p className="text-xs text-[var(--cream-muted)] mt-0.5">{failDesc}</p>
          </div>
        </>
      )}
    </div>
  );
}

function EnvCard({ title, icon, href, hrefLabel, rows, copyCode }: {
  title: string; icon: React.ReactNode;
  href?: string; hrefLabel?: string;
  rows: { key: string; example: string; secret: boolean; note?: string }[];
  copyCode: string;
}) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-white overflow-hidden">
      <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--background)] px-5 py-3">
        <h2 className="flex items-center gap-2 text-sm font-bold text-[var(--foreground)]">
          {icon} {title}
        </h2>
        {href && (
          <a href={href} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs font-semibold text-[var(--accent)] hover:underline">
            {hrefLabel} <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
      <div className="p-5 space-y-4">
        <div className="divide-y divide-[var(--border)] rounded-xl border border-[var(--border)]">
          {rows.map((v) => (
            <div key={v.key} className="flex items-start gap-3 px-4 py-3">
              <code className="shrink-0 rounded-lg bg-gray-100 px-2 py-1 font-mono text-xs text-gray-900 mt-0.5">
                {v.key}
              </code>
              <div className="flex-1 min-w-0">
                {v.secret
                  ? <p className="text-xs text-amber-600 font-medium">secret — .env mein rakho, share mat karo</p>
                  : <p className="font-mono text-xs text-gray-500 truncate">{v.example}</p>
                }
                {v.note && <p className="mt-0.5 text-[10px] text-gray-400">{v.note}</p>}
              </div>
              {v.secret && (
                <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700 uppercase tracking-wide">
                  secret
                </span>
              )}
            </div>
          ))}
        </div>
        <CopyBlock code={copyCode} />
      </div>
    </div>
  );
}
