"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialEmail = searchParams.get("email") || "";

  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resending, setResending] = useState(false);

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    if (!email || !code) {
      setError("Email and OTP are required.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Could not verify. Check the code and try again.");
        return;
      }
      setMessage("Email verified. You can now log in.");
      setTimeout(() => {
        router.push("/login?verified=1");
      }, 800);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResend() {
    setError(null);
    setMessage(null);
    if (!email) {
      setError("Enter your email to resend code.");
      return;
    }
    setResending(true);
    try {
      const res = await fetch("/api/auth/verify-email/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Could not resend code.");
        return;
      }
      setMessage("A new verification code has been sent to your email.");
    } catch {
      setError("Could not resend code. Try again.");
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-[var(--background)]">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-black/30 p-6 shadow-xl">
        <h1 className="text-lg font-semibold text-[var(--cream)] mb-2">
          Verify your email
        </h1>
        <p className="text-xs text-[var(--cream-muted)] mb-6">
          We&apos;ve sent a 6-digit code to your email. Enter it below to activate your
          Virtual Library account.
        </p>

        <form onSubmit={handleVerify} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--cream-muted)]">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/40 py-2.5 px-3 text-sm text-[var(--cream)] placeholder:text-[var(--cream-muted)]/60 focus:border-[var(--accent)]/70 focus:outline-none"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--cream-muted)]">
              OTP code
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
              className="w-full tracking-[0.35em] text-center rounded-xl border border-white/10 bg-black/40 py-2.5 px-3 text-sm font-mono text-[var(--cream)] focus:border-[var(--accent)]/70 focus:outline-none"
              placeholder="123456"
            />
            <p className="mt-1 text-[10px] text-[var(--cream-muted)]">
              Code expires in about 10 minutes.
            </p>
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}
          {message && !error && <p className="text-xs text-emerald-300">{message}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-[var(--accent)] py-2.5 text-sm font-semibold text-[var(--ink)] shadow-lg transition hover:bg-[var(--accent-hover)] disabled:opacity-60"
          >
            {submitting ? "Verifying…" : "Verify email"}
          </button>
        </form>

        <button
          type="button"
          onClick={handleResend}
          disabled={resending}
          className="mt-4 w-full rounded-xl border border-white/10 py-2.5 text-center text-xs font-medium text-[var(--cream)] hover:bg-white/5 disabled:opacity-60"
        >
          {resending ? "Resending…" : "Resend code"}
        </button>

        <p className="mt-5 text-center text-xs text-[var(--cream-muted)]">
          Already verified?{" "}
          <Link
            href="/login"
            className="text-[var(--accent)] underline-offset-2 hover:underline"
          >
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}

