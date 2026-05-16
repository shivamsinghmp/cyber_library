"use client";

import { useState, useEffect } from "react";
import {
  ChevronLeft,
  Save,
  Plus,
  Trash2,
  Tag,
  IndianRupee,
  GripVertical,
  ExternalLink,
  Zap,
  Calendar,
  Clock,
} from "lucide-react";
import Link from "next/link";
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

function calcDiscount(original: number, offer: number): number {
  if (!original || original <= 0 || offer >= original) return 0;
  return Math.round(((original - offer) / original) * 100);
}

const DEFAULT: PricingData = {
  planName: "Pro Membership",
  subtitle: "Everything you need to ace your exams",
  currency: "₹",
  monthly: { originalPrice: 999, offerPrice: 499 },
  yearly: { originalPrice: 4999, offerPrice: 1999 },
  ctaText: "Get Started Now",
  ctaUrl: "/signup",
  features: [
    "Unlimited Study Room Access",
    "AI-Powered Study Assistant",
    "Live & Recorded Video Sessions",
    "Daily Study Slots Booking",
    "Performance Analytics Dashboard",
  ],
};

function PriceSection({
  label,
  icon,
  tier,
  currency,
  onChange,
}: {
  label: string;
  icon: React.ReactNode;
  tier: PriceTier;
  currency: string;
  onChange: (t: PriceTier) => void;
}) {
  const [mode, setMode] = useState<"flat" | "percent">("flat");
  const [pctInput, setPctInput] = useState(
    () => String(calcDiscount(tier.originalPrice, tier.offerPrice) || "")
  );

  function num(val: string) {
    const n = parseFloat(val);
    return isNaN(n) ? 0 : n;
  }

  function handleOriginalChange(val: string) {
    const orig = num(val);
    if (mode === "percent") {
      const pct = num(pctInput);
      const offer = pct > 0 ? Math.round(orig * (1 - pct / 100)) : orig;
      onChange({ originalPrice: orig, offerPrice: offer });
    } else {
      onChange({ ...tier, originalPrice: orig });
    }
  }

  function handlePctChange(val: string) {
    setPctInput(val);
    const pct = num(val);
    if (pct >= 0 && pct <= 100 && tier.originalPrice > 0) {
      onChange({ ...tier, offerPrice: Math.round(tier.originalPrice * (1 - pct / 100)) });
    }
  }

  function handleFlatOfferChange(val: string) {
    onChange({ ...tier, offerPrice: num(val) });
  }

  const discount = calcDiscount(tier.originalPrice, tier.offerPrice);
  const savings   = Math.max(0, tier.originalPrice - tier.offerPrice);

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-white p-6 shadow-[var(--shadow-sm)]">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-base font-semibold text-[var(--foreground)]">
          {icon} {label}
        </h2>
        {/* Mode toggle */}
        <div className="flex rounded-lg border border-[var(--border)] overflow-hidden text-xs font-semibold">
          <button
            type="button"
            onClick={() => setMode("flat")}
            className={`px-3 py-1.5 transition-colors ${mode === "flat" ? "bg-[var(--accent)] text-white" : "text-[var(--cream-muted)] hover:bg-gray-50"}`}
          >
            {currency} Flat Price
          </button>
          <button
            type="button"
            onClick={() => { setMode("percent"); setPctInput(String(discount || "")); }}
            className={`px-3 py-1.5 transition-colors ${mode === "percent" ? "bg-[var(--accent)] text-white" : "text-[var(--cream-muted)] hover:bg-gray-50"}`}
          >
            % Percent Off
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Original price — always flat */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">
            Original Price <span className="text-red-500 text-xs">(strikethrough)</span>
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--cream-muted)]">{currency}</span>
            <input
              type="number" min={0}
              value={tier.originalPrice || ""}
              onChange={(e) => handleOriginalChange(e.target.value)}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] pl-8 pr-4 py-2.5 text-sm text-[var(--foreground)] outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-400/20"
            />
          </div>
        </div>

        {/* Offer — flat or percent */}
        <div>
          {mode === "flat" ? (
            <>
              <label className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">
                Offer Price <span className="text-emerald-600 text-xs">(shown big)</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--cream-muted)]">{currency}</span>
                <input
                  type="number" min={0}
                  value={tier.offerPrice || ""}
                  onChange={(e) => handleFlatOfferChange(e.target.value)}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] pl-8 pr-4 py-2.5 text-sm text-[var(--foreground)] outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20"
                />
              </div>
            </>
          ) : (
            <>
              <label className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">
                Discount % <span className="text-emerald-600 text-xs">(auto-calculates offer)</span>
              </label>
              <div className="relative">
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold text-[var(--cream-muted)]">%</span>
                <input
                  type="number" min={0} max={100}
                  value={pctInput}
                  onChange={(e) => handlePctChange(e.target.value)}
                  placeholder="e.g. 50"
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] pl-4 pr-8 py-2.5 text-sm text-[var(--foreground)] outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20"
                />
              </div>
              <p className="mt-1 text-[11px] text-[var(--cream-muted)]">
                Offer price = {currency}{(tier.offerPrice || 0).toLocaleString("en-IN")}
              </p>
            </>
          )}
        </div>
      </div>

      {/* Live preview */}
      <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl bg-[var(--background)] px-4 py-3">
        {tier.originalPrice > tier.offerPrice && (
          <span className="text-base font-medium text-[var(--cream-muted)] line-through decoration-[var(--cream-muted)]">
            {currency}{tier.originalPrice.toLocaleString("en-IN")}
          </span>
        )}
        {discount > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-extrabold text-white"
            style={{ background: "linear-gradient(135deg,#ef4444,#f97316)" }}>
            -{discount}% OFF
          </span>
        )}
        <span className="text-2xl font-extrabold text-[var(--foreground)]">
          {currency}{(tier.offerPrice || 0).toLocaleString("en-IN")}
        </span>
        {savings > 0 && (
          <span className="text-xs text-emerald-600 font-semibold">
            Save {currency}{savings.toLocaleString("en-IN")}
          </span>
        )}
      </div>
    </div>
  );
}

