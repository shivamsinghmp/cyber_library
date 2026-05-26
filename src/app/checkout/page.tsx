"use client";

import { useState, Suspense, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Tag, X, Ticket, Clock, ChevronDown, ChevronUp, CheckCircle } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useSubscription } from "@/hooks/useSubscription";
import toast from "react-hot-toast";

declare global {
  interface Window {
    Razorpay: new (options: {
      key: string;
      amount: number;
      order_id: string;
      name: string;
      description?: string;
      handler: (response: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string; }) => void;
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
  const typeSubscription = searchParams.get("type") === "subscription";
  const rewardId = searchParams.get("rewardId") ?? "";
  const subPlan = (searchParams.get("plan") ?? "").toUpperCase() as "MONTHLY" | "YEARLY" | "";

  const planName = searchParams.get("name") || searchParams.get("productName") || DEFAULT_PLAN.name;
  // Use explicit finite-number checks so amount=0 (admin-configured free plan)
  // is honoured instead of falling through `||` to DEFAULT_PLAN.price.
  const priceFromQuery = (() => {
    const priceStr = searchParams.get("price");
    if (priceStr !== null && Number.isFinite(Number(priceStr))) return Number(priceStr);
    const amountStr = searchParams.get("amount");
    if (amountStr !== null && Number.isFinite(Number(amountStr))) return Number(amountStr);
    return DEFAULT_PLAN.price;
  })();
  const originalPriceFromQuery = (() => {
    const s = searchParams.get("originalAmount");
    return s !== null && Number.isFinite(Number(s)) ? Number(s) : 0;
  })();
  const productId = searchParams.get("productId") ?? "";
  // Restrict post-payment redirect to same-origin relative paths to prevent open redirect.
  const rawRedirect = searchParams.get("redirect") ?? "";
  const customRedirectUrl =
    rawRedirect.startsWith("/") && !rawRedirect.startsWith("//") ? rawRedirect : "";

  const isCartMode = fromCart && cartItems.length > 0;
  const isRewardEnrollment = typeReward && rewardId;
  const isProductPurchase = !!productId;
  const isSubscription = typeSubscription && (subPlan === "MONTHLY" || subPlan === "YEARLY");

  const { data: session, status } = useSession();
  const { active: hasActiveSub, planType: activePlanType, endDate: activeEndDate, loading: subLoading } = useSubscription();
  const [enrolledSlotIds, setEnrolledSlotIds] = useState<Set<string>>(new Set());
  const [subsLoaded, setSubsLoaded] = useState(false);

  useEffect(() => {
    if (fromCart && cartItems.length === 0 && !isRewardEnrollment && !isProductPurchase && !isSubscription) {
      router.replace("/cart");
      return;
    }
    if (status === "unauthenticated" && ((fromCart && cartItems.length > 0) || isRewardEnrollment || isProductPurchase || isSubscription)) {
      let callback = "/checkout?from=cart";
      if (isSubscription) {
        callback = `/checkout?type=subscription&plan=${subPlan}&name=${encodeURIComponent(planName)}&amount=${priceFromQuery}`;
      } else if (isProductPurchase) {
        callback = `/checkout?productId=${encodeURIComponent(productId)}&productName=${encodeURIComponent(planName)}&amount=${priceFromQuery}`;
      } else if (isRewardEnrollment) {
        callback = `/checkout?type=reward&rewardId=${encodeURIComponent(rewardId)}&name=${encodeURIComponent(planName)}&price=${priceFromQuery}`;
      } else {
        callback = "/checkout?from=cart";
      }
      router.replace(`/login?callbackUrl=${encodeURIComponent(callback)}`);
    }
  }, [fromCart, cartItems.length, status, router, isRewardEnrollment, isProductPurchase, isSubscription, productId, rewardId, planName, priceFromQuery, subPlan]);

  useEffect(() => {
    if (!session?.user || !fromCart) {
      setSubsLoaded(true);
      return;
    }
    fetch("/api/user/subscriptions", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : []))
      .then((data: { studySlotId: string }[]) => {
        setEnrolledSlotIds(new Set(data.map((s) => s.studySlotId)));
      })
      .catch(() => {})
      .finally(() => setSubsLoaded(true));
  }, [session?.user, fromCart]);

  const payableItems = isCartMode ? cartItems.filter((i) => !enrolledSlotIds.has(i.slotId)) : cartItems;
  const price = isCartMode ? payableItems.reduce((s, i) => s + i.price, 0) : priceFromQuery;
  const displayName = isCartMode
    ? `Cart (${payableItems.length} subscription${payableItems.length !== 1 ? "s" : ""})`
    : isSubscription
      ? planName
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

  type PublicCoupon = {
    id: string; code: string; discountType: string; discountValue: number;
    description: string | null; minOrderAmount: number | null;
    validUntil: string | null; validFrom: string | null;
  };
  const [publicCoupons, setPublicCoupons] = useState<PublicCoupon[]>([]);
  const [offersOpen, setOffersOpen] = useState(true);

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

  useEffect(() => {
    fetch("/api/public/coupons")
      .then((r) => r.ok ? r.json() : [])
      .then((data: PublicCoupon[]) => setPublicCoupons(data))
      .catch(() => {});
  }, []);

  async function quickApplyCoupon(code: string) {
    setCouponInput(code);
    setCouponMessage(null);
    if (!session?.user) { setCouponMessage({ type: "error", text: "Please log in to apply a coupon." }); return; }
    setCouponApplying(true);
    try {
      const res = await fetch("/api/coupon/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, orderAmount: price }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setAppliedCoupon({ code: data.code, discountAmount: data.discountAmount, description: data.description ?? data.code });
        setCouponMessage({ type: "success", text: `Coupon applied: ${data.description ?? data.code}` });
        setCouponInput("");
      } else {
        setCouponMessage({ type: "error", text: data.error ?? "Coupon apply nahi hua" });
      }
    } catch { setCouponMessage({ type: "error", text: "Network error" }); }
    finally { setCouponApplying(false); }
  }

  const redirectToSuccess = useCallback(() => {
    if (customRedirectUrl) {
      window.location.href = customRedirectUrl;
      return;
    }
    if (isSubscription) {
      toast.success("🎉 Subscription activated! Welcome aboard.");
      router.push("/dashboard");
      return;
    }
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
  }, [displayName, total, discount, appliedCoupon?.code, isCartMode, isRewardEnrollment, isProductPurchase, isSubscription, rewardId, router, customRedirectUrl]);
  async function completeWithoutPayment() {
    if (isCartMode && payableItems.length > 0) {
        clearCart();
    }
    toast.success("Subscription Activated Successfully!");
    const t = setTimeout(() => { redirectToSuccess(); }, 1500);
    return () => clearTimeout(t);
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



    try {
      let payloadType = "CART";
      let payloadIds: string[] = [];
      if (isSubscription) {
        payloadType = "SUBSCRIPTION";
        payloadIds = [subPlan as string];
      } else if (isCartMode) {
        payloadType = "CART";
        payloadIds = payableItems.map((i) => i.slotId);
      } else if (isProductPurchase) {
        payloadType = "PRODUCT";
        payloadIds = [productId];
      } else if (isRewardEnrollment) {
        payloadType = "REWARD";
        payloadIds = [rewardId];
      }

      if (payloadIds.length === 0) {
        toast.error("Checkout session invalid hai. Wapas jao aur dobara try karo.");
        setSubmitting(false);
        return;
      }

      const orderRes = await fetch("/api/razorpay/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: payloadType,
          ids: payloadIds,
          couponCode: appliedCoupon?.code || undefined,
        }),
      });
      const orderData = await orderRes.json().catch(() => ({}));
      if (!orderRes.ok) {
        toast.error(orderData.error ?? "Payment not configured");
        setSubmitting(false);
        return;
      }

      // If backend calculated price is 0 (due to 100% coupon), it will skip Razorpay
      if (orderData.free === true) {
        if (isCartMode) clearCart();
        toast.success("🎉 Payment successful!");
        if (orderData.transactionId) {
          router.push(`/dashboard/receipt/${orderData.transactionId}`);
        } else {
          redirectToSuccess();
        }
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
        handler: async (response: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => {
          let txnId: string | null = null;
          try {
            const verifyRes = await fetch("/api/razorpay/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
                type: payloadType,
                ids: payloadIds,
                couponCode: appliedCoupon?.code || undefined,
              })
            });
            if (verifyRes.ok) {
              if (isCartMode) clearCart();
              const verifyData = await verifyRes.json().catch(() => ({}));
              txnId = verifyData.transactionId ?? null;
            }
          } catch (e) {
            console.error("Verification error", e);
          }
          if (txnId) {
            router.push(`/dashboard/receipt/${txnId}`);
          } else {
            redirectToSuccess();
          }
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

  if (isSubscription && !subLoading && hasActiveSub && activePlanType !== "ROOM") {
    const expiry = activeEndDate ? new Date(activeEndDate).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : null;
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10">
          <CheckCircle className="h-9 w-9 text-emerald-500" />
        </div>
        <h2 className="mb-2 text-xl font-bold text-[var(--foreground)]">Subscription Already Active</h2>
        <p className="text-sm text-[var(--muted-text)]">
          Aapka {activePlanType === "MONTHLY" ? "Monthly" : "Yearly"} subscription already active hai
          {expiry ? ` — ${expiry} tak valid hai` : ""}.
          Dashboard use karte rahein!
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-block rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-500"
        >
          Dashboard pe Jao
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:py-12">
      <h1 className="text-2xl font-bold text-[var(--foreground)] md:text-3xl">
        Checkout
      </h1>
      <p className="mt-1 text-sm text-[var(--muted-text)]">
        Payment will be completed via Razorpay.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        <div className="rounded-2xl border border-[var(--border)] bg-white p-6 space-y-4 shadow-[var(--shadow-sm)]">
          <h2 className="text-sm font-bold text-[var(--foreground)] uppercase tracking-wide">Order summary</h2>
          {isCartMode ? (
            <>
              {payableItems.map((item) => (
                <div key={item.slotId} className="flex justify-between text-sm">
                  <span className="text-[var(--muted-text)]">{item.name} · {item.timeLabel}</span>
                  <span className="font-semibold text-[var(--foreground)]">{item.price > 0 ? `₹${item.price}` : "Free"}</span>
                </div>
              ))}
              {cartItems.length > payableItems.length && (
                <p className="text-xs text-emerald-600">
                  {cartItems.length - payableItems.length} item(s) already enrolled — not charged
                </p>
              )}
              <div className="flex justify-between text-sm text-[var(--muted-text)] pt-1 border-t border-[var(--border)]">
                <span>Subtotal</span>
                <span className="font-semibold text-[var(--foreground)]">₹{price}</span>
              </div>
            </>
          ) : isSubscription ? (
            <>
              <div className="flex items-center justify-between text-sm">
                <span className="text-[var(--muted-text)]">Plan</span>
                <span className="flex items-center gap-2 font-bold text-[var(--foreground)]">
                  {planName}
                  <span className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
                    style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>
                    {subPlan === "MONTHLY" ? "Monthly" : "Yearly"}
                  </span>
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[var(--muted-text)]">Billing cycle</span>
                <span className="font-semibold text-[var(--foreground)]">
                  {subPlan === "MONTHLY" ? "Every month" : "Every year"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--muted-text)]">Amount</span>
                <div className="flex flex-col items-end gap-0.5">
                  {originalPriceFromQuery > price && (
                    <span className="text-xs text-[var(--muted-text)] line-through">
                      ₹{originalPriceFromQuery.toLocaleString("en-IN")}
                    </span>
                  )}
                  <div className="flex items-center gap-2">
                    {originalPriceFromQuery > price && (
                      <span className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
                        style={{ background: "linear-gradient(135deg,#ef4444,#f97316)" }}>
                        -{Math.round(((originalPriceFromQuery - price) / originalPriceFromQuery) * 100)}% OFF
                      </span>
                    )}
                    <span className="text-base font-bold text-[var(--foreground)]">
                      ₹{price.toLocaleString("en-IN")}
                    </span>
                  </div>
                  {originalPriceFromQuery > price && (
                    <span className="text-[10px] text-emerald-600 font-semibold">
                      You save ₹{(originalPriceFromQuery - price).toLocaleString("en-IN")}
                    </span>
                  )}
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="flex justify-between text-sm">
                <span className="text-[var(--muted-text)]">{isRewardEnrollment ? "Reward enrollment" : "Plan"}</span>
                <span className="font-semibold text-[var(--foreground)]">{planName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[var(--muted-text)]">Amount</span>
                <span className="font-semibold text-[var(--foreground)]">₹{price}</span>
              </div>
            </>
          )}

          {/* ── Available public coupons ── */}
          {publicCoupons.length > 0 && (
            <div className="border-t border-[var(--border)] pt-4">
              <button
                type="button"
                onClick={() => setOffersOpen((o) => !o)}
                className="flex w-full items-center justify-between text-xs font-bold text-[var(--accent)] mb-2"
              >
                <span className="flex items-center gap-1.5">
                  <Ticket className="h-3.5 w-3.5" />
                  Available Offers ({publicCoupons.length})
                </span>
                {offersOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>
              {offersOpen && (
                <div className="flex flex-col gap-2 mb-3">
                  {publicCoupons.map((c) => {
                    const discountLabel = c.discountType === "PERCENT"
                      ? `${c.discountValue}% off`
                      : `₹${c.discountValue} off`;
                    const isApplied = appliedCoupon?.code === c.code;
                    const daysLeft = c.validUntil
                      ? Math.ceil((new Date(c.validUntil).getTime() - Date.now()) / 86400000)
                      : null;
                    const expiring = daysLeft !== null && daysLeft <= 3;
                    return (
                      <div
                        key={c.id}
                        className={`relative flex items-center justify-between rounded-xl border px-3 py-2.5 transition-all ${
                          isApplied
                            ? "border-emerald-300 bg-emerald-50"
                            : "border-dashed border-[var(--border)] bg-[var(--page-bg)] hover:border-[var(--accent-border)]"
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-xs font-black tracking-wider text-[var(--accent)]">
                              {c.code}
                            </span>
                            <span className="rounded-full bg-[var(--accent-pale)] px-2 py-0.5 text-[10px] font-bold text-[var(--accent)]">
                              {discountLabel}
                            </span>
                            {expiring && daysLeft !== null && (
                              <span className="flex items-center gap-0.5 text-[10px] font-semibold text-amber-600">
                                <Clock className="h-3 w-3" />
                                {daysLeft === 0 ? "Expires today!" : `${daysLeft}d left`}
                              </span>
                            )}
                          </div>
                          <p className="mt-0.5 text-[10px] text-[var(--muted-text)] truncate">
                            {c.description ?? discountLabel}
                            {c.minOrderAmount ? ` · Min. ₹${c.minOrderAmount}` : ""}
                            {c.validUntil && !expiring
                              ? ` · Valid till ${new Date(c.validUntil).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}`
                              : ""}
                          </p>
                        </div>
                        <button
                          type="button"
                          disabled={couponApplying}
                          onClick={() => isApplied ? removeCoupon() : quickApplyCoupon(c.code)}
                          className={`ml-3 shrink-0 rounded-lg px-3 py-1.5 text-[11px] font-bold transition-all disabled:opacity-50 ${
                            isApplied
                              ? "bg-emerald-100 text-emerald-700 hover:bg-red-100 hover:text-red-600"
                              : "bg-[var(--accent-pale)] text-[var(--accent)] hover:bg-[var(--accent-border)]"
                          }`}
                        >
                          {isApplied ? "Remove" : "Apply"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <div className="border-t border-[var(--border)] pt-4">
            <p className="mb-2 text-xs font-medium text-[var(--muted-text)]">
              Coupon code {!session?.user && "(log in to apply — one use per account)"}
            </p>
            {appliedCoupon ? (
              <div className="flex items-center justify-between rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2.5">
                <span className="text-sm font-semibold text-emerald-700">
                  {appliedCoupon.code} · {appliedCoupon.description}
                </span>
                <button
                  type="button"
                  onClick={removeCoupon}
                  className="rounded-lg p-1 text-emerald-500 hover:bg-emerald-100 hover:text-emerald-700"
                  aria-label="Remove coupon"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Tag className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-text)]" />
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
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--page-bg)] py-2.5 pl-9 pr-3 text-sm text-[var(--foreground)] placeholder:text-[var(--placeholder)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-border)]"
                  />
                </div>
                <button
                  type="button"
                  disabled={couponApplying}
                  onClick={(e) => handleApplyCoupon(e as unknown as React.FormEvent)}
                  className="rounded-xl border border-[var(--accent-border)] bg-[var(--accent-pale)] px-4 py-2.5 text-sm font-semibold text-[var(--accent)] transition hover:bg-[var(--accent)] hover:text-white disabled:opacity-60"
                >
                  {couponApplying ? "Applying…" : "Apply"}
                </button>
              </div>
            )}
            {couponMessage && (
              <p className={`mt-2 text-xs font-medium ${couponMessage.type === "success" ? "text-emerald-600" : "text-red-500"}`}>
                {couponMessage.text}
              </p>
            )}
          </div>

          {discount > 0 && (
            <div className="flex justify-between text-sm text-emerald-600">
              <span className="font-medium">Discount</span>
              <span className="font-semibold">−₹{discount}</span>
            </div>
          )}
          <div className="border-t border-[var(--border)] pt-3 flex justify-between items-center">
            <span className="text-sm font-bold text-[var(--foreground)]">Total Payable</span>
            <div className="flex items-center gap-2">
              {discount > 0 && (
                <span className="text-xs text-[var(--muted-text)] line-through">₹{price.toLocaleString("en-IN")}</span>
              )}
              <span className={`text-xl font-black ${total === 0 ? "text-emerald-600" : "text-[var(--foreground)]"}`}>
                ₹{total.toLocaleString("en-IN")}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-full bg-[var(--accent)] py-3 text-sm font-bold text-white shadow-[var(--shadow-brand)] transition hover:bg-[var(--accent-hover)] disabled:opacity-70 sm:flex-1"
          >
            {submitting ? "Processing…" : "Proceed to payment"}
          </button>
          <Link
            href={isCartMode ? "/cart" : "/"}
            className="w-full rounded-full border border-[var(--border)] py-3 text-center text-sm font-semibold text-[var(--body-text)] transition hover:bg-[var(--page-bg)] sm:flex-1"
          >
            {isCartMode ? "Back to cart" : "Back"}
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
