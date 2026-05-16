"use client";

import Link from "next/link";
import { UserPlus, ChevronLeft, Users } from "lucide-react";
import { useFetch } from "@/hooks/useFetch";

type ReferredUser = {
  id: string;
  name: string | null;
  email: string;
  createdAt: string;
  referralRewarded: boolean;
};

type ReferrerRow = {
  referrerId: string;
  referrerName: string;
  referrerEmail: string;
  referralCode: string | null;
  role: string;
  referredCount: number;
  referredUsers?: ReferredUser[];
};

export default function AdminReferralsPage() {
  const { data, loading } = useFetch<ReferrerRow[]>("/api/admin/referrals?includeReferred=true");
  const list = data ?? [];

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-6">
      <div>
        <Link href="/admin" className="inline-flex items-center gap-1 text-sm font-medium text-[var(--cream-muted)] hover:text-[var(--accent)]">
          <ChevronLeft className="h-4 w-4" /> Back to Admin
        </Link>
        <h1 className="mt-2 flex items-center gap-2 text-2xl font-bold text-[var(--cream)]">
          <UserPlus className="h-7 w-7 text-[var(--accent)]" /> Referrals
        </h1>
        <p className="mt-1 text-sm text-[var(--cream-muted)]">Kaun kitne students refer kar raha hai — referrer list aur unke referred users</p>
      </div>

      {loading ? (
        <p className="rounded-2xl border border-gray-200 bg-white px-6 py-10 text-center text-sm text-[var(--cream-muted)]">Loading…</p>
      ) : list.length === 0 ? (
        <p className="rounded-2xl border border-gray-200 bg-white px-6 py-10 text-center text-sm text-[var(--cream-muted)]">Abhi koi referral data nahi. Students apna referral link generate karenge to yahan dikhega.</p>
      ) : (
        <div className="space-y-4">
          {list.map((row) => (
            <div key={row.referrerId} className="rounded-2xl border border-gray-200 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-gray-900">{row.referrerName}</p>
                  <p className="text-xs text-[var(--cream-muted)]">{row.referrerEmail}</p>
                  <p className="mt-1 font-mono text-xs text-[var(--accent)]">{row.referralCode ?? "—"}</p>
                </div>
                <div className="flex items-center gap-2 rounded-xl bg-indigo-100 px-4 py-2">
                  <Users className="h-4 w-4 text-[var(--accent)]" />
                  <span className="text-lg font-bold text-gray-900">{row.referredCount}</span>
                  <span className="text-xs text-[var(--cream-muted)]">referred</span>
                </div>
              </div>
              {(row.referredUsers ?? []).length > 0 && (
                <div className="mt-4 border-t border-gray-200 pt-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">Referred users</p>
                  <ul className="space-y-1.5">
                    {row.referredUsers!.map((u) => (
                      <li key={u.id} className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm">
                        <span className="truncate font-medium text-[var(--cream)]">{u.name || u.email}</span>
                        <span className="ml-2 shrink-0 text-xs text-[var(--cream-muted)]">
                          {new Date(u.createdAt).toLocaleDateString()}
                          {u.referralRewarded && <span className="ml-1 rounded bg-emerald-100 px-1 text-emerald-700">Rewarded</span>}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
