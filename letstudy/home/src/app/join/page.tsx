"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Users, Clock, BookOpen, CheckCircle2, Star,
  ArrowRight, Zap, Shield, Trophy,
} from "lucide-react";

type FieldDef = {
  id: string;
  key: string;
  label: string;
  type: "text" | "number" | "email" | "textarea" | "select";
  required: boolean;
  options: string[] | null;
};

const FEATURES = [
  {
    icon: Users,
    color: "bg-indigo-100 text-indigo-600",
    title: "Body Doubling",
    desc: "Camera-on study room jahan sabhi apna syllabus padh rahe hain — ek doosre ki presence se focus banta hai.",
  },
  {
    icon: Clock,
    color: "bg-emerald-100 text-emerald-600",
    title: "Pomodoro Blocks",
    desc: "25-minute focus sprints, short breaks. Overthink mat karo — bas aao aur shuru karo.",
  },
  {
    icon: Shield,
    color: "bg-amber-100 text-amber-600",
    title: "Zero Distraction",
    desc: "No chat, no random bakwaas. Strict library rules — real padhai ka environment.",
  },
  {
    icon: Trophy,
    color: "bg-purple-100 text-purple-600",
    title: "Indian Exams Ready",
    desc: "UPSC, JEE, NEET, CA, college exams — serious padhai ke liye banaya gaya.",
  },
];

const TESTIMONIALS = [
  { name: "Priya S.", exam: "UPSC Aspirant", text: "Pehle ghar pe focus nahi hota tha. Yahan camera on karte hi mind set ho jaata hai." },
  { name: "Rahul K.", exam: "JEE 2025", text: "3 months mein mere study hours double ho gaye. Best decision tha join karna." },
  { name: "Ananya M.", exam: "CA Final", text: "Library jaane ki zaroorat nahi. Yahan sabhi serious students hain — energy alag hi hoti hai." },
];

