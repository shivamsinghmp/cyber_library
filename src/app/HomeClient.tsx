"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { PlantLeaderboard } from "@/components/PlantLeaderboard";
import { DynamicFaqs } from "@/components/DynamicFaqs";

const TESTIMONIALS = [
  {
    name: "Aman",
    role: "UPSC Aspirant",
    quote:
      "Ghar pe padhna impossible tha — phone, family, distractions. Yahan aake pehli baar 3 ghante continuous pada. Game changer hai seriously.",
    initial: "A",
  },
  {
    name: "Khushi",
    role: "JEE Student",
    quote:
      "Roz evening slot join karti hoon. Camera on hone se neend nahi aati aur baaki students ko dekhke motivation milta hai. Mere marks improve hue hain.",
    initial: "K",
  },
  {
    name: "Rohan",
    role: "NEET Aspirant",
    quote:
      "Pehle sochta tha 1 ghanta bhi focus nahi kar sakta. Ab daily 4-5 ghante ho jaate hain bina kisi problem ke. Yahi chahiye tha mujhe.",
    initial: "R",
  },
];

const DEFAULT_HEADLINE = "Finally, a Place Where You Actually Study.";

type Faq = { id: string; question: string; answer: string; order?: number };

const fadeIn = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.12 } },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.88 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  },
};

type HomeClientProps = {
  recentBlogs?: Array<{
    id: string;
    slug: string;
    title: string;
    excerpt: string | null;
    publishedAt: Date | null;
  }>;
  initialHeadline?: string | null;
  initialFaqs?: Faq[];
};

