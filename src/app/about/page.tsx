import Link from "next/link";
import type { Metadata } from "next";
import { Users, Clock, Zap, Heart } from "lucide-react";

export const metadata: Metadata = {
  title: "About Let's Study — 24/7 Virtual Study Room & Focus Hub",
  description: "Let's Study is a 24/7 body doubling study hub built for UPSC, JEE, NEET and anyone who wants to do real deep work. Learn how we use body doubling, Pomodoro sprints and community accountability to help you actually study.",
  keywords: ["about lets study", "virtual study room", "body doubling online", "study accountability", "focus community India"],
  alternates: { canonical: "/about" },
  openGraph: {
    title: "About Let's Study — 24/7 Virtual Study Room & Focus Hub",
    description: "A 24/7 body doubling study hub built for UPSC, JEE, NEET and anyone who wants to do real deep work.",
    url: "https://cyberlib.in/about",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "About Let's Study",
    description: "A 24/7 body doubling study hub for UPSC, JEE, NEET and deep work.",
  },
};

const PILLARS = [
  {
    icon: Users,
    title: "Body Doubling",
    desc: "Working in the silent presence of others dramatically improves focus. Our sessions recreate that real-library effect, online.",
    color: "text-[var(--accent)] bg-[var(--cream)] border-[var(--cream-muted)]",
  },
  {
    icon: Clock,
    title: "Pomodoro Structure",
    desc: "Strict 50/10 work-break cycles paced by our admin so your brain never burns out. Structure is freedom.",
    color: "text-blue-600 bg-blue-50 border-blue-100",
  },
  {
    icon: Zap,
    title: "Real Accountability",
    desc: "Cameras on, mics off. Streaks, coins, and a public leaderboard make consistency rewarding.",
    color: "text-amber-600 bg-amber-50 border-amber-100",
  },
  {
    icon: Heart,
    title: "Mental Wellness",
    desc: "Burnout ends careers. Book private 1-on-1 wellness sessions with professionals to stay anchored.",
    color: "text-rose-600 bg-rose-50 border-rose-100",
  },
];

export default function AboutPage() {
  return (
    <div className="bg-[var(--page-bg)] min-h-screen">
      {/* Hero */}
      <section className="relative py-24 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_center,_rgba(13,148,136,0.08)_0%,_transparent_60%)]" />
        <div className="relative mx-auto max-w-3xl text-center">
          <p className="section-eyebrow">Our Mission</p>
          <h1 className="text-4xl font-black text-[var(--foreground)] md:text-5xl leading-tight mb-6">
            What is Let's Study?
          </h1>
          <p className="text-lg text-[var(--body-text)] leading-relaxed max-w-2xl mx-auto">
            A 24/7 study hub built on one idea:{" "}
            <strong className="text-[var(--foreground)]">you work better when others are working around you.</strong>{" "}
            No social features. No distractions.
            Just structured, silent deep work.
          </p>
        </div>
      </section>

      {/* Pillars */}
      <section className="px-4 pb-20">
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {PILLARS.map((p) => {
              const Icon = p.icon;
              return (
                <div key={p.title} className="card-hover p-6">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-2xl border ${p.color} mb-4`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-base font-black text-[var(--foreground)] mb-2">{p.title}</h3>
                  <p className="text-sm text-[var(--body-text)] leading-relaxed">{p.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Story */}
      <section className="px-4 pb-20">
        <div className="mx-auto max-w-3xl">
          <div className="card p-8 md:p-10">
            <p className="section-eyebrow mb-4">Our Story</p>
            <h2 className="text-2xl font-black text-[var(--foreground)] mb-6">Why we started this</h2>
            <div className="space-y-4 text-[var(--body-text)] leading-relaxed">
              <p>
                &ldquo;Just focus harder&rdquo; doesn&apos;t work. We tried it.
              </p>
              <p>
                Then we studied together on video — cameras on, phones away. That quiet accountability changed everything. Let&apos;s Study is that feeling, built into a product.
              </p>
              <p>
                Today it&apos;s a calm, rule-based space for UPSC aspirants, JEE/NEET students, and anyone who wants to finally sit down and do the work — alongside others doing the same.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 pb-24">
        <div className="mx-auto max-w-2xl text-center">
          <div className="card p-10 bg-gradient-to-br from-[var(--cream)] to-white border-[var(--cream-muted)]">
            <h2 className="text-2xl font-black text-[var(--foreground)] mb-3">Ready to join?</h2>
            <p className="text-[var(--body-text)] mb-6">
              Start your first session today — it&apos;s free.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/signup" className="btn-primary">
                Request Access →
              </Link>
              <Link href="/" className="btn-ghost">
                Back to Home
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
