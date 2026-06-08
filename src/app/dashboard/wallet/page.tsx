"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Coins, TrendingUp, TrendingDown, ShoppingBag, Sparkles,
  ChevronLeft, ChevronRight, Lock, CheckCircle2, ExternalLink,
  Zap, Brain, BookOpen, Clock, Gift, Flame, Star, Plus,
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import { motion } from "framer-motion";

type Log = {
  id: string;
  coins: number;
  reason: string;
  createdAt: string;
};

type SpendableProduct = {
  id: string;
  name: string;
  description: string | null;
  coinPrice: number;
  imageUrl: string | null;
  purchased: boolean;
};

type WalletData = {
  coinBalance: number;
  earnTotal: number;
  spendTotal: number;
  logs: Log[];
  hasMore: boolean;
  page: number;
  spendableProducts: SpendableProduct[];
};

const EARN_LABELS: Record<string, { label: string; icon: typeof Zap }> = {
  "25M_FOCUS_SESSION":        { label: "25m Focus Session", icon: Zap },
  "POMODORO_CYCLE_COMPLETED": { label: "Pomodoro Cycle", icon: Clock },
  "QUIZ_CORRECT":             { label: "Quiz Correct", icon: Brain },
  "TODO_COMPLETED":           { label: "Task Completed", icon: CheckCircle2 },
  "STREAK_MAINTAINED":        { label: "Streak Maintained", icon: Sparkles },
  "TAB_AWAY_VIOLATION":       { label: "Tab Away Penalty", icon: TrendingDown },
};

const COIN_PACK_LABELS: Record<string, string> = {
  COIN_PACK_COINS_100:  "Starter Pack (100 coins purchased)",
  COIN_PACK_COINS_350:  "Study Pack (350 coins purchased)",
  COIN_PACK_COINS_700:  "Power Pack (700 coins purchased)",
  COIN_PACK_COINS_1500: "Pro Pack (1500 coins purchased)",
};

