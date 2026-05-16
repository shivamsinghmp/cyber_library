"use client";

import { useState } from "react";
import { ShieldAlert, Loader2, CheckCircle, RefreshCw } from "lucide-react";
import Link from "next/link";

export function EmailVerifyBanner({ email }: { email: string }) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleResend() {
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/verify-email/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        setSent(true);
      } else {
        const d = await res.json().catch(() => ({}));
        setError(d.error || "Link nahi bheja ja saka. Dobara try karo.");
      }
    } catch {
      setError("Network error. Dobara try karo.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="w-full flex items-center gap-3 px-4 py-3"
      style={{ background: "#DC2626", color: "#fff" }}>

      {/* Icon */}
      <ShieldAlert className="h-5 w-5 shrink-0" />

      {/* Message */}
      <div className="flex-1 min-w-0 text-sm font-semibold">
        <span className="mr-1">Email verify nahi hua hai!</span>
        <span className="font-normal opacity-90 hidden sm:inline">
          Kuch features limited ho sakte hain —
          <strong className="ml-1">{email}</strong> pe link bheja gaya hai.
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 shrink-0 text-sm">
        {sent ? (
          <span className="flex items-center gap-1.5 font-semibold text-green-200">
            <CheckCircle className="h-4 w-4" />
            Link bhej diya! Inbox check karo.
          </span>
        ) : error ? (
          <span className="text-xs text-red-200">{error}</span>
        ) : (
          <button
            onClick={handleResend}
            disabled={sending}
            className="flex items-center gap-1.5 font-bold underline underline-offset-2 hover:opacity-80 disabled:opacity-50 transition-opacity">
            {sending
              ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Bhej rahe hain…</>
              : <><RefreshCw className="h-3.5 w-3.5" />Link dobara bhejo</>
            }
          </button>
        )}

        <Link
          href={`/verify-email?email=${encodeURIComponent(email)}`}
          className="rounded-lg bg-white px-3 py-1.5 text-xs font-extrabold text-red-600 hover:bg-red-50 transition-colors">
          Verify Karo →
        </Link>
      </div>
    </div>
  );
}
