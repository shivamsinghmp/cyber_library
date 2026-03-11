"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Gift, CheckCircle, Clock, Award, CreditCard } from "lucide-react";
import toast from "react-hot-toast";

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
        fetch("/api/rewards", { credentials: "include" })
          .then((r) => (r.ok ? r.json() : []))
          .then((d: RewardItem[]) => setAllRewards(Array.isArray(d) ? d : []))
          .catch(() => {});
        fetch("/api/user/rewards", { credentials: "include" })
          .then((r) => (r.ok ? r.json() : []))
          .then((d: Win[]) => setWins(Array.isArray(d) ? d : []))
          .catch(() => {});
      } else toast.error(data.error ?? "Enrollment failed.");
    } catch {
      toast.error("Enrollment failed.");
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 md:py-8">
      <h1 className="mb-2 text-2xl font-semibold text-[var(--cream)] md:text-3xl">
        Reward Program
      </h1>
      <p className="mb-6 text-sm text-[var(--cream-muted)]">
        All rewards created by admin are listed below. If you are enrolled in a reward, you will see Enrolled / Pending / Paid here and in My winnings.
      </p>

      {/* All rewards (admin-created) — show Enrolled when student is winner */}
      <section className="mb-8">
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-[var(--cream)]">
          <Award className="h-4 w-4 text-[var(--accent)]" />
          All rewards
        </h2>
        {rewardsLoading ? (
          <div className="rounded-2xl border border-white/10 bg-black/20 px-6 py-8 text-center text-sm text-[var(--cream-muted)]">
            Loading…
          </div>
        ) : allRewards.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-black/20 px-6 py-8 text-center text-sm text-[var(--cream-muted)]">
            No rewards in the program yet.
          </div>
        ) : (
          <div className="space-y-3">
            {allRewards.map((r) => (
              <div
                key={r.id}
                className="flex flex-col gap-3 rounded-xl border border-white/10 bg-black/25 p-4"
              >
                <div>
                  <p className="font-medium text-[var(--cream)]">{r.name}</p>
                  <p className="mt-1 text-sm text-[var(--cream-muted)] leading-relaxed">
                    {r.description || "No description."}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="text-xs text-[var(--cream-muted)]">Prize:</span>
                    <span className="text-sm font-semibold text-[var(--accent)]">₹{r.amount}</span>
                    <span className="text-xs text-[var(--cream-muted)]">· Enroll:</span>
                    <span className="text-sm font-medium text-[var(--cream)]">
                      {(r.enrollmentAmount ?? 0) > 0 ? `₹${r.enrollmentAmount}` : "Free"}
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  {r.enrolled ? (
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        r.winStatus === "PAID"
                          ? "bg-emerald-500/15 text-emerald-300"
                          : "bg-amber-500/15 text-amber-300"
                      }`}
                    >
                      {r.winStatus === "PAID" ? "Paid" : "Enrolled (Pending)"}
                    </span>
                  ) : ((r.enrollmentAmount ?? 0) > 0) ? (
                    <Link
                      href={`/checkout?type=reward&rewardId=${encodeURIComponent(r.id)}&name=${encodeURIComponent(r.name)}&price=${r.enrollmentAmount}`}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--accent)]/50 bg-[var(--accent)]/10 px-4 py-2 text-sm font-medium text-[var(--cream)] transition hover:bg-[var(--accent)]/20"
                    >
                      <CreditCard className="h-4 w-4" />
                      Pay ₹{r.enrollmentAmount} to enroll
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleFreeEnroll(r.id)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/50 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-300 transition hover:bg-emerald-500/20"
                    >
                      <Gift className="h-4 w-4" />
                      Enroll (Free)
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <h2 className="mb-3 mt-8 flex items-center gap-2 text-lg font-semibold text-[var(--cream)]">
        <Gift className="h-4 w-4 text-[var(--accent)]" />
        My winnings
      </h2>
      <p className="mb-6 text-sm text-[var(--cream-muted)]">
        When you win a reward, the amount is shown here. Paid rewards have been credited to you.
      </p>

      {loading ? (
        <div className="rounded-2xl border border-white/10 bg-black/20 px-6 py-12 text-center text-sm text-[var(--cream-muted)]">
          Loading…
        </div>
      ) : wins.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-black/20 px-6 py-12 text-center">
          <Gift className="mx-auto h-12 w-12 text-[var(--cream-muted)]/50" />
          <p className="mt-3 text-sm text-[var(--cream-muted)]">No rewards yet.</p>
          <p className="mt-1 text-xs text-[var(--cream-muted)]/80">
            Keep studying — you may win rewards from streaks, contests, or referrals!
          </p>
        </div>
      ) : (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
              <p className="text-xs font-medium text-[var(--cream-muted)]">Total won</p>
              <p className="text-2xl font-bold text-[var(--cream)]">₹{totalWon}</p>
            </div>
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
              <p className="text-xs font-medium text-emerald-300/80">Amount paid to you</p>
              <p className="text-2xl font-bold text-emerald-300">₹{totalPaid}</p>
            </div>
          </div>

          {pending.length > 0 && (
            <section className="mb-8">
              <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-[var(--cream)]">
                <Clock className="h-4 w-4 text-amber-400" />
                Pending ({pending.length})
              </h2>
              <div className="space-y-3">
                {pending.map((w) => (
                  <div
                    key={w.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4"
                  >
                    <div>
                      <p className="font-medium text-[var(--cream)]">{w.reward.name}</p>
                      <p className="text-sm text-amber-200/90">₹{w.reward.amount} · Won on {new Date(w.wonAt).toLocaleDateString()}</p>
                    </div>
                    <span className="rounded-full bg-amber-500/20 px-3 py-1 text-xs font-medium text-amber-200">
                      Pending payment
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section>
            <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-[var(--cream)]">
              <CheckCircle className="h-4 w-4 text-emerald-400" />
              Paid ({paid.length})
            </h2>
            {paid.length === 0 ? (
              <p className="rounded-xl border border-white/10 bg-black/20 px-4 py-6 text-center text-sm text-[var(--cream-muted)]">
                No paid rewards yet.
              </p>
            ) : (
              <div className="space-y-3">
                {paid.map((w) => (
                  <div
                    key={w.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 p-4"
                  >
                    <div>
                      <p className="font-medium text-[var(--cream)]">{w.reward.name}</p>
                      <p className="text-sm text-[var(--cream-muted)]">
                        ₹{w.reward.amount} · Paid on {w.paidAt ? new Date(w.paidAt).toLocaleDateString() : "—"}
                      </p>
                    </div>
                    <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-medium text-emerald-300">
                      Paid
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
