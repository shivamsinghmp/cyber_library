"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle, XCircle, Loader2, RefreshCw } from "lucide-react";

type Status = "loading" | "success" | "already" | "error";

function ConfirmContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") ?? "";
  const email = searchParams.get("email") ?? "";

  const [status, setStatus] = useState<Status>("loading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [resendDone, setResendDone] = useState(false);

  useEffect(() => {
    if (!token || !email) {
      setStatus("error");
      setErrorMsg("Link incomplete hai. Signup se naya link lo.");
      return;
    }

    fetch("/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, email }),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setStatus("error");
          setErrorMsg(data.error || "Link invalid ya expire ho gaya hai.");
          return;
        }
        if (data.alreadyVerified) {
          setStatus("already");
        } else {
          setStatus("success");
          setTimeout(() => router.push("/login?verified=1"), 3000);
        }
      })
      .catch(() => {
        setStatus("error");
        setErrorMsg("Network error. Dobara try karo.");
      });
  }, [token, email, router]);

  async function handleResend() {
    if (!email) return;
    setResending(true);
    try {
      const res = await fetch("/api/auth/verify-email/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (res.ok) setResendDone(true);
    } catch {}
    finally { setResending(false); }
  }

  return (
    <div className="min-h-[100dvh] flex items-center justify-center px-5 py-12"
      style={{ background: "var(--page-bg)" }}>
      <div className="w-full max-w-[420px]">
        <div className="rounded-2xl border bg-white p-8 text-center"
          style={{ borderColor: "var(--border)", boxShadow: "var(--shadow-md)" }}>

          {status === "loading" && (
            <>
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl"
                style={{ background: "linear-gradient(135deg, #6366F1, #8B5CF6)", boxShadow: "0 8px 24px rgba(99,102,241,0.35)" }}>
                <Loader2 className="h-8 w-8 text-white animate-spin" />
              </div>
              <h1 className="text-xl font-extrabold mb-2" style={{ color: "var(--foreground)" }}>
                Verify ho raha hai…
              </h1>
              <p className="text-sm" style={{ color: "var(--muted-text)" }}>
                Ek second, link check kar rahe hain.
              </p>
            </>
          )}

          {status === "success" && (
            <>
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 border border-emerald-200">
                <CheckCircle className="h-8 w-8 text-emerald-600" />
              </div>
              <h1 className="text-xl font-extrabold mb-2" style={{ color: "var(--foreground)" }}>
                Email verify ho gaya! 🎉
              </h1>
              <p className="text-sm mb-5" style={{ color: "var(--muted-text)" }}>
                Tumhara account ready hai. 3 seconds mein login page pe bhej rahe hain…
              </p>
              <Link href="/login?verified=1"
                className="inline-flex items-center justify-center rounded-xl px-6 py-2.5 text-sm font-extrabold text-white transition-all hover:scale-[1.02]"
                style={{ background: "linear-gradient(135deg, #6366F1, #8B5CF6)", boxShadow: "0 6px 20px rgba(99,102,241,0.40)" }}>
                Login Karo →
              </Link>
            </>
          )}

          {status === "already" && (
            <>
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 border border-blue-200">
                <CheckCircle className="h-8 w-8 text-blue-600" />
              </div>
              <h1 className="text-xl font-extrabold mb-2" style={{ color: "var(--foreground)" }}>
                Pehle se verified hai!
              </h1>
              <p className="text-sm mb-5" style={{ color: "var(--muted-text)" }}>
                Yeh email already verify hai. Sidha login karo.
              </p>
              <Link href="/login"
                className="inline-flex items-center justify-center rounded-xl px-6 py-2.5 text-sm font-extrabold text-white transition-all hover:scale-[1.02]"
                style={{ background: "linear-gradient(135deg, #6366F1, #8B5CF6)", boxShadow: "0 6px 20px rgba(99,102,241,0.40)" }}>
                Login Karo →
              </Link>
            </>
          )}

          {status === "error" && (
            <>
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 border border-red-200">
                <XCircle className="h-8 w-8 text-red-500" />
              </div>
              <h1 className="text-xl font-extrabold mb-2" style={{ color: "var(--foreground)" }}>
                Link kaam nahi kiya
              </h1>
              <p className="text-sm mb-5" style={{ color: "var(--muted-text)" }}>
                {errorMsg}
              </p>

              {email && !resendDone && (
                <button
                  onClick={handleResend}
                  disabled={resending}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-bold transition-all hover:bg-gray-50 disabled:opacity-50 mb-3"
                  style={{ borderColor: "var(--border)", color: "var(--foreground)" }}>
                  {resending
                    ? <><Loader2 className="h-4 w-4 animate-spin" /> Bhej rahe hain…</>
                    : <><RefreshCw className="h-4 w-4" /> Naya link maango</>
                  }
                </button>
              )}

              {resendDone && (
                <div className="flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 mb-3">
                  <CheckCircle className="h-4 w-4 text-emerald-600" />
                  <p className="text-sm font-semibold text-emerald-700">Naya link bhej diya! Inbox check karo.</p>
                </div>
              )}

              <Link href="/signup"
                className="text-sm font-bold hover:underline"
                style={{ color: "var(--accent)" }}>
                Naya account banao
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailConfirmPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--page-bg)" }}>
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: "var(--accent)" }} />
      </div>
    }>
      <ConfirmContent />
    </Suspense>
  );
}
