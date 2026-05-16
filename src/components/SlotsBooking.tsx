"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  Clock, Users, ExternalLink, ShieldCheck,
  Loader2, Zap, Lock, BookOpen, Video,
} from "lucide-react";
import { motion } from "framer-motion";

type SlotItem = {
  id: string;
  roomId: string | null;
  label: string;
  time: string;
  seatsLeft: number;
  price: number;
  meetLink: string | null;
};

type SlotsBookingProps = {
  hideLoginPrompt?: boolean;
  slotType?: "STUDY" | "MENTORSHIP" | "MENTAL";
  title?: string;
  description?: string;
  emptyMessage?: string;
};

const SLOT_COLORS = [
  { gradient: "linear-gradient(135deg, #6366F1, #8B5CF6)", glow: "rgba(99,102,241,0.30)", pale: "#EEF2FF", border: "#C7D2FE" },
  { gradient: "linear-gradient(135deg, #06B6D4, #3B82F6)", glow: "rgba(6,182,212,0.30)",  pale: "#ECFEFF", border: "#A5F3FC" },
  { gradient: "linear-gradient(135deg, #F59E0B, #EF4444)", glow: "rgba(245,158,11,0.30)",  pale: "#FFFBEB", border: "#FDE68A" },
  { gradient: "linear-gradient(135deg, #10B981, #06B6D4)", glow: "rgba(16,185,129,0.30)",  pale: "#ECFDF5", border: "#A7F3D0" },
  { gradient: "linear-gradient(135deg, #8B5CF6, #EC4899)", glow: "rgba(139,92,246,0.30)",  pale: "#F5F3FF", border: "#DDD6FE" },
  { gradient: "linear-gradient(135deg, #F43F5E, #F59E0B)", glow: "rgba(244,63,94,0.30)",   pale: "#FFF1F2", border: "#FECDD3" },
];

const SLOT_EMOJIS = ["🌅", "☀️", "🌆", "🌙", "⭐", "🔥"];

const fadeIn = {
  hidden:  { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as [number,number,number,number] } },
};
const stagger = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.09 } },
};
const cardAnim = {
  hidden:  { opacity: 0, scale: 0.94, y: 24 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { type: "spring" as const, stiffness: 280, damping: 22 } },
};

