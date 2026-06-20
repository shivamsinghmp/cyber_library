"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ChevronLeft, Search, Users, ArrowLeft } from "lucide-react";

type ReferrerRow = {
  referrerId: string;
  referrerName: string;
  referrerEmail: string;
  studentId: string | null;
  referralCode: string | null;
  referredCount: number;
  activeCount: number;
  inactiveCount: number;
};

type ReferralDetail = {
  id: string;
  name: string | null;
  email: string;
  referralCode: string | null;
  totalReferrals: number;
  activeReferrals: number;
  referrals: { id: string; name: string | null; email: string; joinedAt: string; rewarded: boolean; active: boolean }[];
};

export default function ReferralsClient() {
  const [list, setList] = useState<ReferrerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [detail, setDetail] = useState<ReferralDetail | null>(null);

  const fetchList = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/staff/referrals?q=${encodeURIComponent(q)}`, { credentials: "include" });
      if (res.ok) setList(await res.json());
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchList(search); }, [fetchList, search]);

  async function openDetail(id: string) {
    const res = await fetch(`/api/staff/referrals/${id}`, { credentials: "include" });
    if (res.ok) setDetail(await res.json());
  }

  if (detail) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <button onClick={() => setDetail(null)} className="inline-flex items-center gap-1 text-sm text-[var(--cream-muted)] hover:text-[var(--accent)]">
          <ArrowLeft className="h-4 w-4" /> Back to referrers
        </button>
        <h1 className="text-2xl font-semibold text-[var(--cream)]">{detail.name || detail.email}</h1>
        <p className="text-xs text-[var(--cream-muted)]">
          Code: <span className="font-mono">{detail.referralCode ?? "—"}</span> · {detail.totalReferrals} referred ({detail.activeReferrals} active)
        </p>
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/30">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left">
                {["Name", "Email", "Joined", "Status", "Rewarded"].map((h) => (
                  <th key={h} className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-[var(--cream-muted)]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {detail.referrals.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3 text-[var(--cream)]">{r.name || "—"}</td>
                  <td className="px-4 py-3 text-[var(--cream-muted)]">{r.email}</td>
                  <td className="px-4 py-3 text-[var(--cream-muted)]">{new Date(r.joinedAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${r.active ? "bg-emerald-500/20 text-emerald-400" : "bg-gray-500/20 text-gray-400"}`}>
                      {r.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[var(--cream-muted)]">{r.rewarded ? "Yes" : "No"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <Link href="/staff" className="inline-flex items-center gap-1 text-sm text-[var(--cream-muted)] hover:text-[var(--accent)]">
          <ChevronLeft className="h-4 w-4" /> Dashboard
        </Link>
        <h1 className="mt-1 flex items-center gap-2 text-2xl font-semibold text-[var(--cream)]">
          <Users className="h-5 w-5 text-[var(--accent)]" /> Referral Program
        </h1>
        <p className="text-xs text-[var(--cream-muted)]">Read-only overview — referral exports stay in the admin portal.</p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--cream-muted)]" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, email, code…"
          className="w-full rounded-xl border border-white/10 bg-black/40 pl-9 pr-4 py-2.5 text-sm text-[var(--cream)] placeholder:text-[var(--cream-muted)]/60 focus:border-[var(--accent)]/70 focus:outline-none"
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/30 shadow-xl">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--accent)] border-t-transparent" />
          </div>
        ) : list.length === 0 ? (
          <p className="py-16 text-center text-sm text-[var(--cream-muted)]">No referrers found.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left">
                {["Referrer", "Code", "Referred", "Active", ""].map((h) => (
                  <th key={h} className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-[var(--cream-muted)]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {list.map((r) => (
                <tr key={r.referrerId} className="hover:bg-black/20">
                  <td className="px-4 py-3">
                    <p className="font-medium text-[var(--cream)]">{r.referrerName}</p>
                    <p className="text-xs text-[var(--cream-muted)]">{r.referrerEmail}</p>
                  </td>
                  <td className="px-4 py-3 font-mono text-[var(--cream-muted)]">{r.referralCode ?? "—"}</td>
                  <td className="px-4 py-3 text-[var(--cream)]">{r.referredCount}</td>
                  <td className="px-4 py-3 text-emerald-400">{r.activeCount}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => openDetail(r.referrerId)} className="text-xs font-semibold text-[var(--accent)] hover:underline">
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
