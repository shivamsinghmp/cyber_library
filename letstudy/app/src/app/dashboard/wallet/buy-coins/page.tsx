"use client";

import { useState } from "react";
import { Coins, ArrowLeft, Zap, Star, Crown, Rocket, CheckCircle2, Pencil } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { motion } from "framer-motion";

declare global {
  interface Window {
    Razorpay: new (options: {
      key: string;
      amount: number;
      order_id: string;
      name: string;
      description?: string;
      handler: (response: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => void;
      modal?: { ondismiss?: () => void };
    }) => { open: () => void };
  }
}

type Pack = {
  id: string;
  coins: number;
  priceRupees: number;
  label: string;
  icon: typeof Zap;
  color: string;
  bg: string;
  border: string;
  badge?: string;
  perCoin: string;
};

const PACKS: Pack[] = [
  {
    id: "COINS_100",
    coins: 100,
    priceRupees: 50,
    label: "Starter Pack",
    icon: Zap,
    color: "text-sky-600",
    bg: "bg-sky-50",
    border: "border-sky-200",
    perCoin: "₹0.50/coin",
  },
  {
    id: "COINS_350",
    coins: 350,
    priceRupees: 150,
    label: "Study Pack",
    icon: Star,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    perCoin: "₹0.43/coin",
    badge: "Popular",
  },
  {
    id: "COINS_700",
    coins: 700,
    priceRupees: 275,
    label: "Power Pack",
    icon: Rocket,
    color: "text-violet-600",
    bg: "bg-violet-50",
    border: "border-violet-200",
    perCoin: "₹0.39/coin",
    badge: "Save 21%",
  },
  {
    id: "COINS_1500",
    coins: 1500,
    priceRupees: 499,
    label: "Pro Pack",
    icon: Crown,
    color: "text-amber-600",
    bg: "bg-amber-50",
    border: "border-amber-200",
    perCoin: "₹0.33/coin",
    badge: "Best Value",
  },
];

function loadRazorpayScript(): Promise<void> {
  if (typeof window !== "undefined" && window.Razorpay) return Promise.resolve();
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => resolve();
    document.body.appendChild(script);
  });
}

const COINS_PER_RUPEE = 2; // 1 coin = ₹0.50

