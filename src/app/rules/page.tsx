import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Code of Conduct & Rules",
  description: "The Cyber Library code of conduct. Maintain silence, keep cameras on, and stay focused during our online body doubling sessions.",
};

const RULES = [
  {
    icon: "🔇",
    title: "Mute Mic",
    description:
      "Keep your microphone muted at all times unless the host asks you to speak. Background noise breaks everyone’s focus.",
  },
  {
    icon: "📷",
    title: "Camera Recommended",
    description:
      "We encourage cameras on so that body doubling works. Being visible keeps you and others accountable.",
  },
  {
    icon: "🚫",
    title: "No Self-Promotion",
    description:
      "This is a study-first space. No pitching services, products, or social links in chat or on screen.",
  },
  {
    icon: "🎯",
    title: "Stay Focused",
    description:
      "Arrive with a clear task, stay for the full block, and save messaging and notifications for breaks.",
  },
];

export default function RulesPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 pt-32 pb-8 md:pt-40 md:pb-12">
      <div className="mb-10">
        <h1 className="text-2xl font-semibold text-[var(--cream)] md:text-3xl">
          Code of Conduct
        </h1>
        <p className="mt-2 text-sm text-[var(--cream-muted)] md:text-base">
          The Cyber Library works when everyone treats the room like a real library: quiet, respectful, and focused.
        </p>
      </div>

      <div className="space-y-5">
        {RULES.map((rule) => (
          <div
            key={rule.title}
            className="flex gap-4 rounded-2xl border border-white/10 bg-black/35 p-5 shadow-[0_14px_35px_rgba(0,0,0,0.65)]"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-black/50 text-2xl">
              {rule.icon}
            </div>
            <div>
              <h2 className="text-base font-semibold text-[var(--cream)]">
                {rule.title}
              </h2>
              <p className="mt-1 text-sm text-[var(--cream-muted)]">
                {rule.description}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-10 rounded-2xl border border-white/10 bg-black/30 p-5 text-sm text-[var(--cream-muted)]">
        <h2 className="mb-2 font-semibold text-[var(--cream)]">Safety & respect</h2>
        <p>
          We have zero tolerance for harassment or disruptive behaviour. Hosts may remove
          participants who break these rules so the room stays safe and focused.
        </p>
      </div>

      <p className="mt-8 text-center text-sm text-[var(--cream-muted)]">
        <Link href="/" className="text-[var(--accent)] hover:underline">
          ← Back to Home
        </Link>
      </p>
    </div>
  );
}