export function HomeClient({
  recentBlogs = [],
  initialHeadline,
  initialFaqs = [],
}: HomeClientProps) {
  const { data: session, status } = useSession();
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const headline = initialHeadline?.trim() || DEFAULT_HEADLINE;
  const [stats, setStats] = useState<{
    totalStudents: number;
    totalHours: number;
    activeNow: number;
  } | null>(null);
  const isStudent =
    session?.user &&
    ((session.user as { role?: string }).role ?? "STUDENT") === "STUDENT";
  const isLoading = status === "loading";

  useEffect(() => {
    fetch("/api/public-stats")
      .then((r) => (r.ok ? r.json() : null))
      .then(
        (d: { totalStudents: number; totalHours: number; activeNow: number } | null) => {
          if (d) setStats(d);
        }
      )
      .catch(() => {});
  }, []);

  /* ─── helpers ─── */
  const words = headline.split(" ");
  const headlineStart = words.slice(0, 3).join(" ");
  const headlineMid   = words.slice(3, 6).join(" ");
  const headlineEnd   = words.slice(6).join(" ");

  return (
    <div className="relative overflow-hidden" style={{ background: "var(--page-bg)" }}>

      {/* ══════════════════════════════════════════════
          HERO
      ══════════════════════════════════════════════ */}
      <section className="relative min-h-[92vh] flex items-center overflow-hidden">

        {/* Background: dot grid */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: "radial-gradient(circle, #6366F122 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />

        {/* Gradient orbs */}
        <div
          className="pointer-events-none absolute -top-48 right-0 h-[700px] w-[700px] rounded-full blur-[140px] animate-[orb-move_22s_ease-in-out_infinite_alternate]"
          style={{ background: "radial-gradient(circle, rgba(139,92,246,0.18) 0%, rgba(99,102,241,0.08) 60%, transparent 100%)" }}
        />
        <div
          className="pointer-events-none absolute bottom-0 -left-32 h-[500px] w-[500px] rounded-full blur-[120px]"
          style={{ background: "radial-gradient(circle, rgba(6,182,212,0.14) 0%, transparent 70%)" }}
        />

        <div className="relative z-10 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-24 md:py-32">
          <div className="grid lg:grid-cols-2 gap-14 lg:gap-20 items-center">

            {/* Left */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={staggerContainer}
              className="space-y-8"
            >
              {/* Badge */}
              <motion.div variants={fadeIn}>
                <span className="inline-flex items-center gap-2.5 rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-[0.15em]"
                  style={{
                    borderColor: "var(--accent-border)",
                    background: "var(--accent-pale)",
                    color: "var(--accent)",
                  }}>
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
                      style={{ background: "var(--accent)" }} />
                    <span className="relative inline-flex h-2 w-2 rounded-full"
                      style={{ background: "var(--accent)" }} />
                  </span>
                  Trusted by 5000+ Students Across India
                </span>
              </motion.div>

              {/* Headline */}
              <motion.h1
                variants={fadeIn}
                className="text-4xl sm:text-5xl lg:text-[3.5rem] font-extrabold tracking-tight leading-[1.08]"
                style={{ color: "var(--foreground)" }}
              >
                {headlineStart}{" "}
                <span
                  className="bg-clip-text text-transparent animate-[gradient-shift_8s_ease_infinite]"
                  style={{
                    backgroundImage: "linear-gradient(135deg, #6366F1, #8B5CF6, #06B6D4, #6366F1)",
                    backgroundSize: "300% auto",
                  }}
                >
                  {headlineMid}
                </span>{" "}
                {headlineEnd}
              </motion.h1>

              {/* Description */}
              <motion.p
                variants={fadeIn}
                className="text-lg leading-relaxed max-w-lg"
                style={{ color: "var(--body-text)" }}
              >
                Ghar pe focus nahi hota? Phone haath mein aa jaata hai? Cyber Library mein aao — yahan students saath milke padhte hain, cameras on, mics off. Koi bakwaas nahi, sirf padhai.
              </motion.p>

              {/* CTAs */}
              <motion.div variants={fadeIn} className="flex flex-wrap gap-4">
                {isLoading ? (
                  <div className="h-14 w-44 animate-pulse rounded-full"
                    style={{ background: "var(--accent-pale)" }} />
                ) : !session?.user ? (
                  <>
                    <Link
                      href="/login"
                      className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full px-8 py-4 text-sm font-bold text-white transition-all hover:scale-105"
                      style={{
                        background: "linear-gradient(135deg, #6366F1, #8B5CF6)",
                        boxShadow: "var(--shadow-brand)",
                      }}
                    >
                      <span className="absolute inset-0 translate-x-[-100%] skew-x-12 bg-white/10 transition-transform duration-500 group-hover:translate-x-[100%]" />
                      Join Session Now
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                    </Link>
                    <Link
                      href="/signup"
                      className="inline-flex items-center gap-2 rounded-full border-2 px-8 py-4 text-sm font-bold transition-all hover:scale-105"
                      style={{
                        borderColor: "var(--accent)",
                        color: "var(--accent)",
                        background: "white",
                      }}
                    >
                      Request Access
                    </Link>
                  </>
                ) : (
                  <Link
                    href="/dashboard"
                    className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full px-8 py-4 text-sm font-bold text-white transition-all hover:scale-105"
                    style={{
                      background: "linear-gradient(135deg, #6366F1, #8B5CF6)",
                      boxShadow: "var(--shadow-brand)",
                    }}
                  >
                    <span className="absolute inset-0 translate-x-[-100%] skew-x-12 bg-white/10 transition-transform duration-500 group-hover:translate-x-[100%]" />
                    Go to Dashboard
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                  </Link>
                )}
              </motion.div>

              {/* Bullets */}
              <motion.div variants={fadeIn} className="flex flex-wrap gap-5">
                {[
                  { emoji: "👥", label: "Saath padhte hain, focus rehta hai" },
                  { emoji: "⏱️", label: "Pomodoro timer + lo-fi music" },
                  { emoji: "🏆", label: "Streaks, coins aur leaderboard" },
                ].map((f) => (
                  <div key={f.label} className="flex items-center gap-2 text-sm font-medium"
                    style={{ color: "var(--body-text)" }}>
                    <span className="flex h-7 w-7 items-center justify-center rounded-full text-sm"
                      style={{ background: "var(--accent-pale)" }}>
                      {f.emoji}
                    </span>
                    {f.label}
                  </div>
                ))}
              </motion.div>
            </motion.div>

            {/* Right: 3D floating card */}
            <motion.div
              initial={{ opacity: 0, x: 60 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3, duration: 1, ease: [0.16, 1, 0.3, 1] }}
              className="relative lg:flex lg:justify-end"
            >
              {/* Glow behind card */}
              <div className="absolute -inset-10 rounded-[3rem] blur-3xl"
                style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.12))" }} />

              {/* Floating badges */}
              <motion.div
                animate={{ y: [0, 8, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -top-6 -left-4 z-20 rounded-2xl border bg-white px-4 py-3"
                style={{ borderColor: "var(--border)", boxShadow: "var(--shadow-lg)" }}
              >
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl text-lg"
                    style={{
                      background: "linear-gradient(135deg, #6366F1, #8B5CF6)",
                      boxShadow: "0 4px 12px rgba(99,102,241,0.40)",
                    }}>
                    🔥
                  </div>
                  <div>
                    <p className="text-xs font-extrabold" style={{ color: "var(--foreground)" }}>7 Din ki Streak! 🔥</p>
                    <p className="text-[10px]" style={{ color: "var(--muted-text)" }}>Chalta reh bhai</p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                className="absolute -bottom-4 -right-4 z-20 rounded-2xl border bg-white px-4 py-3"
                style={{ borderColor: "var(--border)", boxShadow: "var(--shadow-lg)" }}
              >
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl text-lg"
                    style={{
                      background: "linear-gradient(135deg, #10B981, #06B6D4)",
                      boxShadow: "0 4px 12px rgba(16,185,129,0.40)",
                    }}>
                    ⚡
                  </div>
                  <div>
                    <p className="text-xs font-extrabold" style={{ color: "var(--foreground)" }}>42 abhi pad rahe hain</p>
                    <p className="text-[10px]" style={{ color: "var(--muted-text)" }}>Tu bhi aa ja!</p>
                  </div>
                </div>
              </motion.div>

              {/* Main card */}
              <motion.div
                animate={{ y: [0, -12, 0] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                className="relative w-full max-w-md"
              >
                <div className="relative overflow-hidden rounded-[2.5rem] border border-white/60 bg-white/85 p-8 backdrop-blur-xl"
                  style={{ boxShadow: "0 32px 80px rgba(15,23,42,0.14), 0 8px 24px rgba(99,102,241,0.10)" }}>

                  {/* Card gradient overlay */}
                  <div className="pointer-events-none absolute inset-0 rounded-[2.5rem]"
                    style={{ background: "linear-gradient(135deg, rgba(238,242,255,0.5) 0%, transparent 60%, rgba(245,243,255,0.4) 100%)" }} />

                  {/* Header */}
                  <div className="relative z-10 mb-7 flex items-center justify-between">
                    <p className="text-xs font-bold uppercase tracking-[0.2em]"
                      style={{ color: "var(--accent)" }}>Teri Padhai Ka Safar</p>
                    <span className="rounded-full px-3 py-1 text-[10px] font-extrabold text-white"
                      style={{
                        background: "linear-gradient(135deg, #10B981, #06B6D4)",
                        boxShadow: "0 2px 8px rgba(16,185,129,0.4)",
                      }}>
                      FREE TO START
                    </span>
                  </div>

                  {/* Steps */}
                  <div className="relative z-10 space-y-3">
                    {[
                      { step: "01", title: "Free mein sign up karo", desc: "Sirf 30 second lagenge, I promise", done: true },
                      { step: "02", title: "Apna slot choose karo", desc: "Morning, afternoon ya night — jo suit kare", done: true },
                      { step: "03", title: "Google Meet join karo", desc: "Camera on, mic off. Bas padhna hai.", done: false },
                      { step: "04", title: "Coins kamao, rank badhao", desc: "Roz aao, streak banao, leaderboard pe chao", done: false },
                    ].map((item, i) => (
                      <motion.div
                        key={item.step}
                        initial={{ opacity: 0, x: -16 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.5 + i * 0.1 }}
                        className="flex items-start gap-4 rounded-2xl border px-4 py-3.5"
                        style={{
                          borderColor: item.done ? "var(--accent-border)" : "var(--border)",
                          background: item.done ? "var(--accent-pale)" : "rgba(255,255,255,0.5)",
                        }}
                      >
                        <span
                          className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-extrabold"
                          style={item.done ? {
                            background: "linear-gradient(135deg, #6366F1, #8B5CF6)",
                            color: "white",
                            boxShadow: "0 2px 8px rgba(99,102,241,0.40)",
                          } : {
                            background: "var(--border)",
                            color: "var(--muted-text)",
                          }}
                        >
                          {item.done ? (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                          ) : item.step}
                        </span>
                        <div>
                          <p className="text-sm font-bold"
                            style={{ color: item.done ? "var(--accent)" : "var(--foreground)" }}>
                            {item.title}
                          </p>
                          <p className="text-xs mt-0.5" style={{ color: "var(--muted-text)" }}>{item.desc}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  {/* Card CTA */}
                  <div className="relative z-10 mt-6">
                    <Link
                      href="/signup"
                      className="group flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl py-4 text-sm font-bold text-white transition-all hover:scale-[1.02]"
                      style={{
                        background: "linear-gradient(135deg, #6366F1, #8B5CF6)",
                        boxShadow: "var(--shadow-brand)",
                      }}
                    >
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

      {/* ══════════════════════════════════════════════
          STATS
      ══════════════════════════════════════════════ */}
      {stats && (stats.totalStudents > 0 || stats.totalHours > 0) && (
        <section className="border-y bg-white py-16" style={{ borderColor: "var(--border)" }}>
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={staggerContainer}
              className="grid grid-cols-3 gap-8"
            >
              {[
                {
                  value:
                    stats.totalStudents >= 1000
                      ? `${(stats.totalStudents / 1000).toFixed(1)}k+`
                      : `${stats.totalStudents}+`,
                  label: "Students Enrolled",
                  emoji: "👥",
                  bg: "linear-gradient(135deg, #6366F1, #8B5CF6)",
                  glow: "rgba(99,102,241,0.35)",
                },
                {
                  value:
                    stats.totalHours >= 1000
                      ? `${Math.floor(stats.totalHours / 1000)}k+`
                      : `${stats.totalHours}+`,
                  label: "Hours Studied",
                  emoji: "⏱️",
                  bg: "linear-gradient(135deg, #8B5CF6, #06B6D4)",
                  glow: "rgba(139,92,246,0.35)",
                },
                {
                  value: stats.activeNow > 0 ? `${stats.activeNow} Live` : "24/7",
                  label: stats.activeNow > 0 ? "Studying Right Now" : "Always Open",
                  emoji: stats.activeNow > 0 ? "🔴" : "✅",
                  bg: "linear-gradient(135deg, #06B6D4, #10B981)",
                  glow: "rgba(6,182,212,0.35)",
                },
              ].map((s, i) => (
                <motion.div key={i} variants={fadeIn} className="flex flex-col items-center text-center gap-3">
                  <div
                    className="flex h-16 w-16 items-center justify-center rounded-2xl text-2xl"
                    style={{
                      background: s.bg,
                      boxShadow: `0 2px 0 rgba(255,255,255,0.15) inset, 0 -3px 0 rgba(0,0,0,0.12) inset, 0 8px 20px ${s.glow}`,
                    }}
                  >
                    {s.emoji}
                  </div>
                  <p className="text-3xl md:text-4xl font-black" style={{ color: "var(--foreground)" }}>
                    {s.value}
                  </p>
                  <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--muted-text)" }}>
                    {s.label}
                  </p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>
      )}

      {/* ══════════════════════════════════════════════
          SCIENCE SECTION
      ══════════════════════════════════════════════ */}
      <section className="relative overflow-hidden py-28">
        <div className="pointer-events-none absolute top-0 right-0 h-[400px] w-[400px] rounded-full blur-[100px]"
          style={{ background: "radial-gradient(circle, rgba(139,92,246,0.12), transparent)" }} />
        <div className="pointer-events-none absolute bottom-0 left-0 h-[300px] w-[300px] rounded-full blur-[80px]"
          style={{ background: "radial-gradient(circle, rgba(6,182,212,0.10), transparent)" }} />

        <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={staggerContainer}
            className="space-y-16"
          >
            {/* Header */}
            <div className="mx-auto max-w-3xl text-center">
              <motion.div variants={fadeIn}>
                <span className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-bold uppercase tracking-widest mb-5"
                  style={{ borderColor: "var(--accent-border)", background: "var(--accent-pale)", color: "var(--accent)" }}>
                  Ye Kaam Karta Kyun Hai?
                </span>
              </motion.div>
              <motion.h2 variants={fadeIn} className="text-3xl font-extrabold tracking-tight sm:text-5xl"
                style={{ color: "var(--foreground)" }}>
                Akele padhna mushkil hai —{" "}
                <span className="bg-clip-text text-transparent"
                  style={{ backgroundImage: "linear-gradient(135deg, #6366F1, #8B5CF6)" }}>
                  Saath mein aasaan.
                </span>
              </motion.h2>
              <motion.p variants={fadeIn} className="mt-5 text-lg leading-relaxed"
                style={{ color: "var(--body-text)" }}>
                Science kehta hai — jab aap doosron ke saath kaam karte ho, to focus 3x better hota hai. Hum usi principle pe kaam karte hain. Simple hai, effective hai.
              </motion.p>
            </div>

            {/* Cards */}
            <div className="grid gap-7 md:grid-cols-3">
              {[
                {
                  iconBg: "linear-gradient(145deg, #818CF8, #4F46E5)",
                  glow: "rgba(99,102,241,0.45)",
                  cardBg: "linear-gradient(145deg, #EEF2FF 0%, #FFFFFF 100%)",
                  borderColor: "#C7D2FE",
                  icon: (
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                      <circle cx="9" cy="7" r="4"/>
                      <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
                      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                    </svg>
                  ),
                  title: "Saath padhne se focus badhta hai",
                  desc: "Jab 30-40 students ek saath screen pe dikh rahe hote hain aur padh rahe hote hain — phone uthane ki ichchha khud khatam ho jaati hai. Ye peer pressure acha wala hai.",
                  watermark: "👥",
                },
                {
                  iconBg: "linear-gradient(145deg, #A78BFA, #7C3AED)",
                  glow: "rgba(124,58,237,0.45)",
                  cardBg: "linear-gradient(145deg, #F5F3FF 0%, #FFFFFF 100%)",
                  borderColor: "#DDD6FE",
                  icon: (
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/>
                      <polyline points="12 6 12 12 16 14"/>
                    </svg>
                  ),
                  title: "Timer se padhai, thakaan nahi",
                  desc: "50 minute padho, 10 minute rest. Ye Pomodoro technique hai — doctors aur toppers dono use karte hain. Brain fresh rehta hai aur padhaya yaad bhi rehta hai.",
                  watermark: "⏱️",
                },
                {
                  iconBg: "linear-gradient(145deg, #22D3EE, #0891B2)",
                  glow: "rgba(8,145,178,0.45)",
                  cardBg: "linear-gradient(145deg, #ECFEFF 0%, #FFFFFF 100%)",
                  borderColor: "#A5F3FC",
                  icon: (
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                    </svg>
                  ),
                  title: "Dimag ko signal milta hai",
                  desc: "Jab aap Cyber Library open karte ho, brain samajh jaata hai — 'ab padhna hai'. Kuch dino baad automatically focus mode on ho jaata hai. Ye conditioning hai.",
                  watermark: "⚡",
                },
              ].map((item, i) => (
                <motion.div
                  variants={fadeIn}
                  key={i}
                  whileHover={{ y: -8, transition: { duration: 0.3 } }}
                  className="group relative overflow-hidden rounded-[2rem] border p-8"
                  style={{
                    borderColor: item.borderColor,
                    background: item.cardBg,
                    boxShadow: "var(--shadow-md)",
                  }}
                >
                  {/* 3D icon */}
                  <div className="relative mb-8 inline-block">
                    <div
                      className="flex h-16 w-16 items-center justify-center rounded-2xl transition-transform duration-300 group-hover:-translate-y-1 group-hover:scale-110"
                      style={{
                        background: item.iconBg,
                        boxShadow: `0 2px 0 rgba(255,255,255,0.18) inset, 0 -3px 0 rgba(0,0,0,0.15) inset, 0 8px 20px ${item.glow}, 0 2px 6px rgba(0,0,0,0.08)`,
                      }}
                    >
                      {item.icon}
                    </div>
                    {/* 3D shadow clone */}
                    <div className="absolute top-2 left-2 h-16 w-16 rounded-2xl opacity-20 blur-[10px]"
                      style={{ background: item.iconBg }} />
                  </div>

                  <h3 className="mb-3 text-xl font-bold" style={{ color: "var(--foreground)" }}>{item.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--body-text)" }}>{item.desc}</p>

                  {/* Background watermark */}
                  <div className="absolute -bottom-2 -right-2 select-none text-[7rem] leading-none opacity-[0.04] pointer-events-none">
                    {item.watermark}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          HOW IT WORKS
      ══════════════════════════════════════════════ */}
      <section className="relative py-28 bg-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={staggerContainer}
          >
            <div className="mb-16 text-center">
              <motion.div variants={fadeIn}>
                <span className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-bold uppercase tracking-widest mb-5"
                  style={{ borderColor: "var(--accent-border)", background: "var(--accent-pale)", color: "var(--accent)" }}>
                  Itna Simple Hai
                </span>
              </motion.div>
              <motion.h2 variants={fadeIn} className="text-3xl font-extrabold tracking-tight sm:text-5xl"
                style={{ color: "var(--foreground)" }}>
                4 Steps Mein Shuru Karo
              </motion.h2>
            </div>

            <div className="relative grid gap-8 md:grid-cols-4">
              {/* Connecting gradient line */}
              <div
                className="absolute top-12 left-[12.5%] right-[12.5%] hidden h-[2px] md:block"
                style={{
                  background: "linear-gradient(to right, #6366F1, #8B5CF6, #06B6D4, #10B981)",
                  opacity: 0.3,
                }}
              />

              {[
                {
                  step: "01",
                  title: "Free Account Banao",
                  desc: "Sirf naam aur email chahiye. 30 second mein ho jaata hai — koi credit card nahi.",
                  color: "#6366F1",
                },
                {
                  step: "02",
                  title: "Slot Choose Karo",
                  desc: "Morning, afternoon ya night — jo time suit kare woh slot book karo.",
                  color: "#8B5CF6",
                },
                {
                  step: "03",
                  title: "Meet Join Karo",
                  desc: "Camera on, mic off. Timer shuru hoga aur sab padhai mein lag jaayenge.",
                  color: "#06B6D4",
                },
                {
                  step: "04",
                  title: "Roz Aao, Badhte Raho",
                  desc: "Har din aane se streak banti hai, coins milte hain aur leaderboard pe rank improve hoti hai.",
                  color: "#10B981",
                },
              ].map((item, i) => (
                <motion.div
                  variants={scaleIn}
                  key={i}
                  className="group relative text-center"
                >
                  {/* 3D badge */}
                  <div className="relative mx-auto mb-8 flex h-24 w-24 items-center justify-center">
                    <div
                      className="absolute inset-0 rounded-full blur-[20px] opacity-25"
                      style={{ background: item.color }}
                    />
                    <div
                      className="relative flex h-24 w-24 items-center justify-center rounded-full text-2xl font-black text-white transition-all duration-300 group-hover:-translate-y-2 group-hover:scale-110"
                      style={{
                        background: `linear-gradient(145deg, ${item.color}BB, ${item.color})`,
                        boxShadow: `0 2px 0 rgba(255,255,255,0.2) inset, 0 -4px 0 rgba(0,0,0,0.15) inset, 0 10px 28px ${item.color}60, 0 4px 8px rgba(0,0,0,0.10)`,
                      }}
                    >
                      {item.step}
                    </div>
                    {/* ground shadow */}
                    <div
                      className="absolute -bottom-1 left-1/2 h-4 w-14 -translate-x-1/2 rounded-full blur-[8px] opacity-20 transition-opacity duration-300 group-hover:opacity-35"
                      style={{ background: item.color }}
                    />
                  </div>

                  <h4 className="mb-3 text-lg font-bold" style={{ color: "var(--foreground)" }}>{item.title}</h4>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--body-text)" }}>{item.desc}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          ECOSYSTEM BENTO
      ══════════════════════════════════════════════ */}
      <section className="relative py-28">
        <div className="pointer-events-none absolute left-0 top-1/2 h-[500px] w-[500px] -translate-y-1/2 -translate-x-1/2 rounded-full blur-[120px]"
          style={{ background: "radial-gradient(circle, rgba(139,92,246,0.10), transparent)" }} />

        <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={staggerContainer}
          >
            <div className="mb-16 max-w-3xl mx-auto text-center">
              <motion.div variants={fadeIn}>
                <span className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-bold uppercase tracking-widest mb-5"
                  style={{ borderColor: "var(--accent-border)", background: "var(--accent-pale)", color: "var(--accent)" }}>
                  Sirf Rooms Nahi, Bahut Kuch Hai
                </span>
              </motion.div>
              <motion.h2 variants={fadeIn} className="text-3xl font-extrabold tracking-tight sm:text-5xl"
                style={{ color: "var(--foreground)" }}>
                Study rooms ke alawa{" "}
                <span className="bg-clip-text text-transparent"
                  style={{ backgroundImage: "linear-gradient(135deg, #6366F1, #06B6D4)" }}>
                  aur bhi bahut kuch.
                </span>
              </motion.h2>
              <motion.p variants={fadeIn} className="mt-5 text-lg" style={{ color: "var(--body-text)" }}>
                Games, rewards, mental health support — sab kuch ek jagah. Padhai boring nahi lagegi jab progress dikh rahi ho.
              </motion.p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 md:grid-rows-2 gap-5">

              {/* Feature 1: Live Focus (2 cols, dark) */}
              <motion.div
                variants={fadeIn}
                className="md:col-span-2 group relative overflow-hidden rounded-[2rem] p-10 md:p-12"
                style={{ background: "linear-gradient(135deg, #4338CA 0%, #5B21B6 55%, #1D4ED8 100%)" }}
              >
                {/* bright glow top-right */}
                <div className="pointer-events-none absolute -top-12 -right-12 h-64 w-64 rounded-full blur-[60px]"
                  style={{ background: "radial-gradient(circle, rgba(167,139,250,0.45), transparent)" }} />
                {/* cyan glow bottom */}
                <div className="pointer-events-none absolute -bottom-8 left-1/3 h-48 w-48 rounded-full blur-[50px]"
                  style={{ background: "radial-gradient(circle, rgba(99,210,255,0.25), transparent)" }} />
                {/* dot grid */}
                <div className="pointer-events-none absolute inset-0"
                  style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.07) 1px, transparent 1px)", backgroundSize: "24px 24px" }} />

                <div className="relative z-10">
                  {/* icon box — white bg so it pops */}
                  <div className="mb-7 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 ring-2 ring-white/30">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3"/>
                    </svg>
                  </div>
                  <h4 className="mb-4 text-2xl font-bold" style={{ color: "#FFFFFF" }}>Live Study Rooms</h4>
                  <p className="mb-8 max-w-md text-base leading-relaxed font-medium" style={{ color: "#E0E7FF" }}>
                    Google Meet pe silent sessions join karo. Pomodoro timer chalta hai, sab saath padhte hain. Ghar pe bhi library jaisi feeling aati hai.
                  </p>
                  <Link href="/study-room"
                    className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold transition hover:bg-white/90 hover:scale-105"
                    style={{ color: "#4338CA" }}>
                    Explore Rooms
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m9 18 6-6-6-6"/></svg>
                  </Link>
                </div>
              </motion.div>

              {/* Feature 2: Gamification */}
              <motion.div
                variants={fadeIn}
                className="group relative overflow-hidden rounded-[2rem] border bg-white p-8 transition-all hover:-translate-y-1"
                style={{ borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }}
              >
                <div className="pointer-events-none absolute -top-8 -right-8 h-40 w-40 rounded-full blur-[50px] opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                  style={{ background: "radial-gradient(circle, rgba(16,185,129,0.2), transparent)" }} />
                <div className="relative mb-7 inline-block">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl transition-transform duration-300 group-hover:-translate-y-1 group-hover:scale-110"
                    style={{
                      background: "linear-gradient(145deg, #34D399, #059669)",
                      boxShadow: "0 2px 0 rgba(255,255,255,0.15) inset, 0 -3px 0 rgba(0,0,0,0.12) inset, 0 6px 16px rgba(5,150,105,0.40)",
                    }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                      <path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14"/>
                    </svg>
                  </div>
                  <div className="absolute top-1.5 left-1.5 h-14 w-14 rounded-2xl opacity-25 blur-[8px]"
                    style={{ background: "linear-gradient(145deg, #34D399, #059669)" }} />
                </div>
                <h4 className="mb-3 text-xl font-bold" style={{ color: "var(--foreground)" }}>Streaks & Rewards 🏆</h4>
                <p className="text-sm leading-relaxed" style={{ color: "var(--body-text)" }}>
                  Roz aao toh streak banti hai, coins milte hain. Leaderboard pe naam aata hai toh motivation automatic aa jaata hai.
                </p>
              </motion.div>

              {/* Feature 3: Mental Health */}
              <motion.div
                variants={fadeIn}
                className="group relative overflow-hidden rounded-[2rem] border bg-white p-8 transition-all hover:-translate-y-1"
                style={{ borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }}
              >
                <div className="pointer-events-none absolute top-0 left-0 h-48 w-full opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                  style={{ background: "linear-gradient(to bottom, rgba(59,130,246,0.06), transparent)" }} />
                <div className="relative mb-7 inline-block">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl transition-transform duration-300 group-hover:-translate-y-1 group-hover:scale-110"
                    style={{
                      background: "linear-gradient(145deg, #60A5FA, #2563EB)",
                      boxShadow: "0 2px 0 rgba(255,255,255,0.15) inset, 0 -3px 0 rgba(0,0,0,0.12) inset, 0 6px 16px rgba(37,99,235,0.40)",
                    }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                      <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z"/>
                      <path d="M12 8v4l3 3"/>
                    </svg>
                  </div>
                  <div className="absolute top-1.5 left-1.5 h-14 w-14 rounded-2xl opacity-25 blur-[8px]"
                    style={{ background: "linear-gradient(145deg, #60A5FA, #2563EB)" }} />
                </div>
                <h4 className="mb-3 text-xl font-bold" style={{ color: "var(--foreground)" }}>Mental Health Support 💙</h4>
                <p className="mb-6 text-sm leading-relaxed" style={{ color: "var(--body-text)" }}>
                  Padhai ka pressure bahut hota hai. Agar kabhi overwhelmed lage toh 1-on-1 counselling sessions available hain — bilkul private.
                </p>
                <Link href="/mental-session"
                  className="inline-flex items-center gap-1.5 text-sm font-bold transition-colors"
                  style={{ color: "#2563EB" }}>
                  Book a Session
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m9 18 6-6-6-6"/></svg>
                </Link>
              </motion.div>

              {/* Feature 4: Store (2 cols) */}
              <motion.div
                variants={fadeIn}
                className="md:col-span-2 group relative overflow-hidden rounded-[2rem] border bg-white p-10 md:flex md:items-center md:gap-10 transition-all hover:-translate-y-1"
                style={{ borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }}
              >
                <div className="pointer-events-none absolute bottom-0 right-0 h-64 w-64 rounded-full blur-[80px] opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                  style={{ background: "radial-gradient(circle, rgba(245,158,11,0.15), transparent)" }} />
                <div className="relative z-10 flex-1">
                  <div className="relative mb-7 inline-block">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl transition-transform duration-300 group-hover:-translate-y-1 group-hover:scale-110"
                      style={{
                        background: "linear-gradient(145deg, #FCD34D, #D97706)",
                        boxShadow: "0 2px 0 rgba(255,255,255,0.15) inset, 0 -3px 0 rgba(0,0,0,0.12) inset, 0 6px 16px rgba(217,119,6,0.40)",
                      }}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                        <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/>
                        <path d="M3 6h18"/>
                        <path d="M16 10a4 4 0 0 1-8 0"/>
                      </svg>
                    </div>
                    <div className="absolute top-1.5 left-1.5 h-14 w-14 rounded-2xl opacity-25 blur-[8px]"
                      style={{ background: "linear-gradient(145deg, #FCD34D, #D97706)" }} />
                  </div>
                  <h4 className="mb-3 text-2xl font-bold" style={{ color: "var(--foreground)" }}>Study Material Store 📚</h4>
                  <p className="mb-6 text-base leading-relaxed" style={{ color: "var(--body-text)" }}>
                    Toppers ke banaye planners, notes aur trackers — seedha download karo. Khud dhundhne ki zarurat nahi.
                  </p>
                  <Link href="/store"
                    className="inline-flex items-center gap-2 text-sm font-bold transition-colors"
                    style={{ color: "#D97706" }}>
                    Browse Collection
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m9 18 6-6-6-6"/></svg>
                  </Link>
                </div>
                <div className="relative z-10 mt-8 hidden md:flex md:mt-0 h-40 w-40 shrink-0 items-center justify-center rounded-[2rem] border"
                  style={{ borderColor: "var(--accent-border)", background: "linear-gradient(135deg, var(--accent-pale), var(--violet-pale))" }}>
                  <div className="absolute inset-3 rounded-[1.5rem] border border-dashed"
                    style={{ borderColor: "var(--accent-border)" }} />
                  <span className="text-6xl transition-transform duration-500 group-hover:scale-110">📚</span>
                </div>
              </motion.div>

            </div>
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          STUDENT CTA
      ══════════════════════════════════════════════ */}
      {isStudent && (
        <section className="py-10 px-4">
          <div className="mx-auto max-w-5xl">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeIn}
              className="relative overflow-hidden rounded-[2.5rem] p-px"
              style={{
                background: "linear-gradient(135deg, #6366F1, #8B5CF6, #06B6D4)",
                boxShadow: "var(--shadow-brand)",
              }}
            >
              <div className="rounded-[calc(2.5rem-1px)] px-10 py-12 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-8"
                style={{ background: "linear-gradient(135deg, #EEF2FF 0%, #FFFFFF 50%, #F5F3FF 100%)" }}>
                <div>
                  <h2 className="text-3xl font-extrabold" style={{ color: "var(--foreground)" }}>
                    Aaj se shuru karte hain? 🚀
                  </h2>
                  <p className="mt-3" style={{ color: "var(--body-text)" }}>
                    Schedule dekho aur apna slot book karo — aaj ki padhai aaj hi ho.
                  </p>
                </div>
                <Link href="/study-room"
                  className="shrink-0 inline-flex items-center gap-2 rounded-full px-8 py-4 text-sm font-bold text-white transition hover:scale-105"
                  style={{
                    background: "linear-gradient(135deg, #6366F1, #8B5CF6)",
                    boxShadow: "var(--shadow-brand)",
                  }}>
                  Book Study Slot
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m9 18 6-6-6-6"/></svg>
                </Link>
              </div>
            </motion.div>
          </div>
        </section>
      )}

      {/* ══════════════════════════════════════════════
          RULES
      ══════════════════════════════════════════════ */}
      <section className="relative py-28 bg-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={staggerContainer}
          >
            <div className="mb-16 text-center">
              <motion.h2 variants={fadeIn} className="text-3xl font-extrabold tracking-tight sm:text-5xl"
                style={{ color: "var(--foreground)" }}>
                4 Simple Rules —{" "}
                <span className="bg-clip-text text-transparent"
                  style={{ backgroundImage: "linear-gradient(135deg, #6366F1, #8B5CF6)" }}>
                  Follow Karo, Fly Karo
                </span>
              </motion.h2>
              <motion.p variants={fadeIn} className="mt-5 mx-auto max-w-2xl text-lg leading-relaxed"
                style={{ color: "var(--body-text)" }}>
                Ye rules isiliye hain taaki sab students ka experience best rahe. Ek ka distract hona sabko affect karta hai — isliye discipline must hai.
              </motion.p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  icon: (
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m2 2 20 20"/><path d="M18.89 13.23A7.12 7.12 0 0 0 19 12v-2"/>
                      <path d="M5 10v2a7 7 0 0 0 12 5V11"/>
                      <path d="M15.02 10.4 14 9V4a2 2 0 1 0-4 0v1.07"/>
                      <path d="M14.53 14.53a3 3 0 0 1-5.06-2.11"/>
                    </svg>
                  ),
                  title: "Mic Band Rakho",
                  desc: "Room join karte hi mic mute karo. Ek ki awaaz bhi 40 logon ka focus toda sakti hai — isliye ye rule strict hai.",
                  iconBg: "linear-gradient(145deg, #818CF8, #4F46E5)",
                  glow: "rgba(99,102,241,0.45)",
                  span: "lg:col-span-2",
                },
                {
                  icon: (
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
                      <circle cx="12" cy="12" r="3"/>
                      <path d="M3 9h18"/>
                    </svg>
                  ),
                  title: "Camera On Rakho",
                  desc: "Camera on hone se neend nahi aati aur phone haath mein nahi jaata. Ye sabse bada trick hai focus ke liye.",
                  iconBg: "linear-gradient(145deg, #A78BFA, #7C3AED)",
                  glow: "rgba(124,58,237,0.45)",
                  span: "lg:col-span-1",
                },
                {
                  icon: (
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z"/>
                    </svg>
                  ),
                  title: "Baat Nahi, Padhai",
                  desc: "Chat sirf admin announcements ke liye hai. Dost se baad mein baat karna — pehle apna syllabus complete karo.",
                  iconBg: "linear-gradient(145deg, #22D3EE, #0891B2)",
                  glow: "rgba(8,145,178,0.45)",
                  span: "lg:col-span-1",
                },
                {
                  icon: (
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/>
                      <circle cx="12" cy="12" r="6"/>
                      <circle cx="12" cy="12" r="2"/>
                    </svg>
                  ),
                  title: "Pehle Plan, Phir Join",
                  desc: "Room join karne se pehle decide karo — 'aaj kya padhna hai'. Ek clear goal hoga toh session waste nahi hoga. Timer bajne tak baithna hai!",
                  iconBg: "linear-gradient(145deg, #34D399, #059669)",
                  glow: "rgba(5,150,105,0.45)",
                  span: "lg:col-span-4",
                },
              ].map((rule, i) => (
                <motion.div
                  key={i}
                  variants={fadeIn}
                  className={`group relative overflow-hidden rounded-[2rem] border p-8 transition-all hover:-translate-y-1 hover:shadow-[var(--shadow-md)] ${rule.span}`}
                  style={{ borderColor: "var(--border)", background: "var(--page-bg)" }}
                >
                  {/* Top accent line on hover */}
                  <div className="absolute top-0 left-0 right-0 h-0.5 origin-left scale-x-0 transition-transform duration-300 group-hover:scale-x-100 rounded-t-[2rem]"
                    style={{ background: rule.iconBg }} />

                  {/* 3D icon */}
                  <div className="relative mb-6 inline-block">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl transition-transform duration-300 group-hover:-translate-y-1 group-hover:scale-110"
                      style={{
                        background: rule.iconBg,
                        boxShadow: `0 2px 0 rgba(255,255,255,0.15) inset, 0 -3px 0 rgba(0,0,0,0.12) inset, 0 6px 16px ${rule.glow}`,
                      }}>
                      {rule.icon}
                    </div>
                    <div className="absolute top-1.5 left-1.5 h-14 w-14 rounded-2xl opacity-20 blur-[8px]"
                      style={{ background: rule.iconBg }} />
                  </div>

                  <h3 className="mb-3 text-xl font-bold" style={{ color: "var(--foreground)" }}>{rule.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--body-text)" }}>{rule.desc}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          TESTIMONIALS
      ══════════════════════════════════════════════ */}
      <section className="relative py-28">
        <div className="pointer-events-none absolute inset-0"
          style={{ background: "linear-gradient(to bottom, rgba(238,242,255,0.3), transparent 40%)" }} />

        <div className="relative z-10 mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
          >
            <div className="mb-12 text-center">
              <motion.div variants={fadeIn}>
                <span className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-bold uppercase tracking-widest mb-5"
                  style={{ borderColor: "var(--accent-border)", background: "var(--accent-pale)", color: "var(--accent)" }}>
                  Unhi Ki Zubaani
                </span>
              </motion.div>
              <motion.h2 variants={fadeIn} className="text-3xl font-extrabold tracking-tight sm:text-4xl"
                style={{ color: "var(--foreground)" }}>
                Jo Aaye, Woh Bole
              </motion.h2>
            </div>

            <motion.div
              variants={fadeIn}
              className="relative overflow-hidden rounded-[2.5rem] border bg-white p-10 md:p-14"
              style={{ borderColor: "var(--border)", boxShadow: "var(--shadow-lg)" }}
            >
              {/* Stars */}
              <div className="mb-8 flex justify-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} width="20" height="20" viewBox="0 0 24 24" fill="#F59E0B">
                    <path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                ))}
              </div>

              <div className="min-h-[120px] text-center">
                <motion.p
                  key={activeTestimonial}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="text-xl md:text-2xl font-semibold leading-relaxed tracking-tight"
                  style={{ color: "var(--foreground)" }}
                >
                  {`"${TESTIMONIALS[activeTestimonial].quote}"`}
                </motion.p>
              </div>

              <div className="mt-10 flex flex-col items-center gap-3">
                <motion.div
                  key={`${activeTestimonial}-avatar`}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4 }}
                  className="flex h-14 w-14 items-center justify-center rounded-full text-xl font-extrabold text-white"
                  style={{
                    background: activeTestimonial === 0
                      ? "linear-gradient(135deg, #6366F1, #8B5CF6)"
                      : activeTestimonial === 1
                      ? "linear-gradient(135deg, #8B5CF6, #A855F7)"
                      : "linear-gradient(135deg, #06B6D4, #3B82F6)",
                  }}
                >
                  {TESTIMONIALS[activeTestimonial].initial}
                </motion.div>
                <div className="text-center">
                  <p className="font-bold" style={{ color: "var(--foreground)" }}>
                    {TESTIMONIALS[activeTestimonial].name}
                  </p>
                  <p className="text-sm" style={{ color: "var(--muted-text)" }}>
                    {TESTIMONIALS[activeTestimonial].role}
                  </p>
                </div>
              </div>

              {/* Controls */}
              <div className="mt-10 flex items-center justify-center gap-6">
                <button
                  type="button"
                  onClick={() =>
                    setActiveTestimonial((p) => (p === 0 ? TESTIMONIALS.length - 1 : p - 1))
                  }
                  className="flex h-12 w-12 items-center justify-center rounded-full border transition-all hover:-translate-y-0.5"
                  style={{ borderColor: "var(--border)", background: "white", color: "var(--foreground)" }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                </button>
                <div className="flex gap-2">
                  {TESTIMONIALS.map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActiveTestimonial(idx)}
                      className="h-2.5 rounded-full transition-all duration-500"
                      style={{
                        width: idx === activeTestimonial ? "2rem" : "0.625rem",
                        background: idx === activeTestimonial ? "var(--accent)" : "var(--border)",
                      }}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setActiveTestimonial((p) => (p === TESTIMONIALS.length - 1 ? 0 : p + 1))
                  }
                  className="flex h-12 w-12 items-center justify-center rounded-full border transition-all hover:-translate-y-0.5"
                  style={{ borderColor: "var(--border)", background: "white", color: "var(--foreground)" }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                </button>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          LEADERBOARD
      ══════════════════════════════════════════════ */}
      <section className="py-28 bg-white">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={staggerContainer}
          >
            <div className="mb-16 text-center">
              <motion.div variants={fadeIn}>
                <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-amber-600 mb-5">
                  🏆 Is Hafte Ke Toppers
                </span>
              </motion.div>
              <motion.h2 variants={fadeIn} className="text-3xl font-extrabold tracking-tight sm:text-5xl"
                style={{ color: "var(--foreground)" }}>
                Sabse Zyada Padhne Wale
              </motion.h2>
              <motion.p variants={fadeIn} className="mt-4 text-lg" style={{ color: "var(--body-text)" }}>
                Ye students roz aate hain, roz padhte hain. Kya tu bhi inke saath rank karega?
              </motion.p>
            </div>
            <motion.div variants={fadeIn} className="mx-auto max-w-2xl">
              <PlantLeaderboard limit={5} />
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          BLOG
      ══════════════════════════════════════════════ */}
      {recentBlogs.length > 0 && (
        <section className="relative py-28">
          <div className="pointer-events-none absolute right-0 top-1/2 h-[400px] w-[400px] -translate-y-1/2 rounded-full blur-[100px]"
            style={{ background: "radial-gradient(circle, rgba(99,102,241,0.10), transparent)" }} />

          <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-80px" }}
              variants={staggerContainer}
            >
              <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between">
                <div>
                  <motion.div variants={fadeIn}>
                    <span className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-bold uppercase tracking-widest mb-3"
                      style={{ borderColor: "var(--accent-border)", background: "var(--accent-pale)", color: "var(--accent)" }}>
                      Padhai ke Tips
                    </span>
                  </motion.div>
                  <motion.h2 variants={fadeIn} className="text-3xl font-extrabold tracking-tight sm:text-4xl"
                    style={{ color: "var(--foreground)" }}>
                    Blog & Resources
                  </motion.h2>
                </div>
                <motion.div variants={fadeIn} className="mt-6 md:mt-0">
                  <Link href="/blog"
                    className="inline-flex items-center gap-2 rounded-full border px-5 py-2.5 text-sm font-bold transition-all hover:-translate-y-0.5"
                    style={{
                      borderColor: "var(--border)",
                      background: "white",
                      color: "var(--foreground)",
                      boxShadow: "var(--shadow-sm)",
                    }}>
                    View All Articles
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m9 18 6-6-6-6"/></svg>
                  </Link>
                </motion.div>
              </div>

              <div className="grid gap-6 md:grid-cols-3">
                {recentBlogs.map((blog, i) => (
                  <motion.div
                    variants={fadeIn}
                    key={blog.id}
                    className="group flex flex-col overflow-hidden rounded-[2rem] border bg-white transition-all hover:-translate-y-1 hover:shadow-[var(--shadow-lg)]"
                    style={{ borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }}
                  >
                    {/* Gradient top bar */}
                    <div className="h-1.5 w-full" style={{
                      background: i === 0
                        ? "linear-gradient(to right, #6366F1, #8B5CF6)"
                        : i === 1
                        ? "linear-gradient(to right, #8B5CF6, #06B6D4)"
                        : "linear-gradient(to right, #06B6D4, #10B981)",
                    }} />
                    <div className="flex-1 p-8">
                      <div className="mb-4">
                        <span className="inline-flex rounded-full px-3 py-1 text-xs font-bold"
                          style={{ background: "var(--accent-pale)", color: "var(--accent)" }}>
                          {blog.publishedAt
                            ? new Date(blog.publishedAt).toLocaleDateString(undefined, {
                                month: "short", day: "numeric", year: "numeric",
                              })
                            : "Recent"}
                        </span>
                      </div>
                      <h4 className="mb-3 text-xl font-bold line-clamp-2 transition-colors group-hover:text-[var(--accent)]"
                        style={{ color: "var(--foreground)" }}>
                        {blog.title}
                      </h4>
                      <p className="text-sm leading-relaxed line-clamp-3" style={{ color: "var(--body-text)" }}>
                        {blog.excerpt || "Read more about this topic..."}
                      </p>
                    </div>
                    <div className="border-t p-5" style={{ borderColor: "var(--border)" }}>
                      <Link href={`/blog/${blog.slug}`}
                        className="inline-flex items-center gap-2 text-sm font-bold transition-colors"
                        style={{ color: "var(--accent)" }}>
                        Read Article
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m9 18 6-6-6-6"/></svg>
                      </Link>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>
      )}

      {/* ══════════════════════════════════════════════
          FAQs
      ══════════════════════════════════════════════ */}
      <DynamicFaqs initialFaqs={initialFaqs} />
    </div>
  );
}