export default function BuyCoinsPage() {
  const router = useRouter();
  const [buying, setBuying] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ coins: number; label: string } | null>(null);
  const [customAmount, setCustomAmount] = useState("");

  async function handleBuy(pack: Pack) {
    setBuying(pack.id);
    try {
      const orderRes = await fetch("/api/razorpay/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ type: "COIN_PACK", ids: [pack.id] }),
      });
      const orderData = await orderRes.json().catch(() => ({}));
      if (!orderRes.ok) {
        toast.error(orderData.error ?? "Failed to create order");
        setBuying(null);
        return;
      }

      const { orderId, keyId, amount } = orderData as { orderId: string; keyId: string; amount: number };

      await loadRazorpayScript();
      if (!window.Razorpay) {
        toast.error("Payment gateway failed to load. Please try again.");
        setBuying(null);
        return;
      }

      const rzp = new window.Razorpay({
        key: keyId,
        amount,
        order_id: orderId,
        name: "Let's Study",
        description: `${pack.label} — ${pack.coins} coins`,
        handler: async (response) => {
          try {
            const verifyRes = await fetch("/api/razorpay/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
                type: "COIN_PACK",
                ids: [pack.id],
              }),
            });
            if (verifyRes.ok) {
              setSuccess({ coins: pack.coins, label: pack.label });
            } else {
              const d = await verifyRes.json().catch(() => ({}));
              toast.error(d.error ?? "Payment could not be verified. Please contact support.");
            }
          } catch {
            toast.error("Verification error. Please contact support.");
          } finally {
            setBuying(null);
          }
        },
        modal: {
          ondismiss: () => setBuying(null),
        },
      });
      rzp.open();
    } catch {
      toast.error("Something went wrong");
      setBuying(null);
    }
  }

  const customRupees = parseInt(customAmount, 10);
  const customCoins = Number.isFinite(customRupees) && customRupees >= 10 ? customRupees * COINS_PER_RUPEE : 0;
  const customValid = customRupees >= 10 && customRupees <= 10000;

  async function handleBuyCustom() {
    if (!customValid) return;
    const packId = `COINS_CUSTOM_${customRupees}`;
    setBuying(packId);
    try {
      const orderRes = await fetch("/api/razorpay/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ type: "COIN_PACK", ids: [packId] }),
      });
      const orderData = await orderRes.json().catch(() => ({}));
      if (!orderRes.ok) { toast.error(orderData.error ?? "Failed to create order"); setBuying(null); return; }

      const { orderId, keyId, amount } = orderData as { orderId: string; keyId: string; amount: number };
      await loadRazorpayScript();
      if (!window.Razorpay) { toast.error("Payment gateway failed to load."); setBuying(null); return; }

      const rzp = new window.Razorpay({
        key: keyId, amount, order_id: orderId,
        name: "Let's Study",
        description: `Custom Pack — ${customCoins} coins`,
        handler: async (response) => {
          try {
            const verifyRes = await fetch("/api/razorpay/verify", {
              method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
              body: JSON.stringify({ ...response, type: "COIN_PACK", ids: [packId] }),
            });
            if (verifyRes.ok) setSuccess({ coins: customCoins, label: "Custom Pack" });
            else { const d = await verifyRes.json().catch(() => ({})); toast.error(d.error ?? "Payment could not be verified."); }
          } catch { toast.error("Verification error."); }
          finally { setBuying(null); }
        },
        modal: { ondismiss: () => setBuying(null) },
      });
      rzp.open();
    } catch { toast.error("Something went wrong"); setBuying(null); }
  }

  if (success) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", bounce: 0.5 }}
          className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-3xl bg-amber-100 border-2 border-amber-300 shadow-lg"
        >
          <CheckCircle2 className="h-12 w-12 text-amber-500" />
        </motion.div>
        <h1 className="text-3xl font-black text-[var(--foreground)]">Coins Added!</h1>
        <p className="mt-2 text-[var(--muted-text)]">
          <strong className="text-amber-600">{success.coins.toLocaleString("en-IN")} coins</strong> have been added to your wallet.
        </p>
        <p className="mt-1 text-sm text-[var(--muted-text)]">{success.label} successfully purchased.</p>
        <div className="mt-8 flex flex-col gap-3">
          <Link
            href="/dashboard/wallet"
            className="w-full rounded-2xl bg-amber-400 hover:bg-amber-500 py-3 text-sm font-bold text-amber-900 shadow-md transition-all text-center"
          >
            Go to Wallet
          </Link>
          <Link
            href="/dashboard/studymate"
            className="w-full rounded-2xl border border-[var(--cream-muted)] py-3 text-sm font-semibold text-[var(--body-text)] hover:bg-[var(--cream)] transition-colors text-center"
          >
            Use AI StudyMate
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-3 pb-12">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/dashboard/wallet"
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--cream-muted)] bg-white hover:bg-[var(--cream)] transition-colors"
        >
          <ArrowLeft className="h-4 w-4 text-[var(--muted-text)]" />
        </Link>
        <div>
          <h1 className="text-xl font-black text-[var(--foreground)]">Buy Coins</h1>
          <p className="text-xs text-[var(--muted-text)]">AI StudyMate ke liye coins kharido</p>
        </div>
      </div>

      {/* Value info */}
      <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 flex items-start gap-3">
        <Coins className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-bold text-amber-900">1 coin = ₹0.50</p>
          <p className="text-xs text-amber-700 mt-0.5">
            Coins are used in the AI StudyMate chatbot. Each model uses a different amount — budget models use just 1 coin/1000 tokens, while Claude Opus premium uses 50 coins/1000 tokens.
          </p>
        </div>
      </div>

      {/* Pack grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {PACKS.map((pack, i) => {
          const Icon = pack.icon;
          const isLoading = buying === pack.id;
          return (
            <motion.div
              key={pack.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              className={`relative flex flex-col rounded-2xl border-2 ${pack.border} bg-white p-5 shadow-sm hover:shadow-md transition-shadow`}
            >
              {pack.badge && (
                <span className={`absolute -top-2.5 right-4 rounded-full px-3 py-0.5 text-[10px] font-black uppercase tracking-wide ${pack.bg} ${pack.color} border ${pack.border}`}>
                  {pack.badge}
                </span>
              )}

              <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-2xl ${pack.bg} border ${pack.border}`}>
                <Icon className={`h-5 w-5 ${pack.color}`} />
              </div>

              <p className="text-xs font-bold text-[var(--muted-text)] uppercase tracking-wider">{pack.label}</p>

              <div className="mt-1 flex items-end gap-2">
                <span className="text-4xl font-black text-[var(--foreground)] tabular-nums leading-none">
                  {pack.coins.toLocaleString("en-IN")}
                </span>
                <span className="mb-1 text-sm font-semibold text-[var(--muted-text)]">coins</span>
              </div>

              <div className="mt-3 flex items-center justify-between">
                <div>
                  <p className="text-2xl font-black text-[var(--foreground)]">₹{pack.priceRupees}</p>
                  <p className="text-[10px] text-[var(--muted-text)]">{pack.perCoin}</p>
                </div>
                <button
                  onClick={() => handleBuy(pack)}
                  disabled={!!buying}
                  className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition-all shadow-sm hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed ${pack.bg} ${pack.color} border ${pack.border}`}
                >
                  {isLoading ? (
                    <span className="flex items-center gap-1.5">
                      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Processing…
                    </span>
                  ) : (
                    <>
                      <Coins className="h-4 w-4" />
                      Buy Now
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Custom Amount Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mt-5 rounded-2xl border-2 border-dashed border-gray-200 bg-white p-5 hover:border-amber-300 transition-colors"
      >
        <div className="mb-3 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-50 border border-gray-200">
            <Pencil className="h-4 w-4 text-gray-500" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--muted-text)]">Custom Amount</p>
            <p className="text-[10px] text-[var(--muted-text)]">Enter any amount (min ₹10, max ₹10,000)</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-500">₹</span>
            <input
              type="number"
              min={10}
              max={10000}
              step={1}
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
              placeholder="e.g. 45"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-7 pr-3 text-sm font-semibold text-[var(--foreground)] focus:border-amber-400 focus:bg-white focus:outline-none"
            />
          </div>

          {/* Coin preview */}
          <div className="flex min-w-[90px] flex-col items-center rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-center">
            <span className="text-lg font-black text-amber-700 tabular-nums leading-none">
              {customCoins > 0 ? customCoins.toLocaleString("en-IN") : "—"}
            </span>
            <span className="text-[10px] font-medium text-amber-600">coins</span>
          </div>

          <button
            onClick={handleBuyCustom}
            disabled={!customValid || !!buying}
            className="flex items-center gap-2 rounded-xl bg-amber-400 px-4 py-2.5 text-sm font-bold text-amber-900 shadow-sm transition hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {buying?.startsWith("COINS_CUSTOM") ? (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-amber-900 border-t-transparent" />
            ) : (
              <Coins className="h-4 w-4" />
            )}
            Buy
          </button>
        </div>

        {customAmount && !customValid && (
          <p className="mt-2 text-xs text-red-500">
            {customRupees < 10 ? "Minimum amount is ₹10." : "Maximum amount allowed is ₹10,000."}
          </p>
        )}
      </motion.div>

      {/* Footer note */}
      <p className="mt-6 text-center text-[10px] text-[var(--muted-text)]">
        Payments are secured through Razorpay. Coins are added instantly after payment.
      </p>
    </div>
  );
}
