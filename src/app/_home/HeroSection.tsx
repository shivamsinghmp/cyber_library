"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { fadeIn, staggerContainer } from "./animations";

type Props = {
  headlineStart: string;
  headlineMid: string;
  headlineEnd: string;
  isLoggedIn: boolean;
  isStudent: boolean;
  isLoading: boolean;
};

export function HeroSection({ headlineStart, headlineMid, headlineEnd, isLoggedIn, isStudent, isLoading }: Props) {
  return (
    <section className="relative flex min-h-[92vh] items-center overflow-hidden">
      <div className="pointer-events-none absolute inset-0" style={{ backgroundImage: "radial-gradient(circle, #6366F122 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
      <div className="pointer-events-none absolute -top-48 right-0 h-[700px] w-[700px] animate-[orb-move_22s_ease-in-out_infinite_alternate] rounded-full blur-[140px]" style={{ background: "radial-gradient(circle, rgba(139,92,246,0.18) 0%, rgba(99,102,241,0.08) 60%, transparent 100%)" }} />
      <div className="pointer-events-none absolute bottom-0 -left-32 h-[500px] w-[500px] rounded-full blur-[120px]" style={{ background: "radial-gradient(circle, rgba(6,182,212,0.14) 0%, transparent 70%)" }} />

      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 py-24 sm:px-6 md:py-32 lg:px-8">
        <div className="grid items-center gap-14 lg:grid-cols-2 lg:gap-20">

          {/* Left */}
          <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="space-y-8">
            <motion.div variants={fadeIn}>
              <span className="inline-flex items-center gap-2.5 rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-[0.15em]" style={{ borderColor: "var(--accent-border)", background: "var(--accent-pale)", color: "var(--accent)" }}>
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75" style={{ background: "var(--accent)" }} />
                  <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: "var(--accent)" }} />
                </span>
                Trusted by 5000+ Students Across India
              </span>
            </motion.div>

            <motion.h1 variants={fadeIn} className="text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-5xl lg:text-[3.5rem]" style={{ color: "var(--foreground)" }}>
              {headlineStart}{" "}
              <span className="animate-[gradient-shift_8s_ease_infinite] bg-clip-text text-transparent" style={{ backgroundImage: "linear-gradient(135deg, #6366F1, #8B5CF6, #06B6D4, #6366F1)", backgroundSize: "300% auto" }}>
                {headlineMid}
              </span>{" "}
              {headlineEnd}
            </motion.h1>

            <motion.p variants={fadeIn} className="max-w-lg text-lg leading-relaxed" style={{ color: "var(--body-text)" }}>
              Ghar pe focus nahi hota? Phone haath mein aa jaata hai? Cyber Library mein aao — yahan students saath milke padhte hain, cameras on, mics off. Koi bakwaas nahi, sirf padhai.
            </motion.p>

            <motion.div variants={fadeIn} className="flex flex-wrap gap-4">
              {isLoading ? (
                <div className="h-14 w-44 animate-pulse rounded-full" style={{ background: "var(--accent-pale)" }} />
              ) : !isLoggedIn ? (
                <>
                  <Link href="/login" className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full px-8 py-4 text-sm font-bold text-white transition-all hover:scale-105" style={{ background: "linear-gradient(135deg, #6366F1, #8B5CF6)", boxShadow: "var(--shadow-brand)" }}>
                    <span className="absolute inset-0 translate-x-[-100%] skew-x-12 bg-white/10 transition-transform duration-500 group-hover:translate-x-[100%]" />
                    Join Session Now
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                  </Link>
                  <Link href="/signup" className="inline-flex items-center gap-2 rounded-full border-2 px-8 py-4 text-sm font-bold transition-all hover:scale-105" style={{ borderColor: "var(--accent)", color: "var(--accent)", background: "white" }}>
                    Request Access
                  </Link>
                </>
              ) : (
                <Link href="/dashboard" className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full px-8 py-4 text-sm font-bold text-white transition-all hover:scale-105" style={{ background: "linear-gradient(135deg, #6366F1, #8B5CF6)", boxShadow: "var(--shadow-brand)" }}>
                  <span className="absolute inset-0 translate-x-[-100%] skew-x-12 bg-white/10 transition-transform duration-500 group-hover:translate-x-[100%]" />
                  Go to Dashboard
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                </Link>
              )}
            </motion.div>

            <motion.div variants={fadeIn} className="flex flex-wrap gap-5">
              {[
                { emoji: "👥", label: "Saath padhte hain, focus rehta hai" },
                { emoji: "⏱️", label: "Pomodoro timer + lo-fi music" },
                { emoji: "🏆", label: "Streaks, coins aur leaderboard" },
              ].map((f) => (
                <div key={f.label} className="flex items-center gap-2 text-sm font-medium" style={{ color: "var(--body-text)" }}>
                  <span className="flex h-7 w-7 items-center justify-center rounded-full text-sm" style={{ background: "var(--accent-pale)" }}>{f.emoji}</span>
                  {f.label}
                </div>
              ))}
            </motion.div>
          </motion.div>

          {/* Right: floating card */}
          <motion.div initial={{ opacity: 0, x: 60 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3, duration: 1, ease: [0.16, 1, 0.3, 1] }} className="relative lg:flex lg:justify-end">
            <div className="absolute -inset-10 rounded-[3rem] blur-3xl" style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.12))" }} />

            <motion.div animate={{ y: [0, 8, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }} className="absolute -left-4 -top-6 z-20 rounded-2xl border bg-white px-4 py-3" style={{ borderColor: "var(--border)", boxShadow: "var(--shadow-lg)" }}>
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl text-lg" style={{ background: "linear-gradient(135deg, #6366F1, #8B5CF6)", boxShadow: "0 4px 12px rgba(99,102,241,0.40)" }}>🔥</div>
                <div>
                  <p className="text-xs font-extrabold" style={{ color: "var(--foreground)" }}>7 Din ki Streak! 🔥</p>
                  <p className="text-[10px]" style={{ color: "var(--muted-text)" }}>Chalta reh bhai</p>
                </div>
              </div>
            </motion.div>

            <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }} className="absolute -bottom-4 -right-4 z-20 rounded-2xl border bg-white px-4 py-3" style={{ borderColor: "var(--border)", boxShadow: "var(--shadow-lg)" }}>
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl text-lg" style={{ background: "linear-gradient(135deg, #10B981, #06B6D4)", boxShadow: "0 4px 12px rgba(16,185,129,0.40)" }}>⚡</div>
                <div>
                  <p className="text-xs font-extrabold" style={{ color: "var(--foreground)" }}>42 abhi pad rahe hain</p>
                  <p className="text-[10px]" style={{ color: "var(--muted-text)" }}>Tu bhi aa ja!</p>
                </div>
              </div>
            </motion.div>

            <motion.div animate={{ y: [0, -12, 0] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }} className="relative w-full max-w-md">
              <div className="relative overflow-hidden rounded-[2.5rem] border border-white/60 bg-white/85 p-8 backdrop-blur-xl" style={{ boxShadow: "0 32px 80px rgba(15,23,42,0.14), 0 8px 24px rgba(99,102,241,0.10)" }}>
                <div className="pointer-events-none absolute inset-0 rounded-[2.5rem]" style={{ background: "linear-gradient(135deg, rgba(238,242,255,0.5) 0%, transparent 60%, rgba(245,243,255,0.4) 100%)" }} />
                <div className="relative z-10 mb-7 flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: "var(--accent)" }}>Teri Padhai Ka Safar</p>
                  <span className="rounded-full px-3 py-1 text-[10px] font-extrabold text-white" style={{ background: "linear-gradient(135deg, #10B981, #06B6D4)", boxShadow: "0 2px 8px rgba(16,185,129,0.4)" }}>FREE TO START</span>
                </div>
                <div className="relative z-10 space-y-3">
                  {[
                    { step: "01", title: "Free mein sign up karo", desc: "Sirf 30 second lagenge, I promise", done: true },
                    { step: "02", title: "Apna slot choose karo", desc: "Morning, afternoon ya night — jo suit kare", done: true },
                    { step: "03", title: "Google Meet join karo", desc: "Camera on, mic off. Bas padhna hai.", done: false },
                    { step: "04", title: "Coins kamao, rank badhao", desc: "Roz aao, streak banao, leaderboard pe chao", done: false },
                  ].map((item, i) => (
                    <motion.div key={item.step} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 + i * 0.1 }} className="flex items-start gap-4 rounded-2xl border px-4 py-3.5" style={{ borderColor: item.done ? "var(--accent-border)" : "var(--border)", background: item.done ? "var(--accent-pale)" : "rgba(255,255,255,0.5)" }}>
                      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-extrabold" style={item.done ? { background: "linear-gradient(135deg, #6366F1, #8B5CF6)", color: "white", boxShadow: "0 2px 8px rgba(99,102,241,0.40)" } : { background: "var(--border)", color: "var(--muted-text)" }}>
                        {item.done ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg> : item.step}
                      </span>
                      <div>
                        <p className="text-sm font-bold" style={{ color: item.done ? "var(--accent)" : "var(--foreground)" }}>{item.title}</p>
                        <p className="mt-0.5 text-xs" style={{ color: "var(--muted-text)" }}>{item.desc}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
                <div className="relative z-10 mt-6">
                  <Link href="/signup" className="group flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl py-4 text-sm font-bold text-white transition-all hover:scale-[1.02]" style={{ background: "linear-gradient(135deg, #6366F1, #8B5CF6)", boxShadow: "var(--shadow-brand)" }}>
                    <span className="absolute inset-0 translate-x-[-100%] skew-x-12 bg-white/10 transition-transform duration-500 group-hover:translate-x-[100%]" />
                    Abhi Shuru Karo — Free Hai!
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m9 18 6-6-6-6"/></svg>
                  </Link>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
