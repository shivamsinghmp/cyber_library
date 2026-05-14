"use client";

import { useState, useEffect } from "react";
import { UserPlus, Link2, Copy, Gift, Users, CheckCircle2, ArrowRight, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

type ReferredUser = {
  id: string; name: string; email: string; joinedAt: string; rewarded: boolean;
};

const HOW_STEPS = [
  { icon: Link2,        label: "Get your link",    desc: "Generate your unique referral link below" },
  { icon: Users,        label: "Invite friends",   desc: "Share with friends who want to study seriously" },
  { icon: Gift,         label: "Earn rewards",     desc: "Get rewarded when they join & purchase a plan" },
];

export default function ReferPage() {
  const [referralCode, setReferralCode]     = useState<string | null>(null);
  const [referralLink, setReferralLink]     = useState<string | null>(null);
  const [referredUsers, setReferredUsers]   = useState<ReferredUser[]>([]);
  const [referralLoading, setReferralLoading]     = useState(true);
  const [referralGenerating, setReferralGenerating] = useState(false);

  useEffect(() => {
    setReferralLoading(true);
    fetch("/api/user/referral", { credentials: "include" })
      .then(res => res.ok ? res.json() : {})
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
    } catch { toast.error("Could not generate link"); }
    finally { setReferralGenerating(false); }
  }

  function copyLink() {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink)
      .then(() => toast.success("Link copied!"))
      .catch(() => toast.error("Copy failed"));
  }

  const rewarded = referredUsers.filter(u => u.rewarded).length;

  return (
    <div className="mx-auto max-w-4xl space-y-6">

      {/* Header */}
      <div className="bg-white rounded-2xl border border-[var(--border)] shadow-[var(--shadow-sm)] px-6 py-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center">
          <Gift className="w-5 h-5 text-emerald-600" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-[var(--foreground)]">Refer & Earn</h1>
          <p className="text-xs text-[var(--muted-text)]">Invite friends and earn rewards when they join</p>
        </div>
      </div>

      {/* How it works */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {HOW_STEPS.map(({ icon: Icon, label, desc }, i) => (
          <div key={label} className="bg-white rounded-2xl border border-[var(--border)] shadow-[var(--shadow-sm)] px-5 py-4 flex items-start gap-3">
            <div className="shrink-0 w-8 h-8 rounded-lg bg-[var(--accent-pale)] border border-[var(--accent-border)] flex items-center justify-center">
              <Icon className="w-4 h-4 text-[var(--accent)]" />
            </div>
            <div>
              <p className="text-xs font-bold text-[var(--muted-text)] uppercase tracking-widest mb-0.5">Step {i + 1}</p>
              <p className="text-sm font-bold text-[var(--foreground)]">{label}</p>
              <p className="text-xs text-[var(--muted-text)] mt-0.5 leading-relaxed">{desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Stats strip */}
      {referralCode && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total Referred", value: referredUsers.length, color: "text-[var(--accent)]" },
            { label: "Rewarded", value: rewarded, color: "text-emerald-600" },
            { label: "Pending", value: referredUsers.length - rewarded, color: "text-amber-600" },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl border border-[var(--border)] shadow-[var(--shadow-sm)] px-5 py-4 text-center">
              <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
              <p className="text-xs text-[var(--muted-text)] mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Referral link / generate */}
      <div className="bg-white rounded-2xl border border-[var(--border)] shadow-[var(--shadow-sm)] overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--border)] flex items-center gap-2">
          <UserPlus className="w-4 h-4 text-[var(--accent)]" />
          <h2 className="text-sm font-bold text-[var(--foreground)]">Your Referral Link</h2>
        </div>

        <div className="px-6 py-6">
          {referralLoading ? (
            <div className="flex items-center gap-3 py-4 justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-[var(--accent)]" />
              <span className="text-sm text-[var(--muted-text)]">Loading referral info…</span>
            </div>
          ) : !referralCode ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 rounded-full bg-[var(--accent-pale)] border border-[var(--accent-border)] flex items-center justify-center mx-auto">
                <Link2 className="w-7 h-7 text-[var(--accent)]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--foreground)] mb-1">Generate your referral link</p>
                <p className="text-xs text-[var(--muted-text)] max-w-sm mx-auto leading-relaxed">
                  Apna referral link banao — jitne friends is link se sign up karenge, unka data yahan dikhega.
                </p>
              </div>
              <button type="button" onClick={handleGenerateReferral} disabled={referralGenerating}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-sm font-bold transition-all shadow-[var(--shadow-brand)] disabled:opacity-60">
                {referralGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
                {referralGenerating ? "Generating…" : "Generate Referral Link"}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-3 rounded-xl border border-[var(--accent-border)] bg-[var(--accent-pale)] px-4 py-3">
                <p className="flex-1 font-mono text-sm text-[var(--foreground)] truncate select-all">{referralLink}</p>
                <button type="button" onClick={copyLink}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[var(--accent)] text-white text-xs font-bold hover:bg-[var(--accent-hover)] transition-all">
                  <Copy className="w-3.5 h-3.5" /> Copy
                </button>
              </div>
              <p className="text-xs text-[var(--muted-text)] text-center">Share this link with friends. They get a welcome bonus, you earn rewards!</p>
            </div>
          )}
        </div>
      </div>

      {/* Referred users */}
      {referralCode && (
        <div className="bg-white rounded-2xl border border-[var(--border)] shadow-[var(--shadow-sm)] overflow-hidden">
          <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-[var(--accent)]" />
              <h2 className="text-sm font-bold text-[var(--foreground)]">Referred Friends</h2>
            </div>
            <span className="text-xs font-semibold text-[var(--muted-text)] bg-[var(--page-bg)] border border-[var(--border)] px-2 py-0.5 rounded-full">{referredUsers.length}</span>
          </div>

          {referredUsers.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <Users className="w-8 h-8 text-[var(--muted-text)] mx-auto mb-2 opacity-40" />
              <p className="text-sm font-semibold text-[var(--foreground)]">No referrals yet</p>
              <p className="text-xs text-[var(--muted-text)] mt-1">Abhi koi aapke link se sign up nahi kiya. Link share karo!</p>
            </div>
          ) : (
            <ul className="divide-y divide-[var(--border)]">
              {referredUsers.map(u => (
                <li key={u.id} className="flex items-center gap-4 px-6 py-4 hover:bg-[var(--page-bg)] transition-colors">
                  <div className="w-9 h-9 rounded-full bg-[var(--accent-pale)] border border-[var(--accent-border)] flex items-center justify-center text-sm font-bold text-[var(--accent)] shrink-0">
                    {u.name?.charAt(0)?.toUpperCase() || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[var(--foreground)] truncate">{u.name}</p>
                    <p className="text-xs text-[var(--muted-text)]">{u.email}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-[var(--muted-text)]">{new Date(u.joinedAt).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}</p>
                    {u.rewarded ? (
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1 mt-0.5 justify-end">
                        <CheckCircle2 className="w-3 h-3" /> Rewarded
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full mt-0.5 block">Pending</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
