"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useSession } from "next-auth/react";

const fadeIn = {
  hidden:  { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.65, ease: [0.16, 1, 0.3, 1] as [number,number,number,number] } },
};
const stagger = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

/* ── data ── */
const PROBLEMS = [
  { emoji: "📱", problem: "Phone keeps finding its way into your hand", fix: "Camera on automatically pushes the phone aside" },
  { emoji: "😴", problem: "Studying alone makes you drowsy",        fix: "No room for sleep when 40+ students are in session with you" },
  { emoji: "🏠", problem: "Can't concentrate at home",           fix: "Virtual library environment puts your brain into focus mode" },
  { emoji: "📅", problem: "Daily schedule never sticks",              fix: "Fixed slots bring automatic discipline" },
  { emoji: "😔", problem: "Motivation keeps coming and going",          fix: "Streak and leaderboard become your reason to show up daily" },
  { emoji: "😰", problem: "Exam pressure leads to burnout",    fix: "Pomodoro breaks ensure your mind stays fresh" },
  { emoji: "📊", problem: "Hard to tell if you're actually progressing", fix: "Daily WhatsApp update — streak, hours, and next target, all clear" },
];

const FEATURES = [
  {
    icon: "🖥️",
    title: "Live Google Meet Sessions",
    desc: "Real students, real cameras, real accountability. This isn't Netflix — everyone here is actually studying.",
    gradient: "linear-gradient(145deg, #818CF8, #4F46E5)",
    glow: "rgba(99,102,241,0.40)",
  },
  {
    icon: "⏱️",
    title: "Pomodoro Timer System",
    desc: "50 minutes deep work, 10 minutes break. A science-backed technique used by top students. Your brain stays fresh and knowledge sticks.",
    gradient: "linear-gradient(145deg, #A78BFA, #7C3AED)",
    glow: "rgba(124,58,237,0.40)",
  },
  {
    icon: "🏆",
    title: "Leaderboard & Streaks",
    desc: "Show up daily, build your streak. Reach the top and everyone will know. Healthy competition drives more study time.",
    gradient: "linear-gradient(145deg, #FCD34D, #D97706)",
    glow: "rgba(217,119,6,0.40)",
  },
  {
    icon: "🎵",
    title: "Lo-Fi Music Background",
    desc: "Distraction-free lo-fi music plays during sessions. It signals your brain — 'it's study time now'.",
    gradient: "linear-gradient(145deg, #34D399, #059669)",
    glow: "rgba(5,150,105,0.40)",
  },
  {
    icon: "📚",
    title: "Premium Study Material",
    desc: "Download notes, planners and trackers made by top students. Everything in one place.",
    gradient: "linear-gradient(145deg, #60A5FA, #2563EB)",
    glow: "rgba(37,99,235,0.40)",
  },
  {
    icon: "🔒",
    title: "Zero Distraction Zone",
    desc: "No social media, no chatting, no distractions. Just studying. Wasting time here is literally impossible.",
    gradient: "linear-gradient(145deg, #F87171, #DC2626)",
    glow: "rgba(220,38,38,0.40)",
  },
  {
    icon: "💬",
    title: "WhatsApp Daily Progress Update",
    desc: "Sent to WhatsApp daily — how much you studied, your streak, and motivation for tomorrow. Consistency never breaks.",
    gradient: "linear-gradient(145deg, #4ADE80, #16A34A)",
    glow: "rgba(22,163,74,0.40)",
  },
];

const AI_FEATURES = [
  { emoji: "🗓️", title: "Study Plan",     desc: "Enter exam date + syllabus — AI builds your perfect timetable in a second",          bg: "#EEF2FF", border: "#C7D2FE", iconBg: "#6366F1" },
  { emoji: "⚡",  title: "Shortcuts",       desc: "3 methods per question — slow, fast, fastest. Save time in the exam.",               bg: "#FFFBEB", border: "#FDE68A", iconBg: "#D97706" },
  { emoji: "📸",  title: "Photo Solve",     desc: "Handwritten or printed question — upload a photo, AI solves it step-by-step",      bg: "#F5F3FF", border: "#DDD6FE", iconBg: "#7C3AED" },
  { emoji: "🎯",  title: "80/20 Focus",     desc: "Top 20% topics that give 80% marks — stop wasting time on the rest",            bg: "#FEF2F2", border: "#FECACA", iconBg: "#DC2626" },
  { emoji: "🧠",  title: "Doubt Clear",     desc: "Explains with step-by-step reasoning — keeps going until you fully understand", bg: "#ECFDF5", border: "#A7F3D0", iconBg: "#059669" },
  { emoji: "📈",  title: "Weak Topic Fix",  desc: "AI diagnoses where and why you go wrong — fixes the root cause",              bg: "#ECFEFF", border: "#A5F3FC", iconBg: "#0891B2" },
  { emoji: "⏱️",  title: "Speed Training",  desc: "Standard vs shortcut method side by side — double your exam speed",               bg: "#FFF7ED", border: "#FED7AA", iconBg: "#EA580C" },
  { emoji: "💆",  title: "Stress Support",  desc: "Feeling frustrated? Just say so — AI switches to friend mode, no judgement",     bg: "#FDF2F8", border: "#FBCFE8", iconBg: "#DB2777" },
];

