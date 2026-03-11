"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  CreditCard,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  Lock,
  EyeOff,
  Mail,
} from "lucide-react";
import toast from "react-hot-toast";

export default function AdminRazorpayPage() {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [keyId, setKeyId] = useState("");
  const [hasSecret, setHasSecret] = useState(false);
  const [keySecret, setKeySecret] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // SMTP state
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState<string>("");
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpFrom, setSmtpFrom] = useState("");
  const [smtpPass, setSmtpPass] = useState("");
  const [smtpHasPass, setSmtpHasPass] = useState(false);
  const [smtpSaving, setSmtpSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/razorpay/status", { credentials: "include" })
        .then((res) => (res.ok ? res.json() : {}))
        .then((data) => setConfigured(data.configured === true)),
      fetch("/api/admin/razorpay/settings", { credentials: "include" })
        .then((res) => (res.ok ? res.json() : {}))
        .then((data) => {
          setKeyId(data.keyId ?? "");
          setHasSecret(data.hasSecret === true);
        }),
      fetch("/api/admin/smtp/settings", { credentials: "include" })
        .then((res) => (res.ok ? res.json() : {}))
        .then((data) => {
          if (data.host) setSmtpHost(data.host);
          if (data.port) setSmtpPort(String(data.port));
          if (data.user) setSmtpUser(data.user);
          if (data.from) setSmtpFrom(data.from);
          setSmtpHasPass(data.hasPass === true);
        }),
    ])
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/admin/razorpay/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyId: keyId.trim() || undefined,
          keySecret: keySecret ? keySecret.trim() : undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Failed to save");
        setSaving(false);
        return;
      }
      toast.success("Settings saved securely. Key Secret is stored encrypted.");
      setKeySecret("");
      setHasSecret(true);
      setConfigured(!!(keyId.trim() && (keySecret.trim() || hasSecret)));
    } catch {
      toast.error("Something went wrong");
    }
    setSaving(false);
  }

  async function handleSaveSmtp(e: React.FormEvent) {
    e.preventDefault();
    setSmtpSaving(true);
    try {
      const portNum = smtpPort ? Number(smtpPort) : undefined;
      const res = await fetch("/api/admin/smtp/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          host: smtpHost.trim() || undefined,
          port: Number.isFinite(portNum as number) ? portNum : undefined,
          user: smtpUser.trim() || undefined,
          from: smtpFrom.trim() || undefined,
          pass: smtpPass ? smtpPass.trim() : undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Failed to save SMTP settings");
        setSmtpSaving(false);
        return;
      }
      toast.success("SMTP settings saved securely.");
      setSmtpPass("");
      setSmtpHasPass(true);
    } catch {
      toast.error("Something went wrong");
    }
    setSmtpSaving(false);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--cream)] md:text-3xl">
          Razorpay API Integration
        </h1>
        <p className="mt-1 text-sm text-[var(--cream-muted)]">
          Enter your API keys below. The Key Secret is encrypted before storage and never shown again.
        </p>
      </div>

      {/* Status */}
      <div
        className={`flex items-center gap-3 rounded-2xl border p-4 ${
          loading
            ? "border-white/10 bg-black/20"
            : configured
              ? "border-emerald-500/30 bg-emerald-500/10"
              : "border-amber-500/30 bg-amber-500/10"
        }`}
      >
        {loading ? (
          <span className="text-sm text-[var(--cream-muted)]">Loading…</span>
        ) : configured ? (
          <>
            <CheckCircle className="h-5 w-5 shrink-0 text-emerald-400" />
            <div>
              <p className="font-medium text-[var(--cream)]">Razorpay is configured</p>
              <p className="text-xs text-[var(--cream-muted)]">
                Keys are set. Checkout can use Razorpay. Key Secret is stored encrypted.
              </p>
            </div>
          </>
        ) : (
          <>
            <AlertCircle className="h-5 w-5 shrink-0 text-amber-400" />
            <div>
              <p className="font-medium text-[var(--cream)]">Razorpay not configured</p>
              <p className="text-xs text-[var(--cream-muted)]">
                Enter Key ID and Key Secret below. They are stored securely.
              </p>
            </div>
          </>
        )}
      </div>

      {/* Razorpay API keys */}
      <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl border border-white/10 bg-black/25 p-6">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-[var(--cream)]">
          <Lock className="h-4 w-4 text-emerald-500/80" />
          API keys (stored securely)
        </h2>

        <div>
          <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-[var(--cream-muted)]">
            <CreditCard className="h-3.5 w-3.5" />
            Key ID
          </label>
          <input
            type="text"
            value={keyId}
            onChange={(e) => setKeyId(e.target.value)}
            placeholder="rzp_test_... or rzp_live_..."
            className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-[var(--cream)] placeholder:text-[var(--cream-muted)]/50 focus:border-[var(--accent)]/70 focus:outline-none"
            autoComplete="off"
          />
        </div>

        <div>
          <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-[var(--cream-muted)]">
            <EyeOff className="h-3.5 w-3.5" />
            Key Secret
          </label>
          <input
            type="password"
            value={keySecret}
            onChange={(e) => setKeySecret(e.target.value)}
            placeholder={hasSecret ? "Leave blank to keep current secret" : "Enter your Key Secret"}
            className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-[var(--cream)] placeholder:text-[var(--cream-muted)]/50 focus:border-[var(--accent)]/70 focus:outline-none"
            autoComplete="new-password"
          />
          <p className="mt-1 text-[10px] text-[var(--cream-muted)]">
            Stored encrypted. Never displayed after saving. Leave blank to keep existing.
          </p>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={saving || (!keyId.trim() && !keySecret.trim())}
            className="rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[var(--ink)] transition hover:bg-[var(--accent-hover)] disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save securely"}
          </button>
        </div>
      </form>

      {/* SMTP settings */}
      <form
        onSubmit={handleSaveSmtp}
        className="space-y-6 rounded-2xl border border-white/10 bg-black/25 p-6"
      >
        <h2 className="flex items-center gap-2 text-sm font-semibold text-[var(--cream)]">
          <Mail className="h-4 w-4 text-emerald-500/80" />
          Email / SMTP (OTP & notifications)
        </h2>

        <p className="text-xs text-[var(--cream-muted)]">
          Configure SMTP to send OTPs and other emails. Password is stored encrypted and never shown again.
        </p>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--cream-muted)]">
              SMTP host (SMTP_HOST)
            </label>
            <input
              type="text"
              value={smtpHost}
              onChange={(e) => setSmtpHost(e.target.value)}
              placeholder="smtp.example.com"
              className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-[var(--cream)] placeholder:text-[var(--cream-muted)]/50 focus:border-[var(--accent)]/70 focus:outline-none"
              autoComplete="off"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--cream-muted)]">
              SMTP port (SMTP_PORT)
            </label>
            <input
              type="number"
              min={1}
              max={65535}
              value={smtpPort}
              onChange={(e) => setSmtpPort(e.target.value)}
              placeholder="587"
              className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-[var(--cream)] placeholder:text-[var(--cream-muted)]/50 focus:border-[var(--accent)]/70 focus:outline-none"
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--cream-muted)]">
              SMTP user (SMTP_USER)
            </label>
            <input
              type="text"
              value={smtpUser}
              onChange={(e) => setSmtpUser(e.target.value)}
              placeholder="your_smtp_user"
              className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-[var(--cream)] placeholder:text-[var(--cream-muted)]/50 focus:border-[var(--accent)]/70 focus:outline-none"
              autoComplete="off"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--cream-muted)]">
              From email (SMTP_FROM)
            </label>
            <input
              type="text"
              value={smtpFrom}
              onChange={(e) => setSmtpFrom(e.target.value)}
              placeholder='Virtual Library <no-reply@virtuallibrary.com>'
              className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-[var(--cream)] placeholder:text-[var(--cream-muted)]/50 focus:border-[var(--accent)]/70 focus:outline-none"
              autoComplete="off"
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-[var(--cream-muted)]">
            SMTP password (SMTP_PASS)
          </label>
          <input
            type="password"
            value={smtpPass}
            onChange={(e) => setSmtpPass(e.target.value)}
            placeholder={
              smtpHasPass
                ? "Leave blank to keep current password"
                : "Enter your SMTP password"
            }
            className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-[var(--cream)] placeholder:text-[var(--cream-muted)]/50 focus:border-[var(--accent)]/70 focus:outline-none"
            autoComplete="new-password"
          />
          <p className="mt-1 text-[10px] text-[var(--cream-muted)]">
            Stored encrypted using ENCRYPTION_KEY / AUTH_SECRET. Never displayed again after save.
          </p>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={smtpSaving || (!smtpHost.trim() && !smtpUser.trim() && !smtpPass.trim())}
            className="rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[var(--ink)] transition hover:bg-[var(--accent-hover)] disabled:opacity-50"
          >
            {smtpSaving ? "Saving…" : "Save SMTP settings"}
          </button>
        </div>
      </form>

      {/* Help */}
      <div className="rounded-2xl border border-white/10 bg-black/20 p-4 space-y-2">
        <p className="text-xs font-medium text-[var(--cream-muted)]">
          Get keys from{" "}
          <a
            href="https://dashboard.razorpay.com/app/keys"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[var(--accent)] hover:underline"
          >
            Razorpay Dashboard → API Keys
            <ExternalLink className="h-3 w-3" />
          </a>
        </p>
        <p className="text-[10px] text-[var(--cream-muted)]">
          Add <code className="rounded bg-white/10 px-1">ENCRYPTION_KEY</code> to .env (min 16 chars) for secret encryption. If unset, AUTH_SECRET is used.
        </p>
      </div>

      <p className="text-center text-sm text-[var(--cream-muted)]">
        <Link href="/admin" className="text-[var(--accent)] hover:underline">
          ← Back to Admin
        </Link>
      </p>
    </div>
  );
}
