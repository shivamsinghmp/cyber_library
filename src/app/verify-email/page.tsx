"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Mail, Loader2, RefreshCw, CheckCircle } from "lucide-react";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";

  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [resendError, setResendError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function handleResend() {
    if (!email || cooldown > 0) return;
    setResending(true);
    setResendError(null);
    setResendSuccess(false);
    try {
      const res = await fetch("/api/auth/verify-email/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setResendError(data.error || "Link nahi bheja ja saka. Dobara try karo.");
        return;
      }
      setResendSuccess(true);
      setCooldown(60);
    } catch {
      setResendError("Kuch gadbad ho gayi. Dobara try karo.");
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="min-h-[100dvh] flex items-center justify-center px-5 py-12"
      style={{ background: "var(--page-bg)" }}>
      <div className="w-full max-w-[420px]">

        {/* Card */}
        <div className="rounded-2xl border bg-white p-8 text-center"
          style={{ borderColor: "var(--border)", boxShadow: "var(--shadow-md)" }}>

          {/* Icon */}
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl"
            style={{ background: "linear-gradient(135deg, #6366F1, #8B5CF6)", boxShadow: "0 8px 24px rgba(99,102,241,0.35)" }}>
            <Mail className="h-8 w-8 text-white" />
          </div>

          <h1 className="text-xl font-extrabold mb-2" style={{ color: "var(--foreground)" }}>
            Email check karo!
          </h1>

          <p className="text-sm mb-1" style={{ color: "var(--muted-text)" }}>
            Tumhare email pe verification link bheja gaya hai:
          </p>
          <p className="text-sm font-bold mb-6 break-all" style={{ color: "var(--foreground)" }}>
            {email || "tumhari email"}
          </p>

          <div className="rounded-xl border px-4 py-3 mb-6 text-left space-y-1.5"
            style={{ borderColor: "var(--border)", background: "var(--page-bg)" }}>
            {[
              "Email inbox kholo",
              '"The Cyber Library" ka email dhundho',
              '"Verify Email Address" button pe click karo',
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-extrabold text-white"
                  style={{ background: "linear-gradient(135deg, #6366F1, #8B5CF6)" }}>
                  {i + 1}
                </span>
                <p className="text-xs font-medium" style={{ color: "var(--muted-text)" }}>{step}</p>
              </div>
            ))}
          </div>

          {/* Resend */}
          {resendSuccess ? (
            <div className="flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 mb-4">
              <CheckCircle className="h-4 w-4 text-emerald-600" />
              <p className="text-sm font-semibold text-emerald-700">
                Naya link bhej diya! Inbox check karo.
              </p>
            </div>
          ) : resendError ? (
            <p className="text-xs font-semibold text-red-500 mb-3">{resendError}</p>
          ) : null}

          <button
            onClick={handleResend}
            disabled={resending || cooldown > 0}
            className="flex w-full items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-bold transition-all hover:bg-gray-50 disabled:opacity-50"
            style={{ borderColor: "var(--border)", color: "var(--foreground)" }}>
            {resending
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Bhej rahe hain…</>
              : cooldown > 0
              ? <><RefreshCw className="h-4 w-4" /> Resend ({cooldown}s)</>
              : <><RefreshCw className="h-4 w-4" /> Link dobara bhejo</>
            }
          </button>

          <p className="mt-4 text-[11px]" style={{ color: "var(--muted-text)" }}>
            Spam folder bhi check karo. Link 24 ghante valid rahega.
          </p>
        </div>

        <p className="mt-5 text-center text-sm" style={{ color: "var(--muted-text)" }}>
          Pehle se account verify hai?{" "}
          <Link href="/login" className="font-extrabold hover:underline" style={{ color: "var(--accent)" }}>
            Login Karo
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--page-bg)" }}>
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: "var(--accent)" }} />
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
