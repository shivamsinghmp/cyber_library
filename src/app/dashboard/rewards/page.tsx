"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Gift, CheckCircle2, Clock, Award, CreditCard, Sparkles, Gem, ShieldCheck, Loader2, Trophy, TrendingUp } from "lucide-react";
import toast from "react-hot-toast";
import { motion } from "framer-motion";

type RewardItem = {
  id: string; name: string; description: string | null;
  amount: number; enrollmentAmount: number; type: string;
  enrolled: boolean; winStatus: string | null;
};

type Win = {
  id: string; status: string; wonAt: string; paidAt: string | null;
  reward: { id: string; name: string; amount: number; type: string };
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } },
};

export default function DashboardRewardsPage() {
  const [allRewards, setAllRewards]           = useState<RewardItem[]>([]);
  const [rewardsLoading, setRewardsLoading]   = useState(true);
  const [wins, setWins]                       = useState<Win[]>([]);
  const [loading, setLoading]                 = useState(true);

  useEffect(() => {
    fetch("/api/rewards", { credentials: "include" })
      .then(res => res.ok ? res.json() : [])
      .then((data: RewardItem[]) => setAllRewards(Array.isArray(data) ? data : []))
      .catch(() => setAllRewards([]))
      .finally(() => setRewardsLoading(false));
  }, []);

  useEffect(() => {
    fetch("/api/user/rewards", { credentials: "include" })
      .then(res => res.ok ? res.json() : [])
      .then((data: Win[]) => setWins(Array.isArray(data) ? data : []))
      .catch(() => setWins([]))
      .finally(() => setLoading(false));
  }, []);

  const pending  = wins.filter(w => w.status === "PENDING");
  const paid     = wins.filter(w => w.status === "PAID");
  const totalWon = wins.reduce((s, w) => s + w.reward.amount, 0);
  const totalPaid = paid.reduce((s, w) => s + w.reward.amount, 0);

  async function handleFreeEnroll(rewardId: string) {
    try {
      const res = await fetch("/api/user/rewards/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rewardId }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        toast.success("Enrolled successfully!");
        fetch("/api/rewards", { credentials: "include" }).then(r => r.ok ? r.json() : []).then((d: RewardItem[]) => setAllRewards(Array.isArray(d) ? d : []));
        fetch("/api/user/rewards", { credentials: "include" }).then(r => r.ok ? r.json() : []).then((d: Win[]) => setWins(Array.isArray(d) ? d : []));
      } else toast.error(data.error ?? "Enrollment failed.");
    } catch { toast.error("Enrollment failed."); }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">

      {/* Header */}
      <div className="bg-white rounded-2xl border border-[var(--border)] shadow-[var(--shadow-sm)] px-6 py-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center">
          <Trophy className="w-5 h-5 text-amber-500" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-[var(--foreground)]">Rewards Vault</h1>
          <p className="text-xs text-[var(--muted-text)]">Unlock challenges, join programs, and track your winnings</p>
        </div>
      </div>

      {/* Wallet Stats */}
      {!loading && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: "Total Won",     value: `₹${totalWon}`,  icon: Sparkles,   bg: "bg-amber-50 border-amber-200",  text: "text-amber-600",  iconBg: "bg-amber-100" },
            { label: "Paid to Bank",  value: `₹${totalPaid}`, icon: ShieldCheck,bg: "bg-emerald-50 border-emerald-200", text: "text-emerald-600", iconBg: "bg-emerald-100" },
            { label: "Pending",       value: `₹${totalWon - totalPaid}`, icon: Clock, bg: "bg-[var(--accent-pale)] border-[var(--accent-border)]", text: "text-[var(--accent)]", iconBg: "bg-[var(--accent-pale)]" },
          ].map(({ label, value, icon: Icon, bg, text, iconBg }) => (
            <div key={label} className={`rounded-2xl border ${bg} px-6 py-5 flex items-center gap-4`}>
              <div className={`w-12 h-12 rounded-xl ${iconBg} flex items-center justify-center shrink-0`}>
                <Icon className={`w-6 h-6 ${text}`} />
              </div>
              <div>
                <p className={`text-2xl font-black ${text}`}>{value}</p>
                <p className="text-xs font-semibold text-[var(--muted-text)] mt-0.5">{label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Available Rewards */}
      <div className="bg-white rounded-2xl border border-[var(--border)] shadow-[var(--shadow-sm)] overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--border)] flex items-center gap-2">
          <Award className="w-4 h-4 text-[var(--accent)]" />
          <h2 className="text-sm font-bold text-[var(--foreground)]">Available Rewards</h2>
          {allRewards.length > 0 && <span className="ml-auto text-xs text-[var(--muted-text)] bg-[var(--page-bg)] border border-[var(--border)] px-2 py-0.5 rounded-full">{allRewards.length}</span>}
        </div>

        {rewardsLoading ? (
          <div className="flex items-center justify-center py-14">
            <Loader2 className="w-7 h-7 animate-spin text-[var(--accent)]" />
          </div>
        ) : allRewards.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <Gift className="w-10 h-10 text-[var(--muted-text)] mx-auto mb-3 opacity-40" />
            <p className="text-sm font-semibold text-[var(--foreground)]">No rewards available</p>
            <p className="text-xs text-[var(--muted-text)] mt-1">Check back soon — new challenges are added regularly!</p>
          </div>
        ) : (
          <div className="p-5">
            <motion.div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
              initial="hidden" animate="show"
              variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } }}>
              {allRewards.map(r => (
                <motion.div key={r.id} variants={itemVariants}
                  className="group flex flex-col justify-between rounded-2xl border border-[var(--border)] bg-[var(--page-bg)] p-5 hover:border-[var(--accent-border)] hover:bg-white hover:shadow-[var(--shadow-md)] transition-all">
                  <div>
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-10 h-10 rounded-xl bg-[var(--accent-pale)] border border-[var(--accent-border)] flex items-center justify-center group-hover:bg-[var(--accent)] group-hover:border-[var(--accent)] transition-all">
                        <Gift className="w-5 h-5 text-[var(--accent)] group-hover:text-white transition-colors" />
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-[var(--muted-text)] uppercase tracking-wide">Prize</p>
                        <p className="text-xl font-black text-amber-500">₹{r.amount}</p>
                      </div>
                    </div>
                    <h3 className="text-base font-bold text-[var(--foreground)] mb-1.5">{r.name}</h3>
                    <p className="text-xs text-[var(--muted-text)] leading-relaxed line-clamp-3">{r.description || "No description provided."}</p>
                  </div>

                  <div className="mt-5 pt-4 border-t border-[var(--border)]">
                    {r.enrolled ? (
                      <div className={`w-full flex items-center justify-center py-3 rounded-xl border font-bold text-xs uppercase tracking-widest ${
                        r.winStatus === "PAID"
                          ? "bg-emerald-50 border-emerald-200 text-emerald-600"
                          : "bg-amber-50 border-amber-200 text-amber-600"
                      }`}>
                        {r.winStatus === "PAID" ? "🏆 Winner (Paid)" : "✅ Enrolled — Pending"}
                      </div>
                    ) : (r.enrollmentAmount ?? 0) > 0 ? (
                      <Link href={`/checkout?type=reward&rewardId=${encodeURIComponent(r.id)}&name=${encodeURIComponent(r.name)}&price=${r.enrollmentAmount}`}
                        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-bold text-xs uppercase tracking-widest transition-all shadow-[var(--shadow-brand)]">
                        <CreditCard className="w-4 h-4" /> Enroll for ₹{r.enrollmentAmount}
                      </Link>
                    ) : (
                      <button type="button" onClick={() => handleFreeEnroll(r.id)}
                        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-emerald-300 text-emerald-600 hover:bg-emerald-500 hover:text-white hover:border-emerald-500 font-bold text-xs uppercase tracking-widest transition-all">
                        <Gem className="w-4 h-4" /> Claim Free Entry
                      </button>
                    )}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        )}
      </div>

      {/* Win logs */}
      {!loading && wins.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Pending */}
          <div className="bg-white rounded-2xl border border-[var(--border)] shadow-[var(--shadow-sm)] overflow-hidden">
            <div className="px-5 py-4 border-b border-[var(--border)] flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" />
              <h3 className="text-sm font-bold text-[var(--foreground)]">Pending Verification</h3>
              <span className="ml-auto text-xs font-semibold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">{pending.length}</span>
            </div>
            <div className="p-4 space-y-3">
              {pending.length === 0 ? (
                <p className="text-sm text-[var(--muted-text)] text-center py-4">No pending rewards.</p>
              ) : pending.map(w => (
                <div key={w.id} className="flex items-center justify-between p-4 rounded-xl bg-amber-50 border border-amber-200">
                  <div>
                    <p className="text-sm font-bold text-[var(--foreground)]">{w.reward.name}</p>
                    <p className="text-xs text-amber-600 mt-0.5">Won: {new Date(w.wonAt).toLocaleDateString()}</p>
                  </div>
                  <span className="text-lg font-black text-amber-500">₹{w.reward.amount}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Paid */}
          <div className="bg-white rounded-2xl border border-[var(--border)] shadow-[var(--shadow-sm)] overflow-hidden">
            <div className="px-5 py-4 border-b border-[var(--border)] flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <h3 className="text-sm font-bold text-[var(--foreground)]">Successfully Paid</h3>
              <span className="ml-auto text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">{paid.length}</span>
            </div>
            <div className="p-4 space-y-3">
              {paid.length === 0 ? (
                <p className="text-sm text-[var(--muted-text)] text-center py-4">No paid rewards yet.</p>
              ) : paid.map(w => (
                <div key={w.id} className="flex items-center justify-between p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                  <div>
                    <p className="text-sm font-bold text-[var(--foreground)]">{w.reward.name}</p>
                    <p className="text-xs text-emerald-600 mt-0.5">Paid: {w.paidAt ? new Date(w.paidAt).toLocaleDateString() : "—"}</p>
                  </div>
                  <span className="text-lg font-black text-emerald-500">₹{w.reward.amount}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
