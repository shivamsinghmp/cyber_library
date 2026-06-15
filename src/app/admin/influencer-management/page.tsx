"use client";

import { useState, useEffect, useCallback } from "react";
import { Modal } from "@/components/Modal";
import {
  IndianRupee,
  Users,
  Activity,
  ChevronDown,
  ChevronUp,
  Plus,
  Eye,
  EyeOff,
} from "lucide-react";
import {
  AdminPageHeader,
  AdminTable,
  AdminTh,
  AdminTd,
} from "@/components/ui";

// ─── Types ────────────────────────────────────────────────────────────────────

type CouponRow = {
  id: string;
  code: string;
  discountType: string;
  discountValue: number;
  commissionRate: number;
  redemptionCount: number;
  earningCount: number;
  earningsTotal: number;
};

type EarningRow = {
  id: string;
  couponCode: string | null;
  couponId: string | null;
  transactionAmount: number;
  commissionAmount: number;
  status: string;
  paidAt: string | null;
  createdAt: string;
};

type InfluencerProfileData = {
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
} | null;

type ReferredUserRow = {
  id: string;
  name: string | null;
  email: string;
  joinedAt: string;
  trialStatus: "ACTIVE" | "EXPIRED" | "NONE";
  trialEndDate: string | null;
  planStatus: "ACTIVE" | "EXPIRED" | "NONE";
  planType: string | null;
  planEndDate: string | null;
  totalPurchaseAmount: number;
  commissionEarned: number;
  pendingCommission: number;
  paidCommission: number;
  attributionMethod: "COUPON" | "LINK";
};

