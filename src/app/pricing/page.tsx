"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import {
  Check,
  Zap,
  Star,
  ArrowRight,
  Sparkles,
  Shield,
  Clock,
} from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";


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

function calcDiscount(original: number, offer: number): number {
  if (!original || original <= 0 || offer >= original) return 0;
  return Math.round(((original - offer) / original) * 100);
}

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};

export default function PricingPage() {
  const [data, setData] = useState<PricingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [billing, setBilling] = useState<"monthly" | "yearly">("yearly");

  const { data: session } = useSession();
  const router = useRouter();

  useEffect(() => {
    fetch("/api/pricing")
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  const handleSubscribe = useCallback(() => {
    if (!session?.user) {
      router.push(`/login?callbackUrl=${encodeURIComponent("/pricing")}`);
      return;
    }
    if (!data) return;

    const tier = billing === "monthly" ? data.monthly : data.yearly;
    const planType = billing === "monthly" ? "MONTHLY" : "YEARLY";
    const planLabel = `${planType === "MONTHLY" ? "Monthly" : "Yearly"} Membership`;

    const params = new URLSearchParams({
      type: "subscription",
      plan: planType,
      name: planLabel,
      amount: String(tier.offerPrice),
      originalAmount: String(tier.originalPrice),
    });
    router.push(`/checkout?${params.toString()}`);
  }, [session, data, billing, router]);

  const tier = data ? data[billing] : null;
  const discount = tier ? calcDiscount(tier.originalPrice, tier.offerPrice) : 0;
  const savings = tier ? tier.originalPrice - tier.offerPrice : 0;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[var(--accent)] border-t-transparent" />
          <p className="text-sm text-[var(--cream-muted)]">Loading pricing…</p>
        </div>
      </div>
    );
  }

  if (!data || !tier) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-[var(--cream-muted)]">Pricing unavailable. Please try again later.</p>
      </div>
    );
  }

  // Yearly saving vs monthly * 12
  const yearlyVsMonthly =
    billing === "yearly" && data.monthly.offerPrice > 0
      ? Math.round(((data.monthly.offerPrice * 12 - data.yearly.offerPrice) / (data.monthly.offerPrice * 12)) * 100)
      : 0;

  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--background)]">
      {/* Ambient glow orbs */}
      <div
        className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 h-[600px] w-[600px] rounded-full opacity-20"
        style={{ background: "radial-gradient(circle, #6366f1 0%, transparent 70%)" }}
      />
      <div
        className="pointer-events-none absolute bottom-0 right-0 h-[400px] w-[400px] rounded-full opacity-10"
        style={{ background: "radial-gradient(circle, #8b5cf6 0%, transparent 70%)" }}
      />

      <div className="relative z-10 mx-auto max-w-2xl px-4 py-20">
        {/* Header */}
        <motion.div
          className="mb-12 text-center"
          initial="hidden"
          animate="show"
          variants={stagger}
        >
          {/* Animated badge */}
          <motion.div variants={fadeUp} className="mb-5 flex justify-center">
            <span
              className="inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-bold text-white shadow-lg"
              style={{
                background: "linear-gradient(135deg,#f97316,#ef4444)",
                boxShadow: "0 4px 18px rgba(239,68,68,0.4)",
              }}
            >
              <Sparkles className="h-4 w-4" />
              Limited Time Offer — Don&apos;t Miss Out!
            </span>
          </motion.div>

          {/* Gradient headline */}
          <motion.h1
            variants={fadeUp}
            className="text-5xl font-extrabold tracking-tight sm:text-6xl"
            style={{
              background: "linear-gradient(135deg,#6366f1 0%,#8b5cf6 50%,#06b6d4 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            {data.planName}
          </motion.h1>

          {data.subtitle && (
            <motion.p
              variants={fadeUp}
              className="mt-4 text-lg font-medium text-[var(--cream-muted)]"
            >
              {data.subtitle}
            </motion.p>
          )}
        </motion.div>

        {/* ── Billing Toggle ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.25 }}
          className="mb-10 flex flex-col items-center gap-3"
        >
          <div
            className="relative flex items-center gap-1 rounded-2xl p-1.5 shadow-md"
            style={{
              background: "white",
              border: "1.5px solid rgba(99,102,241,0.2)",
              boxShadow: "0 4px 20px rgba(99,102,241,0.12)",
            }}
          >
            {/* sliding pill */}
            <motion.div
              className="absolute top-1.5 h-[calc(100%-12px)] w-[calc(50%-6px)] rounded-xl"
              style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}
              animate={{ left: billing === "monthly" ? 6 : "calc(50%)" }}
              transition={{ type: "spring", bounce: 0.25, duration: 0.4 }}
            />

            <button
              onClick={() => setBilling("monthly")}
              className={`relative z-10 rounded-xl px-8 py-2.5 text-sm font-bold transition-colors ${
                billing === "monthly" ? "text-white" : "text-[var(--cream-muted)] hover:text-[var(--foreground)]"
              }`}
            >
              Monthly
            </button>

            <button
              onClick={() => setBilling("yearly")}
              className={`relative z-10 flex items-center gap-2 rounded-xl px-8 py-2.5 text-sm font-bold transition-colors ${
                billing === "yearly" ? "text-white" : "text-[var(--cream-muted)] hover:text-[var(--foreground)]"
              }`}
            >
              Yearly
              {yearlyVsMonthly > 0 && (
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold ${
                    billing === "yearly"
                      ? "bg-white/25 text-white"
                      : "text-white"
                  }`}
                  style={billing !== "yearly" ? { background: "linear-gradient(135deg,#10b981,#059669)" } : {}}
                >
                  Save {yearlyVsMonthly}%
                </span>
              )}
            </button>
          </div>

          {/* Helper text under toggle */}
          {billing === "monthly" && yearlyVsMonthly > 0 && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-xs font-medium text-emerald-600"
            >
              Switch to Yearly and save {yearlyVsMonthly}% more 🎉
            </motion.p>
          )}
        </motion.div>

        {/* Pricing Card */}
        <motion.div
          initial={{ opacity: 0, y: 32, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.55, delay: 0.1 }}
          className="relative overflow-hidden rounded-3xl border border-[var(--border)] bg-white shadow-[var(--shadow-lg)]"
        >
          {/* Top gradient strip */}
          <div className="h-1.5 w-full bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500" />

          <div className="px-8 py-10 sm:px-12">
            {/* Discount badge */}
            {discount > 0 && (
              <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-4 py-1.5 text-sm font-semibold text-emerald-600 ring-1 ring-emerald-500/20">
                <Zap className="h-3.5 w-3.5" />
                Save {discount}% · You save {data.currency}{savings.toLocaleString("en-IN")}
              </div>
            )}

            {/* Price block — animates on billing change */}
            <div className="mb-8 flex flex-wrap items-end gap-4">
              <div className="flex flex-col">
                {/* Original price — red strikethrough + separate discount badge */}
                {tier.originalPrice > tier.offerPrice && (
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={`orig-${billing}`}
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 6 }}
                      transition={{ duration: 0.2 }}
                      className="flex items-center gap-2"
                    >
                      <span className="text-lg font-medium text-[var(--cream-muted)] line-through decoration-[var(--cream-muted)]">
                        {data.currency}{tier.originalPrice.toLocaleString("en-IN")}
                      </span>
                      {discount > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-extrabold text-white"
                          style={{ background: "linear-gradient(135deg,#ef4444,#f97316)" }}>
                          -{discount}% OFF
                        </span>
                      )}
                    </motion.div>
                  </AnimatePresence>
                )}

                {/* Offer price */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`offer-${billing}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.25 }}
                    className="flex items-baseline gap-1"
                  >
                    <span className="text-2xl font-semibold text-[var(--foreground)]">
                      {data.currency}
                    </span>
                    <span className="text-6xl font-extrabold tracking-tight text-[var(--foreground)]">
                      {tier.offerPrice.toLocaleString("en-IN")}
                    </span>
                    <span className="mb-1 text-base text-[var(--cream-muted)]">
                      /{billing === "monthly" ? "mo" : "yr"}
                    </span>
                  </motion.div>
                </AnimatePresence>

                {/* Per-month breakdown for yearly */}
                {billing === "yearly" && data.monthly.offerPrice > 0 && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-1 text-xs text-[var(--cream-muted)]"
                  >
                    ≈ {data.currency}{Math.round(tier.offerPrice / 12).toLocaleString("en-IN")}/mo · billed annually
                  </motion.p>
                )}
              </div>

              {/* Best value badge — only on yearly */}
              {billing === "yearly" && (
                <div className="mb-1 flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">
                  <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                  Best Value
                </div>
              )}
            </div>

            {/* CTA button */}
            <button
              onClick={handleSubscribe}
              className="mb-10 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 py-4 text-base font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:from-indigo-500 hover:to-violet-500 hover:shadow-indigo-500/40 active:scale-[0.98]"
            >
              {session?.user ? (data.ctaText || "Subscribe Now") : "Login to Subscribe"}
              <ArrowRight className="h-5 w-5" />
            </button>

            {/* Trust badges */}
            <div className="mb-8 flex flex-wrap justify-center gap-4 text-xs text-[var(--cream-muted)]">
              <span className="flex items-center gap-1">
                <Shield className="h-3.5 w-3.5 text-emerald-500" />
                Secure Payment
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-indigo-500" />
                Instant Access
              </span>
              <span className="flex items-center gap-1">
                <Star className="h-3.5 w-3.5 text-amber-500" />
                24/7 Support
              </span>
            </div>

            {/* Divider */}
            <div className="mb-6 border-t border-[var(--border)]" />

            {/* Features list */}
            <p className="mb-5 text-sm font-semibold uppercase tracking-widest text-[var(--cream-muted)]">
              What&apos;s included
            </p>
            <motion.ul
              initial="hidden"
              animate="show"
              variants={stagger}
              className="space-y-3"
            >
              {data.features.map((feature, i) => (
                <motion.li key={i} variants={fadeUp} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-indigo-600/10">
                    <Check className="h-3 w-3 text-indigo-600" />
                  </span>
                  <span className="text-sm leading-snug text-[var(--foreground)]">{feature}</span>
                </motion.li>
              ))}
            </motion.ul>
          </div>
        </motion.div>

        {/* Footer note */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-8 text-center text-xs text-[var(--cream-muted)]"
        >
          Prices are inclusive of all taxes. Cancel anytime.
        </motion.p>
      </div>
    </div>
  );
}
