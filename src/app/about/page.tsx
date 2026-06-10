import Link from "next/link";
import type { Metadata } from "next";
import { Users, Clock, Zap, Heart } from "lucide-react";

export const metadata: Metadata = {
  title: "About Let's Study — India's AI-Powered Collaborative Learning Platform",
  description: "Let's Study is an AI-powered EdTech platform delivering structured virtual study sessions, intelligent progress analytics, and peer accountability for UPSC, JEE, NEET, and working professionals. Built on scalable cloud infrastructure.",
  keywords: ["about lets study", "AI learning platform", "collaborative study platform", "EdTech India", "body doubling platform", "study accountability system", "cloud-native EdTech"],
  alternates: { canonical: "/about" },
  openGraph: {
    title: "About Let's Study — India's AI-Powered Collaborative Learning Platform",
    description: "AI-powered EdTech platform delivering structured virtual study sessions, intelligent progress analytics, and peer accountability — built on scalable cloud infrastructure.",
    url: "https://lstudy.in/about",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "About Let's Study — AI-Powered Learning Platform",
    description: "Structured virtual study sessions, AI-driven progress analytics, and peer accountability for India's most serious learners.",
  },
};

const PILLARS = [
  {
    icon: Users,
    title: "Peer Accountability Engine",
    desc: "Body doubling — the practice of working in the silent presence of others — is a peer-reviewed productivity mechanism. Our platform delivers this effect at scale, 24/7.",
    color: "text-[var(--accent)] bg-[var(--cream)] border-[var(--cream-muted)]",
  },
  {
    icon: Clock,
    title: "Adaptive Session Architecture",
    desc: "Structured 50-minute deep work blocks followed by 10-minute recovery intervals. Clinically validated to maximise cognitive retention and prevent burnout across extended study periods.",
    color: "text-blue-600 bg-blue-50 border-blue-100",
  },
  {
    icon: Zap,
    title: "AI-Powered Progress Tracking",
    desc: "Video presence, streak analytics, a gamified coin economy, and a live performance leaderboard. Every session generates data that the platform uses to reinforce productive behaviour.",
    color: "text-amber-600 bg-amber-50 border-amber-100",
  },
  {
    icon: Heart,
    title: "Integrated Wellness Support",
    desc: "Sustainable academic performance requires mental resilience. Private, confidential 1-on-1 wellness sessions with qualified professionals — available on demand through the platform.",
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
            India&apos;s Collaborative Learning Platform
          </h1>
          <p className="text-lg text-[var(--body-text)] leading-relaxed max-w-2xl mx-auto">
            Let&apos;s Study is{" "}
            <strong className="text-[var(--foreground)]">India&apos;s AI-powered collaborative learning platform for UPSC, JEE, NEET aspirants and working professionals</strong>
            {" "}— delivering structured peer study sessions with AI-driven progress tracking and real-time accountability,{" "}
            <em>unlike passive video lecture platforms or unstructured solo study.</em>
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
            <h2 className="text-2xl font-black text-[var(--foreground)] mb-6">How We Got Here</h2>
            <div className="space-y-4 text-[var(--body-text)] leading-relaxed">
              <p>
                Generic productivity advice fails serious learners. The tools that existed were either distracting social platforms or bare-bones video conferencing with no accountability layer.
              </p>
              <p>
                We validated the model first — studying together on video, cameras on, in structured blocks. The focus improvement was immediate and measurable. Let&apos;s Study is that validated mechanism, engineered into a scalable cloud-native platform.
              </p>
              <p>
                Today, the platform serves UPSC aspirants, JEE and NEET candidates, and working professionals — anyone pursuing high-performance learning outcomes who needs structure, accountability, and a community built around serious work.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Traction metrics */}
      <section className="px-4 pb-12">
        <div className="mx-auto max-w-3xl">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 rounded-2xl border p-6 text-center" style={{ borderColor: "var(--border)", background: "var(--page-bg)" }}>
            {[
              { value: "10,000+", label: "Learners on Platform" },
              { value: "30,000+", label: "Hours Studied" },
              { value: "800+", label: "Sessions Hosted" },
              { value: "20+", label: "Cities Across India" },
            ].map((m) => (
              <div key={m.label}>
                <p className="text-2xl font-black text-[var(--foreground)]">{m.value}</p>
                <p className="text-xs font-medium text-[var(--muted-text)] mt-0.5">{m.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 pb-24">
        <div className="mx-auto max-w-2xl text-center">
          <div className="card p-10 bg-gradient-to-br from-[var(--cream)] to-white border-[var(--cream-muted)]">
            <h2 className="text-2xl font-black text-[var(--foreground)] mb-3">Ready to start learning?</h2>
            <p className="text-[var(--body-text)] mb-6">
              Join 10,000+ learners already building their study discipline on the platform. Your first session is free.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/signup" className="btn-primary">
                Start Learning Free
              </Link>
              <Link href="/" className="btn-ghost">
                Back to Home
              </Link>
            </div>
            <p className="mt-5 text-sm text-[var(--muted-text)]">
              Questions?{" "}
              <a href="mailto:support@lstudy.in" className="font-semibold hover:underline" style={{ color: "var(--accent)" }}>
                support@lstudy.in
              </a>
              {" "}— We respond within 24 hours.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
