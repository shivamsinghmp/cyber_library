"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { DynamicFaqs } from "@/components/DynamicFaqs";
import { HeroSection } from "./_home/HeroSection";
import { StatsSection } from "./_home/StatsSection";
import { TestimonialsSection } from "./_home/TestimonialsSection";
import { LeaderboardSection } from "./_home/LeaderboardSection";
import { BlogSection } from "./_home/BlogSection";
import { fadeIn, staggerContainer, scaleIn } from "./_home/animations";

const DEFAULT_HEADLINE = "Finally, a Place Where You Actually Study.";

type Faq = { id: string; question: string; answer: string; order?: number };

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
  const headline = initialHeadline?.trim() || DEFAULT_HEADLINE;
  const [stats, setStats] = useState<{ totalStudents: number; totalHours: number; activeNow: number } | null>(null);
  const isStudent = session?.user && ((session.user as { role?: string }).role ?? "STUDENT") === "STUDENT";
  const isLoading = status === "loading";

  useEffect(() => {
    fetch("/api/public-stats")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { totalStudents: number; totalHours: number; activeNow: number } | null) => { if (d) setStats(d); })
      .catch(() => {});
  }, []);

  const words = headline.split(" ");
  const headlineStart = words.slice(0, 3).join(" ");
  const headlineMid = words.slice(3, 6).join(" ");
  const headlineEnd = words.slice(6).join(" ");

  return (
    <div className="relative overflow-hidden" style={{ background: "var(--page-bg)" }}>

      {/* HERO */}
      <HeroSection
        headlineStart={headlineStart}
        headlineMid={headlineMid}
        headlineEnd={headlineEnd}
        isLoggedIn={!!session?.user}
        isStudent={!!isStudent}
        isLoading={isLoading}
      />

      {/* STATS */}
      <StatsSection stats={stats} />

      {/* SCIENCE SECTION */}
      <section className="relative overflow-hidden py-28">
        <div className="pointer-events-none absolute top-0 right-0 h-[400px] w-[400px] rounded-full blur-[100px]" style={{ background: "radial-gradient(circle, rgba(139,92,246,0.12), transparent)" }} />
        <div className="pointer-events-none absolute bottom-0 left-0 h-[300px] w-[300px] rounded-full blur-[80px]" style={{ background: "radial-gradient(circle, rgba(6,182,212,0.10), transparent)" }} />
        <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={staggerContainer} className="space-y-16">
            <div className="mx-auto max-w-3xl text-center">
              <motion.div variants={fadeIn}><span className="mb-5 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-bold uppercase tracking-widest" style={{ borderColor: "var(--accent-border)", background: "var(--accent-pale)", color: "var(--accent)" }}>Why This Actually Works</span></motion.div>
              <motion.h2 variants={fadeIn} className="text-3xl font-extrabold tracking-tight sm:text-5xl" style={{ color: "var(--foreground)" }}>Alone, you drift.{" "}<span className="bg-clip-text text-transparent" style={{ backgroundImage: "linear-gradient(135deg, #6366F1, #8B5CF6)" }}>Together, you don&apos;t.</span></motion.h2>
              <motion.p variants={fadeIn} className="mt-5 text-lg leading-relaxed" style={{ color: "var(--body-text)" }}>When others are working around you, you work too. Science calls it body doubling. We just built a room for it.</motion.p>
            </div>
            <div className="grid gap-7 md:grid-cols-3">
              {[
                { iconBg: "linear-gradient(145deg, #818CF8, #4F46E5)", glow: "rgba(99,102,241,0.45)", cardBg: "linear-gradient(145deg, #EEF2FF 0%, #FFFFFF 100%)", borderColor: "#C7D2FE", icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>, title: "Peer presence kills distraction.", desc: "30 people visible on screen, all working. Suddenly picking up your phone feels wrong. That&apos;s body doubling — and it works every time.", watermark: "👥" },
                { iconBg: "linear-gradient(145deg, #A78BFA, #7C3AED)", glow: "rgba(124,58,237,0.45)", cardBg: "linear-gradient(145deg, #F5F3FF 0%, #FFFFFF 100%)", borderColor: "#DDD6FE", icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>, title: "Structure keeps your brain fresh.", desc: "50 minutes on. 10 minutes off. Used by toppers, backed by science. You&apos;ll study more — and remember more.", watermark: "⏱️" },
                { iconBg: "linear-gradient(145deg, #22D3EE, #0891B2)", glow: "rgba(8,145,178,0.45)", cardBg: "linear-gradient(145deg, #ECFEFF 0%, #FFFFFF 100%)", borderColor: "#A5F3FC", icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>, title: "Your brain learns the cue.", desc: "Open Let&apos;s Study — your brain shifts into work mode. Give it a few days. It becomes automatic.", watermark: "⚡" },
              ].map((item, i) => (
                <motion.div variants={fadeIn} key={i} whileHover={{ y: -8, transition: { duration: 0.3 } }} className="group relative overflow-hidden rounded-[2rem] border p-8" style={{ borderColor: item.borderColor, background: item.cardBg, boxShadow: "var(--shadow-md)" }}>
                  <div className="relative mb-8 inline-block">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl transition-transform duration-300 group-hover:-translate-y-1 group-hover:scale-110" style={{ background: item.iconBg, boxShadow: `0 2px 0 rgba(255,255,255,0.18) inset, 0 -3px 0 rgba(0,0,0,0.15) inset, 0 8px 20px ${item.glow}, 0 2px 6px rgba(0,0,0,0.08)` }}>{item.icon}</div>
                    <div className="absolute top-2 left-2 h-16 w-16 rounded-2xl opacity-20 blur-[10px]" style={{ background: item.iconBg }} />
                  </div>
                  <h3 className="mb-3 text-xl font-bold" style={{ color: "var(--foreground)" }}>{item.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--body-text)" }}>{item.desc}</p>
                  <div className="pointer-events-none absolute -bottom-2 -right-2 select-none text-[7rem] leading-none opacity-[0.04]">{item.watermark}</div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="relative bg-white py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={staggerContainer}>
            <div className="mb-16 text-center">
              <motion.div variants={fadeIn}><span className="mb-5 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-bold uppercase tracking-widest" style={{ borderColor: "var(--accent-border)", background: "var(--accent-pale)", color: "var(--accent)" }}>How It Works</span></motion.div>
              <motion.h2 variants={fadeIn} className="text-3xl font-extrabold tracking-tight sm:text-5xl" style={{ color: "var(--foreground)" }}>Four steps. You&apos;re in.</motion.h2>
            </div>
            <div className="relative grid gap-8 md:grid-cols-4">
              <div className="absolute top-12 left-[12.5%] right-[12.5%] hidden h-[2px] md:block" style={{ background: "linear-gradient(to right, #6366F1, #8B5CF6, #06B6D4, #10B981)", opacity: 0.3 }} />
              {[
                { step: "01", title: "Create your free account", desc: "Your name, your email. No card needed. Done in 30 seconds.", color: "#6366F1" },
                { step: "02", title: "Pick your time slot", desc: "Morning, afternoon, or night — whatever fits your schedule.", color: "#8B5CF6" },
                { step: "03", title: "Join the Google Meet room", desc: "Camera on, mic off. The timer starts. Everyone gets to work.", color: "#06B6D4" },
                { step: "04", title: "Come back daily. Watch it compound.", desc: "Daily attendance builds streaks, earns coins, and moves your rank up the leaderboard.", color: "#10B981" },
              ].map((item, i) => (
                <motion.div variants={scaleIn} key={i} className="group relative text-center">
                  <div className="relative mx-auto mb-8 flex h-24 w-24 items-center justify-center">
                    <div className="absolute inset-0 rounded-full blur-[20px] opacity-25" style={{ background: item.color }} />
                    <div className="relative flex h-24 w-24 items-center justify-center rounded-full text-2xl font-black text-white transition-all duration-300 group-hover:-translate-y-2 group-hover:scale-110" style={{ background: `linear-gradient(145deg, ${item.color}BB, ${item.color})`, boxShadow: `0 2px 0 rgba(255,255,255,0.2) inset, 0 -4px 0 rgba(0,0,0,0.15) inset, 0 10px 28px ${item.color}60, 0 4px 8px rgba(0,0,0,0.10)` }}>{item.step}</div>
                    <div className="absolute -bottom-1 left-1/2 h-4 w-14 -translate-x-1/2 rounded-full blur-[8px] opacity-20 transition-opacity duration-300 group-hover:opacity-35" style={{ background: item.color }} />
                  </div>
                  <h4 className="mb-3 text-lg font-bold" style={{ color: "var(--foreground)" }}>{item.title}</h4>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--body-text)" }}>{item.desc}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ECOSYSTEM BENTO */}
      <section className="relative py-28">
        <div className="pointer-events-none absolute left-0 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[120px]" style={{ background: "radial-gradient(circle, rgba(139,92,246,0.10), transparent)" }} />
        <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={staggerContainer}>
            <div className="mx-auto mb-16 max-w-3xl text-center">
              <motion.div variants={fadeIn}><span className="mb-5 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-bold uppercase tracking-widest" style={{ borderColor: "var(--accent-border)", background: "var(--accent-pale)", color: "var(--accent)" }}>More Than Study Rooms</span></motion.div>
              <motion.h2 variants={fadeIn} className="text-3xl font-extrabold tracking-tight sm:text-5xl" style={{ color: "var(--foreground)" }}>Everything you need{" "}<span className="bg-clip-text text-transparent" style={{ backgroundImage: "linear-gradient(135deg, #6366F1, #06B6D4)" }}>to stay consistent.</span></motion.h2>
              <motion.p variants={fadeIn} className="mt-5 text-lg" style={{ color: "var(--body-text)" }}>Progress you can see. Support when you need it. One place. No switching.</motion.p>
            </div>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-3 md:grid-rows-2">
              <motion.div variants={fadeIn} className="group relative overflow-hidden rounded-[2rem] p-10 md:col-span-2 md:p-12" style={{ background: "linear-gradient(135deg, #4338CA 0%, #5B21B6 55%, #1D4ED8 100%)" }}>
                <div className="pointer-events-none absolute -right-12 -top-12 h-64 w-64 rounded-full blur-[60px]" style={{ background: "radial-gradient(circle, rgba(167,139,250,0.45), transparent)" }} />
                <div className="pointer-events-none absolute -bottom-8 left-1/3 h-48 w-48 rounded-full blur-[50px]" style={{ background: "radial-gradient(circle, rgba(99,210,255,0.25), transparent)" }} />
                <div className="pointer-events-none absolute inset-0" style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.07) 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
                <div className="relative z-10">
                  <div className="mb-7 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 ring-2 ring-white/30"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3"/></svg></div>
                  <h4 className="mb-4 text-2xl font-bold" style={{ color: "#FFFFFF" }}>Live Study Rooms</h4>
                  <p className="mb-8 max-w-md text-base font-medium leading-relaxed" style={{ color: "#E0E7FF" }}>Silent Google Meet sessions with a running Pomodoro timer. Show up, work, leave feeling like you actually did something today.</p>
                  <Link href="/study-room" className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold transition hover:scale-105 hover:bg-white/90" style={{ color: "#4338CA" }}>Explore Rooms <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m9 18 6-6-6-6"/></svg></Link>
                </div>
              </motion.div>
              <motion.div variants={fadeIn} className="group relative overflow-hidden rounded-[2rem] border bg-white p-8 transition-all hover:-translate-y-1" style={{ borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }}>
                <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full blur-[50px] opacity-0 transition-opacity duration-500 group-hover:opacity-100" style={{ background: "radial-gradient(circle, rgba(16,185,129,0.2), transparent)" }} />
                <div className="relative mb-7 inline-block">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl transition-transform duration-300 group-hover:-translate-y-1 group-hover:scale-110" style={{ background: "linear-gradient(145deg, #34D399, #059669)", boxShadow: "0 2px 0 rgba(255,255,255,0.15) inset, 0 -3px 0 rgba(0,0,0,0.12) inset, 0 6px 16px rgba(5,150,105,0.40)" }}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14"/></svg></div>
                  <div className="absolute left-1.5 top-1.5 h-14 w-14 rounded-2xl opacity-25 blur-[8px]" style={{ background: "linear-gradient(145deg, #34D399, #059669)" }} />
                </div>
                <h4 className="mb-3 text-xl font-bold" style={{ color: "var(--foreground)" }}>Streaks & Rewards 🏆</h4>
                <p className="text-sm leading-relaxed" style={{ color: "var(--body-text)" }}>Show up daily, earn coins, climb the leaderboard. Consistency stops feeling like discipline — it starts feeling like a game.</p>
              </motion.div>
              <motion.div variants={fadeIn} className="group relative overflow-hidden rounded-[2rem] border bg-white p-8 transition-all hover:-translate-y-1" style={{ borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }}>
                <div className="pointer-events-none absolute left-0 top-0 h-48 w-full opacity-0 transition-opacity duration-500 group-hover:opacity-100" style={{ background: "linear-gradient(to bottom, rgba(59,130,246,0.06), transparent)" }} />
                <div className="relative mb-7 inline-block">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl transition-transform duration-300 group-hover:-translate-y-1 group-hover:scale-110" style={{ background: "linear-gradient(145deg, #60A5FA, #2563EB)", boxShadow: "0 2px 0 rgba(255,255,255,0.15) inset, 0 -3px 0 rgba(0,0,0,0.12) inset, 0 6px 16px rgba(37,99,235,0.40)" }}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z"/><path d="M12 8v4l3 3"/></svg></div>
                  <div className="absolute left-1.5 top-1.5 h-14 w-14 rounded-2xl opacity-25 blur-[8px]" style={{ background: "linear-gradient(145deg, #60A5FA, #2563EB)" }} />
                </div>
                <h4 className="mb-3 text-xl font-bold" style={{ color: "var(--foreground)" }}>Mental Health Support 💙</h4>
                <p className="mb-6 text-sm leading-relaxed" style={{ color: "var(--body-text)" }}>Exam pressure is real. Private 1-on-1 wellness sessions are available when you need them. No judgment. Completely confidential.</p>
                <Link href="/mental-session" className="inline-flex items-center gap-1.5 text-sm font-bold transition-colors" style={{ color: "#2563EB" }}>Book a Session <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m9 18 6-6-6-6"/></svg></Link>
              </motion.div>
              <motion.div variants={fadeIn} className="group relative overflow-hidden rounded-[2rem] border bg-white p-10 transition-all hover:-translate-y-1 md:col-span-2 md:flex md:items-center md:gap-10" style={{ borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }}>
                <div className="pointer-events-none absolute bottom-0 right-0 h-64 w-64 rounded-full blur-[80px] opacity-0 transition-opacity duration-500 group-hover:opacity-100" style={{ background: "radial-gradient(circle, rgba(245,158,11,0.15), transparent)" }} />
                <div className="relative z-10 flex-1">
                  <div className="relative mb-7 inline-block">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl transition-transform duration-300 group-hover:-translate-y-1 group-hover:scale-110" style={{ background: "linear-gradient(145deg, #FCD34D, #D97706)", boxShadow: "0 2px 0 rgba(255,255,255,0.15) inset, 0 -3px 0 rgba(0,0,0,0.12) inset, 0 6px 16px rgba(217,119,6,0.40)" }}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg></div>
                    <div className="absolute left-1.5 top-1.5 h-14 w-14 rounded-2xl opacity-25 blur-[8px]" style={{ background: "linear-gradient(145deg, #FCD34D, #D97706)" }} />
                  </div>
                  <h4 className="mb-3 text-2xl font-bold" style={{ color: "var(--foreground)" }}>Study Material Store 📚</h4>
                  <p className="mb-6 text-base leading-relaxed" style={{ color: "var(--body-text)" }}>Planners, notes, and trackers made by toppers. Download and use — no searching, no sorting.</p>
                  <Link href="/store" className="inline-flex items-center gap-2 text-sm font-bold transition-colors" style={{ color: "#D97706" }}>Browse Collection <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m9 18 6-6-6-6"/></svg></Link>
                </div>
                <div className="relative z-10 mt-8 hidden h-40 w-40 shrink-0 items-center justify-center rounded-[2rem] border md:mt-0 md:flex" style={{ borderColor: "var(--accent-border)", background: "linear-gradient(135deg, var(--accent-pale), var(--violet-pale))" }}>
                  <div className="absolute inset-3 rounded-[1.5rem] border border-dashed" style={{ borderColor: "var(--accent-border)" }} />
                  <span className="text-6xl transition-transform duration-500 group-hover:scale-110">📚</span>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* STUDENT CTA */}
      {isStudent && (
        <section className="px-4 py-10">
          <div className="mx-auto max-w-5xl">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeIn} className="relative overflow-hidden rounded-[2.5rem] p-px" style={{ background: "linear-gradient(135deg, #6366F1, #8B5CF6, #06B6D4)", boxShadow: "var(--shadow-brand)" }}>
              <div className="flex flex-col gap-8 rounded-[calc(2.5rem-1px)] px-10 py-12 sm:flex-row sm:items-center sm:justify-between" style={{ background: "linear-gradient(135deg, #EEF2FF 0%, #FFFFFF 50%, #F5F3FF 100%)" }}>
                <div>
                  <h2 className="text-3xl font-extrabold" style={{ color: "var(--foreground)" }}>Ready to start today?</h2>
                  <p className="mt-3" style={{ color: "var(--body-text)" }}>Pick a slot, join the room. Today&apos;s study session starts now.</p>
                </div>
                <Link href="/study-room" className="inline-flex shrink-0 items-center gap-2 rounded-full px-8 py-4 text-sm font-bold text-white transition hover:scale-105" style={{ background: "linear-gradient(135deg, #6366F1, #8B5CF6)", boxShadow: "var(--shadow-brand)" }}>
                  Book Your Slot <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m9 18 6-6-6-6"/></svg>
                </Link>
              </div>
            </motion.div>
          </div>
        </section>
      )}

      {/* RULES */}
      <section className="relative bg-white py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={staggerContainer}>
            <div className="mb-16 text-center">
              <motion.h2 variants={fadeIn} className="text-3xl font-extrabold tracking-tight sm:text-5xl" style={{ color: "var(--foreground)" }}>Four rules.{" "}<span className="bg-clip-text text-transparent" style={{ backgroundImage: "linear-gradient(135deg, #6366F1, #8B5CF6)" }}>One purpose: let everyone focus.</span></motion.h2>
              <motion.p variants={fadeIn} className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed" style={{ color: "var(--body-text)" }}>One distracted person breaks thirty people&apos;s focus. These rules protect your session — and everyone else&apos;s.</motion.p>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m2 2 20 20"/><path d="M18.89 13.23A7.12 7.12 0 0 0 19 12v-2"/><path d="M5 10v2a7 7 0 0 0 12 5V11"/><path d="M15.02 10.4 14 9V4a2 2 0 1 0-4 0v1.07"/><path d="M14.53 14.53a3 3 0 0 1-5.06-2.11"/></svg>, title: "Mic muted. Always.", desc: "One stray sound breaks forty people&apos;s concentration. Mute before you enter. No exceptions.", iconBg: "linear-gradient(145deg, #818CF8, #4F46E5)", glow: "rgba(99,102,241,0.45)", span: "lg:col-span-2" },
                { icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="12" cy="12" r="3"/><path d="M3 9h18"/></svg>, title: "Camera on.", desc: "Camera on means no drowsiness, no phone, no wandering. It&apos;s the simplest accountability tool there is.", iconBg: "linear-gradient(145deg, #A78BFA, #7C3AED)", glow: "rgba(124,58,237,0.45)", span: "lg:col-span-1" },
                { icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z"/></svg>, title: "Chat is for announcements only.", desc: "Talk to your friends after the timer. Right now, just work.", iconBg: "linear-gradient(145deg, #22D3EE, #0891B2)", glow: "rgba(8,145,178,0.45)", span: "lg:col-span-1" },
                { icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>, title: "Know your task before you join.", desc: "Decide what you&apos;re studying before you enter the room. A clear goal is the difference between a productive session and a wasted one.", iconBg: "linear-gradient(145deg, #34D399, #059669)", glow: "rgba(5,150,105,0.45)", span: "lg:col-span-4" },
              ].map((rule, i) => (
                <motion.div key={i} variants={fadeIn} className={`group relative overflow-hidden rounded-[2rem] border p-8 transition-all hover:-translate-y-1 hover:shadow-[var(--shadow-md)] ${rule.span}`} style={{ borderColor: "var(--border)", background: "var(--page-bg)" }}>
                  <div className="absolute left-0 right-0 top-0 h-0.5 origin-left scale-x-0 rounded-t-[2rem] transition-transform duration-300 group-hover:scale-x-100" style={{ background: rule.iconBg }} />
                  <div className="relative mb-6 inline-block">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl transition-transform duration-300 group-hover:-translate-y-1 group-hover:scale-110" style={{ background: rule.iconBg, boxShadow: `0 2px 0 rgba(255,255,255,0.15) inset, 0 -3px 0 rgba(0,0,0,0.12) inset, 0 6px 16px ${rule.glow}` }}>{rule.icon}</div>
                    <div className="absolute left-1.5 top-1.5 h-14 w-14 rounded-2xl opacity-20 blur-[8px]" style={{ background: rule.iconBg }} />
                  </div>
                  <h3 className="mb-3 text-xl font-bold" style={{ color: "var(--foreground)" }}>{rule.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--body-text)" }}>{rule.desc}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <TestimonialsSection />

      {/* LEADERBOARD */}
      <LeaderboardSection />

      {/* BLOG */}
      <BlogSection blogs={recentBlogs} />

      {/* FAQs */}
      <DynamicFaqs initialFaqs={initialFaqs} />
    </div>
  );
}
