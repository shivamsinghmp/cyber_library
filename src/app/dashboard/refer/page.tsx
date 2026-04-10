"use client";

import { useState, useEffect } from "react";
import { UserPlus, Link2, Copy } from "lucide-react";
import toast from "react-hot-toast";

type ReferredUser = {
  id: string;
  name: string;
  email: string;
  joinedAt: string;
  rewarded: boolean;
};

export default function ReferPage() {
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [referralLink, setReferralLink] = useState<string | null>(null);
  const [referredUsers, setReferredUsers] = useState<ReferredUser[]>([]);
  const [referralLoading, setReferralLoading] = useState(true);
  const [referralGenerating, setReferralGenerating] = useState(false);

  useEffect(() => {
    setReferralLoading(true);
    fetch("/api/user/referral", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : {}))
      .then((data: { referralCode?: string; referralLink?: string; referredUsers?: ReferredUser[] }) => {
        setReferralCode(data.referralCode ?? null);
        setReferralLink(data.referralLink ?? null);
        setReferredUsers(Array.isArray(data.referredUsers) ? data.referredUsers : []);
      })
      .catch(() => {})
      .finally(() => setReferralLoading(false));
  }, []);

  async function handleGenerateReferral() {
    setReferralGenerating(true);
    try {
      const res = await fetch("/api/user/referral", { method: "POST", credentials: "include" });
      const data = await res.json();
      if (res.ok) {
        setReferralCode(data.referralCode ?? null);
        setReferralLink(data.referralLink ?? null);
        toast.success("Referral link ready! Share it with friends.");
      } else toast.error(data.error || "Could not generate link");
    } catch {
      toast.error("Could not generate link");
    } finally {
      setReferralGenerating(false);
    }
  }

  function copyReferralLink() {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink).then(
      () => toast.success("Link copied!"),
      () => toast.error("Copy failed")
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[var(--cream)] md:text-3xl">Refer & Earn</h1>
        <p className="mt-1 text-sm text-[var(--cream-muted)]">Invite friends and earn rewards when they join</p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-black/30 p-6 md:p-8">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-xl font-semibold text-[var(--cream)]">
            <UserPlus className="h-6 w-6 text-[var(--accent)]" />
            Your Referral
          </h2>
        </div>

        {referralLoading ? (
          <p className="rounded-xl border border-white/10 bg-black/20 px-4 py-8 text-center text-sm text-[var(--cream-muted)]">
            Loading your referral info…
          </p>
        ) : !referralCode ? (
          <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-10 text-center max-w-md mx-auto">
            <UserPlus className="mx-auto mb-4 h-12 w-12 text-[var(--accent)]/50" />
            <p className="text-sm text-[var(--cream-muted)] mb-6">
              Apna referral link banao — jitne friends is link se sign up karenge, unka data yahan dikhega.
            </p>
            <button
              type="button"
              onClick={handleGenerateReferral}
              disabled={referralGenerating}
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-[var(--ink)] hover:opacity-90 disabled:opacity-50"
            >
              <Link2 className="h-5 w-5" />
              {referralGenerating ? "Generating…" : "Generate referral link"}
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-[var(--accent)]/30 bg-[var(--accent)]/10 px-5 py-5 max-w-2xl">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-[var(--cream-muted)] mb-1">Your referral link</p>
                <p className="truncate font-mono text-base text-[var(--cream)] select-all">{referralLink}</p>
              </div>
              <button
                type="button"
                onClick={copyReferralLink}
                className="shrink-0 flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-sm font-medium text-[var(--cream)] hover:bg-white/20 transition"
              >
                <Copy className="h-4 w-4" />
                Copy link
              </button>
            </div>
            
            <div className="border-t border-white/10 pt-8">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-[var(--cream)]">
                  Referred friends ({referredUsers.length})
                </h3>
              </div>
              {referredUsers.length === 0 ? (
                <p className="rounded-xl border border-dashed border-white/20 bg-black/10 px-4 py-8 text-center text-sm text-[var(--cream-muted)] max-w-xl">
                  Abhi koi aapke link se sign up nahi kiya. Link share karo!
                </p>
              ) : (
                <ul className="space-y-3 max-w-2xl">
                  {referredUsers.map((u) => (
                    <li
                      key={u.id}
                      className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-[var(--cream)] truncate text-base">{u.name}</p>
                        <p className="text-xs text-[var(--cream-muted)] mt-0.5">{u.email}</p>
                      </div>
                      <div className="shrink-0 text-right ml-4">
                        <span className="text-xs text-[var(--cream-muted)] block">Joined</span>
                        <span className="text-sm font-medium text-[var(--cream)]">
                          {new Date(u.joinedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
