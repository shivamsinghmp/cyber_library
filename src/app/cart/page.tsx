"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useCart } from "@/context/CartContext";
import { ShoppingCart, Trash2 } from "lucide-react";

export default function CartPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { items, removeItem, count } = useCart();
  const isLoggedIn = !!session?.user;
  const total = items.reduce((sum, i) => sum + i.price, 0);

  // Not logged in: Cart click → send to login, then back to cart
  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace(`/login?callbackUrl=${encodeURIComponent("/cart")}`);
    }
  }, [status, router]);

  if (status === "loading" || status === "unauthenticated") {
    return (
      <div className="mx-auto max-w-2xl px-4 pt-32 pb-12 text-center text-sm text-[var(--cream-muted)]">
        Redirecting to login…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 pt-32 pb-8 md:pt-40 md:pb-12">
      <h1 className="text-2xl font-semibold text-[var(--cream)] md:text-3xl">
        Cart
      </h1>
      <p className="mt-1 text-sm text-[var(--cream-muted)]">
        {count === 0
          ? "Your cart is empty. Add study room subscriptions from the Study Room page."
          : isLoggedIn
            ? "Review your subscriptions and proceed to checkout."
            : "Log in to checkout and buy the subscriptions in your cart."}
      </p>

      {count === 0 ? (
        <div className="mt-8 rounded-2xl border border-white/10 bg-black/20 px-6 py-12 text-center">
          <ShoppingCart className="mx-auto h-12 w-12 text-[var(--cream-muted)]/50" />
          <p className="mt-3 text-sm text-[var(--cream-muted)]">No items in cart</p>
          <Link
            href="/study-room"
            className="mt-4 inline-block rounded-full bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-[var(--ink)] transition hover:bg-[var(--accent-hover)]"
          >
            Browse Study Rooms
          </Link>
        </div>
      ) : (
        <>
          <ul className="mt-6 space-y-3">
            {items.map((item) => (
              <li
                key={item.slotId}
                className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-black/25 px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-[var(--cream)]">{item.name}</p>
                  <p className="text-xs text-[var(--cream-muted)]">{item.timeLabel}</p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      item.price > 0 ? "bg-[var(--accent)]/15 text-[var(--accent)]" : "bg-emerald-500/15 text-emerald-300"
                    }`}
                  >
                    {item.price > 0 ? `₹${item.price}` : "Free"}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeItem(item.slotId)}
                    className="rounded-lg p-1.5 text-[var(--cream-muted)] transition hover:bg-white/10 hover:text-red-400"
                    aria-label="Remove"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-6 rounded-xl border border-white/10 bg-black/25 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--cream-muted)]">Total</span>
              <span className="text-lg font-bold tracking-tight text-[var(--cream)]">
                <span className="text-base font-semibold text-[var(--cream-muted)]">₹</span>
                {total}
              </span>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3">
            {!isLoggedIn ? (
              <>
                <p className="text-center text-sm text-[var(--cream-muted)]">
                  Log in to proceed to checkout and buy these subscriptions.
                </p>
                <Link
                  href={`/login?callbackUrl=${encodeURIComponent("/cart")}`}
                  className="w-full rounded-full bg-[var(--accent)] py-2.5 text-center text-sm font-semibold text-[var(--ink)] transition hover:bg-[var(--accent-hover)]"
                >
                  Log in to checkout
                </Link>
                <Link
                  href="/study-room"
                  className="w-full rounded-full border border-white/10 py-2.5 text-center text-sm text-[var(--cream)] transition hover:bg-white/5"
                >
                  Continue browsing
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/checkout?from=cart"
                  className="w-full rounded-full bg-[var(--accent)] py-2.5 text-center text-sm font-semibold text-[var(--ink)] transition hover:bg-[var(--accent-hover)]"
                >
                  Proceed to checkout
                </Link>
                <Link
                  href="/study-room"
                  className="w-full rounded-full border border-white/10 py-2.5 text-center text-sm text-[var(--cream)] transition hover:bg-white/5"
                >
                  Add more
                </Link>
              </>
            )}
          </div>
        </>
      )}

      <p className="mt-8 text-center text-sm text-[var(--cream-muted)]">
        <Link href="/" className="text-[var(--accent)] hover:underline">
          ← Back to Home
        </Link>
      </p>
    </div>
  );
}
