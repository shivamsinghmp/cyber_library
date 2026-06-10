"use client";

import { motion } from "framer-motion";
import { fadeIn, staggerContainer } from "./animations";

type Stats = { totalStudents: number; totalHours: number; activeNow: number };

function fmtK(n: number) {
  if (n < 1000) return `${n}+`;
  const k = n / 1000;
  return k % 1 === 0 ? `${k}k+` : `${k.toFixed(1)}k+`;
}

export function StatsSection({ stats }: { stats: Stats | null }) {
  const displayStudents = Math.max(stats?.totalStudents ?? 0, 10000);
  const displayHours    = Math.max(stats?.totalHours    ?? 0, 5000);
  const activeNow       = stats?.activeNow ?? 0;

  const items = [
    {
      value: fmtK(displayStudents),
      label: "Students Enrolled", emoji: "👥",
      bg: "linear-gradient(135deg, #6366F1, #8B5CF6)", glow: "rgba(99,102,241,0.35)",
    },
    {
      value: fmtK(displayHours),
      label: "Hours Studied", emoji: "⏱️",
      bg: "linear-gradient(135deg, #8B5CF6, #06B6D4)", glow: "rgba(139,92,246,0.35)",
    },
    {
      value: activeNow > 0 ? `${activeNow} Live` : "24/7",
      label: activeNow > 0 ? "Studying Right Now" : "Always Open",
      emoji: activeNow > 0 ? "🔴" : "✅",
      bg: "linear-gradient(135deg, #06B6D4, #10B981)", glow: "rgba(6,182,212,0.35)",
    },
  ];

  return (
    <section className="border-y bg-white py-16" style={{ borderColor: "var(--border)" }}>
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={staggerContainer} className="grid grid-cols-3 gap-8">
          {items.map((s, i) => (
            <motion.div key={i} variants={fadeIn} className="flex flex-col items-center gap-3 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl text-2xl" style={{ background: s.bg, boxShadow: `0 2px 0 rgba(255,255,255,0.15) inset, 0 -3px 0 rgba(0,0,0,0.12) inset, 0 8px 20px ${s.glow}` }}>
                {s.emoji}
              </div>
              <p className="text-3xl font-black md:text-4xl" style={{ color: "var(--foreground)" }}>{s.value}</p>
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--muted-text)" }}>{s.label}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
