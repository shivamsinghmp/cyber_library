"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useCart } from "@/context/CartContext";
import toast from "react-hot-toast";
import { CheckCircle, Clock, Users, ExternalLink, ShieldCheck, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

type SlotItem = { id: string; roomId: string | null; label: string; time: string; seatsLeft: number; price: number; meetLink: string | null };

type SlotsBookingProps = {
  hideLoginPrompt?: boolean;
  /** Filter slots by type: STUDY (default) | MENTORSHIP | MENTAL */
  slotType?: "STUDY" | "MENTORSHIP" | "MENTAL";
  title?: string;
  description?: string;
  emptyMessage?: string;
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
  hidden: { opacity: 0, scale: 0.95, y: 30 },
  show: { opacity: 1, scale: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } },
};

export function SlotsBooking({
  hideLoginPrompt,
  slotType = "STUDY",
  title = "Study Room",
  description = "Select your dedicated deep-work shift. every room operates as a silent, camera-on sanctuary engineered for absolute focus and community accountability.",
  emptyMessage = "No exclusive study rooms are available right now.",
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
    fetch(`/api/user/subscriptions?_t=${Date.now()}`, { credentials: "include" })
      .then((res) => (res.ok ? res.json() : []))
      .then((data: { studySlotId: string }[]) => {
        const ids = Array.isArray(data) ? data.map((s) => s.studySlotId) : [];
        setEnrolledSlotIds(new Set(ids));
      })
      .catch(() => setEnrolledSlotIds(new Set()));
  }, [session?.user]);

  return (
    <div className="mx-auto max-w-6xl px-4 pt-32 pb-8 md:pt-40 md:pb-12 relative">
      {/* Background ambient lighting */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-[radial-gradient(ellipse_at_top,_var(--accent)_0%,_transparent_70%)] opacity-[0.04] pointer-events-none" />

      {/* HEADER: CENTER ALIGNED & PREMIUM */}
      <div className="mb-16 text-center flex flex-col items-center justify-center relative z-10 max-w-3xl mx-auto">
        <motion.h1 initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="text-4xl md:text-6xl font-black tracking-tight text-white drop-shadow-lg pb-4">
          {title}
        </motion.h1>
        <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }} className="h-1 w-20 bg-gradient-to-r from-transparent via-[var(--accent)] to-transparent rounded-full mb-6" />
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="text-[15px] md:text-lg text-[var(--cream-muted)] leading-relaxed font-medium">
          {description}
        </motion.p>
      </div>

      {slotsLoading ? (
        <div className="flex items-center justify-center py-20">
           <Loader2 className="w-10 h-10 text-[var(--accent)] animate-spin" />
        </div>
      ) : slots.length === 0 ? (
        <div className="rounded-3xl border border-white/5 bg-black/20 px-6 py-20 text-center shadow-inner max-w-2xl mx-auto">
           <ShieldCheck className="mx-auto w-12 h-12 text-[var(--cream-muted)]/30 mb-4" />
           <p className="text-xl font-semibold text-[var(--cream-muted)]">{emptyMessage}</p>
        </div>
      ) : (
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 relative z-10">
          {slots.map((slot) => {
            const isEnrolled = enrolledSlotIds.has(slot.id);
            const inCart = isInCart(slot.id);

            return (
              <motion.div
                key={slot.id}
                variants={itemVariants}
                className={`group relative flex flex-col justify-between rounded-3xl overflow-hidden backdrop-blur-2xl transition-all duration-500 ease-out border shadow-2xl hover:-translate-y-2 ${
                   isEnrolled 
                   ? 'bg-gradient-to-b from-emerald-950/40 to-black/80 border-emerald-500/20 hover:border-emerald-500/50 hover:shadow-[0_20px_40px_-10px_rgba(16,185,129,0.3)]' 
                   : 'bg-gradient-to-b from-neutral-900/60 to-black/80 border-white/10 hover:border-[var(--accent)]/40 hover:shadow-[0_20px_40px_-10px_rgba(var(--accent-rgb),0.2)]'
                }`}
              >
                {/* Glow Overlay Effect */}
                {!isEnrolled && <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent)]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />}
                {isEnrolled && <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />}

                <div className="p-8 relative z-10">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h2 className="text-[11px] font-black uppercase tracking-[0.3em] text-[var(--cream-muted)] mb-1">
                        {slot.label} Shift
                      </h2>
                      <div className="flex items-center gap-2">
                        <Clock className={`w-4 h-4 ${isEnrolled ? 'text-emerald-400' : 'text-[var(--accent)]'}`} />
                        <h3 className="text-2xl font-bold text-white tracking-wide">{slot.time}</h3>
                      </div>
                    </div>
                    
                    {/* Price Tag */}
                    <div className={`px-4 py-1.5 rounded-full backdrop-blur-md border border-white/10 ${isEnrolled ? 'bg-emerald-500/10 text-emerald-400' : 'bg-white/5 text-[var(--accent)]'}`}>
                       <span className="text-sm font-black tracking-widest">{slot.price > 0 ? `₹${slot.price}` : "FREE"}</span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {/* Urgency / Inventory */}
                    {!isEnrolled && (
                      <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                        <div className={`p-2 rounded-full ${slot.seatsLeft < 10 ? 'bg-red-500/10 text-red-400 animate-pulse' : 'bg-white/5 text-gray-400'}`}>
                           <Users className="w-4 h-4" />
                        </div>
                        <span className={`text-sm font-semibold tracking-wide ${slot.seatsLeft < 10 ? 'text-red-300' : 'text-[var(--cream-muted)]'}`}>
                          {slot.seatsLeft === 0 ? 'Fully Booked' : `Only ${slot.seatsLeft} seats remaining`}
                        </span>
                      </div>
                    )}
                    
                    {/* Enrolled Status Text */}
                    {isEnrolled && (
                      <div className="flex items-center gap-3 border-b border-emerald-500/10 pb-4">
                        <div className="p-2 rounded-full bg-emerald-500/20 text-emerald-400">
                           <ShieldCheck className="w-4 h-4" />
                        </div>
                        <span className="text-sm font-semibold tracking-wide text-emerald-300">
                           Subscription Active
                        </span>
                      </div>
                    )}

                    {/* Room ID */}
                    {slot.roomId && (
                      <p className="font-mono text-xs uppercase tracking-widest text-[var(--cream-muted)] opacity-60">
                        Room ID: {slot.roomId}
                      </p>
                    )}
                  </div>
                </div>

                {/* Card Actions */}
                <div className="p-6 pt-0 relative z-10 w-full mt-auto">
                  {isEnrolled ? (
                    slot.meetLink ? (
                      <a
                        href={slot.meetLink}
                        target="_blank"
                        rel="noreferrer"
                        className="group/btn flex w-full items-center justify-center gap-3 rounded-2xl bg-emerald-500 py-4 text-[13px] font-black uppercase tracking-widest text-black transition-all hover:bg-emerald-400 hover:scale-[1.02] shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)]"
                      >
                        Enter Library <ExternalLink className="w-4 h-4 transition-transform group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1" />
                      </a>
                    ) : (
                       <div className="w-full text-center text-xs font-black uppercase tracking-widest text-emerald-500 py-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
                          Verified Pass
                       </div>
                    )
                  ) : inCart ? (
                    <Link
                      href="/checkout?from=cart&redirect=/dashboard/subscription?payment=success"
                      className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gray-800 text-white font-black uppercase tracking-widest text-[13px] py-4 transition-all hover:bg-gray-700 shadow-lg"
                    >
                      Added To Checkout <CheckCircle className="w-4 h-4 text-emerald-400" />
                    </Link>
                  ) : (
                    <button
                      type="button"
                      disabled={slot.seatsLeft === 0}
                      onClick={() => {
                        if (enrolledSlotIds.has(slot.id)) {
                          toast.error("You are already enrolled in this slot!");
                          return;
                        }
                        addItem({
                          slotId: slot.id,
                          name: slot.label,
                          timeLabel: slot.time,
                          price: slot.price,
                          roomId: slot.roomId ?? undefined,
                        });
                        toast.success("Subscription added to cart!");
                      }}
                      className="w-full rounded-2xl bg-white text-black py-4 text-[13px] font-black uppercase tracking-widest transition-all hover:bg-[var(--accent)] hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(255,255,255,0.1)] hover:shadow-[0_0_25px_rgba(var(--accent-rgb),0.4)]"
                    >
                      {slot.seatsLeft === 0 ? "Sold Out" : "Secure Your Seat"}
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {!hideLoginPrompt && !session?.user && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mt-16 text-center">
           <p className="text-sm font-semibold text-[var(--cream-muted)]">
             Already a member?{" "}
             <Link href="/login" className="text-[var(--accent)] hover:text-white transition-colors duration-300 ml-1 underline underline-offset-4 decoration-[var(--accent)]/50">
                Sign In securely
             </Link>
           </p>
        </motion.div>
      )}
    </div>
  );
}
