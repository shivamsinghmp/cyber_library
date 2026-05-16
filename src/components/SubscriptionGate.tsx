"use client";

import { useSubscription } from "@/hooks/useSubscription";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Lock, Sparkles, ArrowRight, Calendar } from "lucide-react";

const FREE_PATHS = [
  "/dashboard/profile",
  "/dashboard/settings",
  "/dashboard/student-form",
  "/dashboard/feedback",
];

type PriceTier = { originalPrice: number; offerPrice: number };
type PricingData = { currency: string; monthly: PriceTier; yearly: PriceTier };

function calcOff(orig: number, offer: number) {
  if (!orig || orig <= offer) return 0;
  return Math.round(((orig - offer) / orig) * 100);
}

function PlanCard({
  label,
  period,
  tier,
  currency,
  highlight,
}: {
  label: string;
  period: string;
  tier: PriceTier;
  currency: string;
  highlight?: boolean;
}) {
  const off = calcOff(tier.originalPrice, tier.offerPrice);
  const savings = tier.originalPrice - tier.offerPrice;

  return (
    <div
      className={`rounded-2xl p-4 text-left ${
        highlight ? "text-white" : "border border-gray-200 bg-gray-50"
      }`}
      style={highlight ? { background: "linear-gradient(135deg,#6366f1,#8b5cf6)" } : {}}
    >
      <div className="flex items-center justify-between mb-1">
        <p className={`text-[10px] font-bold uppercase tracking-wider ${highlight ? "text-white/70" : "text-gray-500"}`}>
          {label}
        </p>
        {off > 0 && (
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-extrabold text-white"
            style={{ background: highlight ? "rgba(255,255,255,0.25)" : "linear-gradient(135deg,#ef4444,#f97316)" }}
          >
            -{off}% OFF
          </span>
        )}
      </div>

      {tier.originalPrice > tier.offerPrice && (
        <p className={`text-xs line-through ${highlight ? "text-white/40" : "text-gray-400"}`}>
          {currency}{tier.originalPrice.toLocaleString("en-IN")}
        </p>
      )}

      <p className={`text-xl font-extrabold ${highlight ? "text-white" : "text-gray-900"}`}>
        {currency}{tier.offerPrice.toLocaleString("en-IN")}
        <span className={`text-sm font-normal ${highlight ? "text-white/70" : "text-gray-400"}`}>
          /{period}
        </span>
      </p>

      {savings > 0 && (
        <p className={`mt-1 text-[10px] font-semibold ${highlight ? "text-emerald-300" : "text-emerald-600"}`}>
          Save {currency}{savings.toLocaleString("en-IN")}
        </p>
      )}
    </div>
  );
}

export function SubscriptionGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { active, loading, planType, endDate } = useSubscription();
  const [pricing, setPricing] = useState<PricingData | null>(null);

  useEffect(() => {
    fetch("/api/pricing")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) setPricing(d); })
      .catch(() => {});
  }, []);

  if (FREE_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--accent)] border-t-transparent" />
      </div>
    );
  }

  // Fallback pricing when API hasn't loaded yet
  const currency = pricing?.currency ?? "₹";
  const monthly: PriceTier = pricing?.monthly ?? { originalPrice: 999, offerPrice: 499 };
  const yearly: PriceTier  = pricing?.yearly  ?? { originalPrice: 4999, offerPrice: 1999 };

  if (!active) {
    return (
      <div className="relative min-h-[60vh]">
        {/* Blurred content behind */}
        <div className="pointer-events-none select-none blur-sm opacity-40" aria-hidden="true">
          {children}
        </div>

        {/* Lock overlay */}
        <div className="absolute inset-0 flex items-center justify-center px-4">
          <div
            className="w-full max-w-md overflow-hidden rounded-3xl border border-[var(--border)] bg-white text-center shadow-2xl"
            style={{ boxShadow: "0 24px 60px rgba(99,102,241,0.18)" }}
          >
            {/* Top gradient strip */}
            <div className="h-1.5 w-full bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500" />

            <div className="px-8 py-10">
              {/* Lock icon */}
              <div
                className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl"
                style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", boxShadow: "0 8px 24px rgba(99,102,241,0.4)" }}
              >
                <Lock className="h-8 w-8 text-white" />
              </div>

              <h2 className="mb-2 text-2xl font-extrabold text-[var(--foreground)]">
                Feature Locked
              </h2>
              <p className="mb-6 text-sm text-gray-500">
                This feature is available to active subscribers only. Choose a plan to unlock everything.
              </p>

              {/* Plans preview — dynamic from API */}
              <div className="mb-6 grid grid-cols-2 gap-3">
                <PlanCard label="Monthly" period="mo" tier={monthly} currency={currency} />
                <PlanCard label="Yearly"  period="yr" tier={yearly}  currency={currency} highlight />
              </div>

              <Link
                href="/pricing"
                className="flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-bold text-white transition hover:opacity-90 active:scale-[0.98]"
                style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", boxShadow: "0 4px 16px rgba(99,102,241,0.4)" }}
              >
                <Sparkles className="h-4 w-4" />
                View Plans & Subscribe
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Active subscription — show remaining days hint
  const daysLeft = endDate
    ? Math.max(0, Math.ceil((new Date(endDate).getTime() - Date.now()) / 86_400_000))
    : null;

  return (
    <>
      {daysLeft !== null && daysLeft <= 7 && (
        <div className="mx-4 mt-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-medium text-amber-700">
          <Calendar className="h-4 w-4 flex-shrink-0" />
          Your {planType === "MONTHLY" ? "monthly" : "yearly"} subscription expires in{" "}
          <strong>{daysLeft} day{daysLeft !== 1 ? "s" : ""}</strong>.{" "}
          <Link href="/pricing" className="ml-1 underline hover:text-amber-900">Renew now</Link>
        </div>
      )}
      {children}
    </>
  );
}
