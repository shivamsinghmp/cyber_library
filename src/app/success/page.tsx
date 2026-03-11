"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Suspense } from "react";

function SuccessContent() {
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const planName = searchParams.get("plan") || "Your plan";
  const price = searchParams.get("price") || "";
  const couponCode = searchParams.get("coupon");
  const rewardId = searchParams.get("rewardId");
  const isDigital = searchParams.get("digital") === "1";
  const redeemedRef = useRef(false);
  const enrollRef = useRef(false);
  const [whatsappGroupLink, setWhatsappGroupLink] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/support-info")
      .then((r) => r.ok ? r.json() : {})
      .then((data: { whatsappGroupLink?: string | null }) => setWhatsappGroupLink(data.whatsappGroupLink ?? null))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!couponCode || !session?.user || redeemedRef.current) return;
    redeemedRef.current = true;
    fetch("/api/coupon/redeem", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: couponCode }),
    }).catch(() => {});
  }, [couponCode, session?.user]);

  useEffect(() => {
    if (!rewardId || !session?.user || enrollRef.current) return;
    enrollRef.current = true;
    fetch("/api/user/rewards/enroll", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rewardId }),
    }).catch(() => {});
  }, [rewardId, session?.user]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="mb-6 rounded-full bg-emerald-500/20 p-4">
        <svg
          className="h-14 w-14 text-emerald-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h1 className="text-2xl font-semibold text-[var(--cream)] md:text-3xl">
        Payment Successful!
      </h1>
      <p className="mt-2 text-sm text-[var(--cream-muted)] md:text-base max-w-md">
        {isDigital
          ? "Your purchase is complete. Download your product from My Downloads."
          : rewardId
            ? "Reward enrollment complete."
            : "Your slot is booked."}
        {!isDigital && planName && price && (
          <> You now have access — {planName} (₹{price}).</>
        )}
      </p>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row flex-wrap justify-center">
        {isDigital && (
          <Link
            href="/dashboard/downloads"
            className="inline-flex items-center justify-center rounded-full border border-[var(--accent)]/50 bg-[var(--accent)]/10 px-5 py-2.5 text-sm font-medium text-[var(--cream)] transition hover:bg-[var(--accent)]/20"
          >
            My Downloads
          </Link>
        )}
        {whatsappGroupLink && (
          <a
            href={whatsappGroupLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-full bg-emerald-600/90 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-emerald-500"
          >
            Join WhatsApp Group
          </a>
        )}
        {rewardId && (
          <Link
            href="/dashboard/rewards"
            className="inline-flex items-center justify-center rounded-full border border-[var(--accent)]/50 bg-[var(--accent)]/10 px-5 py-2.5 text-sm font-medium text-[var(--cream)] transition hover:bg-[var(--accent)]/20"
          >
            My Rewards
          </Link>
        )}
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center rounded-full border border-white/10 bg-black/40 px-5 py-2.5 text-sm font-medium text-[var(--cream)] transition hover:bg-white/5"
        >
          Go to Dashboard
        </Link>
      </div>

      <p className="mt-6 text-xs text-[var(--cream-muted)]">
        We’ve sent your receipt and access details to your email.
      </p>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-[60vh] flex items-center justify-center text-[var(--cream-muted)]">Loading…</div>}>
      <SuccessContent />
    </Suspense>
  );
}
