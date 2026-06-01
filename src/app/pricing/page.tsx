"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, X, Star, Zap, Gift, Shield, Users, Clock } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useSubscription } from "@/hooks/useSubscription";
import toast from "react-hot-toast";

type PriceTier = { originalPrice: number; offerPrice: number };

type PricingData = {
  planName: string;
  subtitle: string;
  currency: string;
  monthly: PriceTier;
  yearly: PriceTier;
  ctaText: string;
  ctaUrl: string;
  features: string[];
};

function calcYearlySaving(monthly: number, yearly: number): number {
  if (!monthly || monthly <= 0) return 0;
  return Math.round(((monthly * 12 - yearly) / (monthly * 12)) * 100);
}

export default function PricingPage() {
  const [data, setData] = useState<PricingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");
  const [trialLoading, setTrialLoading] = useState(false);
  const clickedRef = useRef(false);

  const { data: session, status } = useSession();
  const router = useRouter();
  const {
    active: hasActiveSub,
    planType: activePlanType,
    isTrial,
    trialUsed,
    loading: subLoading,
  } = useSubscription();

  useEffect(() => {
    if (subLoading) return;
    if (hasActiveSub && !isTrial) {
      toast.success(
        `Aapka ${activePlanType === "MONTHLY" ? "Monthly" : "Yearly"} subscription already active hai!`
      );
      router.replace("/dashboard");
    }
  }, [hasActiveSub, isTrial, subLoading, activePlanType, router]);

  useEffect(() => {
    fetch("/api/pricing")
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  const handleSubscribe = useCallback(() => {
    if (status === "loading") return;
    if (!session?.user) {
      router.push(`/login?callbackUrl=${encodeURIComponent("/pricing")}`);
      return;
    }
    if (!data || clickedRef.current) return;
    clickedRef.current = true;
    setTimeout(() => { clickedRef.current = false; }, 3000);

    const tier = billing === "monthly" ? data.monthly : data.yearly;
    const planType = billing === "monthly" ? "MONTHLY" : "YEARLY";
    const params = new URLSearchParams({
      type: "subscription",
      plan: planType,
      name: `${planType === "MONTHLY" ? "Monthly" : "Yearly"} Membership`,
      amount: String(tier.offerPrice),
      originalAmount: String(tier.originalPrice),
    });
    router.push(`/checkout?${params.toString()}`);
  }, [session, status, data, billing, router]);

  const handleStartTrial = useCallback(async () => {
    if (status === "loading") return;
    if (!session?.user) {
      router.push(`/login?callbackUrl=${encodeURIComponent("/pricing")}`);
      return;
    }
    setTrialLoading(true);
    try {
      const res = await fetch("/api/trial/activate", { method: "POST" });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "Trial activate nahi hua.");
        return;
      }
      toast.success("7-day free trial start ho gaya! Enjoy karo.");
      router.push("/dashboard");
    } catch {
      toast.error("Kuch galat hua. Dobara try karo.");
    } finally {
      setTrialLoading(false);
    }
  }, [session, status, router]);

  if (loading || subLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--background)]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--background)]">
        <p className="text-[var(--muted-text)]">Pricing unavailable. Please try again later.</p>
      </div>
    );
  }

  const tier = billing === "monthly" ? data.monthly : data.yearly;
  const yearlySaving = calcYearlySaving(data.monthly.offerPrice, data.yearly.offerPrice);
  const perMonth =
    billing === "yearly"
      ? Math.round(data.yearly.offerPrice / 12)
      : data.monthly.offerPrice;

  const isTrialEligible = session?.user && !trialUsed && !hasActiveSub;
  const isTrialExpired = session?.user && trialUsed && !hasActiveSub;

  return (
    <div className="min-h-screen bg-[var(--background)]">

      {/* ── Hero Section ── */}
      <div className="relative overflow-hidden bg-[var(--foreground)] px-4 pb-16 pt-14 text-center">
        {/* subtle grid pattern */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(var(--background) 1px, transparent 1px), linear-gradient(90deg, var(--background) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        {/* Trial eligible badge */}
        {isTrialEligible && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-5 inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-4 py-1.5"
          >
            <Gift className="h-3.5 w-3.5 text-amber-400" />
            <span className="text-xs font-semibold text-amber-300">
              7-day free trial available — no card needed
            </span>
          </motion.div>
        )}

        {/* Trial expired badge */}
        {isTrialExpired && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-5 inline-flex items-center gap-2 rounded-full border border-red-400/30 bg-red-400/10 px-4 py-1.5"
          >
            <Clock className="h-3.5 w-3.5 text-red-400" />
            <span className="text-xs font-semibold text-red-300">
              Aapka free trial khatam ho gaya — subscribe karo
            </span>
          </motion.div>
        )}

        {/* Current plan badge */}
        {isTrial && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-5 inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-4 py-1.5"
          >
            <Star className="h-3.5 w-3.5 text-amber-400" />
            <span className="text-xs font-semibold text-amber-300">
              7-Day Free Trial active hai
            </span>
          </motion.div>
        )}

        <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
          Simple, honest pricing
        </h1>
        <p className="mt-3 text-base text-white/60">
          {data.subtitle || "Everything you need to ace your exams"}
        </p>

        {/* Billing Toggle */}
        <div className="mt-8 flex justify-center">
          <div className="flex rounded-xl border border-white/10 bg-white/5 p-1">
            <button
              onClick={() => setBilling("monthly")}
              className={`rounded-lg px-6 py-2 text-sm font-semibold transition-all duration-200 ${
                billing === "monthly"
                  ? "bg-white text-[var(--foreground)] shadow"
                  : "text-white/60 hover:text-white"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBilling("yearly")}
              className={`flex items-center gap-2 rounded-lg px-6 py-2 text-sm font-semibold transition-all duration-200 ${
                billing === "yearly"
                  ? "bg-white text-[var(--foreground)] shadow"
                  : "text-white/60 hover:text-white"
              }`}
            >
              Yearly
              {yearlySaving > 0 && (
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    billing === "yearly"
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-emerald-500/20 text-emerald-400"
                  }`}
                >
                  save {yearlySaving}%
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── Plan Cards ── */}
      <div className="mx-auto -mt-6 max-w-4xl px-4 pb-16">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">

          {/* Free Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="rounded-2xl border border-[var(--border)] bg-white p-7 shadow-sm"
          >
            <div className="mb-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-[var(--muted-text)]">
                Free
              </p>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-5xl font-black text-[var(--foreground)]">
                  {data.currency}0
                </span>
                <span className="text-sm text-[var(--muted-text)]">/mo</span>
              </div>
              <p className="mt-1 text-xs text-[var(--muted-text)]">Forever free</p>
            </div>

            {isTrialEligible ? (
              <button
                onClick={handleStartTrial}
                disabled={trialLoading}
                className="mb-6 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-amber-400 bg-amber-50 py-3 text-sm font-bold text-amber-700 transition hover:bg-amber-100 disabled:opacity-60"
              >
                <Gift className="h-4 w-4" />
                {trialLoading ? "Starting…" : "Start 7-Day Free Trial"}
              </button>
            ) : isTrial ? (
              <button
                disabled
                className="mb-6 w-full rounded-xl border-2 border-amber-200 bg-amber-50 py-3 text-sm font-bold text-amber-600"
              >
                Trial Active
              </button>
            ) : (
              <button
                disabled
                className="mb-6 w-full rounded-xl border-2 border-[var(--border)] py-3 text-sm font-semibold text-[var(--muted-text)]"
              >
                ✓ Current plan
              </button>
            )}

            <ul className="space-y-3.5">
              {[
                "Browse course catalog",
                "Read free blog articles",
                "Access community forum",
                { text: "Study Room Access", crossed: true },
                { text: "AI Study Assistant", crossed: true },
                { text: "Video Sessions", crossed: true },
                { text: "Slots Booking", crossed: true },
              ].map((item, i) => {
                const crossed = typeof item === "object" && item.crossed;
                const text = typeof item === "object" ? item.text : item;
                return (
                  <li key={i} className="flex items-center gap-3">
                    {crossed ? (
                      <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-gray-100">
                        <X className="h-3 w-3 text-gray-400" />
                      </span>
                    ) : (
                      <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-gray-100">
                        <Check className="h-3 w-3 text-gray-500" />
                      </span>
                    )}
                    <span
                      className={`text-sm ${
                        crossed ? "text-gray-300 line-through" : "text-[var(--foreground)]"
                      }`}
                    >
                      {text}
                    </span>
                  </li>
                );
              })}
            </ul>
          </motion.div>

          {/* Pro Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="relative rounded-2xl bg-[var(--foreground)] p-7 shadow-2xl"
          >
            {/* Popular badge */}
            <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-amber-400 px-5 py-1 text-[11px] font-black uppercase tracking-wider text-white shadow-lg">
              Most Popular
            </span>

            <div className="mb-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-white/50">
                {data.planName}
              </p>

              <AnimatePresence mode="wait">
                <motion.div
                  key={billing}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2 }}
                  className="mt-2 flex items-baseline gap-2"
                >
                  {tier.originalPrice > tier.offerPrice && (
                    <span className="text-sm text-white/40 line-through">
                      {data.currency}
                      {billing === "yearly"
                        ? Math.round(data.yearly.originalPrice / 12).toLocaleString("en-IN")
                        : data.monthly.originalPrice.toLocaleString("en-IN")}
                    </span>
                  )}
                  <span className="text-5xl font-black text-white">
                    {data.currency}
                    {perMonth.toLocaleString("en-IN")}
                  </span>
                  <span className="text-sm text-white/50">/mo</span>
                </motion.div>
              </AnimatePresence>

              {billing === "yearly" && (
                <p className="mt-1 text-xs text-emerald-400">
                  <Zap className="mr-0.5 inline h-3 w-3" />
                  Billed {data.currency}{data.yearly.offerPrice.toLocaleString("en-IN")}/yr · save {yearlySaving}%
                </p>
              )}
              {billing === "monthly" && tier.originalPrice > tier.offerPrice && (
                <p className="mt-1 text-xs text-emerald-400">First month offer price</p>
              )}
            </div>

            <button
              onClick={handleSubscribe}
              className="mb-2 w-full rounded-xl bg-white py-3 text-sm font-bold text-[var(--foreground)] shadow transition hover:bg-white/90 active:scale-[0.98]"
            >
              {session?.user ? (data.ctaText || "Upgrade Now") : "Login to Upgrade"}
            </button>

            {isTrialEligible && (
              <p className="mb-6 text-center text-xs text-white/50">
                or{" "}
                <button
                  onClick={handleStartTrial}
                  className="font-semibold text-amber-400 underline underline-offset-2 hover:text-amber-300"
                >
                  try free for 7 days
                </button>
              </p>
            )}
            {!isTrialEligible && <div className="mb-6" />}

            <ul className="space-y-3.5">
              {(data.features ?? []).map((feature, i) => (
                <li key={i} className="flex items-center gap-3">
                  <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-white/10">
                    <Check className="h-3 w-3 text-white" />
                  </span>
                  <span className="text-sm text-white/80">{feature}</span>
                </li>
              ))}
              <li className="flex items-center gap-3 pt-1">
                <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-amber-400/20">
                  <Star className="h-3 w-3 text-amber-400" />
                </span>
                <span className="text-sm font-semibold text-white">Everything in Free</span>
              </li>
            </ul>
          </motion.div>
        </div>

        {/* ── Trust Bar ── */}
        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center sm:gap-10">
          <div className="flex items-center gap-2 text-sm text-[var(--muted-text)]">
            <Shield className="h-4 w-4 text-emerald-500" />
            <span>Secure payments via Razorpay</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-[var(--muted-text)]">
            <Users className="h-4 w-4 text-blue-500" />
            <span>500+ active students</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-[var(--muted-text)]">
            <Zap className="h-4 w-4 text-amber-500" />
            <span>Cancel anytime, no questions</span>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-[var(--muted-text)]">
          Prices are inclusive of all taxes.
        </p>
      </div>
    </div>
  );
}
