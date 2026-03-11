"use client";

import { useState } from "react";
import Link from "next/link";

type Step = "request" | "reset" | "done";

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<Step>("request");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleRequest(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    if (!email) {
      setError("Enter your registered email.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/forgot-password/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Could not send code. Try again.");
        return;
      }
      setMessage("If this email exists, an OTP has been sent. Check your inbox.");
      setStep("reset");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    if (!code || !password || !confirmPassword) {
      setError("Enter OTP and new password.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/forgot-password/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Could not reset password. Check the code and try again.");
        return;
      }
      setStep("done");
      setMessage("Password updated. You can now log in with your new password.");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-[var(--background)]">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-black/30 p-6 shadow-xl">
        <h1 className="text-xl font-semibold text-[var(--cream)] mb-2">
          Forgot password
        </h1>
        <p className="text-xs text-[var(--cream-muted)] mb-6">
          Enter your email, we&apos;ll send a 6-digit OTP. Then set a new password.
        </p>

        {step === "request" && (
          <form onSubmit={handleRequest} className="space-y-4">
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
            {error && <p className="text-xs text-red-400">{error}</p>}
            {message && !error && (
              <p className="text-xs text-emerald-300">{message}</p>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-[var(--accent)] py-2.5 text-sm font-semibold text-[var(--ink)] shadow-lg transition hover:bg-[var(--accent-hover)] disabled:opacity-60"
            >
              {submitting ? "Sending code…" : "Send OTP"}
            </button>
          </form>
        )}

        {step === "reset" && (
          <form onSubmit={handleReset} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--cream-muted)]">
                Email
              </label>
              <input
                type="email"
                value={email}
                disabled
                className="w-full cursor-not-allowed rounded-xl border border-white/10 bg-black/40 py-2.5 px-3 text-sm text-[var(--cream-muted)]"
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
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--cream-muted)]">
                New password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black/40 py-2.5 px-3 text-sm text-[var(--cream)] placeholder:text-[var(--cream-muted)]/60 focus:border-[var(--accent)]/70 focus:outline-none"
                placeholder="Min 8 characters"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--cream-muted)]">
                Confirm password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black/40 py-2.5 px-3 text-sm text-[var(--cream)] placeholder:text-[var(--cream-muted)]/60 focus:border-[var(--accent)]/70 focus:outline-none"
                placeholder="Repeat new password"
              />
            </div>
            {error && <p className="text-xs text-red-400">{error}</p>}
            {message && !error && (
              <p className="text-xs text-emerald-300">{message}</p>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-[var(--accent)] py-2.5 text-sm font-semibold text-[var(--ink)] shadow-lg transition hover:bg-[var(--accent-hover)] disabled:opacity-60"
            >
              {submitting ? "Updating…" : "Set new password"}
            </button>
          </form>
        )}

        {step === "done" && (
          <div className="space-y-4">
            {message && (
              <p className="text-xs text-emerald-300">{message}</p>
            )}
            <Link
              href="/login"
              className="block w-full rounded-xl bg-[var(--accent)] py-2.5 text-center text-sm font-semibold text-[var(--ink)] shadow-lg transition hover:bg-[var(--accent-hover)]"
            >
              Go to login
            </Link>
          </div>
        )}

        <p className="mt-5 text-center text-xs text-[var(--cream-muted)]">
          Remember your password?{" "}
          <Link
            href="/login"
            className="text-[var(--accent)] underline-offset-2 hover:underline"
          >
            Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}

