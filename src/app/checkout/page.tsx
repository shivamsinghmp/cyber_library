"use client";

import { useState, Suspense, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Tag, X } from "lucide-react";
import { useCart } from "@/context/CartContext";
import toast from "react-hot-toast";

declare global {
  interface Window {
    Razorpay: new (options: {
      key: string;
      amount: number;
      order_id: string;
      name: string;
      description?: string;
      handler: (response: { razorpay_payment_id: string; razorpay_order_id: string }) => void;
      modal?: { ondismiss?: () => void };
    }) => { open: () => void };
  }
}

const DEFAULT_PLAN = { name: "Daily Pass", price: 49 };

type AppliedCoupon = {
  code: string;
  discountAmount: number;
  description: string;
};

function CheckoutForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { items: cartItems, clear: clearCart } = useCart();
  const fromCart = searchParams.get("from") === "cart";
  const typeReward = searchParams.get("type") === "reward";
  const rewardId = searchParams.get("rewardId") ?? "";

  const planName = searchParams.get("name") || searchParams.get("productName") || DEFAULT_PLAN.name;
  const priceFromQuery = Number(searchParams.get("price")) || Number(searchParams.get("amount")) || DEFAULT_PLAN.price;
  const productId = searchParams.get("productId") ?? "";

  const isCartMode = fromCart && cartItems.length > 0;
  const isRewardEnrollment = typeReward && rewardId;
  const isProductPurchase = !!productId;

  const { data: session, status } = useSession();
  const [enrolledSlotIds, setEnrolledSlotIds] = useState<Set<string>>(new Set());
  const [subsLoaded, setSubsLoaded] = useState(false);

  useEffect(() => {
    if (fromCart && cartItems.length === 0 && !isRewardEnrollment && !isProductPurchase) {
      router.replace("/cart");
      return;
    }
    if (status === "unauthenticated" && ((fromCart && cartItems.length > 0) || isRewardEnrollment || isProductPurchase)) {
      let callback = "/checkout?from=cart";
      if (isProductPurchase) {
        callback = `/checkout?productId=${encodeURIComponent(productId)}&productName=${encodeURIComponent(planName)}&amount=${priceFromQuery}`;
      } else if (isRewardEnrollment) {
        callback = `/checkout?type=reward&rewardId=${encodeURIComponent(rewardId)}&name=${encodeURIComponent(planName)}&price=${priceFromQuery}`;
      } else {
        callback = "/checkout?from=cart";
      }
      router.replace(`/login?callbackUrl=${encodeURIComponent(callback)}`);
    }
  }, [fromCart, cartItems.length, status, router, isRewardEnrollment, isProductPurchase, productId, rewardId, planName, priceFromQuery]);

  useEffect(() => {
    if (!session?.user || !fromCart) {
      setSubsLoaded(true);
      return;
    }
    fetch("/api/user/subscriptions", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : []))
      .then((data: { studySlotId: string }[]) => {
        const ids = Array.isArray(data) ? data.map((s) => s.studySlotId) : [];
        setEnrolledSlotIds(new Set(ids));
      })
      .catch(() => {})
      .finally(() => setSubsLoaded(true));
  }, [session?.user, fromCart]);

  const payableItems = isCartMode ? cartItems.filter((i) => !enrolledSlotIds.has(i.slotId)) : cartItems;
  const price = isCartMode ? payableItems.reduce((s, i) => s + i.price, 0) : priceFromQuery;
  const displayName = isCartMode
    ? `Cart (${payableItems.length} subscription${payableItems.length !== 1 ? "s" : ""})`
    : isProductPurchase
      ? planName
      : isRewardEnrollment
        ? `Reward: ${planName}`
        : planName;

  const [submitting, setSubmitting] = useState(false);
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const [couponMessage, setCouponMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [couponApplying, setCouponApplying] = useState(false);

  const discount = appliedCoupon?.discountAmount ?? 0;
  const total = Math.max(0, price - discount);

  async function handleApplyCoupon(e: React.FormEvent) {
    e.preventDefault();
    const code = couponInput.trim();
    setCouponMessage(null);
    if (!code) {
      setCouponMessage({ type: "error", text: "Enter a coupon code" });
      return;
    }
    if (!session?.user) {
      setCouponMessage({ type: "error", text: "Please log in to apply a coupon. Each user can use a coupon only once." });
      return;
    }
    setCouponApplying(true);
    try {
      const res = await fetch("/api/coupon/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, orderAmount: price }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setAppliedCoupon({
          code: data.code,
          discountAmount: data.discountAmount,
          description: data.description ?? data.code,
        });
        setCouponMessage({ type: "success", text: `Coupon applied: ${data.description ?? data.code}` });
        setCouponInput("");
      } else {
        setCouponMessage({ type: "error", text: data.error ?? "Invalid or expired coupon" });
      }
    } catch {
      setCouponMessage({ type: "error", text: "Could not apply coupon. Try again." });
    } finally {
      setCouponApplying(false);
    }
  }

  function removeCoupon() {
    setAppliedCoupon(null);
    setCouponMessage(null);
  }

  const redirectToSuccess = useCallback(() => {
    const params = new URLSearchParams({
      plan: displayName,
      price: String(total),
      discount: String(discount),
    });
    if (appliedCoupon?.code) params.set("coupon", appliedCoupon.code);
    if (isCartMode) params.set("from", "cart");
    if (isRewardEnrollment) params.set("rewardId", rewardId);
    if (isProductPurchase) params.set("digital", "1");
    router.push(`/success?${params.toString()}`);
  }, [displayName, total, discount, appliedCoupon?.code, isCartMode, isRewardEnrollment, isProductPurchase, rewardId, router]);

  async function recordTransaction(paymentGatewayId?: string) {
    const orderDetails = isCartMode
      ? payableItems.map((i) => ({ slotId: i.slotId, name: i.name, price: i.price }))
      : isProductPurchase
        ? [{ productId, name: planName, price: priceFromQuery }]
        : [{ slotId: "", name: planName, price: priceFromQuery }];
    const txnRes = await fetch("/api/user/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: total,
        status: "SUCCESS",
        paymentGatewayId: paymentGatewayId ?? undefined,
        orderDetails,
      }),
    });
    if (txnRes.ok) {
      const txn = await txnRes.json();
      return txn.transactionId as string | undefined;
    }
    return undefined;
  }

  async function completeWithoutPayment() {
    if (isCartMode && payableItems.length > 0) {
      try {
        const res = await fetch("/api/user/subscriptions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slotIds: payableItems.map((i) => i.slotId),
          }),
        });
        if (!res.ok) {
          setSubmitting(false);
          return;
        }
        clearCart();
      } catch {
        setSubmitting(false);
        return;
      }
    }
    await recordTransaction();
    redirectToSuccess();
  }

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    if (total <= 0) {
      await completeWithoutPayment();
      return;
    }

    try {
      const orderRes = await fetch("/api/razorpay/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: total }),
      });
      const orderData = await orderRes.json().catch(() => ({}));
      if (!orderRes.ok) {
        toast.error(orderData.error ?? "Payment not configured");
        setSubmitting(false);
        return;
      }
      const { orderId, keyId, amount } = orderData as { orderId: string; keyId: string; amount: number };

      await loadRazorpayScript();
      if (!window.Razorpay) {
        toast.error("Could not load payment. Try again.");
        setSubmitting(false);
        return;
      }

      const rzp = new window.Razorpay({
        key: keyId,
        amount,
        order_id: orderId,
        name: "The Cyber Library",
        description: displayName,
        handler: async (response: { razorpay_payment_id: string; razorpay_order_id: string }) => {
          if (isCartMode && payableItems.length > 0) {
            try {
              const subRes = await fetch("/api/user/subscriptions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  slotIds: payableItems.map((i) => i.slotId),
                }),
              });
              if (subRes.ok) clearCart();
            } catch {
              // still record and redirect
            }
          }
          if (isRewardEnrollment) {
            try {
              await fetch("/api/user/rewards/enroll", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ rewardId }),
              });
            } catch {
              // success page can show message; transaction still recorded
            }
          }
          await recordTransaction(response.razorpay_payment_id);
          redirectToSuccess();
        },
        modal: {
          ondismiss: () => setSubmitting(false),
        },
      });
      rzp.open();
    } catch {
      toast.error("Something went wrong");
      setSubmitting(false);
    }
  }

  if (fromCart && cartItems.length === 0 && !isProductPurchase) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8 text-center text-[var(--cream-muted)]">
        <p>Your cart is empty.</p>
        <Link href="/cart" className="mt-2 inline-block text-[var(--accent)] hover:underline">Go to cart</Link>
      </div>
    );
  }

  const allAlreadyEnrolled = isCartMode && subsLoaded && payableItems.length === 0 && cartItems.length > 0;
  if (allAlreadyEnrolled) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8 text-center">
        <p className="text-[var(--cream)] font-medium">You are already enrolled in all selected rooms.</p>
        <p className="mt-1 text-sm text-[var(--cream-muted)]">No duplicate order will be placed.</p>
        <Link href="/study-room" className="mt-4 inline-block text-[var(--accent)] hover:underline">Browse Study Rooms</Link>
        <span className="mx-2 text-[var(--cream-muted)]">|</span>
        <Link href="/dashboard/subscription" className="inline-block text-[var(--accent)] hover:underline">My Subscription</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:py-12">
      <h1 className="text-2xl font-semibold text-[var(--cream)] md:text-3xl">
        Checkout
      </h1>
      <p className="mt-1 text-sm text-[var(--cream-muted)]">
        Payment will be completed via Razorpay or Stripe.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        <div className="rounded-2xl border border-white/10 bg-black/35 p-6 space-y-4">
          <h2 className="text-sm font-semibold text-[var(--cream)]">Order summary</h2>
          {isCartMode ? (
            <>
              {payableItems.map((item) => (
                <div key={item.slotId} className="flex justify-between text-sm">
                  <span className="text-[var(--cream-muted)]">{item.name} · {item.timeLabel}</span>
                  <span className="font-medium text-[var(--cream)]">{item.price > 0 ? `₹${item.price}` : "Free"}</span>
                </div>
              ))}
              {cartItems.length > payableItems.length && (
                <p className="text-xs text-emerald-400/90">
                  {cartItems.length - payableItems.length} item(s) already enrolled — not charged
                </p>
              )}
              <div className="flex justify-between text-sm text-[var(--cream-muted)] pt-1 border-t border-white/10">
                <span>Subtotal</span>
                <span className="font-medium text-[var(--cream)]">₹{price}</span>
              </div>
            </>
          ) : (
            <>
              <div className="flex justify-between text-sm text-[var(--cream-muted)]">
                <span>{isRewardEnrollment ? "Reward enrollment" : "Plan"}</span>
                <span className="font-medium text-[var(--cream)]">{planName}</span>
              </div>
              <div className="flex justify-between text-sm text-[var(--cream-muted)]">
                <span>Amount</span>
                <span className="font-medium text-[var(--cream)]">₹{price}</span>
              </div>
            </>
          )}

          <div className="border-t border-white/10 pt-4">
            <p className="mb-2 text-xs font-medium text-[var(--cream-muted)]">
              Coupon code {!session?.user && "(log in to apply — one use per account)"}
            </p>
            {appliedCoupon ? (
              <div className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5">
                <span className="text-sm font-medium text-emerald-200">
                  {appliedCoupon.code} · {appliedCoupon.description}
                </span>
                <button
                  type="button"
                  onClick={removeCoupon}
                  className="rounded-lg p-1 text-[var(--cream-muted)] hover:bg-white/10 hover:text-[var(--cream)]"
                  aria-label="Remove coupon"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Tag className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--cream-muted)]" />
                  <input
                    type="text"
                    value={couponInput}
                    onChange={(e) => {
                      setCouponInput(e.target.value.toUpperCase());
                      setCouponMessage(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleApplyCoupon(e as unknown as React.FormEvent);
                      }
                    }}
                    placeholder="Enter code"
                    className="w-full rounded-xl border border-white/10 bg-black/40 py-2.5 pl-9 pr-3 text-sm text-[var(--cream)] placeholder:text-[var(--cream-muted)]/60 focus:border-[var(--accent)]/70 focus:outline-none"
                  />
                </div>
                <button
                  type="button"
                  disabled={couponApplying}
                  onClick={(e) => handleApplyCoupon(e as unknown as React.FormEvent)}
                  className="rounded-xl border border-[var(--accent)]/50 bg-[var(--accent)]/10 px-4 py-2.5 text-sm font-medium text-[var(--cream)] transition hover:bg-[var(--accent)]/20 disabled:opacity-60"
                >
                  {couponApplying ? "Applying…" : "Apply"}
                </button>
              </div>
            )}
            {couponMessage && (
              <p className={`mt-2 text-xs ${couponMessage.type === "success" ? "text-emerald-400" : "text-red-400"}`}>
                {couponMessage.text}
              </p>
            )}
          </div>

          {discount > 0 && (
            <div className="flex justify-between text-sm text-emerald-400">
              <span>Discount</span>
              <span className="font-medium">−₹{discount}</span>
            </div>
          )}
          <div className="border-t border-white/10 pt-3 flex justify-between text-sm font-semibold text-[var(--cream)]">
            <span>Total</span>
            <span>₹{total}</span>
          </div>
        </div>

        <div className="rounded-xl border border-dashed border-white/20 bg-white/5 p-4 text-center text-xs text-[var(--cream-muted)]">
          <p className="font-medium text-[var(--cream)]/80">Payment integration</p>
          <p className="mt-1">
            Integrate Razorpay or Stripe: create order/session on your backend, then open checkout or redirect. On success, redirect to /success.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-full bg-[var(--accent)] py-2.5 text-sm font-semibold text-[var(--ink)] shadow-md transition hover:bg-[var(--accent-hover)] disabled:opacity-70 sm:flex-1"
          >
            {submitting ? "Processing…" : "Proceed to payment"}
          </button>
          <Link
            href={isCartMode ? "/cart" : "/"}
            className="w-full rounded-full border border-white/10 py-2.5 text-center text-sm font-medium text-[var(--cream)]/85 transition hover:bg-white/5 sm:flex-1"
          >
            {isCartMode ? "Back to cart" : "Back to home"}
          </Link>
        </div>
      </form>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="min-h-[40vh] flex items-center justify-center text-[var(--cream-muted)]">Loading…</div>}>
      <CheckoutForm />
    </Suspense>
  );
}