const MOCK_FLOW = [
  {
    step: "01",
    emoji: "📝",
    title: "Take a Mock Test",
    desc: "PYQ-based questions matching the real exam pattern — exactly as they appear. Timed, no hints.",
    bg: "linear-gradient(135deg, #EEF2FF, #E0E7FF)",
    border: "#C7D2FE",
    accent: "#6366F1",
  },
  {
    step: "02",
    emoji: "❌",
    title: "Wrong Answer? No Problem",
    desc: "Whenever you get a question wrong — AI detects it instantly. Not a single mistake goes unnoticed. That's where real learning starts.",
    bg: "linear-gradient(135deg, #FEF2F2, #FEE2E2)",
    border: "#FECACA",
    accent: "#DC2626",
  },
  {
    step: "03",
    emoji: "🧠",
    title: "AI Gives an Instant Solution",
    desc: "Right there — what the reason was, the correct approach, the shortcut, and how to avoid the same mistake next time.",
    bg: "linear-gradient(135deg, #ECFDF5, #D1FAE5)",
    border: "#A7F3D0",
    accent: "#059669",
  },
];

const PYQ_HIGHLIGHTS = [
  {
    emoji: "📚", title: "10+ Years of PYQ Bank",
    desc: "UPSC, JEE, NEET, GATE, CAT, SSC — past year questions from all exams in one place. Sorted by exam and topic.",
    bg: "#EEF2FF", border: "#C7D2FE", iconBg: "#6366F1",
  },
  {
    emoji: "🎯", title: "Smart Mock Tests",
    desc: "Real exam pattern, actual marking scheme, and time pressure. Feel the exam hall from home.",
    bg: "#FFFBEB", border: "#FDE68A", iconBg: "#D97706",
  },
  {
    emoji: "⚡", title: "Instant AI Explanation",
    desc: "No stopping on a wrong answer — AI explains it right there in your language. Hindi or English, your choice.",
    bg: "#ECFDF5", border: "#A7F3D0", iconBg: "#059669",
  },
  {
    emoji: "📊", title: "Weak Topic Radar",
    desc: "How many mocks you've taken, where you keep going wrong — AI builds your performance card and sets your next target.",
    bg: "#ECFEFF", border: "#A5F3FC", iconBg: "#0891B2",
  },
];

const WHO_IS_IT_FOR = [
  { emoji: "📖", title: "UPSC Aspirants",    desc: "Need 8-10 hours daily for Mains? That's possible here." },
  { emoji: "⚗️", title: "JEE / NEET Students", desc: "Conceptual clarity needs a focused study environment." },
  { emoji: "💼", title: "GATE / CAT Preppers", desc: "Working professionals who want to study seriously on weekends." },
  { emoji: "🎓", title: "College Students",   desc: "No last-minute cramming before exams — consistent daily study." },
  { emoji: "💻", title: "Self-Learners",      desc: "Coding, design, languages — learn whatever you want, together." },
  { emoji: "🌙", title: "Night Owls",         desc: "Night slots available too — study while the world sleeps." },
];

const COMPARISON = [
  { point: "Focus environment",      us: "Structured virtual library",  others: "Alone at home — full of distractions" },
  { point: "Accountability",         us: "Live cameras on, 40+ students",others: "Just you and your phone" },
  { point: "Study tracking",         us: "Coins, streaks, leaderboard",  others: "Have to remember yourself" },
  { point: "Schedule",               us: "Fixed daily slots",            others: "Any time means never" },
  { point: "Cost",                   us: "Free to start",                others: "Expensive coaching centres" },
  { point: "Community",              us: "India's serious students",    others: "Struggling alone" },
  { point: "Daily update",           us: "WhatsApp progress report",  others: "Track it yourself or forget" },
];

