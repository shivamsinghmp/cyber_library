"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Gift, CheckCircle, Clock, Award, CreditCard, Sparkles, Gem, ShieldCheck, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { motion } from "framer-motion";

type RewardItem = {
  id: string;
  name: string;
  description: string | null;
  amount: number;
  enrollmentAmount: number;
  type: string;
  enrolled: boolean;
  winStatus: string | null;
};

type Win = {
  id: string;
  status: string;
  wonAt: string;
  paidAt: string | null;
  reward: { id: string; name: string; amount: number; type: string };
};

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } },
};

export default function DashboardRewardsPage() {
  const [allRewards, setAllRewards] = useState<RewardItem[]>([]);
  const [rewardsLoading, setRewardsLoading] = useState(true);
  const [wins, setWins] = useState<Win[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/rewards", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : []))
      .then((data: RewardItem[]) => setAllRewards(Array.isArray(data) ? data : []))
      .catch(() => setAllRewards([]))
      .finally(() => setRewardsLoading(false));
  }, []);

  useEffect(() => {
    fetch("/api/user/rewards", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : []))
      .then((data: Win[]) => setWins(Array.isArray(data) ? data : []))
      .catch(() => setWins([]))
      .finally(() => setLoading(false));
  }, []);

  const pending = wins.filter((w) => w.status === "PENDING");
  const paid = wins.filter((w) => w.status === "PAID");
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
        toast.success("Enrolled successfully.");
        // Refresh data
        fetch("/api/rewards", { credentials: "include" })
          .then((r) => (r.ok ? r.json() : []))
          .then((d: RewardItem[]) => setAllRewards(Array.isArray(d) ? d : []));
        fetch("/api/user/rewards", { credentials: "include" })
          .then((r) => (r.ok ? r.json() : []))
          .then((d: Win[]) => setWins(Array.isArray(d) ? d : []));
      } else toast.error(data.error ?? "Enrollment failed.");
    } catch {
      toast.error("Enrollment failed.");
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:py-12 relative min-h-screen">
      {/* Background ambient lighting */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[radial-gradient(ellipse_at_top,_rgba(212,175,55,0.1)_0%,_transparent_70%)] pointer-events-none" />

      {/* HEADER SECTION */}
      <div className="text-center mb-12 relative z-10">
        <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="mx-auto w-16 h-16 bg-gradient-to-b from-amber-200 to-amber-600 rounded-full flex items-center justify-center p-[2px] shadow-[0_0_30px_rgba(212,175,55,0.4)] mb-6">
           <div className="w-full h-full bg-black rounded-full flex items-center justify-center">
             <Gem className="w-8 h-8 text-amber-400" />
           </div>
        </motion.div>
        <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-4xl md:text-5xl font-black uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-500 drop-shadow-[0_0_20px_rgba(212,175,55,0.3)] mb-4">
          Rewards Vault
        </motion.h1>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="text-[var(--cream-muted)] max-w-2xl mx-auto font-medium">
          Unlock exclusive rewards, join premium challenges, and track your winnings. Hard work pays off in the Cyber Library!
        </motion.p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
           <Loader2 className="w-10 h-10 text-amber-500 animate-spin" />
        </div>
      ) : (
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-12 relative z-10">
          
          {/* STATS VAULT */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <motion.div variants={itemVariants} className="relative group overflow-hidden bg-black/40 border border-amber-500/20 rounded-[2rem] p-8 backdrop-blur-xl shadow-[0_0_30px_rgba(0,0,0,0.5)]">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative z-10 flex items-center justify-between">
                 <div>
                    <h3 className="text-sm font-extrabold uppercase tracking-[0.2em] text-amber-500/60 mb-2 whitespace-nowrap">Total Value Won</h3>
                    <p className="text-5xl font-black text-white drop-shadow-[0_0_15px_rgba(251,191,36,0.3)]">
                       ₹{totalWon}
                    </p>
                 </div>
                 <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                    <Sparkles className="w-8 h-8 text-amber-400" />
                 </div>
              </div>
            </motion.div>

            <motion.div variants={itemVariants} className="relative group overflow-hidden bg-black/40 border border-emerald-500/20 rounded-[2rem] p-8 backdrop-blur-xl shadow-[0_0_30px_rgba(0,0,0,0.5)]">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative z-10 flex items-center justify-between">
                 <div>
                    <h3 className="text-sm font-extrabold uppercase tracking-[0.2em] text-emerald-500/60 mb-2 whitespace-nowrap">Paid to Bank</h3>
                    <p className="text-5xl font-black text-white drop-shadow-[0_0_15px_rgba(52,211,153,0.3)]">
                       ₹{totalPaid}
                    </p>
                 </div>
                 <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                    <ShieldCheck className="w-8 h-8 text-emerald-400" />
                 </div>
              </div>
            </motion.div>
          </section>

          {/* THE MARKETPLACE */}
          <section>
            <div className="flex items-center gap-3 mb-6">
               <Award className="w-6 h-6 text-[var(--accent)]" />
               <h2 className="text-2xl font-bold text-white uppercase tracking-wider">Available Rewards</h2>
            </div>
            
            {rewardsLoading ? (
              <div className="flex items-center justify-center py-12">
                 <Loader2 className="w-8 h-8 text-[var(--accent)] animate-spin" />
              </div>
            ) : allRewards.length === 0 ? (
              <div className="rounded-[2rem] border border-white/5 bg-black/20 p-12 text-center">
                 <Gift className="mx-auto h-12 w-12 text-[var(--cream-muted)]/30 mb-4" />
                 <p className="text-lg text-[var(--cream-muted)] font-medium">The vault is currently empty.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {allRewards.map((r) => (
                  <motion.div
                    key={r.id}
                    variants={itemVariants}
                    className="group relative flex flex-col justify-between overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-b from-white/5 to-black/40 p-6 backdrop-blur-md transition-all hover:-translate-y-1 hover:shadow-[0_15px_40px_-10px_rgba(var(--accent-rgb),0.3)] hover:border-[var(--accent)]/40"
                  >
                    <div>
                      <div className="flex items-start justify-between mb-4">
                         <div className="p-3 bg-[var(--accent)]/10 rounded-2xl border border-[var(--accent)]/20 shadow-inner group-hover:bg-[var(--accent)]/20 transition-colors">
                            <Gift className="w-6 h-6 text-[var(--accent)]" />
                         </div>
                         <div className="text-right">
                            <span className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">Prize Value</span>
                            <span className="text-xl font-black text-amber-400 drop-shadow-md cursor-default">₹{r.amount}</span>
                         </div>
                      </div>
                      <h3 className="text-lg font-bold text-white mb-2">{r.name}</h3>
                      <p className="text-sm text-[var(--cream-muted)] leading-relaxed line-clamp-3">
                        {r.description || "No description provided."}
                      </p>
                    </div>

                    <div className="mt-8 pt-6 border-t border-white/5">
                      {r.enrolled ? (
                        <div className={`w-full flex items-center justify-center py-3 rounded-xl border font-bold uppercase tracking-widest text-[11px] ${r.winStatus === "PAID" ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]" : "bg-amber-500/10 border-amber-500/30 text-amber-400"}`}>
                           {r.winStatus === "PAID" ? "Winner (Paid)" : "Enrolled (Pending)"}
                        </div>
                      ) : ((r.enrollmentAmount ?? 0) > 0) ? (
                        <Link
                          href={`/checkout?type=reward&rewardId=${encodeURIComponent(r.id)}&name=${encodeURIComponent(r.name)}&price=${r.enrollmentAmount}`}
                          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-[var(--accent)]/50 bg-[var(--accent)] hover:bg-[var(--accent)]/90 text-black font-black uppercase tracking-widest text-[11px] shadow-[0_0_20px_rgba(var(--accent-rgb),0.4)] hover:scale-[1.02] transition-all"
                        >
                          <CreditCard className="w-4 h-4" /> Enroll for ₹{r.enrollmentAmount}
                        </Link>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleFreeEnroll(r.id)}
                          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-emerald-500 text-emerald-400 hover:bg-emerald-500 hover:text-black font-black uppercase tracking-widest text-[11px] transition-all hover:scale-[1.02] shadow-[0_0_15px_rgba(16,185,129,0.2)] hover:shadow-[0_0_25px_rgba(16,185,129,0.5)]"
                        >
                          <Gem className="w-4 h-4" /> Claim Free Entry
                        </button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </section>

          {/* INTERNAL LOGS (PENDING & PAID) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-12 pb-12 border-t border-white/5 pt-12">
            {/* PENDING */}
            <section>
              <h2 className="mb-6 flex items-center gap-3 text-xl font-bold text-white">
                <Clock className="h-5 w-5 text-amber-400" />
                Pending Verification
              </h2>
              {pending.length === 0 ? (
                 <p className="text-sm font-medium text-gray-500">No pending rewards.</p>
              ) : (
                <div className="space-y-4">
                  {pending.map((w) => (
                    <motion.div variants={itemVariants} key={w.id} className="group flex items-center justify-between p-5 rounded-2xl bg-amber-500/5 border border-amber-500/20 hover:bg-amber-500/10 transition-colors">
                      <div>
                        <p className="font-bold text-amber-100">{w.reward.name}</p>
                        <p className="text-xs font-semibold uppercase tracking-wider text-amber-500/60 mt-1">Won: {new Date(w.wonAt).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right">
                         <span className="text-lg font-black text-amber-400">₹{w.reward.amount}</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </section>

            {/* PAID */}
            <section>
              <h2 className="mb-6 flex items-center gap-3 text-xl font-bold text-white">
                <CheckCircle className="h-5 w-5 text-emerald-400" />
                Successfully Paid
              </h2>
              {paid.length === 0 ? (
                 <p className="text-sm font-medium text-gray-500">No paid rewards yet.</p>
              ) : (
                <div className="space-y-4">
                  {paid.map((w) => (
                    <motion.div variants={itemVariants} key={w.id} className="group flex items-center justify-between p-5 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 hover:bg-emerald-500/10 transition-colors">
                      <div>
                        <p className="font-bold text-emerald-100">{w.reward.name}</p>
                        <p className="text-xs font-semibold uppercase tracking-wider text-emerald-500/60 mt-1">Paid: {w.paidAt ? new Date(w.paidAt).toLocaleDateString() : "—"}</p>
                      </div>
                      <div className="text-right">
                         <span className="text-lg font-black text-emerald-400">₹{w.reward.amount}</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </section>
          </div>

        </motion.div>
      )}
    </div>
  );
}
