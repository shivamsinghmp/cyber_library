"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";

const TESTIMONIALS = [
  {
    name: "Aman, UPSC Aspirant",
    quote:
      "Pehle main 20 minute bhi focus nahi kar pata tha. Virtual Library ke body doubling sessions ne mera poora routine change kar diya.",
  },
  {
    name: "Khushi, JEE Student",
    quote:
      "Roz shaam ka slot join karti hoon. Lo-fi music, timers aur cameras on hone ka pressure – sab mil ke bohot madad karta hai.",
  },
  {
    name: "Rohan, Working Professional",
    quote:
      "Side projects ke liye time nahi milta tha. Ab weekend Night Shift join karta hoon aur 3–4 ghante deep work ho jata hai.",
  },
];

const DEFAULT_HEADLINE = "Transform Your Study Habits with Live Body Doubling.";

export default function HomePage() {
  const { data: session } = useSession();
  const [liveCount, setLiveCount] = useState(42);
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const [headline, setHeadline] = useState(DEFAULT_HEADLINE);
  const isStudent =
    session?.user && ((session.user as { role?: string }).role ?? "STUDENT") === "STUDENT";

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
    <div className="bg-[var(--background)] px-4 pb-12 pt-4 md:pb-16 md:pt-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-14 pt-6 md:flex-row md:items-center">
        {/* Hero left */}
        <div className="max-w-xl space-y-6">
          <p className="inline-flex items-center gap-2 rounded-full border border-[var(--accent)]/50 bg-black/30 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.2em] text-[var(--cream)]/80">
            <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-400">
              <span className="m-auto h-1 w-1 rounded-full bg-emerald-100" />
            </span>
            Live focus hub · 24/7
          </p>

          <h1 className="text-balance text-3xl font-semibold tracking-tight text-[var(--cream)] sm:text-4xl md:text-5xl">
            {headline}
          </h1>

          <p className="max-w-xl text-sm leading-relaxed text-[var(--cream-muted)] sm:text-base">
            Virtual Library ek 24/7 silent online study room hai jahan log Google Meet par saath
            baith kar kaam karte hain. Cameras on, mics muted – bas deep work.
          </p>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-full bg-[var(--accent)] px-6 py-2.5 text-sm font-semibold text-[var(--ink)] shadow-md shadow-black/40 transition hover:bg-[var(--accent-hover)] hover:-translate-y-0.5"
            >
              Join Now
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center justify-center rounded-full border border-white/10 px-5 py-2 text-sm font-medium text-[var(--cream)]/85 transition hover:bg-white/5"
            >
              Create free account
            </Link>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-[var(--cream-muted)]">
            <div className="inline-flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/15 text-[11px] text-emerald-200">
                ●
              </span>
              <span>
                <strong className="font-semibold text-[var(--cream)]">Body doubling</strong> for
                real-time accountability
              </span>
            </div>
            <div className="inline-flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--accent)]/25 text-[11px] text-[var(--cream)]">
                ⏱
              </span>
              <span>Pomodoro blocks · Lo-fi ambience</span>
            </div>
          </div>
        </div>

        {/* Hero right card */}
        <div className="w-full md:max-w-md">
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-[0_24px_60px_rgba(0,0,0,0.7)]">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.12),_transparent_55%),radial-gradient(circle_at_bottom,_rgba(0,0,0,0.75),_transparent_60%)]" />
            <div className="relative flex h-full flex-col justify-between gap-6 p-6">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--cream-muted)]">
                  Live status
                </p>
                <p className="mt-2 text-lg font-semibold text-[var(--cream)]">
                  {liveCount} Students are currently in the zone.
                </p>
                <p className="mt-1 text-xs text-[var(--cream-muted)]">
                  Har waqt kuch na kuch log focus mode mein hote hain – tum bhi join ho jao.
                </p>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between rounded-2xl bg-black/55 px-4 py-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--cream-muted)]">
                      Next deep focus block
                    </p>
                    <p className="text-sm font-medium text-[var(--cream)]">
                      Starts every 30 minutes
                    </p>
                  </div>
                  <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-[11px] font-semibold text-emerald-200">
                    Join anytime
                  </span>
                </div>

                <div className="grid gap-2 text-[11px] text-[var(--cream-muted)] sm:grid-cols-3">
                  <div className="rounded-2xl bg-black/55 p-3">
                    <p className="mb-1 text-xs font-semibold text-[var(--cream)]">
                      Body Doubling
                    </p>
                    <p>Show up with others so you actually start.</p>
                  </div>
                  <div className="rounded-2xl bg-black/55 p-3">
                    <p className="mb-1 text-xs font-semibold text-[var(--cream)]">
                      Pomodoro Blocks
                    </p>
                    <p>Timed sprints with silent breaks to reset.</p>
                  </div>
                  <div className="rounded-2xl bg-black/55 p-3">
                    <p className="mb-1 text-xs font-semibold text-[var(--cream)]">
                      Lo-fi Ambience
                    </p>
                    <p>Soft visuals &amp; soundscapes that fade into focus.</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[var(--cream-muted)]">
                <span>Built for students, freelancers &amp; self‑learners.</span>
                <span className="rounded-full bg-white/10 px-3 py-1">
                  No small talk. Just deep work.
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* How it works section */}
      <section className="mx-auto mt-16 max-w-6xl space-y-8">
        <div className="max-w-2xl">
          <h2 className="text-2xl font-semibold text-[var(--cream)] md:text-3xl">
            How Virtual Library works
          </h2>
          <p className="mt-2 text-sm text-[var(--cream-muted)] md:text-base">
            In three simple steps, you go from procrastinating alone to showing up with a focused
            crew that&apos;s in it with you.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {[
            {
              step: "Step 1",
              title: "Book your slot",
              desc: "Pick a Morning, Afternoon, or Night shift that matches your energy and schedule.",
            },
            {
              step: "Step 2",
              title: "Join the Meet",
              desc: "Enter the Google Meet link, turn your camera on, mute your mic, and declare your focus.",
            },
            {
              step: "Step 3",
              title: "Study in the zone",
              desc: "Follow the Pomodoro rhythm, stay on camera, and let the group energy keep you anchored.",
            },
          ].map((item) => (
            <div
              key={item.step}
              className="rounded-3xl border border-white/10 bg-black/40 p-5 shadow-[0_18px_45px_rgba(0,0,0,0.65)]"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--cream-muted)]">
                {item.step}
              </p>
              <p className="mt-2 text-base font-semibold text-[var(--cream)]">
                {item.title}
              </p>
              <p className="mt-2 text-sm text-[var(--cream-muted)]">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Slots CTA – only for logged-in students */}
      {isStudent && (
        <section
          id="slots"
          className="mx-auto mt-16 max-w-6xl rounded-3xl border border-white/10 bg-black/35 p-6 shadow-[0_18px_45px_rgba(0,0,0,0.65)] md:p-8"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-[var(--cream)] md:text-2xl">
                Book your study slot
              </h2>
              <p className="mt-1 text-sm text-[var(--cream-muted)]">
                Pick a slot that fits your schedule and join the focus room.
              </p>
            </div>
            <Link
              href="/study-room"
              className="inline-flex shrink-0 items-center justify-center rounded-full bg-[var(--accent)] px-6 py-2.5 text-sm font-semibold text-[var(--ink)] shadow-md transition hover:bg-[var(--accent-hover)]"
            >
              View & book slots
            </Link>
          </div>
        </section>
      )}

      {/* Features section */}
      <section
        id="features"
        className="mx-auto mt-16 max-w-6xl space-y-6 rounded-3xl border border-white/10 bg-black/30 p-5 md:p-7"
      >
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-[var(--cream)] md:text-3xl">
              Built for deep work
            </h2>
            <p className="mt-1 text-sm text-[var(--cream-muted)] md:text-base">
              Jo bhi tum padh rahe ho – UPSC, JEE, NEET ya kuch bhi aur – environment sabse zyada
              matter karta hai.
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-4">
          <FeatureCard
            title="Body Doubling"
            description="Dozens of log camera on rakh ke chupchap kaam kar rahe hote hain – tum bhi unke saath."
            icon="👥"
          />
          <FeatureCard
            title="Pomodoro Timers"
            description="25/50 minute ke focus blocks + short breaks ka structure jo tumhe track par rakhta hai."
            icon="⏱"
          />
          <FeatureCard
            title="Lo-fi Background"
            description="Soft visuals aur lo-fi ambience jo screen pe reh ke bhi dimaag ko shaant rakhta hai."
            icon="🎧"
          />
          <FeatureCard
            title="Distraction-free"
            description="No chatting, no timepass – sirf kaam. Rules clear hain aur sab follow karte hain."
            icon="🎯"
          />
        </div>
      </section>

      {/* Rules section */}
      <section
        id="rules"
        className="mx-auto mt-16 max-w-6xl space-y-6 rounded-3xl border border-white/10 bg-black/35 p-5 md:p-7"
      >
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-[var(--cream)] md:text-3xl">
              Simple rules, strong vibe
            </h2>
            <p className="mt-1 text-sm text-[var(--cream-muted)] md:text-base">
              Room ko real library ki tarah treat karte hain – jitna simple, utna hi effective.
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-4">
          <RuleCard
            icon="🔇"
            title="Mic mute rakho"
            description="Background noise sab ka focus tod deta hai. Meet join karte hi mic permanently mute."
          />
          <RuleCard
            icon="📷"
            title="Camera preferred"
            description="Camera on rehne se body doubling ka effect aata hai – sab ek doosre ko dekh kar kaam karte hain."
          />
          <RuleCard
            icon="💬"
            title="No chatting"
            description="Chat sirf zaroori announcements ke liye. No self-promotion, no random links."
          />
          <RuleCard
            icon="🎯"
            title="Deep work only"
            description="Session shuru hone se pehle apna task decide karo aur block ke end tak usi pe tikke raho."
          />
        </div>
      </section>

      {/* Testimonials slider */}
      <section
        id="testimonials"
        className="mx-auto mt-16 max-w-6xl space-y-6 rounded-3xl border border-white/10 bg-black/30 p-5 md:p-7"
      >
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-[var(--cream)] md:text-3xl">
              Students ka experience
            </h2>
            <p className="mt-1 text-sm text-[var(--cream-muted)] md:text-base">
              Thoda sa external accountability, bohot saara progress.
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex-1 space-y-3">
            <p className="text-sm text-[var(--cream-muted)]">
              “{TESTIMONIALS[activeTestimonial].quote}”
            </p>
            <p className="text-xs font-semibold text-[var(--cream)]">
              — {TESTIMONIALS[activeTestimonial].name}
            </p>
          </div>

          <div className="mt-4 flex items-center gap-3 md:mt-0">
            <button
              type="button"
              onClick={() =>
                setActiveTestimonial((prev) =>
                  prev === 0 ? TESTIMONIALS.length - 1 : prev - 1,
                )
              }
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-[var(--cream)] hover:bg-white/5"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() =>
                setActiveTestimonial((prev) =>
                  prev === TESTIMONIALS.length - 1 ? 0 : prev + 1,
                )
              }
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-[var(--cream)] hover:bg-white/5"
            >
              ›
            </button>
          </div>
        </div>

        <div className="mt-2 flex gap-2">
          {TESTIMONIALS.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setActiveTestimonial(idx)}
              className={`h-1.5 rounded-full transition ${
                idx === activeTestimonial ? "w-6 bg-[var(--accent)]" : "w-2 bg-white/20"
              }`}
              aria-label={`Show testimonial ${idx + 1}`}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