const TESTIMONIALS = [
  {
    name: "Priya S.",    role: "UPSC 2024 Aspirant",
    quote: "I'm now doing 6 hours of daily Mains reading — 2 hours used to be a struggle before. Let's Study has literally transformed my preparation.",
    initial: "P", color: "linear-gradient(135deg, #6366F1, #8B5CF6)",
  },
  {
    name: "Arjun K.",    role: "JEE Advanced Student",
    quote: "I study 4 more hours here after coaching. No time wasted with friends, and my focus stays solid.",
    initial: "A", color: "linear-gradient(135deg, #8B5CF6, #06B6D4)",
  },
  {
    name: "Sneha R.",    role: "NEET Aspirant",
    quote: "My streak hit 45 days. Not a single day missed. I've never been this consistent with studying before.",
    initial: "S", color: "linear-gradient(135deg, #06B6D4, #10B981)",
  },
];

const FAQ = [
  { q: "Is it free?", a: "Yes! Basic study rooms are completely free. Create an account and join today." },
  { q: "Is camera on required?", a: "Highly recommended — camera on makes focus 3x better. But no one forces you." },
  { q: "What if I need a break mid-session?", a: "Rest during the Pomodoro break. If something urgent comes up, you can leave." },
  { q: "Which exam students are here?", a: "UPSC, JEE, NEET, GATE, CAT, boards — students preparing for all kinds of exams study here." },
  { q: "What if my internet is slow?", a: "Google Meet works on basic internet too. You can also join with camera off." },
  { q: "Can I join from mobile?", a: "Yes, Google Meet works on mobile too. No laptop? No problem." },
  { q: "How do I get the WhatsApp update?", a: "After joining, save our WhatsApp number and get added to the group — your progress update arrives automatically every night." },
];