type InfluencerRow = {
  id: string;
  name: string | null;
  email: string;
  referralCode: string | null;
  createdAt: string;
  influencerProfile: InfluencerProfileData;
  coupons: CouponRow[];
  earnings: EarningRow[];
  totalRedemptions: number;
  totalPaidConversions: number;
  totalEarnings: number;
  pendingEarnings: number;
  paidEarnings: number;
  linkClicks: number;
  registrationsViaLink: number;
  conversionsViaLink: number;
  referralLink: string | null;
  referredUsers: ReferredUserRow[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// ─── Stats Bar ────────────────────────────────────────────────────────────────

function TopStatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-4 w-4 text-indigo-600" />
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">{label}</p>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────

function InfluencerDetailModal({
  influencer,
  onClose,
  onPay,
  paying,
}: {
  influencer: InfluencerRow;
  onClose: () => void;
  onPay: (influencerId: string, earningIds?: string[]) => Promise<void>;
  paying: boolean;
}) {
  const ip = influencer.influencerProfile;

  return (
    <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-1">
      {/* Payout info */}
      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
          Payout Details
        </h3>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <DetailRow label="Name" value={influencer.name} />
          <DetailRow label="Email" value={influencer.email} />
          {ip?.upiId && <DetailRow label="UPI ID" value={ip.upiId} />}
          {ip?.bankAccountNo && (
            <DetailRow
              label="Bank"
              value={`****${ip.bankAccountNo.slice(-4)} (${ip.bankIfsc ?? "—"})`}
            />
          )}
          {ip?.bankAccountName && (
            <DetailRow label="Account Name" value={ip.bankAccountName} />
          )}
          {ip?.niche && <DetailRow label="Niche" value={ip.niche} />}
          {ip?.followerCount != null && (
            <DetailRow
              label="Followers"
              value={ip.followerCount.toLocaleString("en-IN")}
            />
          )}
          {ip?.instagram && <DetailRow label="Instagram" value={ip.instagram} />}
          {ip?.youtube && <DetailRow label="YouTube" value={ip.youtube} />}
          {ip?.twitter && <DetailRow label="Twitter" value={ip.twitter} />}
          {ip?.linkedin && <DetailRow label="LinkedIn" value={ip.linkedin} />}
        </div>
      </div>

      {/* Earnings summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 text-center">
          <p className="text-xs text-gray-500 mb-1">Total</p>
          <p className="font-bold text-gray-900">{formatCurrency(influencer.totalEarnings)}</p>
        </div>
        <div className="rounded-xl border border-amber-100 bg-amber-50 p-3 text-center">
          <p className="text-xs text-amber-600 mb-1">Pending</p>
          <p className="font-bold text-amber-700">{formatCurrency(influencer.pendingEarnings)}</p>
        </div>
        <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-center">
          <p className="text-xs text-emerald-600 mb-1">Paid</p>
          <p className="font-bold text-emerald-700">{formatCurrency(influencer.paidEarnings)}</p>
        </div>
      </div>

      {/* Conversion history */}
      {influencer.earnings.length > 0 && (
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
            Conversion History
          </h3>
          <div className="overflow-x-auto rounded-xl border border-gray-100">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-left text-[10px] uppercase tracking-wide text-gray-400">
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Coupon</th>
                  <th className="px-3 py-2">Txn Amt</th>
                  <th className="px-3 py-2">Commission</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {influencer.earnings.map((e) => (
                  <tr key={e.id} className="border-b border-gray-50">
                    <td className="px-3 py-1.5 text-gray-500">{formatDate(e.createdAt)}</td>
                    <td className="px-3 py-1.5 font-mono text-gray-700">{e.couponCode ?? "—"}</td>
                    <td className="px-3 py-1.5 text-gray-700">
                      {formatCurrency(e.transactionAmount)}
                    </td>
                    <td className="px-3 py-1.5 font-semibold text-indigo-600">
                      {formatCurrency(e.commissionAmount)}
                    </td>
                    <td className="px-3 py-1.5">
                      <span
                        className={`inline-flex rounded-full px-1.5 py-0.5 text-[9px] font-bold ${
                          e.status === "PAID"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {e.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Referred Users */}
      {influencer.referredUsers && influencer.referredUsers.length > 0 && (
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
            Referred Users ({influencer.referredUsers.length})
          </h3>
          <div className="overflow-x-auto rounded-xl border border-gray-100">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-left text-[10px] uppercase tracking-wide text-gray-400">
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Email</th>
                  <th className="px-3 py-2">Joined</th>
                  <th className="px-3 py-2">Trial</th>
                  <th className="px-3 py-2">Plan</th>
                  <th className="px-3 py-2">Purchases</th>
                  <th className="px-3 py-2">Commission</th>
                </tr>
              </thead>
              <tbody>
                {influencer.referredUsers.map((u) => (
                  <tr key={u.id} className="border-b border-gray-50">
                    <td className="px-3 py-1.5 text-gray-700">{u.name ?? "—"}</td>
                    <td className="px-3 py-1.5 font-mono text-gray-500">{u.email}</td>
                    <td className="px-3 py-1.5 text-gray-500">{formatDate(u.joinedAt)}</td>
                    <td className="px-3 py-1.5">
                      <span className={`inline-flex rounded-full px-1.5 py-0.5 text-[9px] font-bold ${
                        u.trialStatus === "ACTIVE"
                          ? "bg-emerald-100 text-emerald-700"
                          : u.trialStatus === "EXPIRED"
                          ? "bg-red-100 text-red-700"
                          : "bg-gray-100 text-gray-500"
                      }`}>
                        {u.trialStatus === "ACTIVE" ? "Active" : u.trialStatus === "EXPIRED" ? "Expired" : "None"}
                      </span>
                    </td>
                    <td className="px-3 py-1.5">
                      {u.planType ? (
                        <span className={`inline-flex rounded-full px-1.5 py-0.5 text-[9px] font-bold ${
                          u.planType === "MONTHLY"
                            ? "bg-indigo-100 text-indigo-700"
                            : "bg-purple-100 text-purple-700"
                        }`}>
                          {u.planType === "MONTHLY" ? "Monthly" : u.planType === "YEARLY" ? "Yearly" : u.planType}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-1.5 text-gray-700">{formatCurrency(u.totalPurchaseAmount)}</td>
                    <td className="px-3 py-1.5 font-semibold text-indigo-600">{formatCurrency(u.commissionEarned)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pay button */}
      {influencer.pendingEarnings > 0 && (
        <button
          onClick={() => onPay(influencer.id)}
          disabled={paying}
          className="w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
        >
          {paying
            ? "Processing..."
            : `Mark All as Paid (${formatCurrency(influencer.pendingEarnings)})`}
        </button>
      )}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">{label}</p>
      <p className="text-sm text-gray-800 truncate">{value}</p>
    </div>
  );
}

// ─── Create Influencer Modal ──────────────────────────────────────────────────

function CreateInfluencerModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState({ name: "", email: "", password: "", commissionRate: "10" });
  const [showPass, setShowPass] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ referralCode: string } | null>(null);

  function generatePassword() {
    const chars = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789@#$!";
    let p = "";
    for (let i = 0; i < 12; i++) p += chars[Math.floor(Math.random() * chars.length)];
    setForm((f) => ({ ...f, password: p }));
    setShowPass(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/admin/create-staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim() || undefined,
          email: form.email.trim(),
          password: form.password,
          accountType: "INFLUENCER",
          commissionRate: parseFloat(form.commissionRate) || 10,
        }),
      });
      const data = (await res.json()) as { success?: boolean; referralCode?: string; error?: unknown };
      if (!res.ok) {
        const msg = typeof data.error === "string"
          ? data.error
          : typeof data.error === "object" && data.error !== null
            ? Object.values(data.error as Record<string, string[]>).flat().join(", ")
            : "Kuch galat hua";
        setError(msg);
        return;
      }
      setCreated({ referralCode: data.referralCode ?? "" });
      onCreated();
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  }

  if (created) {
    const link = `https://lstudy.in/join?ref=${created.referralCode}`;
    return (
      <div className="space-y-4 text-center py-2">
        <div className="text-4xl">🎉</div>
        <p className="font-semibold text-gray-800">Influencer account ban gaya!</p>
        <div className="rounded-xl bg-indigo-50 border border-indigo-200 p-4 text-left">
          <p className="text-xs text-indigo-500 font-semibold mb-1">Referral Code</p>
          <p className="font-mono font-bold text-indigo-700 text-lg">{created.referralCode}</p>
          <p className="text-xs text-indigo-500 font-semibold mt-3 mb-1">Referral Link</p>
          <p className="font-mono text-xs text-indigo-700 break-all">{link}</p>
        </div>
        <button
          onClick={() => navigator.clipboard.writeText(link).catch(() => {})}
          className="w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          Copy Referral Link
        </button>
        <button onClick={onClose} className="w-full rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50">
          Close
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">Name</label>
        <input
          type="text"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder="Influencer ka naam"
          className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
        />
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">Email <span className="text-red-500">*</span></label>
        <input
          type="email"
          required
          value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          placeholder="influencer@example.com"
          className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
        />
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">Password <span className="text-red-500">*</span></label>
        <div className="relative flex gap-2">
          <input
            type={showPass ? "text" : "password"}
            required
            minLength={8}
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            placeholder="Min 8 characters"
            className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none pr-10"
          />
          <button type="button" onClick={() => setShowPass((v) => !v)}
            className="absolute right-[4.5rem] top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
          <button type="button" onClick={generatePassword}
            className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 whitespace-nowrap">
            Auto
          </button>
        </div>
        <p className="mt-1 text-[10px] text-gray-400">Influencer ko yeh password share karo login ke liye</p>
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">Commission Rate (%)</label>
        <input
          type="number"
          min="0"
          max="100"
          step="0.5"
          value={form.commissionRate}
          onChange={(e) => setForm((f) => ({ ...f, commissionRate: e.target.value }))}
          className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
        />
        <p className="mt-1 text-[10px] text-gray-400">Har paid plan purchase pe yeh % commission milega</p>
      </div>

      {error && <p className="rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-600">{error}</p>}

      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onClose}
          className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50">
          Cancel
        </button>
        <button type="submit" disabled={saving}
          className="flex-1 rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
          {saving ? "Creating..." : "Create Influencer"}
        </button>
      </div>
    </form>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function InfluencerManagementPage() {
  const [influencers, setInfluencers] = useState<InfluencerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInfluencer, setSelectedInfluencer] = useState<InfluencerRow | null>(null);
  const [paying, setPaying] = useState(false);
  const [expandedCoupons, setExpandedCoupons] = useState<Record<string, boolean>>({});
  const [showCreate, setShowCreate] = useState(false);

  const fetchInfluencers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/influencers");
      if (!res.ok) throw new Error("Failed");
      const data = (await res.json()) as InfluencerRow[];
      setInfluencers(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchInfluencers();
  }, [fetchInfluencers]);

  async function handlePay(influencerId: string, earningIds?: string[]) {
    setPaying(true);
    try {
      const res = await fetch(`/api/admin/influencers/${influencerId}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(earningIds ? { earningIds } : {}),
      });
      if (!res.ok) throw new Error("Failed");
      await fetchInfluencers();
      setSelectedInfluencer((prev) => {
        if (!prev || prev.id !== influencerId) return prev;
        // Update local state to reflect paid
        return {
          ...prev,
          earnings: prev.earnings.map((e) =>
            !earningIds || earningIds.includes(e.id)
              ? { ...e, status: "PAID", paidAt: new Date().toISOString() }
              : e
          ),
          pendingEarnings: 0,
          paidEarnings: prev.totalEarnings,
        };
      });
    } catch {
      // ignore
    } finally {
      setPaying(false);
    }
  }

  // Aggregate top stats
  const totalInfluencers = influencers.length;
  const totalPendingPayouts = influencers.reduce((s, i) => s + i.pendingEarnings, 0);
  const totalPaidOut = influencers.reduce((s, i) => s + i.paidEarnings, 0);
  const totalConversions = influencers.reduce((s, i) => s + i.totalPaidConversions, 0);

  function toggleCoupons(id: string) {
    setExpandedCoupons((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex items-start justify-between gap-4">
        <AdminPageHeader
          title="Influencer Management"
          description="Track influencer coupons, conversions, and process payouts."
        />
        <button
          onClick={() => setShowCreate(true)}
          className="flex shrink-0 items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition mt-1"
        >
          <Plus className="h-4 w-4" />
          New Influencer
        </button>
      </div>

      {/* Top stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <TopStatCard icon={Users} label="Total Influencers" value={String(totalInfluencers)} />
        <TopStatCard
          icon={Clock}
          label="Pending Payouts"
          value={formatCurrency(totalPendingPayouts)}
        />
        <TopStatCard
          icon={IndianRupee}
          label="Paid Out"
          value={formatCurrency(totalPaidOut)}
        />
        <TopStatCard
          icon={Activity}
          label="Total Conversions"
          value={String(totalConversions)}
        />
      </div>

      {/* Table */}
      <AdminTable
        loading={loading}
        empty={influencers.length === 0}
        emptyText="Koi influencer nahi mila. Kisi user ka role INFLUENCER set karo."
        minWidth="800px"
      >
        <thead>
          <tr className="border-b border-gray-200 text-left">
            <AdminTh>Name / Email</AdminTh>
            <AdminTh>Coupon Codes</AdminTh>
            <AdminTh>Registrations</AdminTh>
            <AdminTh>Conversions</AdminTh>
            <AdminTh>Pending</AdminTh>
            <AdminTh>Paid</AdminTh>
            <AdminTh>Link Clicks</AdminTh>
            <AdminTh>Registrations</AdminTh>
            <AdminTh>Conversions</AdminTh>
            <AdminTh>Referral Link</AdminTh>
            <AdminTh>Actions</AdminTh>
          </tr>
        </thead>
        <tbody>
          {influencers.map((inf) => (
            <>
              <tr key={inf.id} className="border-b border-gray-100">
                <AdminTd>
                  <p className="font-medium text-gray-900">{inf.name ?? "—"}</p>
                  <p className="text-xs text-gray-500">{inf.email}</p>
                </AdminTd>
                <AdminTd>
                  <div className="flex flex-wrap gap-1">
                    {inf.coupons.slice(0, 3).map((c) => (
                      <span
                        key={c.id}
                        className="inline-flex rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700"
                      >
                        {c.code}
                      </span>
                    ))}
                    {inf.coupons.length > 3 && (
                      <button
                        onClick={() => toggleCoupons(inf.id)}
                        className="inline-flex items-center gap-0.5 rounded-full border border-gray-200 px-2 py-0.5 text-[10px] text-gray-500 hover:bg-gray-50"
                      >
                        +{inf.coupons.length - 3}
                        {expandedCoupons[inf.id] ? (
                          <ChevronUp className="h-2.5 w-2.5" />
                        ) : (
                          <ChevronDown className="h-2.5 w-2.5" />
                        )}
                      </button>
                    )}
                  </div>
                  {expandedCoupons[inf.id] && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {inf.coupons.slice(3).map((c) => (
                        <span
                          key={c.id}
                          className="inline-flex rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700"
                        >
                          {c.code}
                        </span>
                      ))}
                    </div>
                  )}
                </AdminTd>
                <AdminTd>{inf.totalRedemptions}</AdminTd>
                <AdminTd>{inf.totalPaidConversions}</AdminTd>
                <AdminTd>
                  <span
                    className={`font-semibold ${
                      inf.pendingEarnings > 0 ? "text-amber-600" : "text-gray-400"
                    }`}
                  >
                    {formatCurrency(inf.pendingEarnings)}
                  </span>
                </AdminTd>
                <AdminTd>
                  <span className="text-emerald-600 font-semibold">
                    {formatCurrency(inf.paidEarnings)}
                  </span>
                </AdminTd>
                <AdminTd>{inf.linkClicks}</AdminTd>
                <AdminTd>{inf.registrationsViaLink}</AdminTd>
                <AdminTd>{inf.conversionsViaLink}</AdminTd>
                <AdminTd>
                  {inf.referralLink ? (
                    <button
                      onClick={() => navigator.clipboard.writeText(inf.referralLink!).catch(() => {})}
                      className="rounded-lg border border-indigo-200 bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-100 transition"
                    >
                      Copy Link
                    </button>
                  ) : (
                    <span className="text-xs text-gray-400">No code</span>
                  )}
                </AdminTd>
                <AdminTd>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedInfluencer(inf)}
                      className="rounded-lg border border-gray-200 px-3 py-1 text-xs font-medium text-gray-600 transition hover:bg-gray-50"
                    >
                      View Details
                    </button>
                    {inf.pendingEarnings > 0 && (
                      <button
                        onClick={() => handlePay(inf.id)}
                        disabled={paying}
                        className="rounded-lg bg-indigo-600 px-3 py-1 text-xs font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
                      >
                        Mark Paid
                      </button>
                    )}
                  </div>
                </AdminTd>
              </tr>
            </>
          ))}
        </tbody>
      </AdminTable>

      {/* Detail Modal */}
      <Modal
        isOpen={!!selectedInfluencer}
        title={selectedInfluencer ? `${selectedInfluencer.name ?? selectedInfluencer.email} — Details` : ""}
        onClose={() => setSelectedInfluencer(null)}
        className="max-w-2xl"
      >
        {selectedInfluencer && (
          <InfluencerDetailModal
            influencer={selectedInfluencer}
            onClose={() => setSelectedInfluencer(null)}
            onPay={handlePay}
            paying={paying}
          />
        )}
      </Modal>

      {/* Create Influencer Modal */}
      <Modal
        isOpen={showCreate}
        title="New Influencer Account"
        onClose={() => setShowCreate(false)}
        className="max-w-md"
      >
        <CreateInfluencerModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { void fetchInfluencers(); }}
        />
      </Modal>
    </div>
  );
}

// Needed for the top stats bar — import from lucide (not in AdminTable scope)
function Clock({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}
