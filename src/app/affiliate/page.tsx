"use client";

import { useState, useEffect, useCallback } from "react";
import {
  TrendingUp,
  Users,
  IndianRupee,
  Clock,
  Tag,
  Activity,
  Save,
  AlertCircle,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type CouponStat = {
  id: string;
  code: string;
  discountType: string;
  discountValue: number;
  commissionRate: number;
  isActive: boolean;
  redemptionCount: number;
  earningCount: number;
  earningsTotal: number;
};

type EarningDetail = {
  id: string;
  couponCode: string;
  transactionAmount: number;
  commissionAmount: number;
  status: string;
  paidAt: string | null;
  createdAt: string;
  buyerEmail: string | null;
};

type Stats = {
  totalRedemptions: number;
  totalPaidConversions: number;
  totalEarnings: number;
  pendingEarnings: number;
  paidEarnings: number;
  coupons: CouponStat[];
  earnings: EarningDetail[];
};

type InfluencerProfile = {
  bankAccountName: string | null;
  bankAccountNo: string | null;
  bankIfsc: string | null;
  upiId: string | null;
  instagram: string | null;
  youtube: string | null;
  twitter: string | null;
  linkedin: string | null;
  website: string | null;
  niche: string | null;
  followerCount: number | null;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function maskEmail(email: string): string {
  const atIdx = email.indexOf("@");
  if (atIdx < 0) return "***";
  const local = email.slice(0, atIdx);
  const domain = email.slice(atIdx + 1);
  return `${local.slice(0, 2)}***@${domain}`;
}

function formatCurrency(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-5 ${
        accent
          ? "border-emerald-500/30 bg-emerald-500/10"
          : "border-white/10 bg-black/30"
      }`}
    >
      <div className="flex items-center gap-2 mb-2">
        <Icon
          className={`h-5 w-5 ${accent ? "text-emerald-300" : "text-[var(--accent)]"}`}
        />
        <p
          className={`text-xs font-medium ${
            accent ? "text-emerald-100/80" : "text-[var(--cream-muted)]"
          }`}
        >
          {label}
        </p>
      </div>
      <p
        className={`text-2xl font-bold ${
          accent ? "text-emerald-100" : "text-[var(--cream)]"
        }`}
      >
        {value}
      </p>
      {sub && (
        <p
          className={`mt-1 text-[11px] ${
            accent ? "text-emerald-100/70" : "text-[var(--cream-muted)]"
          }`}
        >
          {sub}
        </p>
      )}
    </div>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function EarningStatusBadge({ status }: { status: string }) {
  const isPaid = status === "PAID";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
        isPaid
          ? "bg-emerald-500/15 text-emerald-300"
          : "bg-amber-500/10 text-amber-200"
      }`}
    >
      {status}
    </span>
  );
}

// ─── Tabs ────────────────────────────────────────────────────────────────────

type TabId = "overview" | "coupons" | "conversions" | "payout";

const TABS: { id: TabId; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "coupons", label: "My Coupons" },
  { id: "conversions", label: "Conversions" },
  { id: "payout", label: "Payout Details" },
];

// ─── Payout Input ─────────────────────────────────────────────────────────────