export default function WhyJoinPage() {
  const { data: session } = useSession();
  const isLoggedIn = !!session?.user;

  return (
    <div className="relative overflow-hidden" style={{ background: "var(--page-bg)" }}>

      {/* ══ HERO ══ */}
      <section className="relative overflow-hidden py-24 md:py-32">
        {/* Orbs */}
        <div className="pointer-events-none absolute -top-32 right-0 h-[600px] w-[600px] rounded-full blur-[140px]"
          style={{ background: "radial-gradient(circle, rgba(99,102,241,0.15), transparent)" }} />
        <div className="pointer-events-none absolute bottom-0 left-0 h-[400px] w-[400px] rounded-full blur-[120px]"
          style={{ background: "radial-gradient(circle, rgba(6,182,212,0.10), transparent)" }} />
        <div className="pointer-events-none absolute inset-0"
          style={{ backgroundImage: "radial-gradient(circle, #6366F115 1px, transparent 1px)", backgroundSize: "32px 32px" }} />

        <div className="relative z-10 mx-auto max-w-4xl px-4 text-center">
          <motion.div initial="hidden" animate="visible" variants={stagger} className="space-y-6">

            <motion.div variants={fadeIn}>
              <span className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-extrabold uppercase tracking-[0.15em]"
                style={{ borderColor: "var(--accent-border)", background: "var(--accent-pale)", color: "var(--accent)" }}>
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75" style={{ background: "var(--accent)" }} />
                  <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: "var(--accent)" }} />
                </span>
                5000+ Students Already Studying
              </span>
            </motion.div>

            <motion.h1 variants={fadeIn} className="text-4xl font-extrabold tracking-tight sm:text-6xl leading-[1.08]"
              style={{ color: "var(--foreground)" }}>
              Can't Focus at Home?{" "}
              <span className="bg-clip-text text-transparent"
                style={{ backgroundImage: "linear-gradient(135deg, #6366F1, #8B5CF6, #06B6D4)", backgroundSize: "200% auto" }}>
                We Understand.
              </span>
            </motion.h1>

            <motion.p variants={fadeIn} className="mx-auto max-w-2xl text-lg leading-relaxed"
              style={{ color: "var(--body-text)" }}>
              Let's Study is a place where real students show up daily — cameras on, mics off, zero distractions.
              Try it once and you'll feel the difference yourself.
            </motion.p>

            <motion.div variants={fadeIn} className="flex flex-wrap items-center justify-center gap-4">
              {isLoggedIn ? (
                <Link href="/study-room"
                  className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full px-8 py-4 text-sm font-extrabold text-white transition-all hover:scale-105"
                  style={{ background: "linear-gradient(135deg, #6366F1, #8B5CF6)", boxShadow: "0 8px 24px rgba(99,102,241,0.40)" }}>
                  <span className="absolute inset-0 translate-x-[-100%] skew-x-12 bg-white/10 transition-transform duration-500 group-hover:translate-x-[100%]" />
                  Start Studying Now →
                </Link>
              ) : (
                <>
                  <Link href="/signup"
                    className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full px-8 py-4 text-sm font-extrabold text-white transition-all hover:scale-105"
                    style={{ background: "linear-gradient(135deg, #6366F1, #8B5CF6)", boxShadow: "0 8px 24px rgba(99,102,241,0.40)" }}>
                    <span className="absolute inset-0 translate-x-[-100%] skew-x-12 bg-white/10 transition-transform duration-500 group-hover:translate-x-[100%]" />
                    Join for Free →
                  </Link>
                  <Link href="/login"
                    className="inline-flex items-center gap-2 rounded-full border-2 bg-white px-8 py-4 text-sm font-bold transition-all hover:scale-105"
                    style={{ borderColor: "var(--accent)", color: "var(--accent)" }}>
                    Log In
                  </Link>
                </>
              )}
            </motion.div>

            {/* Trust badges */}
            <motion.div variants={fadeIn} className="flex flex-wrap items-center justify-center gap-6 pt-2">
              {[
                { emoji: "✅", text: "Completely Free" },
                { emoji: "⚡", text: "2 min signup" },
                { emoji: "🔒", text: "Secure & Private" },
                { emoji: "📱", text: "Mobile friendly" },
              ].map(b => (
                <div key={b.text} className="flex items-center gap-1.5 text-sm font-semibold" style={{ color: "var(--muted-text)" }}>
                  <span>{b.emoji}</span> {b.text}
                </div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ══ PROBLEM → SOLUTION ══ */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={stagger}>

            <div className="mb-14 text-center">
              <motion.div variants={fadeIn}>
                <span className="inline-flex items-center rounded-full border px-4 py-1.5 text-xs font-extrabold uppercase tracking-widest mb-4"
                  style={{ borderColor: "var(--accent-border)", background: "var(--accent-pale)", color: "var(--accent)" }}>
                  Problems Solved
                </span>
              </motion.div>
              <motion.h2 variants={fadeIn} className="text-3xl font-extrabold tracking-tight sm:text-5xl"
                style={{ color: "var(--foreground)" }}>
                Does Any of This Sound Familiar?
              </motion.h2>
              <motion.p variants={fadeIn} className="mt-4 text-lg" style={{ color: "var(--body-text)" }}>
                These problems aren't just yours — almost every student faces them. And Let's Study fixes them.
              </motion.p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {PROBLEMS.map((item, i) => (
                <motion.div key={i} variants={fadeIn}
                  className="overflow-hidden rounded-2xl border"
                  style={{ borderColor: "var(--border)" }}>
                  {/* Problem — red tint */}
                  <div className="px-5 py-4 flex items-start gap-3"
                    style={{ background: "#FEF2F2", borderBottom: "1px solid #FECACA" }}>
                    <span className="text-2xl shrink-0">{item.emoji}</span>
                    <p className="text-sm font-bold text-red-700">{item.problem}</p>
                  </div>
                  {/* Solution — green tint */}
                  <div className="px-5 py-4 flex items-start gap-3"
                    style={{ background: "#ECFDF5" }}>
                    <span className="text-lg shrink-0">✅</span>
                    <p className="text-sm font-semibold text-emerald-700">{item.fix}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ══ FEATURES ══ */}
      <section className="py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={stagger}>

            <div className="mb-14 text-center">
              <motion.div variants={fadeIn}>
                <span className="inline-flex items-center rounded-full border px-4 py-1.5 text-xs font-extrabold uppercase tracking-widest mb-4"
                  style={{ borderColor: "var(--accent-border)", background: "var(--accent-pale)", color: "var(--accent)" }}>
                  What You Get
                </span>
              </motion.div>
              <motion.h2 variants={fadeIn} className="text-3xl font-extrabold tracking-tight sm:text-5xl"
                style={{ color: "var(--foreground)" }}>
                One Platform, Everything Included
              </motion.h2>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((f, i) => (
                <motion.div key={i} variants={fadeIn}
                  whileHover={{ y: -6, transition: { duration: 0.25 } }}
                  className="group relative overflow-hidden rounded-2xl border bg-white p-7 transition-shadow hover:shadow-[var(--shadow-lg)]"
                  style={{ borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }}>
                  {/* 3D icon */}
                  <div className="relative mb-6 inline-block">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl text-2xl transition-transform duration-300 group-hover:-translate-y-1 group-hover:scale-110"
                      style={{ background: f.gradient, boxShadow: `0 2px 0 rgba(255,255,255,0.15) inset, 0 -3px 0 rgba(0,0,0,0.12) inset, 0 8px 20px ${f.glow}` }}>
                      {f.icon}
                    </div>
                    <div className="absolute top-2 left-2 h-14 w-14 rounded-2xl opacity-20 blur-[8px]"
                      style={{ background: f.gradient }} />
                  </div>
                  <h3 className="mb-2 text-base font-extrabold" style={{ color: "var(--foreground)" }}>{f.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--body-text)" }}>{f.desc}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ══ STUDYMATE AI ══ */}
      <section className="py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={stagger}>

            <div className="mb-14 text-center">
              <motion.div variants={fadeIn}>
                <span className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-extrabold uppercase tracking-widest mb-4"
                  style={{ borderColor: "var(--accent-border)", background: "var(--accent-pale)", color: "var(--accent)" }}>
                  <span className="text-base">✨</span> AI-Powered Feature
                </span>
              </motion.div>
              <motion.h2 variants={fadeIn} className="text-3xl font-extrabold tracking-tight sm:text-5xl"
                style={{ color: "var(--foreground)" }}>
                StudyMate AI — Your Personal Topper Companion
              </motion.h2>
              <motion.p variants={fadeIn} className="mt-4 text-lg max-w-2xl mx-auto" style={{ color: "var(--body-text)" }}>
                UPSC, JEE, NEET, GATE, CAT, SSC — any exam. Ask doubts, upload photos, build a plan.
                Available 24/7, never judgemental.
              </motion.p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {AI_FEATURES.map((f, i) => (
                <motion.div key={i} variants={fadeIn}
                  whileHover={{ y: -4, transition: { duration: 0.2 } }}
                  className="rounded-2xl border p-5 transition-all hover:shadow-[var(--shadow-md)]"
                  style={{ background: f.bg, borderColor: f.border }}>
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl text-xl"
                    style={{ background: f.iconBg, boxShadow: `0 4px 12px ${f.iconBg}55` }}>
                    {f.emoji}
                  </div>
                  <h3 className="text-sm font-extrabold mb-1" style={{ color: "var(--foreground)" }}>{f.title}</h3>
                  <p className="text-xs leading-relaxed" style={{ color: "var(--body-text)" }}>{f.desc}</p>
                </motion.div>
              ))}
            </div>

            <motion.div variants={fadeIn} className="mt-10 text-center">
              <Link href="/dashboard/studymate"
                className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full px-8 py-4 text-sm font-extrabold text-white transition-all hover:scale-105"
                style={{ background: "linear-gradient(135deg, #6366F1, #8B5CF6)", boxShadow: "0 8px 24px rgba(99,102,241,0.40)" }}>
                <span className="absolute inset-0 translate-x-[-100%] skew-x-12 bg-white/10 transition-transform duration-500 group-hover:translate-x-[100%]" />
                ✨ Try StudyMate AI — It's Free →
              </Link>
            </motion.div>

          </motion.div>
        </div>
      </section>

      {/* ══ AI MOCK TEST + PYQ ══ */}
      <section className="py-24" style={{ background: "linear-gradient(180deg, #FFFBEB 0%, #FEF3C7 100%)" }}>
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={stagger}>

            {/* Header */}
            <div className="mb-14 text-center">
              <motion.div variants={fadeIn}>
                <span className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-extrabold uppercase tracking-widest mb-4"
                  style={{ borderColor: "#FDE68A", background: "#FFFBEB", color: "#D97706" }}>
                  🏆 The Real Formula for Ranking
                </span>
              </motion.div>
              <motion.h2 variants={fadeIn} className="text-3xl font-extrabold tracking-tight sm:text-5xl"
                style={{ color: "var(--foreground)" }}>
                AI Mock Test + PYQ Training
              </motion.h2>
              <motion.p variants={fadeIn} className="mt-4 text-lg max-w-2xl mx-auto" style={{ color: "var(--body-text)" }}>
                Just studying isn't enough — practicing the right way matters.
                Got an answer wrong? AI stops you right there and explains.{" "}
                <span className="font-bold" style={{ color: "var(--accent)" }}>That's how you rank.</span>
              </motion.p>
            </div>

            {/* ── 3-Step Flow ── */}
            <div className="mb-14 grid gap-5 sm:grid-cols-3">
              {MOCK_FLOW.map((step, i) => (
                <motion.div key={i} variants={fadeIn} className="relative">
                  {/* Connector arrow between steps */}
                  {i < MOCK_FLOW.length - 1 && (
                    <div className="hidden sm:flex absolute -right-3 top-1/2 -translate-y-1/2 z-10
                      h-7 w-7 items-center justify-center rounded-full bg-white border-2 text-sm font-black shadow-sm"
                      style={{ borderColor: "var(--border)", color: "var(--muted-text)" }}>
                      →
                    </div>
                  )}
                  <div className="h-full rounded-2xl border p-6 flex flex-col gap-3"
                    style={{ background: step.bg, borderColor: step.border }}>
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{step.emoji}</span>
                      <span className="text-xs font-black uppercase tracking-widest px-2 py-1 rounded-lg"
                        style={{ background: step.accent + "20", color: step.accent }}>
                        Step {step.step}
                      </span>
                    </div>
                    <h3 className="text-base font-extrabold leading-snug" style={{ color: "var(--foreground)" }}>{step.title}</h3>
                    <p className="text-sm leading-relaxed" style={{ color: "var(--body-text)" }}>{step.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* ── 4 highlight cards ── */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {PYQ_HIGHLIGHTS.map((f, i) => (
                <motion.div key={i} variants={fadeIn}
                  whileHover={{ y: -4, transition: { duration: 0.2 } }}
                  className="rounded-2xl border p-5 transition-all hover:shadow-[var(--shadow-md)]"
                  style={{ background: "white", borderColor: f.border }}>
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl text-xl"
                    style={{ background: f.iconBg, boxShadow: `0 4px 12px ${f.iconBg}55` }}>
                    {f.emoji}
                  </div>
                  <h3 className="text-sm font-extrabold mb-1" style={{ color: "var(--foreground)" }}>{f.title}</h3>
                  <p className="text-xs leading-relaxed" style={{ color: "var(--body-text)" }}>{f.desc}</p>
                </motion.div>
              ))}
            </div>

            {/* ── Instant solution demo card ── */}
            <motion.div variants={fadeIn}
              className="mt-10 rounded-2xl border overflow-hidden"
              style={{ borderColor: "#FDE68A", boxShadow: "0 8px 32px rgba(217,119,6,0.12)" }}>
              {/* Header bar */}
              <div className="px-6 py-4 flex items-center gap-3"
                style={{ background: "linear-gradient(135deg, #D97706, #F59E0B)", color: "white" }}>
                <span className="text-xl">⚡</span>
                <span className="font-extrabold text-sm uppercase tracking-wide">Live Example — AI Instant Explanation</span>
                <span className="ml-auto text-xs font-bold bg-white/20 px-3 py-1 rounded-full">Mock Test Mode</span>
              </div>
              {/* Body */}
              <div className="p-6 grid sm:grid-cols-2 gap-6" style={{ background: "white" }}>
                {/* Wrong answer */}
                <div className="rounded-xl border p-4 space-y-2" style={{ borderColor: "#FECACA", background: "#FEF2F2" }}>
                  <p className="text-xs font-black text-red-600 uppercase tracking-wide">❌ Student's Answer (Wrong)</p>
                  <p className="text-sm font-bold" style={{ color: "var(--foreground)" }}>Q. When did India's first Five-Year Plan begin?</p>
                  <div className="inline-block rounded-lg px-3 py-1.5 text-sm font-bold bg-red-100 text-red-700">1952 (Wrong)</div>
                </div>
                {/* AI solution */}
                <div className="rounded-xl border p-4 space-y-2" style={{ borderColor: "#A7F3D0", background: "#ECFDF5" }}>
                  <p className="text-xs font-black text-emerald-600 uppercase tracking-wide">🧠 AI's Instant Answer</p>
                  <p className="text-xs font-semibold text-emerald-800">
                    The correct answer is <span className="font-black">1951</span> — it began on 1 April 1951.
                    1952 feels right because the first elections also happened that year — a very common confusion.
                  </p>
                  <p className="text-[11px] text-emerald-700 font-bold">
                    💡 Trick: "Plan first, then vote" — Plan 1951, Elections 1952.
                  </p>
                </div>
              </div>
            </motion.div>

          </motion.div>
        </div>
      </section>

      {/* ══ WHO IS IT FOR ══ */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={stagger}>

            <div className="mb-14 text-center">
              <motion.div variants={fadeIn}>
                <span className="inline-flex items-center rounded-full border px-4 py-1.5 text-xs font-extrabold uppercase tracking-widest mb-4"
                  style={{ borderColor: "var(--accent-border)", background: "var(--accent-pale)", color: "var(--accent)" }}>
                  This Is for You If…
                </span>
              </motion.div>
              <motion.h2 variants={fadeIn} className="text-3xl font-extrabold tracking-tight sm:text-5xl"
                style={{ color: "var(--foreground)" }}>
                Who Joins?
              </motion.h2>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {WHO_IS_IT_FOR.map((item, i) => (
                <motion.div key={i} variants={fadeIn}
                  className="flex items-start gap-4 rounded-2xl border bg-white p-6 transition-all hover:-translate-y-1 hover:shadow-[var(--shadow-md)]"
                  style={{ borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }}>
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl"
                    style={{ background: "var(--accent-pale)", border: "1.5px solid var(--accent-border)" }}>
                    {item.emoji}
                  </div>
                  <div>
                    <h3 className="font-extrabold" style={{ color: "var(--foreground)" }}>{item.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed" style={{ color: "var(--body-text)" }}>{item.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ══ COMPARISON TABLE ══ */}
      <section className="py-24">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={stagger}>

            <div className="mb-14 text-center">
              <motion.h2 variants={fadeIn} className="text-3xl font-extrabold tracking-tight sm:text-5xl"
                style={{ color: "var(--foreground)" }}>
                Let's Study vs Studying Alone at Home
              </motion.h2>
            </div>

            <motion.div variants={fadeIn}
              className="overflow-hidden rounded-2xl border"
              style={{ borderColor: "var(--border)", boxShadow: "var(--shadow-lg)" }}>
              {/* Header */}
              <div className="grid grid-cols-3 text-center text-xs font-extrabold uppercase tracking-widest"
                style={{ borderBottom: "2px solid var(--border)" }}>
                <div className="p-4" style={{ color: "var(--muted-text)", background: "var(--page-bg)" }}>Feature</div>
                <div className="p-4" style={{
                  background: "linear-gradient(135deg, #6366F1, #8B5CF6)",
                  color: "white",
                }}>
                  ✨ Let's Study
                </div>
                <div className="p-4" style={{ color: "var(--muted-text)", background: "var(--page-bg)" }}>Alone at Home</div>
              </div>

              {COMPARISON.map((row, i) => (
                <div key={i}
                  className="grid grid-cols-3 text-sm"
                  style={{ borderBottom: i < COMPARISON.length - 1 ? "1px solid var(--border)" : "none" }}>
                  <div className="p-4 font-bold" style={{ color: "var(--foreground)", background: i % 2 === 0 ? "white" : "var(--page-bg)" }}>
                    {row.point}
                  </div>
                  <div className="p-4 text-center font-semibold text-emerald-700"
                    style={{ background: i % 2 === 0 ? "#ECFDF5" : "#D1FAE5" }}>
                    ✅ {row.us}
                  </div>
                  <div className="p-4 text-center font-semibold text-red-600"
                    style={{ background: i % 2 === 0 ? "#FEF2F2" : "#FEE2E2" }}>
                    ❌ {row.others}
                  </div>
                </div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ══ TESTIMONIALS ══ */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={stagger}>

            <div className="mb-14 text-center">
              <motion.div variants={fadeIn}>
                <span className="inline-flex items-center rounded-full border px-4 py-1.5 text-xs font-extrabold uppercase tracking-widest mb-4"
                  style={{ borderColor: "var(--accent-border)", background: "var(--accent-pale)", color: "var(--accent)" }}>
                  In Their Own Words
                </span>
              </motion.div>
              <motion.h2 variants={fadeIn} className="text-3xl font-extrabold tracking-tight sm:text-5xl"
                style={{ color: "var(--foreground)" }}>
                What Our Students Say
              </motion.h2>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {TESTIMONIALS.map((t, i) => (
                <motion.div key={i} variants={fadeIn}
                  className="flex flex-col gap-5 rounded-2xl border bg-white p-7"
                  style={{ borderColor: "var(--border)", boxShadow: "var(--shadow-md)" }}>
                  {/* Stars */}
                  <div className="flex gap-0.5">
                    {[...Array(5)].map((_, j) => (
                      <svg key={j} width="14" height="14" viewBox="0 0 24 24" fill="#F59E0B">
                        <path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                      </svg>
                    ))}
                  </div>
                  <p className="flex-1 text-sm leading-relaxed font-medium" style={{ color: "var(--body-text)" }}>
                    "{t.quote}"
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-extrabold text-white"
                      style={{ background: t.color }}>
                      {t.initial}
                    </div>
                    <div>
                      <p className="text-sm font-extrabold" style={{ color: "var(--foreground)" }}>{t.name}</p>
                      <p className="text-xs font-semibold" style={{ color: "var(--muted-text)" }}>{t.role}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ══ FAQ ══ */}
      <section className="py-24">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={stagger}>

            <div className="mb-14 text-center">
              <motion.h2 variants={fadeIn} className="text-3xl font-extrabold tracking-tight sm:text-5xl"
                style={{ color: "var(--foreground)" }}>
                Common Questions
              </motion.h2>
            </div>

            <div className="space-y-4">
              {FAQ.map((item, i) => (
                <motion.div key={i} variants={fadeIn}
                  className="rounded-2xl border bg-white p-6"
                  style={{ borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }}>
                  <h3 className="flex items-start gap-3 text-base font-extrabold" style={{ color: "var(--foreground)" }}>
                    <span className="shrink-0 flex h-6 w-6 items-center justify-center rounded-full text-xs font-extrabold text-white mt-0.5"
                      style={{ background: "linear-gradient(135deg, #6366F1, #8B5CF6)", minWidth: "1.5rem" }}>
                      Q
                    </span>
                    {item.q}
                  </h3>
                  <p className="mt-3 pl-9 text-sm leading-relaxed" style={{ color: "var(--body-text)" }}>
                    {item.a}
                  </p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ══ FINAL CTA ══ */}
      <section className="py-24 bg-white">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
            <motion.div variants={fadeIn}
              className="relative overflow-hidden rounded-[2.5rem] p-px"
              style={{ background: "linear-gradient(135deg, #6366F1, #8B5CF6, #06B6D4)", boxShadow: "0 20px 60px rgba(99,102,241,0.25)" }}>
              <div className="relative overflow-hidden rounded-[calc(2.5rem-1px)] px-8 py-16 text-center"
                style={{ background: "linear-gradient(135deg, #EEF2FF 0%, #FFFFFF 50%, #F5F3FF 100%)" }}>

                {/* Orbs inside card */}
                <div className="pointer-events-none absolute top-0 right-0 h-48 w-48 rounded-full blur-[80px]"
                  style={{ background: "rgba(99,102,241,0.15)" }} />
                <div className="pointer-events-none absolute bottom-0 left-0 h-48 w-48 rounded-full blur-[80px]"
                  style={{ background: "rgba(6,182,212,0.10)" }} />

                <div className="relative z-10">
                  <p className="mb-4 text-4xl">🚀</p>
                  <h2 className="text-3xl font-extrabold tracking-tight sm:text-5xl mb-4" style={{ color: "var(--foreground)" }}>
                    Not Tomorrow — Today!
                  </h2>
                  <p className="mb-8 text-lg" style={{ color: "var(--body-text)" }}>
                    Try one session. You'll feel the difference. <br />
                    <span className="font-bold" style={{ color: "var(--accent)" }}>It's free, signup takes 30 seconds.</span>
                  </p>

                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    {isLoggedIn ? (
                      <Link href="/study-room"
                        className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full px-10 py-4 text-base font-extrabold text-white transition-all hover:scale-105"
                        style={{ background: "linear-gradient(135deg, #6366F1, #8B5CF6)", boxShadow: "0 8px 28px rgba(99,102,241,0.45)" }}>
                        <span className="absolute inset-0 translate-x-[-100%] skew-x-12 bg-white/10 transition-transform duration-500 group-hover:translate-x-[100%]" />
                        Join Session →
                      </Link>
                    ) : (
                      <>
                        <Link href="/signup"
                          className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full px-10 py-4 text-base font-extrabold text-white transition-all hover:scale-105"
                          style={{ background: "linear-gradient(135deg, #6366F1, #8B5CF6)", boxShadow: "0 8px 28px rgba(99,102,241,0.45)" }}>
                          <span className="absolute inset-0 translate-x-[-100%] skew-x-12 bg-white/10 transition-transform duration-500 group-hover:translate-x-[100%]" />
                          Join for Free →
                        </Link>
                        <Link href="/login"
                          className="inline-flex items-center rounded-full border-2 px-8 py-4 text-base font-bold transition-all hover:scale-105"
                          style={{ borderColor: "var(--accent)", color: "var(--accent)", background: "white" }}>
                          Already have an account? Log In
                        </Link>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

    </div>
  );
}