function formatReason(reason: string): string {
  if (reason.startsWith("AI_MSG_PAID"))  return "AI StudyMate (paid)";
  if (reason.startsWith("AI_MSG_FREE"))  return "AI StudyMate (free)";
  if (reason.startsWith("PURCHASE_PRODUCT_")) return "Course Unlocked";
  if (COIN_PACK_LABELS[reason]) return COIN_PACK_LABELS[reason];
  return EARN_LABELS[reason]?.label ?? reason.replace(/_/g, " ");
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

type CheckinStatus = { checkedInToday: boolean; checkinCoins: number; streak: number };
type Filter = "all" | "earned" | "spent";

export default function WalletPage() {
  const [data, setData] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [page, setPage] = useState(1);
  const [spending, setSpending] = useState<string | null>(null);
  const [checkin, setCheckin] = useState<CheckinStatus | null>(null);
  const [checkingIn, setCheckingIn] = useState(false);

  const fetchWallet = useCallback(async (f: Filter = filter, p: number = page) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/user/wallet?filter=${f}&page=${p}`, { credentials: "include" });
      if (!res.ok) throw new Error();
      setData(await res.json());
    } catch {
      toast.error("Failed to load wallet");
    } finally {
      setLoading(false);
    }
  }, [filter, page]);

  useEffect(() => {
    fetchWallet();
    fetch("/api/user/wallet/checkin", { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) setCheckin(d); })
      .catch(() => {});
  }, []);

  function changeFilter(f: Filter) {
    setFilter(f);
    setPage(1);
    fetchWallet(f, 1);
  }

  function changePage(p: number) {
    setPage(p);
    fetchWallet(filter, p);
  }

  async function handleSpend(productId: string, productName: string, coinPrice: number) {
    if (!confirm(`Spend ${coinPrice} coins to unlock "${productName}"?`)) return;
    setSpending(productId);
    try {
      const res = await fetch("/api/user/wallet/spend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ productId }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error || "Purchase failed"); return; }
      toast.success(json.message);
      fetchWallet(filter, page);
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSpending(null);
    }
  }

  async function handleCheckin() {
    setCheckingIn(true);
    try {
      const res = await fetch("/api/user/wallet/checkin", { method: "POST", credentials: "include" });
      const json = await res.json();
      if (json.alreadyCheckedIn) { toast("You have already checked in today!"); return; }
      if (!res.ok) { toast.error(json.error || "Check-in failed"); return; }
      toast.success(`+${json.coins} coins! ${json.bonusCoins > 0 ? `+${json.bonusCoins} streak bonus!` : ""} 🎉`);
      setCheckin({ checkedInToday: true, checkinCoins: json.coins, streak: json.streak });
      fetchWallet(filter, page);
    } catch {
      toast.error("Check-in failed");
    } finally {
      setCheckingIn(false);
    }
  }

  const balance = data?.coinBalance ?? 0;

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-2 pb-10">

      {/* Balance Card */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-400 via-yellow-400 to-orange-400 p-6 shadow-xl"
      >
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "url('/noise.png')" }} />
        <div className="relative">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-semibold text-amber-900/80 uppercase tracking-widest">Coin Wallet</p>
              <Link
                href="/dashboard/wallet/buy-coins"
                className="mt-1 inline-flex items-center gap-1 rounded-lg bg-amber-900/20 hover:bg-amber-900/30 px-2.5 py-1 text-[10px] font-bold text-amber-900 transition-colors"
              >
                <Plus className="h-3 w-3" /> Buy Coins
              </Link>
              <div className="mt-2 flex items-end gap-2">
                <Coins className="h-10 w-10 text-amber-800 mb-1" />
                <p className="text-6xl font-black text-amber-900 tabular-nums leading-none">
                  {loading ? "—" : balance.toLocaleString("en-IN")}
                </p>
              </div>
              <p className="mt-1 text-sm font-medium text-amber-800/70">coins available</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold text-amber-800/60 uppercase tracking-wider">AI Credits</p>
              <p className="text-2xl font-black text-amber-900 mt-1">
                {loading ? "—" : Math.floor(balance / 5)}
              </p>
              <p className="text-[10px] text-amber-800/60">×10 messages each</p>
            </div>
          </div>

          {/* Earn / Spend stats */}
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white/25 px-4 py-3 backdrop-blur-sm">
              <div className="flex items-center gap-1.5 mb-1">
                <TrendingUp className="h-3.5 w-3.5 text-amber-900" />
                <p className="text-xs font-bold text-amber-900/70 uppercase tracking-wide">Total Earned</p>
              </div>
              <p className="text-xl font-black text-amber-900">{loading ? "—" : (data?.earnTotal ?? 0).toLocaleString()}</p>
            </div>
            <div className="rounded-2xl bg-white/25 px-4 py-3 backdrop-blur-sm">
              <div className="flex items-center gap-1.5 mb-1">
                <TrendingDown className="h-3.5 w-3.5 text-amber-900" />
                <p className="text-xs font-bold text-amber-900/70 uppercase tracking-wide">Total Spent</p>
              </div>
              <p className="text-xl font-black text-amber-900">{loading ? "—" : (data?.spendTotal ?? 0).toLocaleString()}</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Daily Check-in Card */}
      {checkin !== null && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-2xl p-5 flex items-center gap-4 border ${
            checkin.checkedInToday
              ? "bg-emerald-50 border-emerald-200"
              : "bg-white border-[var(--border)]"
          }`}
        >
          <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-2xl ${
            checkin.checkedInToday ? "bg-emerald-100" : "bg-amber-50 border border-amber-200"
          }`}>
            {checkin.checkedInToday ? "✅" : "🎁"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-[var(--foreground)]">
              {checkin.checkedInToday ? "Checked In Today!" : "Daily Check-in Bonus"}
            </p>
            <p className="text-sm text-[var(--cream-muted)]">
              {checkin.checkedInToday
                ? `Streak: ${checkin.streak} din 🔥 — Kal phir aana!`
                : `+${checkin.checkinCoins} coins milenge • Current streak: ${checkin.streak} din`
              }
            </p>
            {!checkin.checkedInToday && checkin.streak > 0 && (
              <div className="mt-1 flex items-center gap-1">
                {[7, 30].map((milestone) => (
                  <span key={milestone} className={`text-[10px] font-bold rounded-full px-2 py-0.5 ${
                    checkin.streak >= milestone ? "bg-amber-400 text-amber-900" : "bg-gray-100 text-gray-400"
                  }`}>
                    {milestone}d bonus
                  </span>
                ))}
              </div>
            )}
          </div>
          {!checkin.checkedInToday && (
            <button
              onClick={handleCheckin}
              disabled={checkingIn}
              className="shrink-0 flex items-center gap-2 rounded-xl bg-amber-400 hover:bg-amber-500 px-5 py-2.5 text-sm font-bold text-amber-900 shadow-md transition-all hover:shadow-lg disabled:opacity-60"
            >
              <Gift className="h-4 w-4" />
              {checkingIn ? "Claiming…" : "Claim"}
            </button>
          )}
          {checkin.checkedInToday && (
            <div className="shrink-0 flex items-center gap-1.5 text-sm font-bold text-emerald-600">
              <Flame className="h-4 w-4" />
              {checkin.streak} din
            </div>
          )}
        </motion.div>
      )}

      {/* How to Earn */}
      <div className="rounded-2xl border border-[var(--border)] bg-white p-5">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-[var(--foreground)] uppercase tracking-wider">
          <Sparkles className="h-4 w-4 text-[var(--accent)]" /> How to Earn Coins
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {[
            { label: "Daily Check-in", coins: checkin?.checkinCoins ?? 5, icon: Gift },
            { label: "25m Focus Session", coins: 25, icon: Zap },
            { label: "Correct Quiz Answer", coins: 1, icon: Brain },
            { label: "Complete Daily Task", coins: 1, icon: CheckCircle2 },
            { label: "Study Streak", coins: 1, icon: Sparkles },
            { label: "Pomodoro Cycle", coins: 2, icon: Clock },
            { label: "7-Day Check-in Streak", coins: 20, icon: Flame },
            { label: "30-Day Check-in Streak", coins: 100, icon: Star },
          ].map(({ label, coins, icon: Icon }) => (
            <div key={label} className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2.5">
              <Icon className="h-4 w-4 text-amber-500 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-medium text-[var(--foreground)] truncate">{label}</p>
                <p className="text-xs font-black text-amber-500">+{coins} coins</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Spend Section */}
      {(data?.spendableProducts?.length ?? 0) > 0 && (
        <div className="rounded-2xl border border-[var(--border)] bg-white p-5">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-[var(--foreground)] uppercase tracking-wider">
            <ShoppingBag className="h-4 w-4 text-[var(--accent)]" /> Unlock with Coins
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {data!.spendableProducts.map((product) => {
              const canAfford = balance >= product.coinPrice;
              return (
                <div key={product.id} className="flex flex-col justify-between rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
                      <BookOpen className="h-5 w-5 text-amber-500" />
                    </div>
                    <div>
                      <p className="font-semibold text-[var(--foreground)] text-sm">{product.name}</p>
                      {product.description && (
                        <p className="text-xs text-[var(--cream-muted)] mt-0.5 line-clamp-2">{product.description}</p>
                      )}
                    </div>
                  </div>
                  {product.purchased ? (
                    <div className="flex items-center justify-between rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2.5">
                      <span className="text-xs font-bold text-emerald-700 flex items-center gap-1.5">
                        <CheckCircle2 className="h-4 w-4" /> Unlocked
                      </span>
                      <Link href="/dashboard/store" className="text-xs text-emerald-600 hover:underline flex items-center gap-1">
                        Access <ExternalLink className="h-3 w-3" />
                      </Link>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleSpend(product.id, product.name, product.coinPrice)}
                      disabled={!canAfford || spending === product.id}
                      className={`w-full flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-bold transition-all ${
                        canAfford
                          ? "bg-amber-400 hover:bg-amber-500 text-amber-900 shadow-md hover:shadow-lg"
                          : "bg-gray-100 text-gray-400 cursor-not-allowed"
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        {canAfford ? <Coins className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                        {spending === product.id ? "Unlocking…" : canAfford ? "Unlock Now" : `Need ${product.coinPrice - balance} more`}
                      </span>
                      <span className="font-black text-base">{product.coinPrice.toLocaleString()} coins</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* AI Credits Info */}
      <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4 flex items-start gap-3">
        <div className="w-8 h-8 rounded-xl bg-indigo-100 border border-indigo-200 flex items-center justify-center shrink-0 mt-0.5">
          <Brain className="h-4 w-4 text-indigo-600" />
        </div>
        <div>
          <p className="text-sm font-bold text-indigo-900">AI StudyMate Credits</p>
          <p className="text-xs text-indigo-700 mt-0.5">
            Every 10 AI messages cost <strong>5 coins</strong>. You currently have <strong>{loading ? "…" : Math.floor(balance / 5)} batches</strong> ({loading ? "…" : balance} coins = {loading ? "…" : Math.floor(balance / 5) * 10} messages) available.
          </p>
          <Link href="/dashboard/studymate" className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:underline">
            Open AI StudyMate <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {/* Transaction History */}
      <div className="rounded-2xl border border-[var(--border)] bg-white overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--border)] flex flex-col sm:flex-row sm:items-center gap-3">
          <h2 className="text-sm font-bold text-[var(--foreground)]">Transaction History</h2>
          <div className="flex gap-1 rounded-xl border border-[var(--border)] bg-[var(--background)] p-1 sm:ml-auto">
            {(["all", "earned", "spent"] as Filter[]).map((f) => (
              <button
                key={f}
                onClick={() => changeFilter(f)}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all capitalize ${
                  filter === f
                    ? "bg-[var(--accent)] text-white shadow-sm"
                    : "text-[var(--cream-muted)] hover:text-[var(--foreground)]"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-14">
            <div className="h-7 w-7 animate-spin rounded-full border-4 border-amber-400 border-t-transparent" />
          </div>
        ) : (data?.logs?.length ?? 0) === 0 ? (
          <div className="py-14 text-center text-sm text-[var(--cream-muted)]">
            <Coins className="h-8 w-8 mx-auto mb-3 opacity-30" />
            No transactions yet. Start studying to earn coins!
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {data!.logs.map((log) => {
              const isEarn = log.coins > 0;
              const isNeutral = log.coins === 0;
              return (
                <div key={log.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-[var(--background)] transition-colors">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    isNeutral ? "bg-gray-100" : isEarn ? "bg-amber-50 border border-amber-200" : "bg-red-50 border border-red-200"
                  }`}>
                    {isNeutral ? (
                      <Brain className="h-4 w-4 text-gray-400" />
                    ) : isEarn ? (
                      <TrendingUp className="h-4 w-4 text-amber-500" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--foreground)] truncate">{formatReason(log.reason)}</p>
                    <p className="text-xs text-[var(--cream-muted)]">{timeAgo(log.createdAt)}</p>
                  </div>
                  <span className={`text-base font-black tabular-nums ${
                    isNeutral ? "text-gray-400" : isEarn ? "text-amber-500" : "text-red-500"
                  }`}>
                    {isNeutral ? "free" : `${isEarn ? "+" : ""}${log.coins}`}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {(page > 1 || data?.hasMore) && (
          <div className="flex items-center justify-between border-t border-[var(--border)] px-5 py-3">
            <button
              onClick={() => changePage(page - 1)}
              disabled={page === 1}
              className="flex items-center gap-1 rounded-xl border border-[var(--border)] px-3 py-1.5 text-xs font-semibold text-[var(--foreground)] hover:bg-[var(--background)] disabled:opacity-40"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Prev
            </button>
            <span className="text-xs text-[var(--cream-muted)]">Page {page}</span>
            <button
              onClick={() => changePage(page + 1)}
              disabled={!data?.hasMore}
              className="flex items-center gap-1 rounded-xl border border-[var(--border)] px-3 py-1.5 text-xs font-semibold text-[var(--foreground)] hover:bg-[var(--background)] disabled:opacity-40"
            >
              Next <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
