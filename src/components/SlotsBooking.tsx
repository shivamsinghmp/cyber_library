"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useCart } from "@/context/CartContext";
import toast from "react-hot-toast";
import { CheckCircle } from "lucide-react";

type SlotItem = { id: string; roomId: string | null; label: string; time: string; seatsLeft: number; price: number; meetLink: string | null };

type SlotsBookingProps = {
  hideLoginPrompt?: boolean;
  /** Filter slots by type: STUDY (default) | MENTORSHIP | MENTAL */
  slotType?: "STUDY" | "MENTORSHIP" | "MENTAL";
  title?: string;
  description?: string;
  emptyMessage?: string;
};

export function SlotsBooking({
  hideLoginPrompt,
  slotType = "STUDY",
  title = "Study Room",
  description = "Choose a shift that fits your schedule. Each room is a silent, camera-on focus space.",
  emptyMessage = "No study rooms available right now.",
}: SlotsBookingProps) {
  const { data: session } = useSession();
  const { addItem, isInCart } = useCart();
  const [slots, setSlots] = useState<SlotItem[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(true);
  const [enrolledSlotIds, setEnrolledSlotIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    setSlotsLoading(true);
    const url = slotType !== "STUDY" ? `/api/slots?type=${slotType}` : "/api/slots";
    fetch(url, { credentials: "include" })
      .then((res) => (res.ok ? res.json() : []))
      .then((data: { id: string; roomId?: string | null; name: string; timeLabel: string; capacity: number; goal?: string | null; price?: number; meetLink?: string | null }[]) => {
        setSlots(
          Array.isArray(data)
            ? data.map((s) => ({
                id: s.id,
                roomId: s.roomId ?? null,
                label: s.name,
                time: s.timeLabel,
                seatsLeft: s.capacity,
                price: s.price ?? 0,
                meetLink: s.meetLink ?? null,
              }))
            : []
        );
      })
      .catch(() => setSlots([]))
      .finally(() => setSlotsLoading(false));
  }, [slotType]);

  useEffect(() => {
    if (!session?.user) {
      setEnrolledSlotIds(new Set());
      return;
    }
    fetch("/api/user/subscriptions", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : []))
      .then((data: { studySlotId: string }[]) => {
        const ids = Array.isArray(data) ? data.map((s) => s.studySlotId) : [];
        setEnrolledSlotIds(new Set(ids));
      })
      .catch(() => setEnrolledSlotIds(new Set()));
  }, [session?.user]);

  return (
    <div className="mx-auto max-w-6xl px-4 pt-32 pb-8 md:pt-40 md:pb-12">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-[var(--cream)] md:text-3xl">
          {title}
        </h1>
        <p className="mt-2 text-sm text-[var(--cream-muted)] md:text-base">
          {description}
        </p>
      </div>

      {slotsLoading ? (
        <p className="rounded-2xl border border-white/10 bg-black/20 px-6 py-8 text-center text-sm text-[var(--cream-muted)]">
          Loading…
        </p>
      ) : slots.length === 0 ? (
        <p className="rounded-2xl border border-white/10 bg-black/20 px-6 py-8 text-center text-sm text-[var(--cream-muted)]">
          {emptyMessage}
        </p>
      ) : (
        <div className="grid gap-5 md:grid-cols-3">
          {slots.map((slot) => (
            <div
              key={slot.id}
              className="flex flex-col justify-between rounded-2xl border border-white/10 bg-black/35 p-5 shadow-[0_18px_45px_rgba(0,0,0,0.65)] transition hover:-translate-y-0.5 hover:border-[var(--accent)]/50"
            >
              <div className="space-y-2">
                {slot.roomId && (
                  <p className="font-mono text-[10px] font-medium uppercase tracking-wider text-[var(--cream-muted)]">
                    {slot.roomId}
                  </p>
                )}
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--cream-muted)]">
                  {slot.label} Shift
                </p>
                <p className="text-lg font-semibold text-[var(--cream)]">{slot.time}</p>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {enrolledSlotIds.has(slot.id) ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-medium text-emerald-200">
                      <CheckCircle className="h-3 w-3" />
                      Enrolled
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-medium text-emerald-200">
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                      {slot.seatsLeft} seats left
                    </span>
                  )}
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${
                      slot.price > 0
                        ? "bg-[var(--accent)]/15 text-[var(--accent)]"
                        : "bg-emerald-500/15 text-emerald-300"
                    }`}
                  >
                    {slot.price > 0 ? (
                      <>
                        <span className="opacity-90">₹</span>
                        <span>{slot.price}</span>
                      </>
                    ) : (
                      "Free"
                    )}
                  </span>
                </div>
              </div>
              <div className="mt-5 flex flex-col gap-2">
                {enrolledSlotIds.has(slot.id) ? (
                  <>
                    <div className="flex items-center justify-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/10 py-2.5 text-sm font-medium text-emerald-300">
                      <CheckCircle className="h-4 w-4 shrink-0" />
                      You are already enrolled
                    </div>
                    {slot.meetLink && (
                      <a
                        href={slot.meetLink}
                        target="_blank"
                        rel="noreferrer"
                        className="block w-full rounded-full border-none bg-indigo-500 py-2.5 text-center text-sm font-medium text-white transition hover:bg-indigo-600 shadow-md"
                      >
                        Join Google Meet
                      </a>
                    )}
                  </>
                ) : isInCart(slot.id) ? (
                  <Link
                    href="/cart"
                    className="block w-full rounded-full border border-[var(--accent)]/50 py-2.5 text-center text-sm font-medium text-[var(--cream)] transition hover:bg-[var(--accent)]/10"
                  >
                    In cart – View cart
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      addItem({
                        slotId: slot.id,
                        name: slot.label,
                        timeLabel: slot.time,
                        price: slot.price,
                        roomId: slot.roomId ?? undefined,
                      });
                      toast.success("Added to cart");
                    }}
                    className="w-full rounded-full border border-white/20 py-2.5 text-sm font-medium text-[var(--cream)] transition hover:bg-white/5"
                  >
                    Add to cart
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {!hideLoginPrompt && !session?.user && (
        <p className="mt-6 text-center text-xs text-[var(--cream-muted)]">
          Already have an account?{" "}
          <Link href="/login" className="text-[var(--accent)] hover:underline">
            Log in
          </Link>{" "}
          to subscribe and access rooms.
        </p>
      )}
    </div>
  );
}
