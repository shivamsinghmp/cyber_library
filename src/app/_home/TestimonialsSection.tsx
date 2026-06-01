"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { fadeIn, staggerContainer } from "./animations";

const TESTIMONIALS = [
  {
    name: "Aman",
    role: "UPSC Aspirant",
    quote: "Ghar pe padhna impossible tha — phone, family, distractions. Yahan aake pehli baar 3 ghante continuous pada. Game changer hai seriously.",
    initial: "A",
  },
  {
    name: "Khushi",
    role: "JEE Student",
    quote: "Roz evening slot join karti hoon. Camera on hone se neend nahi aati aur baaki students ko dekhke motivation milta hai. Mere marks improve hue hain.",
    initial: "K",
  },
  {
    name: "Rohan",
    role: "NEET Aspirant",
    quote: "Pehle sochta tha 1 ghanta bhi focus nahi kar sakta. Ab daily 4-5 ghante ho jaate hain bina kisi problem ke. Yahi chahiye tha mujhe.",
    initial: "R",
  },
];

const AVATAR_GRADIENTS = [
  "linear-gradient(135deg, #6366F1, #8B5CF6)",
  "linear-gradient(135deg, #8B5CF6, #A855F7)",
  "linear-gradient(135deg, #06B6D4, #3B82F6)",
];

export function TestimonialsSection() {
  const [active, setActive] = useState(0);
  const t = TESTIMONIALS[active];

  return (
    <section className="relative py-28">
      <div className="pointer-events-none absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(238,242,255,0.3), transparent 40%)" }} />
      <div className="relative z-10 mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={staggerContainer}>
          <div className="mb-12 text-center">
            <motion.div variants={fadeIn}>
              <span className="mb-5 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-bold uppercase tracking-widest" style={{ borderColor: "var(--accent-border)", background: "var(--accent-pale)", color: "var(--accent)" }}>
                Unhi Ki Zubaani
              </span>
            </motion.div>
            <motion.h2 variants={fadeIn} className="text-3xl font-extrabold tracking-tight sm:text-4xl" style={{ color: "var(--foreground)" }}>
              Jo Aaye, Woh Bole
            </motion.h2>
          </div>

          <motion.div variants={fadeIn} className="relative overflow-hidden rounded-[2.5rem] border bg-white p-10 md:p-14" style={{ borderColor: "var(--border)", boxShadow: "var(--shadow-lg)" }}>
            <div className="mb-8 flex justify-center gap-1">
              {[...Array(5)].map((_, i) => (
                <svg key={i} width="20" height="20" viewBox="0 0 24 24" fill="#F59E0B">
                  <path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
              ))}
            </div>

            <div className="min-h-[120px] text-center">
              <motion.p key={active} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="text-xl font-semibold leading-relaxed tracking-tight md:text-2xl" style={{ color: "var(--foreground)" }}>
                {`"${t.quote}"`}
              </motion.p>
            </div>

            <div className="mt-10 flex flex-col items-center gap-3">
              <motion.div key={`${active}-avatar`} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }} className="flex h-14 w-14 items-center justify-center rounded-full text-xl font-extrabold text-white" style={{ background: AVATAR_GRADIENTS[active] }}>
                {t.initial}
              </motion.div>
              <div className="text-center">
                <p className="font-bold" style={{ color: "var(--foreground)" }}>{t.name}</p>
                <p className="text-sm" style={{ color: "var(--muted-text)" }}>{t.role}</p>
              </div>
            </div>

            <div className="mt-10 flex items-center justify-center gap-6">
              <button type="button" aria-label="Previous testimonial" onClick={() => setActive((p) => (p === 0 ? TESTIMONIALS.length - 1 : p - 1))} className="flex h-12 w-12 items-center justify-center rounded-full border transition-all hover:-translate-y-0.5" style={{ borderColor: "var(--border)", background: "white", color: "var(--foreground)" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>
              </button>
              <div className="flex gap-2" role="tablist" aria-label="Testimonials navigation">
                {TESTIMONIALS.map((_, idx) => (
                  <button key={idx} type="button" role="tab" aria-selected={idx === active} aria-label={`Testimonial ${idx + 1}`} onClick={() => setActive(idx)} className="h-2.5 rounded-full transition-all duration-500" style={{ width: idx === active ? "2rem" : "0.625rem", background: idx === active ? "var(--accent)" : "var(--border)" }} />
                ))}
              </div>
              <button type="button" aria-label="Next testimonial" onClick={() => setActive((p) => (p === TESTIMONIALS.length - 1 ? 0 : p + 1))} className="flex h-12 w-12 items-center justify-center rounded-full border transition-all hover:-translate-y-0.5" style={{ borderColor: "var(--border)", background: "white", color: "var(--foreground)" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>
              </button>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
