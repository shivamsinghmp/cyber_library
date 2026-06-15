"use client";

import { useState, useEffect, useCallback } from "react";
import { Modal } from "@/components/Modal";
import {
  IndianRupee,
  Users,
  Activity,
  ChevronDown,
  ChevronUp,
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

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function InfluencerManagementPage() {
  const [influencers, setInfluencers] = useState<InfluencerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInfluencer, setSelectedInfluencer] = useState<InfluencerRow | null>(null);
  const [paying, setPaying] = useState(false);
  const [expandedCoupons, setExpandedCoupons] = useState<Record<string, boolean>>({});

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
      <AdminPageHeader
        title="Influencer Management"
        description="Track influencer coupons, conversions, and process payouts."
      />

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