type FeatureCardProps = {
  title: string;
  description: string;
  icon: string;
};

function FeatureCard({ title, description, icon }: FeatureCardProps) {
  return (
    <div className="flex flex-col rounded-2xl border border-white/10 bg-black/40 p-4 shadow-[0_14px_35px_rgba(0,0,0,0.65)] transition hover:-translate-y-1 hover:border-[var(--accent)]/60">
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent)]/20 text-base">
        <span aria-hidden="true">{icon}</span>
      </div>
      <h3 className="text-sm font-semibold text-[var(--cream)]">{title}</h3>
      <p className="mt-2 text-xs text-[var(--cream-muted)]">{description}</p>
    </div>
  );
}

type RuleCardProps = {
  icon: string;
  title: string;
  description: string;
};

function RuleCard({ icon, title, description }: RuleCardProps) {
  return (
    <div className="flex flex-col rounded-2xl border border-white/10 bg-black/40 p-4 shadow-[0_14px_35px_rgba(0,0,0,0.65)]">
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-black/60 text-base">
        <span aria-hidden="true">{icon}</span>
      </div>
      <h3 className="text-sm font-semibold text-[var(--cream)]">{title}</h3>
      <p className="mt-2 text-xs text-[var(--cream-muted)]">{description}</p>
    </div>
  );
}
