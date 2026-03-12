"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Users, Clock, Focus, Sparkles } from "lucide-react";

type FieldDef = {
  id: string;
  key: string;
  label: string;
  type: "text" | "number" | "email" | "textarea" | "select";
  required: boolean;
  options: string[] | null;
};

function JoinPageContent() {
  const searchParams = useSearchParams();
  const [fields, setFields] = useState<FieldDef[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [whatsappLink, setWhatsappLink] = useState<string | null>(null);
  const [liveCount, setLiveCount] = useState(24);

  useEffect(() => {
    async function load() {
      try {
        const [fieldsRes, supportRes] = await Promise.all([
          fetch("/api/lead-form/fields"),
          fetch("/api/support-info"),
        ]);
        const defs: FieldDef[] = fieldsRes.ok ? await fieldsRes.json() : [];
        setFields(defs);
        const support = supportRes.ok ? await supportRes.json() : {};
        if (support.whatsappGroupLink) {
          setWhatsappLink(support.whatsappGroupLink);
        }
      } catch {
        // ignore, handled by UI
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Light "alive" counter for students in focus
  useEffect(() => {
    const id = setInterval(() => {
      setLiveCount((current) => {
        const delta = Math.random() > 0.5 ? 1 : -1;
        const next = current + delta;
        if (next < 10 || next > 60) return 24;
        return next;
      });
    }, 5000);
    return () => clearInterval(id);
  }, []);

  function nextBlockLabel() {
    const now = new Date();
    const minutes = now.getMinutes();
    const minutesToNextBlock = 30 - (minutes % 30 || 30);
    if (minutesToNextBlock === 0 || minutesToNextBlock === 30) return "Starting now";
    if (minutesToNextBlock <= 5) return "Starting in a few minutes";
    return `Starts in ${minutesToNextBlock} min`;
  }

  function updateValue(key: string, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const source = searchParams?.toString() || undefined;
      const res = await fetch("/api/lead-form/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields: values, source }),
      });
      if (!res.ok) {
        setError("Could not submit your details. Please try again.");
        setSubmitting(false);
        return;
      }
      if (whatsappLink) {
        window.location.href = whatsappLink;
      } else {
        setError("WhatsApp group link is not configured. Please contact support.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    }
    setSubmitting(false);
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 md:py-12">
      <div className="grid gap-8 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] md:items-start">
        {/* Left: marketing content */}
        <section className="space-y-6">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-[var(--accent)]/50 bg-black/30 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.2em] text-[var(--cream)]/80">
              <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-400">
                <span className="m-auto h-1 w-1 rounded-full bg-emerald-100" />
              </span>
              Digital Study Library · India
            </p>
            <h1 className="mt-3 text-balance text-2xl font-semibold tracking-tight text-[var(--cream)] sm:text-3xl md:text-4xl">
              Join The Cyber Library&apos;s Virtual Study Room
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-[var(--cream-muted)] sm:text-base">
              Virtual Library is a focused online study space for serious learners preparing for exams
              like UPSC, JEE, NEET or college entrances. No noise, no random chatting — just structured
              body doubling, Pomodoro blocks and a quiet camera-on environment where everyone is here
              to study.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-black/30 p-3">
              <div className="mt-0.5 rounded-full bg-emerald-500/15 p-2 text-emerald-300">
                <Users className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--cream-muted)]">
                  Live focus
                </p>
                <p className="mt-1 text-sm font-semibold text-[var(--cream)]">
                  {liveCount} students are currently in the zone
                </p>
                <p className="mt-1 text-xs text-[var(--cream-muted)]">
                  You&apos;ll join a room where cameras are on, mics are muted and everyone is working on
                  their own syllabus.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-black/30 p-3">
              <div className="mt-0.5 rounded-full bg-[var(--accent)]/20 p-2 text-[var(--accent)]">
                <Clock className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--cream-muted)]">
                  Next deep focus block
                </p>
                <p className="mt-1 text-sm font-semibold text-[var(--cream)]">
                  {nextBlockLabel()}
                </p>
                <p className="mt-1 text-xs text-[var(--cream-muted)]">
                  Sessions follow simple 25–30 minute focus sprints with short breaks, so you don&apos;t
                  overthink — you just show up and start.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
              <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold text-emerald-300">
                <Focus className="h-3 w-3" />
                <span>Body Doubling</span>
              </div>
              <p className="text-xs text-[var(--cream-muted)]">
                Study on camera with others so you actually sit down and complete the chapters you keep
                postponing.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
              <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-[var(--accent)]/10 px-2 py-1 text-[10px] font-semibold text-[var(--accent)]">
                <Sparkles className="h-3 w-3" />
                <span>No‑nonsense environment</span>
              </div>
              <p className="text-xs text-[var(--cream-muted)]">
                Strict no‑chat, no self‑promotion and no distraction rules. Treat it like a real library,
                just online.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
              <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/10 px-2 py-1 text-[10px] font-semibold text-[var(--cream)]">
                <span>Built for Indian exams</span>
              </div>
              <p className="text-xs text-[var(--cream-muted)]">
                Whether you&apos;re preparing for UPSC, JEE, NEET, college exams or side projects — the
                environment is designed for long, serious study hours.
              </p>
            </div>
          </div>
        </section>

        {/* Right: dynamic form */}
        <section className="rounded-2xl border border-white/10 bg-black/25 p-5 md:p-6">
          <h2 className="mb-2 text-base font-semibold text-[var(--cream)] md:text-lg">
            Join WhatsApp study group
          </h2>
          <p className="mb-4 text-xs text-[var(--cream-muted)]">
            Fill these details and we&apos;ll save your information as a lead and then send you to the
            official Virtual Library WhatsApp group.
          </p>
          {loading ? (
            <p className="text-sm text-[var(--cream-muted)]">Loading form…</p>
          ) : fields.length === 0 ? (
            <p className="text-sm text-[var(--cream-muted)]">
              Form is not configured yet. Please contact the admin.
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              {fields.map((f) => {
                const val = values[f.key] ?? "";
                const commonProps = {
                  id: f.key,
                  value: val,
                  onChange: (
                    e:
                      | React.ChangeEvent<HTMLInputElement>
                      | React.ChangeEvent<HTMLTextAreaElement>
                      | React.ChangeEvent<HTMLSelectElement>
                  ) => updateValue(f.key, e.target.value),
                  required: f.required,
                };
                return (
                  <div key={f.id}>
                    <label
                      htmlFor={f.key}
                      className="mb-1 block text-xs font-medium text-[var(--cream-muted)]"
                    >
                      {f.label}
                      {f.required && <span className="ml-0.5 text-red-400">*</span>}
                    </label>
                    {f.type === "textarea" ? (
                      <textarea
                        {...commonProps}
                        rows={3}
                        className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-[var(--cream)] placeholder:text-[var(--cream-muted)]/60 focus:border-[var(--accent)]/70 focus:outline-none resize-none"
                      />
                    ) : f.type === "select" ? (
                      <select
                        {...commonProps}
                        className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-[var(--cream)] focus:border-[var(--accent)]/70 focus:outline-none"
                      >
                        <option value="">Select…</option>
                        {(f.options ?? []).map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        {...commonProps}
                        type={f.type === "number" ? "number" : f.type === "email" ? "email" : "text"}
                        className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-[var(--cream)] placeholder:text-[var(--cream-muted)]/60 focus:border-[var(--accent)]/70 focus:outline-none"
                      />
                    )}
                  </div>
                );
              })}
              {error && <p className="text-xs text-red-400">{error}</p>}
              <button
                type="submit"
                disabled={submitting}
                className="mt-1 inline-flex w-full items-center justify-center rounded-xl bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-[var(--ink)] disabled:opacity-70"
              >
                {submitting ? "Submitting…" : "Join now & open WhatsApp"}
              </button>
              <p className="mt-2 text-[10px] text-[var(--cream-muted)]">
                By joining, you agree to follow the Virtual Library rules and code of conduct.
              </p>
            </form>
          )}
        </section>
      </div>

      <p className="mt-8 text-center text-sm text-[var(--cream-muted)]">
        <Link href="/" className="text-[var(--accent)] hover:underline">
          ← Back to Home
        </Link>
      </p>
    </div>
  );
}

export default function JoinPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-5xl px-4 py-8 md:py-12">
          <p className="text-sm text-[var(--cream-muted)]">Loading…</p>
        </div>
      }
    >
      <JoinPageContent />
    </Suspense>
  );
}

