import Link from "next/link";
import type { Metadata } from "next";
import { Shield, ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Rules & Guidelines | Let's Study",
  description: "Read Let's Study rules — mic muted, camera on, zero distraction. These rules exist to keep everyone's experience the best it can be.",
};

const RULES = [
  {
    emoji: "🔇",
    number: "01",
    title: "Always Keep Your Mic Muted",
    desc: "Mute your mic as soon as you join the room. Even one person's audio can break the focus of 40 students. Unmute only when the host asks.",
    gradient: "linear-gradient(145deg, #818CF8, #4F46E5)",
    glow: "rgba(99,102,241,0.40)",
    pale: "#EEF2FF",
    border: "#C7D2FE",
    textColor: "#4F46E5",
  },
  {
    emoji: "📷",
    number: "02",
    title: "Keep Camera On (Required)",
    desc: "Camera on is where the real magic of body doubling happens — no drowsiness, no phone in hand. Just turn it on and start studying!",
    gradient: "linear-gradient(145deg, #34D399, #059669)",
    glow: "rgba(5,150,105,0.40)",
    pale: "#ECFDF5",
    border: "#A7F3D0",
    textColor: "#059669",
  },
  {
    emoji: "🎯",
    number: "03",
    title: "Plan First, Then Join",
    desc: "Decide before joining — 'what am I studying today?' A clear goal means no wasted session. Commit to staying until the timer ends!",
    gradient: "linear-gradient(145deg, #A78BFA, #7C3AED)",
    glow: "rgba(124,58,237,0.40)",
    pale: "#F5F3FF",
    border: "#DDD6FE",
    textColor: "#7C3AED",
  },
  {
    emoji: "💬",
    number: "04",
    title: "Chat is for Admin Only",
    desc: "Do not use the chat for personal conversations. It is reserved for admin announcements only. Talk to friends later — study first!",
    gradient: "linear-gradient(145deg, #22D3EE, #0891B2)",
    glow: "rgba(8,145,178,0.40)",
    pale: "#ECFEFF",
    border: "#A5F3FC",
    textColor: "#0891B2",
  },
  {
    emoji: "🚫",
    number: "05",
    title: "No Promotions Allowed",
    desc: "Do not share any service, product, or social media link — not on screen, not in chat, nowhere. This is a study space, not a marketplace.",
    gradient: "linear-gradient(145deg, #FCD34D, #D97706)",
    glow: "rgba(217,119,6,0.40)",
    pale: "#FFFBEB",
    border: "#FDE68A",
    textColor: "#D97706",
  },
  {
    emoji: "⏱️",
    number: "06",
    title: "Follow the Pomodoro",
    desc: "Study 50 minutes, then take a 10-minute break. Stretch, hydrate. Do not leave the room mid-session — honour your commitment.",
    gradient: "linear-gradient(145deg, #F87171, #DC2626)",
    glow: "rgba(220,38,38,0.40)",
    pale: "#FFF1F2",
    border: "#FECDD3",
    textColor: "#DC2626",
  },
];

const DO_DONT = [
  { do: "Mute your mic", dont: "Let background noise in" },
  { do: "Keep camera on", dont: "Turn off camera and sleep 😴" },
  { do: "Decide your task first", dont: "Join without a plan" },
  { do: "Rest during breaks", dont: "Leave mid-session" },
  { do: "Follow the Pomodoro", dont: "Waste your time" },
];