export function SlotsBooking({
  hideLoginPrompt,
  slotType = "STUDY",
  title = "Live Study Rooms",
  description = "Apna slot choose karo aur aaj se padhai shuru karo. Camera on, mic off — pure focus zone.",
  emptyMessage = "Abhi koi study room available nahi hai. Thodi der baad dobara check karo.",
}: SlotsBookingProps) {
  const { data: session } = useSession();
  const [slots, setSlots]           = useState<SlotItem[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(true);

  useEffect(() => {
    setSlotsLoading(true);
    const url = slotType !== "STUDY" ? `/api/slots?type=${slotType}` : "/api/slots";
    fetch(url, { credentials: "include" })
      .then(r => r.ok ? r.json() : [])
      .then((data: { id: string; roomId?: string | null; name: string; timeLabel: string; capacity: number; goal?: string | null; price?: number; meetLink?: string | null }[]) => {
        setSlots(
          Array.isArray(data)
            ? data.map(s => ({
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


  const urgencyColor = (seats: number) =>
    seats === 0 ? "#EF4444" : seats < 5 ? "#F59E0B" : "#10B981";

  return (
    <div className="relative overflow-hidden" style={{ background: "var(--page-bg)" }}>

      {/* Ambient orbs */}
      <div className="pointer-events-none absolute top-0 right-0 h-[500px] w-[500px] rounded-full blur-[140px]"
        style={{ background: "radial-gradient(circle, rgba(99,102,241,0.10), transparent)" }} />
      <div className="pointer-events-none absolute bottom-0 left-0 h-[400px] w-[400px] rounded-full blur-[120px]"
        style={{ background: "radial-gradient(circle, rgba(6,182,212,0.08), transparent)" }} />
      <div className="pointer-events-none absolute inset-0"
        style={{ backgroundImage: "radial-gradient(circle, #6366F110 1px, transparent 1px)", backgroundSize: "32px 32px" }} />

      <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pt-10 pb-20">

        {/* ── HEADER ── */}
        <motion.div
          initial="hidden" animate="visible" variants={stagger}
          className="mb-14 text-center max-w-3xl mx-auto">

          <motion.div variants={fadeIn} className="mb-4">
            <span className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-extrabold uppercase tracking-[0.15em]"
              style={{ borderColor: "var(--accent-border)", background: "var(--accent-pale)", color: "var(--accent)" }}>
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75" style={{ background: "var(--accent)" }} />
                <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: "var(--accent)" }} />
              </span>
              Sessions Chal Rahi Hain
            </span>
          </motion.div>

          <motion.h1 variants={fadeIn}
            className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl"
            style={{ color: "var(--foreground)" }}>
            {title}
          </motion.h1>

          <motion.p variants={fadeIn} className="mt-4 text-lg leading-relaxed"
            style={{ color: "var(--body-text)" }}>
            {description}
          </motion.p>

          {/* Quick info pills */}
          <motion.div variants={fadeIn} className="mt-7 flex flex-wrap items-center justify-center gap-3">
            {[
              { icon: <Clock className="h-3.5 w-3.5" />, text: "Daily slots available" },
              { icon: <Users className="h-3.5 w-3.5" />, text: "40+ students per session" },
              { icon: <Zap className="h-3.5 w-3.5" />,  text: "Instant Meet link" },
              { icon: <Lock className="h-3.5 w-3.5" />,  text: "Camera on, mic off" },
            ].map((p, i) => (
              <span key={i}
                className="inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-bold"
                style={{ borderColor: "var(--border)", background: "white", color: "var(--muted-text)" }}>
                {p.icon} {p.text}
              </span>
            ))}
          </motion.div>
        </motion.div>

        {/* ── LOGIN PROMPT (guest) ── */}
        {!session?.user && !hideLoginPrompt && (
          <motion.div variants={fadeIn} initial="hidden" animate="visible"
            className="mb-10 flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl border px-6 py-4"
            style={{ borderColor: "var(--accent-border)", background: "var(--accent-pale)" }}>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl"
                style={{ background: "linear-gradient(135deg, #6366F1, #8B5CF6)", boxShadow: "0 4px 12px rgba(99,102,241,0.35)" }}>
                <BookOpen className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-extrabold" style={{ color: "var(--foreground)" }}>
                  Slot book karne ke liye login karo
                </p>
                <p className="text-xs font-semibold" style={{ color: "var(--muted-text)" }}>
                  Free account mein sabhi features available hain
                </p>
              </div>
            </div>
            <div className="flex gap-3 shrink-0">
              <Link href="/login"
                className="rounded-full border px-5 py-2 text-xs font-bold transition hover:-translate-y-0.5"
                style={{ borderColor: "var(--accent-border)", color: "var(--accent)", background: "white" }}>
                Login Karo
              </Link>
              <Link href="/signup"
                className="rounded-full px-5 py-2 text-xs font-extrabold text-white transition hover:scale-105"
                style={{ background: "linear-gradient(135deg, #6366F1, #8B5CF6)", boxShadow: "0 4px 12px rgba(99,102,241,0.35)" }}>
                Free Join
              </Link>
            </div>
          </motion.div>
        )}

        {/* ── LOADING ── */}
        {slotsLoading ? (
          <div className="flex flex-col items-center justify-center gap-4 py-32">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl"
              style={{ background: "linear-gradient(135deg, #6366F1, #8B5CF6)", boxShadow: "0 8px 24px rgba(99,102,241,0.35)" }}>
              <Loader2 className="h-8 w-8 animate-spin text-white" />
            </div>
            <p className="text-sm font-semibold" style={{ color: "var(--muted-text)" }}>
              Slots load ho rahe hain…
            </p>
          </div>

        /* ── EMPTY ── */
        ) : slots.length === 0 ? (
          <div className="mx-auto max-w-md rounded-2xl border bg-white py-16 text-center px-8"
            style={{ borderColor: "var(--border)", boxShadow: "var(--shadow-md)" }}>
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl"
              style={{ background: "var(--accent-pale)", border: "1.5px solid var(--accent-border)" }}>
              <ShieldCheck className="h-8 w-8" style={{ color: "var(--accent)" }} />
            </div>
            <h3 className="text-lg font-extrabold mb-2" style={{ color: "var(--foreground)" }}>
              Abhi Koi Slot Nahi Hai
            </h3>
            <p className="text-sm leading-relaxed" style={{ color: "var(--muted-text)" }}>
              {emptyMessage}
            </p>
          </div>

        /* ── SLOTS GRID ── */
        ) : (
          <motion.div
            variants={stagger} initial="hidden" animate="visible"
            className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {slots.map((slot, idx) => {
              const isFull      = slot.seatsLeft === 0;
              const isUrgent    = slot.seatsLeft > 0 && slot.seatsLeft < 5;
              const colorSet    = SLOT_COLORS[idx % SLOT_COLORS.length];
              const emoji       = SLOT_EMOJIS[idx % SLOT_EMOJIS.length];

              return (
                <motion.div
                  key={slot.id}
                  variants={cardAnim}
                  whileHover={!isFull ? { y: -6, transition: { duration: 0.25 } } : {}}
                  className="group relative flex flex-col overflow-hidden rounded-[1.75rem] border bg-white"
                  style={{
                    borderColor: isFull ? "var(--border)" : colorSet.border,
                    boxShadow: "var(--shadow-md)",
                  }}>

                  {/* ── TOP COLOR STRIPE ── */}
                  <div className="relative h-1.5 w-full"
                    style={{ background: colorSet.gradient }} />

                  {/* ── CARD BODY ── */}
                  <div className="flex flex-1 flex-col p-7">

                    {/* Header row */}
                    <div className="flex items-start justify-between mb-6">
                      <div className="flex items-center gap-3">
                        {/* Emoji icon */}
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl"
                          style={{ background: colorSet.pale, border: `1.5px solid ${colorSet.border}` }}>
                          {emoji}
                        </div>
                        <div>
                          <p className="text-[10px] font-extrabold uppercase tracking-[0.18em]"
                            style={{ color: "var(--muted-text)" }}>
                            {slot.label} Shift
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <Clock className="h-3.5 w-3.5" style={{ color: "var(--accent)" }} />
                            <span className="text-lg font-extrabold" style={{ color: "var(--foreground)" }}>
                              {slot.time}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Live indicator */}
                      <div className="shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-extrabold"
                        style={{ background: "#ECFDF5", color: "#059669", border: "1.5px solid #A7F3D0" }}>
                        <span className="relative flex h-2 w-2">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                        </span>
                        Live
                      </div>
                    </div>

                    {/* Status row */}
                    <div className="mb-6">
                      {isFull ? (
                        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5">
                          <Users className="h-4 w-4 text-red-400 shrink-0" />
                          <p className="text-xs font-extrabold text-red-600">Slot full ho gaya</p>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 shrink-0" style={{ color: urgencyColor(slot.seatsLeft) }} />
                            <p className="text-xs font-bold"
                              style={{ color: urgencyColor(slot.seatsLeft) }}>
                              {isUrgent
                                ? `Sirf ${slot.seatsLeft} seats bachi hain! ⚡`
                                : `${slot.seatsLeft} seats available`}
                            </p>
                          </div>
                          {isUrgent && (
                            <span className="rounded-full px-2.5 py-0.5 text-[10px] font-extrabold"
                              style={{ background: "#FEF3C7", color: "#B45309" }}>
                              Jaldi!
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Room ID */}
                    {slot.roomId && (
                      <p className="mb-5 text-[10px] font-mono uppercase tracking-widest"
                        style={{ color: "var(--muted-text)" }}>
                        Room: {slot.roomId}
                      </p>
                    )}

                    {/* ── CTA BUTTON ── */}
                    <div className="mt-auto">
                      {isFull ? (
                        <button disabled
                          className="w-full cursor-not-allowed rounded-2xl border py-3.5 text-sm font-extrabold opacity-50"
                          style={{ borderColor: "var(--border)", color: "var(--muted-text)", background: "var(--page-bg)" }}>
                          Full Ho Gaya
                        </button>
                      ) : !session?.user ? (
                        <Link href="/login"
                          className="group/btn flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl py-3.5 text-sm font-extrabold text-white transition-all hover:scale-[1.02]"
                          style={{ background: colorSet.gradient, boxShadow: `0 6px 20px ${colorSet.glow}` }}>
                          <Video className="h-4 w-4" />
                          Login Karke Join Karo
                        </Link>
                      ) : slot.meetLink ? (
                        <a href={slot.meetLink} target="_blank" rel="noreferrer"
                          className="group/btn flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl py-3.5 text-sm font-extrabold text-white transition-all hover:scale-[1.02] active:scale-95"
                          style={{ background: colorSet.gradient, boxShadow: `0 6px 20px ${colorSet.glow}` }}>
                          <span className="absolute inset-0 translate-x-[-100%] skew-x-12 bg-white/10 transition-transform duration-500 group-hover/btn:translate-x-[100%]" />
                          <Video className="h-4 w-4 relative" />
                          <span className="relative">Join Now</span>
                          <ExternalLink className="h-3.5 w-3.5 relative opacity-70" />
                        </a>
                      ) : (
                        <div className="w-full rounded-2xl border border-amber-200 bg-amber-50 py-3.5 text-center text-sm font-extrabold text-amber-700">
                          Meet Link Aayega Jaldi
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}

        {/* ── BOTTOM INFO ── */}
        {!slotsLoading && slots.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="mt-12 rounded-2xl border px-6 py-5 flex flex-col sm:flex-row items-center gap-4"
            style={{ borderColor: "var(--border)", background: "white", boxShadow: "var(--shadow-sm)" }}>
            <div className="flex items-center gap-3 flex-1">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl text-lg"
                style={{ background: "var(--accent-pale)", border: "1.5px solid var(--accent-border)" }}>
                💡
              </div>
              <div>
                <p className="text-sm font-extrabold" style={{ color: "var(--foreground)" }}>
                  Pehli baar join kar rahe ho?
                </p>
                <p className="text-xs font-semibold" style={{ color: "var(--muted-text)" }}>
                  Slot book karo → Google Meet link milega → Camera on karo, mic off → Padhai shuru!
                </p>
              </div>
            </div>
            <Link href="/rules"
              className="shrink-0 rounded-full border px-5 py-2 text-xs font-bold transition hover:-translate-y-0.5"
              style={{ borderColor: "var(--border)", color: "var(--foreground)", background: "var(--page-bg)" }}>
              Rules Padho →
            </Link>
          </motion.div>
        )}
      </div>
    </div>
  );
}