function PayoutInput({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[var(--cream-muted)]">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-[var(--cream)] placeholder-[var(--cream-muted)]/50 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
      />
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AffiliatePage() {
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [stats, setStats] = useState<Stats | null>(null);
  const [profile, setProfile] = useState<InfluencerProfile>({
    bankAccountName: null,
    bankAccountNo: null,
    bankIfsc: null,
    upiId: null,
    instagram: null,
    youtube: null,
    twitter: null,
    linkedin: null,
    website: null,
    niche: null,
    followerCount: null,
  });
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [unauthorized, setUnauthorized] = useState(false);

  const fetchStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const res = await fetch("/api/influencer/stats");
      if (res.status === 403 || res.status === 401) {
        setUnauthorized(true);
        return;
      }
      if (!res.ok) throw new Error("Failed");
      const data = (await res.json()) as Stats;
      setStats(data);
    } catch {
      setError("Stats load karne mein error aayi.");
    } finally {
      setLoadingStats(false);
    }
  }, []);

  const fetchProfile = useCallback(async () => {
    setLoadingProfile(true);
    try {
      const res = await fetch("/api/influencer/profile");
      if (!res.ok) return;
      const data = (await res.json()) as InfluencerProfile | null;
      if (data) setProfile(data);
    } catch {
      // silently ignore
    } finally {
      setLoadingProfile(false);
    }
  }, []);

  useEffect(() => {
    void fetchStats();
    void fetchProfile();
  }, [fetchStats, fetchProfile]);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveMsg(null);
    try {
      const res = await fetch("/api/influencer/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...profile,
          followerCount: profile.followerCount ? Number(profile.followerCount) : null,
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      setSaveMsg("Profile saved successfully!");
    } catch {
      setSaveMsg("Save karne mein error aayi.");
    } finally {
      setSaving(false);
    }
  }

  function updateProfile(field: keyof InfluencerProfile, value: string | number | null) {
    setProfile((prev) => ({ ...prev, [field]: value || null }));
  }

  if (unauthorized) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 px-4 py-8">
        <div className="flex items-center gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-6">
          <AlertCircle className="h-6 w-6 text-red-400 shrink-0" />
          <div>
            <h1 className="text-lg font-semibold text-[var(--cream)]">Affiliate access only</h1>
            <p className="text-sm text-[var(--cream-muted)] mt-1">
              Yeh dashboard sirf INFLUENCER role ke accounts ke liye available hai. Admin se contact karo agar galti lag rahi hai.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 md:py-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600">
          <TrendingUp className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[var(--cream)]">Influencer Dashboard</h1>
          <p className="text-sm text-[var(--cream-muted)]">
            Apne coupons, conversions aur earnings track karo
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-white/10 bg-black/20 p-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${
              activeTab === tab.id
                ? "bg-indigo-600 text-white shadow"
                : "text-[var(--cream-muted)] hover:bg-white/5 hover:text-[var(--cream)]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab: Overview */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {loadingStats ? (
            <div className="grid gap-4 md:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-28 animate-pulse rounded-2xl border border-white/10 bg-black/30"
                />
              ))}
            </div>
          ) : stats ? (
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
              <StatCard
                icon={Users}
                label="Total Registrations"
                value={String(stats.totalRedemptions)}
                sub="Coupon use karke sign up kiye"
              />
              <StatCard
                icon={Activity}
                label="Paid Conversions"
                value={String(stats.totalPaidConversions)}
                sub="Jinse earning aayi"
                accent
              />
              <StatCard
                icon={IndianRupee}
                label="Total Earnings"
                value={formatCurrency(stats.totalEarnings)}
                sub={`Paid: ${formatCurrency(stats.paidEarnings)}`}
              />
              <StatCard
                icon={Clock}
                label="Pending Payout"
                value={formatCurrency(stats.pendingEarnings)}
                sub="Admin se request karo"
              />
            </div>
          ) : null}
        </div>
      )}

      {/* Tab: Coupons */}
      {activeTab === "coupons" && (
        <div className="rounded-2xl border border-white/10 bg-black/30">
          {loadingStats ? (
            <div className="p-6">
              <div className="h-32 animate-pulse rounded-xl bg-white/5" />
            </div>
          ) : !stats || stats.coupons.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <Tag className="h-10 w-10 text-[var(--cream-muted)]" />
              <p className="text-[var(--cream)] font-medium">Koi coupon nahi mila</p>
              <p className="text-sm text-[var(--cream-muted)]">
                Admin se apna coupon code maango aur woh tumhe assign kar denge.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-left text-[11px] uppercase tracking-wide text-[var(--cream-muted)]">
                    <th className="px-4 py-3">Code</th>
                    <th className="px-4 py-3">Discount</th>
                    <th className="px-4 py-3">Commission %</th>
                    <th className="px-4 py-3">Registrations</th>
                    <th className="px-4 py-3">Conversions</th>
                    <th className="px-4 py-3">Earnings</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.coupons.map((c) => (
                    <tr
                      key={c.id}
                      className="border-b border-white/5 hover:bg-white/[0.02]"
                    >
                      <td className="px-4 py-3 font-mono font-bold text-[var(--cream)]">
                        {c.code}
                      </td>
                      <td className="px-4 py-3 text-[var(--cream-muted)]">
                        {c.discountType === "PERCENT"
                          ? `${c.discountValue}%`
                          : `₹${c.discountValue}`}
                      </td>
                      <td className="px-4 py-3 text-[var(--cream-muted)]">
                        {c.commissionRate}%
                      </td>
                      <td className="px-4 py-3 text-[var(--cream)]">
                        {c.redemptionCount}
                      </td>
                      <td className="px-4 py-3 text-[var(--cream)]">{c.earningCount}</td>
                      <td className="px-4 py-3 font-medium text-emerald-300">
                        {formatCurrency(c.earningsTotal)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            c.isActive
                              ? "bg-emerald-500/15 text-emerald-300"
                              : "bg-gray-500/20 text-gray-400"
                          }`}
                        >
                          {c.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab: Conversions */}
      {activeTab === "conversions" && (
        <div className="rounded-2xl border border-white/10 bg-black/30">
          {loadingStats ? (
            <div className="p-6">
              <div className="h-32 animate-pulse rounded-xl bg-white/5" />
            </div>
          ) : !stats || stats.earnings.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <Activity className="h-10 w-10 text-[var(--cream-muted)]" />
              <p className="text-[var(--cream)] font-medium">Koi conversion nahi abhi tak</p>
              <p className="text-sm text-[var(--cream-muted)]">
                Jab koi tumhara coupon use karke kuch khareedega, woh yahan dikhega.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-left text-[11px] uppercase tracking-wide text-[var(--cream-muted)]">
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">Coupon</th>
                    <th className="px-4 py-3">Amount Paid</th>
                    <th className="px-4 py-3">My Commission</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.earnings.map((e) => (
                    <tr
                      key={e.id}
                      className="border-b border-white/5 hover:bg-white/[0.02]"
                    >
                      <td className="px-4 py-3 text-[var(--cream-muted)]">
                        {formatDate(e.createdAt)}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-[var(--cream-muted)]">
                        {e.buyerEmail ? maskEmail(e.buyerEmail) : "—"}
                      </td>
                      <td className="px-4 py-3 font-mono font-medium text-[var(--cream)]">
                        {e.couponCode}
                      </td>
                      <td className="px-4 py-3 text-[var(--cream)]">
                        {formatCurrency(e.transactionAmount)}
                      </td>
                      <td className="px-4 py-3 font-bold text-emerald-300">
                        {formatCurrency(e.commissionAmount)}
                      </td>
                      <td className="px-4 py-3">
                        <EarningStatusBadge status={e.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab: Payout Details */}
      {activeTab === "payout" && (
        <div className="rounded-2xl border border-white/10 bg-black/30 p-6">
          {loadingProfile ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-10 animate-pulse rounded-lg bg-white/5" />
              ))}
            </div>
          ) : (
            <form onSubmit={handleSaveProfile} className="space-y-6">
              {/* Bank Details */}
              <div>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--cream-muted)]">
                  Bank Details
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <PayoutInput
                    label="Account Holder Name"
                    value={profile.bankAccountName ?? ""}
                    onChange={(v) => updateProfile("bankAccountName", v)}
                    placeholder="Jaise: Rahul Kumar"
                  />
                  <PayoutInput
                    label="Account Number"
                    value={profile.bankAccountNo ?? ""}
                    onChange={(v) => updateProfile("bankAccountNo", v)}
                    placeholder="Bank account number"
                  />
                  <PayoutInput
                    label="IFSC Code"
                    value={profile.bankIfsc ?? ""}
                    onChange={(v) => updateProfile("bankIfsc", v.toUpperCase())}
                    placeholder="e.g. SBIN0001234"
                  />
                  <PayoutInput
                    label="UPI ID"
                    value={profile.upiId ?? ""}
                    onChange={(v) => updateProfile("upiId", v)}
                    placeholder="e.g. rahul@upi"
                  />
                </div>
              </div>

              {/* Social Media */}
              <div>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--cream-muted)]">
                  Social Media
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <PayoutInput
                    label="Instagram"
                    value={profile.instagram ?? ""}
                    onChange={(v) => updateProfile("instagram", v)}
                    placeholder="@username ya profile URL"
                  />
                  <PayoutInput
                    label="YouTube"
                    value={profile.youtube ?? ""}
                    onChange={(v) => updateProfile("youtube", v)}
                    placeholder="Channel URL"
                  />
                  <PayoutInput
                    label="Twitter / X"
                    value={profile.twitter ?? ""}
                    onChange={(v) => updateProfile("twitter", v)}
                    placeholder="@handle"
                  />
                  <PayoutInput
                    label="LinkedIn"
                    value={profile.linkedin ?? ""}
                    onChange={(v) => updateProfile("linkedin", v)}
                    placeholder="Profile URL"
                  />
                  <PayoutInput
                    label="Website"
                    value={profile.website ?? ""}
                    onChange={(v) => updateProfile("website", v)}
                    placeholder="https://yourwebsite.com"
                  />
                </div>
              </div>

              {/* Niche & Followers */}
              <div>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--cream-muted)]">
                  Content Details
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <PayoutInput
                    label="Niche"
                    value={profile.niche ?? ""}
                    onChange={(v) => updateProfile("niche", v)}
                    placeholder="e.g. UPSC, Study Tips, Education"
                  />
                  <PayoutInput
                    label="Total Followers"
                    type="number"
                    value={
                      profile.followerCount != null ? String(profile.followerCount) : ""
                    }
                    onChange={(v) =>
                      updateProfile("followerCount", v ? parseInt(v, 10) : null)
                    }
                    placeholder="Approximate total across platforms"
                  />
                </div>
              </div>

              {saveMsg && (
                <div
                  className={`rounded-lg px-4 py-2.5 text-sm ${
                    saveMsg.toLowerCase().includes("error")
                      ? "bg-red-500/10 text-red-300"
                      : "bg-emerald-500/10 text-emerald-300"
                  }`}
                >
                  {saveMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
              >
                <Save className="h-4 w-4" />
                {saving ? "Saving..." : "Save Details"}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