export default function AdminPricingPage() {
  const [data, setData] = useState<PricingData>(DEFAULT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newFeature, setNewFeature] = useState("");

  useEffect(() => {
    fetch("/api/admin/pricing", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : DEFAULT))
      .then((d) => setData({ ...DEFAULT, ...d }))
      .catch(() => setData(DEFAULT))
      .finally(() => setLoading(false));
  }, []);

  async function save() {
    if (!data.planName.trim()) { toast.error("Plan name is required"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/pricing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error();
      toast.success("Pricing saved successfully!");
    } catch {
      toast.error("Failed to save pricing");
    }
    setSaving(false);
  }

  function addFeature() {
    const trimmed = newFeature.trim();
    if (!trimmed) return;
    setData((p) => ({ ...p, features: [...p.features, trimmed] }));
    setNewFeature("");
  }

  function removeFeature(i: number) {
    setData((p) => ({ ...p, features: p.features.filter((_, idx) => idx !== i) }));
  }

  function updateFeature(i: number, val: string) {
    setData((p) => {
      const next = [...p.features];
      next[i] = val;
      return { ...p, features: next };
    });
  }

  const yearlyVsMonthly =
    data.monthly.offerPrice > 0
      ? Math.round(((data.monthly.offerPrice * 12 - data.yearly.offerPrice) / (data.monthly.offerPrice * 12)) * 100)
      : 0;

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <p className="text-[var(--cream-muted)]">Loading pricing data…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/admin"
            className="inline-flex items-center gap-1 text-sm font-medium text-[var(--cream-muted)] hover:text-[var(--accent)]"
          >
            <ChevronLeft className="h-4 w-4" />
            Admin
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-[var(--foreground)]">Pricing Editor</h1>
          <p className="text-sm text-[var(--cream-muted)]">
            Changes reflect immediately on{" "}
            <Link href="/pricing" target="_blank" className="inline-flex items-center gap-0.5 text-[var(--accent)] hover:underline">
              /pricing <ExternalLink className="h-3 w-3" />
            </Link>
          </p>
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 rounded-xl bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:opacity-60"
        >
          <Save className="h-4 w-4" />
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </div>

      {/* Yearly saving banner */}
      {yearlyVsMonthly > 0 && (
        <div className="flex items-center gap-3 rounded-2xl border border-indigo-200 bg-indigo-50 px-5 py-3.5">
          <Zap className="h-5 w-5 text-indigo-600" />
          <p className="text-sm font-semibold text-indigo-700">
            Yearly plan saves customers {yearlyVsMonthly}% vs monthly billing
          </p>
        </div>
      )}

      {/* Plan Details */}
      <section className="rounded-2xl border border-[var(--border)] bg-white p-6 shadow-[var(--shadow-sm)]">
        <h2 className="mb-5 flex items-center gap-2 text-base font-semibold text-[var(--foreground)]">
          <Tag className="h-4 w-4 text-[var(--accent)]" />
          Plan Details
        </h2>
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">Plan Name</label>
            <input
              type="text"
              value={data.planName}
              onChange={(e) => setData((p) => ({ ...p, planName: e.target.value }))}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-2.5 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
              placeholder="e.g. Pro Membership"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">Subtitle</label>
            <input
              type="text"
              value={data.subtitle}
              onChange={(e) => setData((p) => ({ ...p, subtitle: e.target.value }))}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-2.5 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
              placeholder="e.g. Everything you need to ace your exams"
            />
          </div>
          <div className="w-32">
            <label className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">Currency Symbol</label>
            <input
              type="text"
              value={data.currency}
              onChange={(e) => setData((p) => ({ ...p, currency: e.target.value }))}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-2.5 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
              placeholder="₹"
              maxLength={3}
            />
          </div>
        </div>
      </section>

      {/* Monthly Pricing */}
      <PriceSection
        label="Monthly Pricing"
        icon={<Clock className="h-4 w-4 text-violet-500" />}
        tier={data.monthly}
        currency={data.currency}
        onChange={(t) => setData((p) => ({ ...p, monthly: t }))}
      />

      {/* Yearly Pricing */}
      <PriceSection
        label="Yearly Pricing"
        icon={<Calendar className="h-4 w-4 text-indigo-500" />}
        tier={data.yearly}
        currency={data.currency}
        onChange={(t) => setData((p) => ({ ...p, yearly: t }))}
      />

      {/* CTA */}
      <section className="rounded-2xl border border-[var(--border)] bg-white p-6 shadow-[var(--shadow-sm)]">
        <h2 className="mb-5 flex items-center gap-2 text-base font-semibold text-[var(--foreground)]">
          <IndianRupee className="h-4 w-4 text-[var(--accent)]" />
          Call to Action Button
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">Button Text</label>
            <input
              type="text"
              value={data.ctaText}
              onChange={(e) => setData((p) => ({ ...p, ctaText: e.target.value }))}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-2.5 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
              placeholder="Get Started Now"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">Button Link (URL)</label>
            <input
              type="text"
              value={data.ctaUrl}
              onChange={(e) => setData((p) => ({ ...p, ctaUrl: e.target.value }))}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-2.5 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
              placeholder="/signup"
            />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="rounded-2xl border border-[var(--border)] bg-white p-6 shadow-[var(--shadow-sm)]">
        <h2 className="mb-1 text-base font-semibold text-[var(--foreground)]">Features List</h2>
        <p className="mb-5 text-sm text-[var(--cream-muted)]">
          Checkmark items shown on the pricing page (same for both monthly & yearly).
        </p>
        <div className="space-y-2">
          {data.features.map((f, i) => (
            <div key={i} className="flex items-center gap-2">
              <GripVertical className="h-4 w-4 flex-shrink-0 text-[var(--cream-muted)]" />
              <input
                type="text"
                value={f}
                onChange={(e) => updateFeature(i, e.target.value)}
                className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-2 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
              />
              <button
                onClick={() => removeFeature(i)}
                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-[var(--cream-muted)] transition hover:bg-red-50 hover:text-red-500"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
        <div className="mt-4 flex gap-2">
          <input
            type="text"
            value={newFeature}
            onChange={(e) => setNewFeature(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addFeature()}
            className="flex-1 rounded-xl border border-dashed border-[var(--border)] bg-[var(--background)] px-4 py-2 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
            placeholder="Add a new feature… (press Enter)"
          />
          <button
            onClick={addFeature}
            className="flex items-center gap-1.5 rounded-xl bg-indigo-50 px-4 py-2 text-sm font-medium text-[var(--accent)] transition hover:bg-indigo-100"
          >
            <Plus className="h-4 w-4" />
            Add
          </button>
        </div>
        <p className="mt-2 text-xs text-[var(--cream-muted)]">{data.features.length} features listed</p>
      </section>

      {/* Save bottom */}
      <div className="flex justify-end pb-8">
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 rounded-xl bg-[var(--accent)] px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:opacity-90 disabled:opacity-60"
        >
          <Save className="h-4 w-4" />
          {saving ? "Saving…" : "Save Pricing"}
        </button>
      </div>
    </div>
  );
}
