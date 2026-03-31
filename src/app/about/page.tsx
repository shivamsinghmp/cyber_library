import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About",
  description: "The Cyber Library is an always-on study space built around the idea of body doubling. Join structured, silent study sessions on Google Meet.",
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 pt-32 pb-8 md:pt-40 md:pb-12">
      <div className="mb-10">
        <h1 className="text-2xl font-semibold text-[var(--cream)] md:text-3xl">
          What is The Cyber Library?
        </h1>
        <p className="mt-2 text-sm text-[var(--cream-muted)] md:text-base">
          A 24/7 online study support service where students join structured, silent study sessions
          on Google Meet. Sessions are designed for exam preparation and deep work – with clear
          rules, timers and a distraction‑free environment.
        </p>
      </div>

      <section className="space-y-4 text-sm text-[var(--cream-muted)]">
        <p>
          The Cyber Library is an always-on study space built around the idea of{" "}
          <strong className="text-[var(--cream)]">body doubling</strong>: working in the presence of
          others so you actually show up and stay on task. You join a silent Google Meet where
          everyone has their camera on and mic muted. No social networking or public posts —
          just guided deep work, Pomodoro blocks, and optional lo-fi ambience.
        </p>
        <p>
          <strong className="text-[var(--cream)]">Body doubling</strong> means doing a task while
          someone else is there, even if they’re not helping. For many people — especially with
          ADHD, anxiety, or big goals — having others “in the room” makes it easier to start and
          keep going. The Cyber Library turns that into a structured online room: book a slot, join
          the Meet, and follow the same simple rules so the vibe stays focused.
        </p>
      </section>

      <section className="mt-10 rounded-2xl border border-white/10 bg-black/35 p-6 shadow-[0_14px_35px_rgba(0,0,0,0.65)]">
        <h2 className="text-lg font-semibold text-[var(--cream)]">Why we started this</h2>
        <p className="mt-3 text-sm text-[var(--cream-muted)]">
          We were a few students and freelancers who couldn’t focus alone. “Just focus harder”
          didn’t work. We tried studying together on video — cameras on, phones away — and it
          changed everything. That quiet accountability became the missing piece. We built
          The Cyber Library so anyone with an internet connection could get the same thing: a
          calm, rule-based space where you show up, declare your task, and work alongside others
          who are doing the same.
        </p>
        <p className="mt-3 text-sm text-[var(--cream-muted)]">
          Today it’s a place for UPSC aspirants, JEE/NEET students, remote workers, and anyone
          who wants a simple structure to finally sit down and do the work.
        </p>
      </section>

      <p className="mt-8 text-center text-sm text-[var(--cream-muted)]">
        <Link href="/" className="text-[var(--accent)] hover:underline">
          ← Back to Home
        </Link>
      </p>
    </div>
  );
}