function JoinPageContent() {
  const searchParams = useSearchParams();
  const [fields, setFields] = useState<FieldDef[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [whatsappLink, setWhatsappLink] = useState<string | null>(null);
  const [liveCount, setLiveCount] = useState(27);

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
        if (support.whatsappGroupLink) setWhatsappLink(support.whatsappGroupLink);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Influencer referral tracking
  useEffect(() => {
    const ref = searchParams?.get("ref");
    if (!ref) return;

    let visitorId = document.cookie.match(/inf_vid=([^;]+)/)?.[1];
    if (!visitorId) {
      visitorId = Math.random().toString(36).slice(2) + Date.now().toString(36);
      document.cookie = `inf_vid=${visitorId}; max-age=${60 * 60 * 24 * 30}; path=/; SameSite=Lax`;
    }
    document.cookie = `inf_ref=${ref}; max-age=${60 * 60 * 24 * 30}; path=/; SameSite=Lax`;
    localStorage.setItem("inf_ref", ref);
    localStorage.setItem("inf_ts", Date.now().toString());

    fetch("/api/influencer/track-click", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ referralCode: ref, visitorId }),
    }).catch(() => {});
  }, [searchParams]);

  // Animated live counter
  useEffect(() => {
    const id = setInterval(() => {
      setLiveCount((c) => {
        const next = c + (Math.random() > 0.5 ? 1 : -1);
        return next < 15 || next > 65 ? 27 : next;
      });
    }, 4000);
    return () => clearInterval(id);
  }, []);

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
        setError("Details submit nahi hue. Dobara try karo.");
        setSubmitting(false);
        return;
      }
      if (whatsappLink) {
        window.location.href = whatsappLink;
      } else {
        setError("WhatsApp link abhi set nahi hai. Admin se contact karo.");
      }
    } catch {
      setError("Kuch galat hua. Dobara try karo.");
    }
    setSubmitting(false);
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-950 via-indigo-900 to-indigo-800">
        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "40px 40px",
          }}
        />

        <div className="relative mx-auto max-w-6xl px-4 py-16 md:py-24">
          {/* Live badge */}
          <div className="mb-6 flex items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/20 border border-emerald-400/30 px-4 py-1.5 text-sm font-semibold text-emerald-300">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              {liveCount} students abhi study kar rahe hain
            </span>
          </div>

          <div className="grid gap-12 md:grid-cols-2 md:items-center">
            {/* Left: Content */}
            <div>
              <h1 className="text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl md:text-5xl">
                India&apos;s #{1} Virtual{" "}
                <span className="text-indigo-300">Study Room</span>
              </h1>
              <p className="mt-4 text-lg leading-relaxed text-indigo-200">
                Ghar pe akele padhna mushkil hai? Let&apos;s Study mein camera-on karo aur serious
                students ke saath focus karo — UPSC, JEE, NEET, CA, ya koi bhi exam.
              </p>

              <ul className="mt-6 space-y-3">
                {[
                  "Free mein join karo — no credit card",
                  "Pomodoro technique se structured padhai",
                  "24/7 active study community",
                  "Distraction-free, library jaisi environment",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-indigo-100">
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              {/* Social proof */}
              <div className="mt-8 flex items-center gap-3">
                <div className="flex -space-x-2">
                  {["P", "R", "A", "S", "K"].map((l, i) => (
                    <div
                      key={i}
                      className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-indigo-800 text-xs font-bold text-white"
                      style={{ background: ["#6366f1","#8b5cf6","#06b6d4","#10b981","#f59e0b"][i] }}
                    >
                      {l}
                    </div>
                  ))}
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    {[1,2,3,4,5].map(i => <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />)}
                  </div>
                  <p className="text-xs text-indigo-300">10,000+ students already joined</p>
                </div>
              </div>
            </div>

            {/* Right: Form */}
            <div className="rounded-2xl bg-white p-6 shadow-2xl">
              <div className="mb-5">
                <div className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                  <Zap className="h-3 w-3" />
                  WhatsApp Group Join Karo — Free
                </div>
                <h2 className="mt-2 text-xl font-bold text-gray-900">
                  Abhi Join Karo
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Details bharo aur seedha WhatsApp study group mein aa jao.
                </p>
              </div>

              {loading ? (
                <div className="space-y-3">
                  {[1,2,3].map(i => (
                    <div key={i} className="h-10 rounded-xl bg-gray-100 animate-pulse" />
                  ))}
                </div>
              ) : fields.length === 0 ? (
                <p className="text-sm text-gray-500">
                  Form abhi configure nahi hua hai। Admin se contact karo.
                </p>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {fields.map((f) => {
                    const val = values[f.key] ?? "";
                    const inputClass =
                      "w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition";
                    return (
                      <div key={f.id}>
                        <label htmlFor={f.key} className="mb-1.5 block text-xs font-semibold text-gray-700">
                          {f.label}
                          {f.required && <span className="ml-0.5 text-red-500">*</span>}
                        </label>
                        {f.type === "textarea" ? (
                          <textarea
                            id={f.key}
                            value={val}
                            onChange={(e) => updateValue(f.key, e.target.value)}
                            required={f.required}
                            rows={3}
                            className={inputClass + " resize-none"}
                          />
                        ) : f.type === "select" ? (
                          <select
                            id={f.key}
                            value={val}
                            onChange={(e) => updateValue(f.key, e.target.value)}
                            required={f.required}
                            className={inputClass}
                          >
                            <option value="">Select karo…</option>
                            {(f.options ?? []).map((opt) => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            id={f.key}
                            type={f.type === "number" ? "number" : f.type === "email" ? "email" : "text"}
                            value={val}
                            onChange={(e) => updateValue(f.key, e.target.value)}
                            required={f.required}
                            className={inputClass}
                          />
                        )}
                      </div>
                    );
                  })}

                  {error && (
                    <p className="rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-600">
                      {error}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="group flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-indigo-700 active:scale-[0.98] disabled:opacity-60"
                  >
                    {submitting ? "Joining…" : (
                      <>
                        WhatsApp Group Join Karo
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </>
                    )}
                  </button>

                  <p className="text-center text-[10px] text-gray-400">
                    Join karke aap Let&apos;s Study ke rules aur code of conduct se agree karte ho.
                    No spam, kabhi bhi leave kar sakte ho.
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="mx-auto max-w-6xl px-4 py-16">
        <div className="mb-10 text-center">
          <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">
            Kyun Join Karein Let&apos;s Study?
          </h2>
          <p className="mt-2 text-gray-500">
            Sirf ek aur study group nahi — yeh ek focused study ecosystem hai
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm hover:shadow-md transition"
            >
              <div className={`mb-3 inline-flex rounded-xl p-2.5 ${f.color}`}>
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mb-1.5 font-semibold text-gray-900">{f.title}</h3>
              <p className="text-sm leading-relaxed text-gray-500">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Testimonials */}
      <div className="bg-gray-50 py-16">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mb-10 text-center">
            <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">
              Students Kya Kehte Hain
            </h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-3">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
                <div className="flex items-center gap-1 mb-3">
                  {[1,2,3,4,5].map(i => <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />)}
                </div>
                <p className="text-gray-700 text-sm leading-relaxed mb-4">&ldquo;{t.text}&rdquo;</p>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{t.name}</p>
                  <p className="text-xs text-gray-400">{t.exam}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Final CTA */}
      <div className="bg-indigo-600 py-14">
        <div className="mx-auto max-w-2xl px-4 text-center">
          <BookOpen className="mx-auto mb-4 h-10 w-10 text-indigo-200" />
          <h2 className="text-2xl font-bold text-white sm:text-3xl">
            Aaj se shuru karo — bilkul free
          </h2>
          <p className="mt-3 text-indigo-200">
            Hazaron students pehle se pad rahe hain. Ek click mein unke saath aa jao.
          </p>
          <a
            href="#"
            onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); }}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-7 py-3.5 text-sm font-bold text-indigo-700 hover:bg-indigo-50 transition"
          >
            Join Karo — Free Hai
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-100 py-6 text-center">
        <Link href="/" className="text-sm text-indigo-600 hover:underline">
          ← Let&apos;s Study Home
        </Link>
      </div>
    </div>
  );
}

export default function JoinPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-white">
          <div className="text-center">
            <div className="mx-auto mb-3 h-8 w-8 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
            <p className="text-sm text-gray-500">Loading…</p>
          </div>
        </div>
      }
    >
      <JoinPageContent />
    </Suspense>
  );
}
