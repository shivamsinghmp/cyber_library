"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { PlantLeaderboard } from "@/components/PlantLeaderboard";
import { DynamicFaqs } from "@/components/DynamicFaqs";

const TESTIMONIALS = [
  {
    name: "Aman, Civil Services Aspirant",
    quote:
      "I couldn't focus for even 20 minutes before discovering this. The body doubling sessions have completely transformed my study routine and consistency.",
  },
  {
    name: "Khushi, Engineering Student",
    quote:
      "I join the evening slots daily. The lo-fi music, built-in timers, and the silent accountability of cameras on really keeps me anchored.",
  },
  {
    name: "Rohan, Working Professional",
    quote:
      "I never found the discipline for my side projects. Now I join the weekend Night Shifts and effortlessly pull off 3–4 hours of raw deep work.",
  },
];

const DEFAULT_HEADLINE = "Transform Your Study Habits with Live Body Doubling.";

const fadeIn = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" as const } }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.2 } }
};

export function HomeClient() {
  const { data: session, status } = useSession();
  const [liveCount, setLiveCount] = useState(42);
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const [headline, setHeadline] = useState(DEFAULT_HEADLINE);
  const isStudent =
    session?.user && ((session.user as { role?: string }).role ?? "STUDENT") === "STUDENT";
  const isLoading = status === "loading";

  useEffect(() => {
    fetch("/api/site-branding")
      .then((r) => (r.ok ? r.json() : {}))
      .then((d: { headline?: string | null }) => {
        if (d.headline && d.headline.trim()) setHeadline(d.headline.trim());
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setLiveCount((current) => {
        const delta = Math.random() > 0.5 ? 1 : -1;
        const next = current + delta;
        if (next < 10 || next > 60) return 42;
        return next;
      });
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative overflow-hidden bg-[var(--background)] px-4 pb-12 pt-4 md:pb-24 md:pt-16 selection:bg-[var(--accent)] selection:text-black">
      {/* Animated Premium Grid & Mesh Background */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#8b735510_1px,transparent_1px),linear-gradient(to_bottom,#8b735510_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-40 mix-blend-screen bg-[radial-gradient(circle_at_0%_0%,_var(--accent)_0%,_transparent_40%),radial-gradient(circle_at_100%_100%,_var(--wood)_0%,_transparent_40%)] bg-[length:200%_200%] animate-[mesh_15s_ease-in-out_infinite_alternate]" />
      <div className="pointer-events-none absolute left-1/2 top-40 h-[800px] w-[800px] -translate-x-1/2 rounded-full bg-[var(--accent)]/5 blur-[200px] animate-[float_8s_ease-in-out_infinite]" />
      
      <motion.div 
        initial="hidden" 
        animate="visible" 
        variants={fadeIn}
        className="relative mx-auto flex max-w-6xl flex-col gap-16 pt-10 md:flex-row md:items-center"
      >
        {/* Hero left */}
        <div className="max-w-xl space-y-10 z-10">
          <motion.p 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.8 }}
            className="inline-flex items-center gap-2 rounded-full border border-[var(--accent)]/40 bg-[var(--ink)]/60 px-5 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent)] backdrop-blur-md shadow-[0_4px_24px_rgba(139,115,85,0.15)] ring-1 ring-white/5"
          >
            <span className="flex h-2 w-2 rounded-full bg-[var(--accent)] shadow-[0_0_8px_var(--accent)]">
              <span className="m-auto h-1 w-1 rounded-full bg-white animate-pulse" />
            </span>
            Premium Live Focus Hub
          </motion.p>

          <h1 className="text-balance text-4xl font-extrabold tracking-tight text-[var(--cream)] sm:text-5xl md:text-6xl leading-[1.12]">
            {headline}
          </h1>

          <p className="max-w-xl text-lg leading-relaxed text-[var(--cream-muted)]/90 font-medium">
            The Cyber Library is an elite, structured online focus environment. Join quiet, intense study sessions via Google Meet to stay permanently accountable. No social networking, no distractions—just pure deep work alongside the ambitious.
          </p>

          <div className="flex flex-wrap gap-5 mt-4">
            {isLoading ? (
               <div className="h-[52px] w-[180px] animate-pulse rounded-full bg-[var(--wood)]/10 border border-[var(--wood)]/20" />
            ) : !session?.user ? (
              <>
                <Link
                  href="/login"
                  className="group relative inline-flex items-center justify-center overflow-hidden rounded-full bg-gradient-to-r from-[var(--accent)] to-[var(--accent-hover)] px-9 py-4 text-sm font-extrabold text-[var(--ink)] transition-all hover:scale-105 hover:shadow-[0_0_30px_rgba(154,130,100,0.5)]"
                >
                  <div className="absolute inset-0 flex h-full w-full justify-center [transform:skew(-12deg)_translateX(-150%)] group-hover:duration-1000 group-hover:[transform:skew(-12deg)_translateX(150%)]">
                    <div className="relative h-full w-10 bg-white/40 blur-sm" />
                  </div>
                  Join Session Now
                </Link>
                <Link
                  href="/signup"
                  className="inline-flex items-center justify-center rounded-full border border-[var(--wood)]/30 bg-white/[0.03] backdrop-blur-2xl px-9 py-4 text-sm font-bold text-[var(--cream)] transition-all hover:bg-white/[0.08] hover:border-[var(--accent)]/50 hover:text-white hover:scale-105 hover:shadow-[0_0_20px_rgba(154,130,100,0.2)]"
                >
                  Request Access
                </Link>
              </>
            ) : (
              <Link
                href="/dashboard"
                className="group relative inline-flex items-center justify-center overflow-hidden rounded-full bg-gradient-to-r from-[var(--accent)] to-[var(--accent-hover)] px-9 py-4 text-sm font-extrabold text-[var(--ink)] transition-all hover:scale-105 hover:shadow-[0_0_30px_rgba(154,130,100,0.5)]"
              >
                <div className="absolute inset-0 flex h-full w-full justify-center [transform:skew(-12deg)_translateX(-150%)] group-hover:duration-1000 group-hover:[transform:skew(-12deg)_translateX(150%)]">
                  <div className="relative h-full w-10 bg-white/40 blur-sm" />
                </div>
                Go to Dashboard
              </Link>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-6 pt-2 text-sm font-semibold text-[var(--cream-muted)]">
            <div className="inline-flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent)]/20 text-[var(--accent)] ring-1 ring-[var(--accent)]/30">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
              </span>
              <span><strong className="text-[var(--cream)] font-bold">Body doubling</strong> accountability</span>
            </div>
            <div className="inline-flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--wood)]/20 text-[var(--wood)] ring-1 ring-[var(--wood)]/30">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              </span>
              <span>Pomodoro & Lo-fi pacing</span>
            </div>
          </div>
        </div>

        {/* Hero right card (Premium Glass Panel Widget) */}
        <motion.div 
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4, duration: 0.8, ease: "easeOut" }}
          className="w-full md:max-w-[440px] z-10 animate-[float_6s_ease-in-out_infinite]"
        >
          <div className="glass-panel">
            <div className="relative flex h-full flex-col justify-between gap-10 p-10">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-xs font-bold uppercase tracking-[0.25em] text-[var(--wood)]">
                    Live Status
                  </p>
                  <span className="flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1.5 text-[10px] font-bold tracking-widest text-emerald-400 ring-1 ring-inset ring-emerald-500/30">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]"></span> ACTIVE
                  </span>
                </div>
                <p className="text-3xl font-extrabold text-[var(--cream)] tracking-tight leading-tight">
                  <span className="text-[var(--accent)]">{liveCount}</span> Students are currently deep in the zone.
                </p>
                <p className="mt-4 text-sm text-[var(--cream-muted)] leading-relaxed">
                  Multiple quiet blocks are running right now. Pick an open seat and drop your procrastination instantly.
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-2xl border border-[var(--wood)]/10 bg-[var(--background)]/80 px-6 py-5 shadow-inner">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[var(--wood)]">
                      Next Focus Sprint
                    </p>
                    <p className="text-sm font-bold text-[var(--cream)] mt-1">
                      Starts every 30 minutes
                    </p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--accent)]/10 text-[var(--accent)] ring-1 ring-[var(--accent)]/30">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 22h14"/><path d="M5 2h14"/><path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22"/><path d="M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2"/></svg>
                  </div>
                </div>

                <div className="grid gap-4 text-xs text-[var(--cream-muted)] sm:grid-cols-2">
                  <div className="rounded-2xl border border-[var(--wood)]/10 bg-white/[0.02] p-5 shadow-inner transition hover:bg-[var(--accent)]/10 hover:border-[var(--accent)]/30 backdrop-blur-md">
                    <p className="mb-2 text-sm font-bold text-[var(--cream)]">Atmosphere</p>
                    <p className="leading-relaxed">Total silence. Only typing and lo-fi beats.</p>
                  </div>
                  <div className="rounded-2xl border border-[var(--wood)]/10 bg-white/[0.02] p-5 shadow-inner transition hover:bg-[var(--accent)]/10 hover:border-[var(--accent)]/30 backdrop-blur-md">
                    <p className="mb-2 text-sm font-bold text-[var(--cream)]">Structure</p>
                    <p className="leading-relaxed">Mandatory breaks to preserve mental clarity.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* NEW SECTION: Science of Body Doubling */}
      <motion.section 
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={staggerContainer}
        className="mx-auto mt-40 max-w-6xl space-y-16 z-10 relative"
      >
        <div className="max-w-3xl text-center mx-auto">
          <motion.h2 variants={fadeIn} className="text-3xl font-extrabold text-[var(--cream)] md:text-5xl tracking-tight">
            The Science Behind Our Architecture
          </motion.h2>
          <motion.p variants={fadeIn} className="mt-6 text-lg text-[var(--cream-muted)] leading-relaxed md:text-xl font-medium">
            Motivation is fleeting. Discipline is engineered. We leverage high-end psychological frameworks to force you into a flow state.
          </motion.p>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {[
            {
              title: "Social Accountability",
              desc: "Knowing that dozens of other ambitious students are actively working alongside you provides the positive peer pressure needed to prevent you from picking up your phone.",
              icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            },
            {
              title: "Structured Productivity",
              desc: "We utilize strictly timed Pomodoro sprints (e.g., 50 minutes of deep work followed by a 10-minute break) to optimize your brain's cognitive endurance and completely prevent burnout.",
              icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            },
            {
              title: "Environmental Triggering",
              desc: "By exclusively entering our virtual libraries when you intend to study, you condition your brain to immediately associate this digital environment with high-intensity focus.",
              icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
            },
          ].map((item, i) => (
             <motion.div
              variants={fadeIn}
              key={i}
              className="glass-panel group p-10"
            >
              <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[var(--accent)]/10 blur-[50px] transition-all duration-700 group-hover:scale-150 group-hover:bg-[var(--accent)]/20" />
              <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--background)] text-[var(--accent)] shadow-inner ring-1 ring-[var(--wood)]/20">
                {item.icon}
              </div>
              <h3 className="mb-4 text-2xl font-bold text-[var(--cream)] tracking-tight">{item.title}</h3>
              <p className="text-base leading-relaxed text-[var(--cream-muted)] font-medium">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* NEW SECTION: How It Works */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={staggerContainer}
        className="mx-auto mt-40 max-w-6xl relative z-10"
      >
        <div className="absolute right-0 top-20 h-96 w-96 rounded-full bg-[var(--wood)]/10 blur-[120px] pointer-events-none" />
        <div className="text-center mb-16">
          <motion.h2 variants={fadeIn} className="text-xs font-extrabold uppercase tracking-[0.3em] text-[var(--accent)] mb-4">
            Workflow
          </motion.h2>
          <motion.h3 variants={fadeIn} className="text-3xl font-extrabold text-[var(--cream)] md:text-5xl tracking-tight">
            How The Hub Operates
          </motion.h3>
        </div>

        <div className="grid gap-10 md:grid-cols-4">
          {[
            {
              step: "01",
              title: "Reserve a Seat",
              desc: "Browse securely scheduled deep-work sprints and select a slot that fits your study objective."
            },
            {
              step: "02",
              title: "Enter the Library",
              desc: "Join our dedicated Google Meet infrastructure. Mute your microphone and keep the camera active."
            },
            {
              step: "03",
              title: "Lock In",
              desc: "The admin initiates the Pomodoro timer. Complete silence falls. Raw, unfiltered focus begins."
            },
            {
              step: "04",
              title: "Rest & Repeat",
              desc: "Take mandatory 10-minute breaks to stretch and reset your mental bandwidth before the next sprint."
            }
          ].map((item, i) => (
             <motion.div variants={fadeIn} key={i} className="relative group">
                <div className="mb-6 flex">
                  <span className="text-6xl font-extrabold text-[var(--wood)]/20 transition-all duration-500 group-hover:text-[var(--accent)]/40 tracking-tighter">
                    {item.step}
                  </span>
                </div>
                <h4 className="mb-3 text-xl font-bold text-[var(--cream)]">{item.title}</h4>
                <p className="text-sm leading-relaxed text-[var(--cream-muted)] font-medium">
                  {item.desc}
                </p>
                {i !== 3 && (
                  <div className="absolute right-0 top-8 hidden w-1/2 -translate-y-1/2 border-t-[1.5px] border-dashed border-[var(--wood)]/20 md:block" />
                )}
             </motion.div>
          ))}
        </div>
      </motion.section>

      {/* NEW SECTION: The Unfair Advantage (Ecosystem Showcase) */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={staggerContainer}
        className="mx-auto mt-40 max-w-6xl relative z-10 px-4"
      >
        <div className="absolute left-0 top-1/2 -z-10 h-[600px] w-[600px] -translate-y-1/2 -translate-x-1/2 rounded-full bg-[var(--wood)]/5 blur-[160px]" />
        
        <div className="text-center mb-16 max-w-3xl mx-auto">
          <motion.h2 variants={fadeIn} className="text-xs font-extrabold uppercase tracking-[0.3em] text-[var(--accent)] mb-4">
            The Complete Ecosystem
          </motion.h2>
          <motion.h3 variants={fadeIn} className="text-3xl font-extrabold text-[var(--cream)] md:text-5xl tracking-tight leading-tight">
            Not just study rooms. <br className="hidden md:block"/> An entire productivity engine.
          </motion.h3>
          <motion.p variants={fadeIn} className="mt-6 text-lg text-[var(--cream-muted)] font-medium">
            We combined high-stakes gamification with premium mental health support to create an environment where failure is virtually impossible.
          </motion.p>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 md:grid-rows-2 gap-6">
          {/* Feature 1: Realtime Focus (Spans 2 cols) */}
          <motion.div variants={fadeIn} className="md:col-span-2 group relative overflow-hidden rounded-[2rem] border border-[var(--wood)]/20 bg-gradient-to-br from-[var(--ink)]/80 to-[var(--background)] p-8 md:p-12 shadow-[0_20px_40px_rgba(15,11,7,0.4)] backdrop-blur-3xl">
            <div className="absolute right-0 top-0 h-full w-2/3 opacity-30 mix-blend-screen bg-[radial-gradient(ellipse_at_top_right,_var(--accent)_0%,_transparent_70%)] pointer-events-none transition-opacity duration-700 group-hover:opacity-50" />
            <div className="relative z-10">
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--accent)]/10 text-[var(--accent)] ring-1 ring-[var(--accent)]/30 backdrop-blur-md">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3"/></svg>
              </div>
              <h4 className="text-2xl font-bold text-[var(--cream)] tracking-tight mb-3">Live Focus Architecture</h4>
              <p className="text-base text-[var(--cream-muted)] leading-relaxed max-w-md font-medium mb-8">
                Drop into highly structured, completely silent Google Meet rooms. Paced by Pomodoro timers and fueled by the collective willpower of top-tier aspirants.
              </p>
              <Link href="/study-room" className="inline-flex items-center gap-2 text-sm font-bold text-[var(--accent)] hover:text-white transition-colors">
                Explore Rooms <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m9 18 6-6-6-6"/></svg>
              </Link>
            </div>
          </motion.div>

          {/* Feature 2: Gamification */}
          <motion.div variants={fadeIn} className="group relative overflow-hidden rounded-[2rem] border border-[var(--wood)]/10 bg-white/[0.02] p-8 shadow-inner backdrop-blur-xl transition hover:bg-white/[0.05] hover:border-[var(--wood)]/30">
            <div className="absolute -bottom-10 -right-10 h-32 w-32 rounded-full bg-emerald-500/10 blur-[40px] pointer-events-none group-hover:bg-emerald-500/20 transition-all" />
            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/30">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14"/></svg>
            </div>
            <h4 className="text-xl font-bold text-[var(--cream)] tracking-tight mb-3">Gamified Streaks</h4>
            <p className="text-sm text-[var(--cream-muted)] leading-relaxed font-medium mb-6">
              Track consistency, dominate the global leaderboard, and earn exclusive ranks and hardware rewards for pure discipline.
            </p>
          </motion.div>

          {/* Feature 3: Mental Health */}
          <motion.div variants={fadeIn} className="group relative overflow-hidden rounded-[2rem] border border-[var(--wood)]/10 bg-white/[0.02] p-8 shadow-inner backdrop-blur-xl transition hover:bg-white/[0.05] hover:border-[var(--wood)]/30">
            <div className="absolute top-0 left-0 h-40 w-full bg-gradient-to-b from-blue-500/10 to-transparent opacity-0 transition-opacity duration-700 group-hover:opacity-100 pointer-events-none" />
            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/30">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z"/><path d="M12 8v4l3 3"/></svg>
            </div>
            <h4 className="text-xl font-bold text-[var(--cream)] tracking-tight mb-3">Therapy & Wellness</h4>
            <p className="text-sm text-[var(--cream-muted)] leading-relaxed font-medium mb-6">
              Burnout destroys careers. Book 1-on-1 private mental wellness sessions with certified professionals to stay anchored.
            </p>
            <Link href="/mental-session" className="inline-flex items-center text-sm font-bold text-blue-400 hover:text-white transition-colors">
              Book a Session
            </Link>
          </motion.div>

          {/* Feature 4: Store & Vault (Spans 2 cols) */}
          <motion.div variants={fadeIn} className="md:col-span-2 group relative overflow-hidden rounded-[2rem] border border-[var(--wood)]/10 bg-white/[0.02] p-8 md:p-12 shadow-inner backdrop-blur-xl transition hover:bg-white/[0.05] hover:border-[var(--wood)]/30 flex flex-col md:flex-row md:items-center gap-8 md:gap-12">
            <div className="flex-1">
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--wood)]/10 text-[var(--wood)] ring-1 ring-[var(--wood)]/30">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
              </div>
              <h4 className="text-2xl font-bold text-[var(--cream)] tracking-tight mb-3">Premium Digital Vault</h4>
              <p className="text-base text-[var(--cream-muted)] leading-relaxed font-medium mb-6">
                Direct access to high-end productivity trackers, planners, and verified study material crafted by toppers, stored forever in your personal dashboard.
              </p>
              <Link href="/store" className="inline-flex items-center gap-2 text-sm font-bold text-[var(--wood)] hover:text-white transition-colors">
                Browse Collection <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m9 18 6-6-6-6"/></svg>
              </Link>
            </div>
            
            <div className="hidden shrink-0 md:flex w-40 h-40 rounded-[2rem] bg-[var(--background)]/80 ring-1 ring-white/10 items-center justify-center relative shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
               <div className="absolute inset-2 border border-dashed border-[var(--wood)]/20 rounded-[1.5rem]" />
               <svg className="w-16 h-16 text-[var(--wood)]/50 transition-all duration-700 group-hover:scale-110 group-hover:text-[var(--accent)]" viewBox="0 0 24 24" fill="currentColor"><path d="m20.24 12.24-8 8a2.12 2.12 0 0 1-3 0L3.76 14.76a2.12 2.12 0 0 1 0-3l8-8a2.12 2.12 0 0 1 3 0l5.48 5.48a2.12 2.12 0 0 1 0 3Z"/><path d="M14 8h.01"/></svg>
            </div>
          </motion.div>
        
        </div>
      </motion.section>

      {/* Slots CTA – only for logged-in students */}
      {isStudent && (
        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeIn}
          id="slots"
          className="mx-auto mt-32 max-w-5xl overflow-hidden rounded-[3rem] border border-[var(--accent)]/20 bg-gradient-to-br from-[var(--ink)] to-[var(--background)] p-10 shadow-[0_30px_60px_rgba(15,11,7,0.8)] md:p-14 relative"
        >
          <div className="absolute right-0 top-0 h-full w-1/2 opacity-5 mix-blend-screen bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]" />
          <div className="relative flex flex-col gap-8 sm:flex-row sm:items-center sm:justify-between z-10">
            <div>
              <h2 className="text-3xl font-extrabold text-[var(--cream)] tracking-tight md:text-4xl">
                Ready to drop into the zone?
              </h2>
              <p className="mt-4 text-lg font-medium text-[var(--cream-muted)]">
                View the schedule and reserve a seat in our upcoming silent study blocks.
              </p>
            </div>
            <Link
              href="/study-room"
              className="inline-flex shrink-0 items-center justify-center rounded-full bg-[var(--accent)] px-10 py-4 text-base font-bold text-[var(--ink)] shadow-[0_10px_30px_rgba(139,115,85,0.3)] transition-all hover:scale-105 hover:bg-[var(--accent-hover)]"
            >
              Book Study Slot
            </Link>
          </div>
        </motion.section>
      )}

      {/* Bento Grid: Rules and Constraints */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={staggerContainer}
        id="rules"
        className="mx-auto mt-32 max-w-6xl space-y-12"
      >
        <div className="text-center">
          <motion.h2 variants={fadeIn} className="text-3xl font-extrabold text-[var(--cream)] md:text-5xl tracking-tight">
            Simple Rules, Unbreakable Vibe
          </motion.h2>
          <motion.p variants={fadeIn} className="mt-6 mx-auto max-w-2xl text-lg font-medium text-[var(--cream-muted)] leading-relaxed">
            We treat our digital focus rooms exactly like a real prestige library. The structure is non-negotiable, ensuring everyone experiences the absolute highest quality deep work.
          </motion.p>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <BentoRuleCard
            icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m2 2 20 20"/><path d="M18.89 13.23A7.12 7.12 0 0 0 19 12v-2"/><path d="M5 10v2a7 7 0 0 0 12 5V11"/><path d="M15.02 10.4 14 9V4a2 2 0 1 0-4 0v1.07"/><path d="M14.53 14.53a3 3 0 0 1-5.06-2.11"/></svg>}
            title="Maintain Absolute Silence"
            description="All microphones are strictly muted upon entry. Background noise completely shatters the collective focus state of the room."
            className="lg:col-span-2"
          />
          <BentoRuleCard
            icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="12" cy="12" r="3"/><path d="M3 9h18"/></svg>}
            title="Cameras Highly Preferred"
            description="Keeping your camera active simulates genuine library body doubling."
            className="lg:col-span-1"
          />
          <BentoRuleCard
            icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z"/></svg>}
            title="Zero Socialization"
            description="The chat feature is exclusively reserved for urgent administrative announcements."
            className="lg:col-span-1"
          />
          <BentoRuleCard
            icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>}
            title="Commit Before Entry"
            description="Determine your specific task before joining the meet. Lock in your objective, drop into the room, and do not leave until the timer rings. Structure is freedom."
            className="lg:col-span-4"
          />
        </div>
      </motion.section>

      {/* Testimonials section */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={fadeIn}
        id="testimonials"
        className="mx-auto mt-40 max-w-4xl relative"
      >
        <div className="absolute -inset-20 bg-gradient-to-b from-transparent via-[var(--accent)]/5 to-transparent blur-3xl rounded-full" />
        
        <div className="relative rounded-[3rem] border border-[var(--wood)]/20 bg-[var(--ink)]/50 backdrop-blur-2xl p-10 shadow-[0_40px_80px_rgba(15,11,7,0.7)] md:p-16 text-center">
          <h2 className="text-xs font-extrabold uppercase tracking-[0.3em] text-[var(--accent)] mb-10">
            Field Reports
          </h2>

          <div className="min-h-[160px] px-2 md:px-14">
            <motion.p 
              key={activeTestimonial}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="text-xl md:text-3xl font-semibold tracking-tight leading-relaxed text-[var(--cream)]"
            >
              “{TESTIMONIALS[activeTestimonial].quote}”
            </motion.p>
          </div>
            
          <motion.p 
            key={`${activeTestimonial}-name`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="mt-10 text-base font-bold text-[var(--wood)]"
          >
            — {TESTIMONIALS[activeTestimonial].name}
          </motion.p>

          <div className="mt-14 flex items-center justify-center gap-8">
            <button
              type="button"
              onClick={() => setActiveTestimonial((prev) => prev === 0 ? TESTIMONIALS.length - 1 : prev - 1)}
              className="flex h-14 w-14 items-center justify-center rounded-full border border-[var(--wood)]/20 bg-[var(--background)] text-[var(--cream)] shadow-md transition-all hover:scale-110 hover:bg-[var(--ink)] hover:border-[var(--accent)]/50"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            </button>
            
            <div className="flex gap-3">
              {TESTIMONIALS.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveTestimonial(idx)}
                  className={`h-2.5 rounded-full transition-all duration-500 ${
                    idx === activeTestimonial ? "w-10 bg-[var(--accent)] shadow-[0_0_10px_var(--accent)]" : "w-2.5 bg-[var(--wood)]/30 hover:bg-[var(--wood)]/60"
                  }`}
                  aria-label={`Show testimonial ${idx + 1}`}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={() => setActiveTestimonial((prev) => prev === TESTIMONIALS.length - 1 ? 0 : prev + 1)}
              className="flex h-14 w-14 items-center justify-center rounded-full border border-[var(--wood)]/20 bg-[var(--background)] text-[var(--cream)] shadow-md transition-all hover:scale-110 hover:bg-[var(--ink)] hover:border-[var(--accent)]/50"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
            </button>
          </div>
        </div>
      </motion.section>

      {/* NEW SECTION: Public Leaderboard Preview */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={staggerContainer}
        className="mx-auto mt-40 max-w-5xl relative z-10 px-4"
      >
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-full w-full max-w-3xl rounded-full bg-emerald-500/5 blur-[120px] pointer-events-none" />
        <div className="text-center mb-16 relative z-10">
          <motion.h2 variants={fadeIn} className="text-3xl font-extrabold text-[var(--cream)] md:text-5xl tracking-tight">
            Hall of Fame
          </motion.h2>
          <motion.p variants={fadeIn} className="mt-4 text-lg text-[var(--cream-muted)] font-medium">
            The most disciplined students in our ecosystem right now.
          </motion.p>
        </div>
        <motion.div variants={fadeIn} className="relative z-10 mx-auto max-w-2xl">
          <PlantLeaderboard limit={5} />
        </motion.div>
      </motion.section>

      {/* Dynamic FAQs Section */}
      <DynamicFaqs />
    </div>
  );
}

type BentoRuleCardProps = {
  icon: React.ReactNode;
  title: string;
  description: string;
  className?: string;
};

function BentoRuleCard({ icon, title, description, className = "" }: BentoRuleCardProps) {
  return (
    <div className={`glass-panel p-10 group ${className}`}>
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[var(--accent)]/30 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
      <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--background)]/80 text-[var(--accent)] ring-1 ring-inset ring-[var(--wood)]/20 shadow-inner backdrop-blur-sm">
        <span aria-hidden="true" className="w-6 h-6">{icon}</span>
      </div>
      <h3 className="mb-3 text-2xl font-bold text-[var(--cream)] tracking-tight">{title}</h3>
      <p className="text-base font-medium leading-relaxed text-[var(--cream-muted)]">{description}</p>
    </div>
  );
}
