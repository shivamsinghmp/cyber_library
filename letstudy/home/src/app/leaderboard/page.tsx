import type { Metadata } from "next";
import Link from "next/link";
import { LeaderboardClient } from "./LeaderboardClient";

export const metadata: Metadata = {
  title: "Study Leaderboard — Top Learners | Let's Study",
  description: "See India's most consistent studiers ranked by total minutes studied. Daily, weekly, and all-time rankings updated live.",
  alternates: { canonical: "/leaderboard" },
  openGraph: {
    title: "Study Leaderboard — Who's Studying the Most?",
    description: "Real-time leaderboard of India's most consistent learners ranked by study time. Join Let's Study and claim your spot.",
    url: "https://lstudy.in/leaderboard",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Study Leaderboard | Let's Study",
    description: "Daily, weekly, and all-time rankings of India's most consistent learners.",
  },
};

export default function LeaderboardPage() {
  return (
    <div className="bg-[var(--page-bg)] min-h-screen">

      {/* Hero */}
      <section className="relative py-16 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_center,_rgba(245,158,11,0.07)_0%,_transparent_60%)]" />
        <div className="relative mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-amber-600 mb-5">
            🏆 This Week&apos;s Top Students
          </div>
          <h1 className="text-4xl font-black text-[var(--foreground)] md:text-5xl leading-tight mb-4">
            Most Consistent Learners
          </h1>
          <p className="text-lg text-[var(--body-text)] max-w-xl mx-auto leading-relaxed">
            These students show up every day. Will you join them?
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold text-white transition-all hover:scale-105"
              style={{ background: "linear-gradient(135deg, #6366F1, #8B5CF6)", boxShadow: "var(--shadow-brand)" }}
            >
              Join & Compete Free
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-full border-2 px-6 py-3 text-sm font-bold transition-all hover:scale-105"
              style={{ borderColor: "var(--accent)", color: "var(--accent)", background: "white" }}
            >
              Log In to See Your Rank
            </Link>
          </div>
        </div>
      </section>

      {/* Leaderboard */}
      <section className="px-4 pb-4">
        <LeaderboardClient />
      </section>

      {/* Footer CTA */}
      <section className="px-4 pb-20">
        <div className="mx-auto max-w-2xl">
          <div className="rounded-2xl border p-8 text-center" style={{ borderColor: "var(--border)", background: "white" }}>
            <p className="text-lg font-black text-[var(--foreground)] mb-2">Want to climb the rankings?</p>
            <p className="text-sm text-[var(--body-text)] mb-5">
              Every minute you study in a Let&apos;s Study session goes toward your rank.
              Show up daily, build your streak, and watch your score rise.
            </p>
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 rounded-full px-7 py-3 text-sm font-bold text-white transition-all hover:scale-105"
              style={{ background: "linear-gradient(135deg, #6366F1, #8B5CF6)", boxShadow: "var(--shadow-brand)" }}
            >
              Start Your Free Session
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