export default function RulesPage() {
  return (
    <div className="relative min-h-screen overflow-hidden" style={{ background: "var(--page-bg)" }}>

      {/* Ambient orbs */}
      <div className="pointer-events-none absolute top-0 right-0 h-[400px] w-[400px] rounded-full blur-[120px]"
        style={{ background: "radial-gradient(circle, rgba(99,102,241,0.10), transparent)" }} />
      <div className="pointer-events-none absolute bottom-0 left-0 h-[350px] w-[350px] rounded-full blur-[100px]"
        style={{ background: "radial-gradient(circle, rgba(16,185,129,0.08), transparent)" }} />
      <div className="pointer-events-none absolute inset-0"
        style={{ backgroundImage: "radial-gradient(circle, #6366F112 1px, transparent 1px)", backgroundSize: "32px 32px" }} />

      <div className="relative z-10 mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12">

        {/* ── HEADER ── */}
        <div className="mb-14 text-center max-w-2xl mx-auto">
          <div className="mb-4 flex justify-center">
            <span className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-extrabold uppercase tracking-[0.15em]"
              style={{ borderColor: "var(--accent-border)", background: "var(--accent-pale)", color: "var(--accent)" }}>
              <Shield className="h-3.5 w-3.5" />
              Code of Conduct
            </span>
          </div>

          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl" style={{ color: "var(--foreground)" }}>
            Simple Rules,{" "}
            <span className="bg-clip-text text-transparent"
              style={{ backgroundImage: "linear-gradient(135deg, #6366F1, #8B5CF6)" }}>
              Big Impact
            </span>
          </h1>

          <p className="mt-4 text-lg leading-relaxed" style={{ color: "var(--body-text)" }}>
            These rules exist so everyone has the best experience. One distraction affects 40 students — discipline is non-negotiable.
          </p>

          {/* Rule count badge */}
          <div className="mt-6 inline-flex items-center gap-3 rounded-2xl border px-5 py-3"
            style={{ borderColor: "var(--border)", background: "white", boxShadow: "var(--shadow-sm)" }}>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl text-xl"
              style={{ background: "var(--accent-pale)", border: "1.5px solid var(--accent-border)" }}>
              📋
            </div>
            <div className="text-left">
              <p className="text-sm font-extrabold" style={{ color: "var(--foreground)" }}>
                Just {RULES.length} Simple Rules
              </p>
              <p className="text-xs font-semibold" style={{ color: "var(--muted-text)" }}>
                Follow them and enjoy your studies
              </p>
            </div>
          </div>
        </div>

        {/* ── RULES GRID ── */}
        <div className="grid gap-5 sm:grid-cols-2">
          {RULES.map((rule, i) => (
            <div key={i}
              className="group relative overflow-hidden rounded-[1.75rem] border bg-white transition-all hover:-translate-y-1 hover:shadow-[var(--shadow-lg)]"
              style={{ borderColor: rule.border, boxShadow: "var(--shadow-sm)" }}>

              {/* Top stripe */}
              <div className="h-1.5 w-full" style={{ background: rule.gradient }} />

              {/* Hover glow */}
              <div className="pointer-events-none absolute -top-8 -right-8 h-32 w-32 rounded-full blur-[40px] opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                style={{ background: rule.glow }} />

              <div className="relative p-6">
                {/* Number + emoji row */}
                <div className="mb-5 flex items-center justify-between">
                  {/* 3D icon */}
                  <div className="relative inline-block">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl text-2xl transition-transform duration-300 group-hover:-translate-y-1 group-hover:scale-110"
                      style={{
                        background: rule.gradient,
                        boxShadow: `0 2px 0 rgba(255,255,255,0.15) inset, 0 -3px 0 rgba(0,0,0,0.12) inset, 0 8px 20px ${rule.glow}`,
                      }}>
                      {rule.emoji}
                    </div>
                    <div className="absolute top-2 left-2 h-14 w-14 rounded-2xl opacity-20 blur-[8px]"
                      style={{ background: rule.gradient }} />
                  </div>

                  {/* Step number */}
                  <span className="text-5xl font-black opacity-[0.07] select-none"
                    style={{ color: rule.textColor }}>
                    {rule.number}
                  </span>
                </div>

                <h2 className="text-base font-extrabold mb-2" style={{ color: "var(--foreground)" }}>
                  {rule.title}
                </h2>
                <p className="text-sm leading-relaxed" style={{ color: "var(--body-text)" }}>
                  {rule.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* ── DO / DON'T TABLE ── */}
        <div className="mt-12 overflow-hidden rounded-2xl border"
          style={{ borderColor: "var(--border)", boxShadow: "var(--shadow-md)" }}>

          {/* Header */}
          <div className="grid grid-cols-2">
            <div className="flex items-center gap-2 border-r px-6 py-4"
              style={{ borderColor: "var(--border)", background: "#ECFDF5" }}>
              <span className="text-lg">✅</span>
              <p className="font-extrabold text-sm text-emerald-700">Do This</p>
            </div>
            <div className="flex items-center gap-2 px-6 py-4"
              style={{ background: "#FFF1F2" }}>
              <span className="text-lg">❌</span>
              <p className="font-extrabold text-sm text-red-700">Don't Do This</p>
            </div>
          </div>

          {DO_DONT.map((row, i) => (
            <div key={i} className="grid grid-cols-2"
              style={{ borderTop: "1px solid var(--border)" }}>
              <div className="border-r px-6 py-3.5 flex items-center gap-2"
                style={{ borderColor: "var(--border)", background: i % 2 === 0 ? "white" : "#F0FDF4" }}>
                <span className="text-green-500 font-black text-base shrink-0">✓</span>
                <p className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>{row.do}</p>
              </div>
              <div className="px-6 py-3.5 flex items-center gap-2"
                style={{ background: i % 2 === 0 ? "white" : "#FFF5F5" }}>
                <span className="text-red-400 font-black text-base shrink-0">✗</span>
                <p className="text-sm font-semibold" style={{ color: "var(--muted-text)" }}>{row.dont}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── ZERO TOLERANCE BOX ── */}
        <div className="mt-6 overflow-hidden rounded-2xl border p-px"
          style={{ background: "linear-gradient(135deg, #EF4444, #F97316)" }}>
          <div className="rounded-[calc(1rem-1px)] px-7 py-6 flex items-start gap-4"
            style={{ background: "#FFF1F2" }}>
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl"
              style={{ background: "linear-gradient(135deg, #F87171, #DC2626)", boxShadow: "0 4px 12px rgba(220,38,38,0.35)" }}>
              🛡️
            </div>
            <div>
              <h3 className="font-extrabold mb-1 text-red-800">Zero Tolerance Policy</h3>
              <p className="text-sm leading-relaxed text-red-700">
                Harassment, disruption, or repeated rule-breaking will result in immediate removal. We maintain a safe, focused environment for everyone — no exceptions.
              </p>
            </div>
          </div>
        </div>

        {/* ── JOIN CTA ── */}
        <div className="mt-10 overflow-hidden rounded-2xl border p-px"
          style={{ background: "linear-gradient(135deg, #6366F1, #8B5CF6, #06B6D4)" }}>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-5 rounded-[calc(1rem-1px)] px-7 py-6"
            style={{ background: "linear-gradient(135deg, #EEF2FF, #FFFFFF, #F5F3FF)" }}>
            <div>
              <p className="font-extrabold" style={{ color: "var(--foreground)" }}>
                Got it? Now join the session! 🚀
              </p>
              <p className="text-sm mt-1" style={{ color: "var(--muted-text)" }}>
                Live study sessions available daily — for free.
              </p>
            </div>
            <Link href="/study-room"
              className="shrink-0 group relative inline-flex items-center gap-2 overflow-hidden rounded-full px-6 py-3 text-sm font-extrabold text-white transition-all hover:scale-105"
              style={{ background: "linear-gradient(135deg, #6366F1, #8B5CF6)", boxShadow: "0 6px 20px rgba(99,102,241,0.35)" }}>
              <span className="absolute inset-0 translate-x-[-100%] skew-x-12 bg-white/10 transition-transform duration-500 group-hover:translate-x-[100%]" />
              Join Study Room
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {/* Back link */}
        <div className="mt-10 text-center">
          <Link href="/"
            className="inline-flex items-center gap-1.5 text-sm font-bold transition-colors hover:text-[var(--accent)]"
            style={{ color: "var(--muted-text)" }}>
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
