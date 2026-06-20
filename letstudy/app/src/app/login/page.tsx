"use client";

import { useState, Suspense, useEffect, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { signIn, signOut, getSession } from "next-auth/react";
import Image from "next/image";
import { Mail, Lock, Loader2, Eye, EyeOff } from "lucide-react";

// Student portal only — admin and staff log in on their own subdomains
// (portal.lstudy.in, staff.lstudy.in), not here.
const LOGIN_AS = "STUDENT";

const schema = z.object({
  email:    z.string().email("Please enter a valid email"),
  password: z.string().min(1, "Please enter your password"),
});
type FormData = z.infer<typeof schema>;

function LoginForm() {
  const searchParams = useSearchParams();
  const registered   = searchParams.get("registered") === "1";
  const verified     = searchParams.get("verified") === "1";
  const callbackUrl  = searchParams.get("callbackUrl");

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [logoUrl, setLogoUrl]         = useState<string | null>(null);
  const [siteTitle, setSiteTitle]     = useState("Let's Study");
  const redirecting = useRef(false);

  // If already logged in with a STUDENT session, redirect to the dashboard.
  // A session left over from a DIFFERENT app (e.g. ADMIN session bleeding
  // across localhost ports in dev) is signed out instead of being bounced
  // to /dashboard, which would just redirect back here.
  useEffect(() => {
    getSession().then(session => {
      if (!session?.user || redirecting.current) return;
      redirecting.current = true;
      const role = (session.user as { role?: string }).role;
      if (role !== "STUDENT") {
        signOut({ redirect: false });
        return;
      }
      const isSafe = callbackUrl?.startsWith("/") && !callbackUrl.startsWith("//");
      window.location.href = isSafe ? callbackUrl! : "/dashboard";
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetch("/api/site-branding")
      .then(r => r.ok ? r.json() : {})
      .then((d: { logoUrl?: string | null; title?: string | null }) => {
        if (d.logoUrl) setLogoUrl(d.logoUrl);
        if (d.title)   setSiteTitle(d.title);
      }).catch(() => {});
  }, []);

  const logoSrc      = logoUrl?.trim() || "/favicon.svg";
  const isExternalLogo = logoSrc.startsWith("http");

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(data: FormData) {
    setSubmitError(null);
    setUnverifiedEmail(null);
    try {
      const result = await signIn("credentials", {
        email: data.email, password: data.password, loginAsRole: LOGIN_AS, redirect: false,
      });
      if (result?.error) {
        try {
          const statusRes = await fetch(`/api/auth/check-email-status?email=${encodeURIComponent(data.email)}`);
          const status = await statusRes.json();
          if (status.exists && !status.verified) {
            setUnverifiedEmail(data.email);
            return;
          }
        } catch {}
        setSubmitError("Incorrect email or password. Please try again.");
        return;
      }
      if (result?.ok) {
        try { await fetch("/api/auth/record-login", { method: "POST" }); } catch {}
        // Honour the callbackUrl set by NextAuth when it bounced the user to login,
        // but only for safe relative paths (prevent open-redirect).
        const isSafe = callbackUrl?.startsWith("/") && !callbackUrl.startsWith("//");
        window.location.href = isSafe ? callbackUrl! : "/dashboard";
        return;
      }
      setSubmitError("Something went wrong. Please try again.");
    } catch { setSubmitError("Something went wrong. Please try again."); }
  }

  return (
    <div className="min-h-[100dvh] flex items-stretch" style={{ background: "var(--page-bg)" }}>

      {/* ── LEFT PANEL (desktop only) ── */}
      <div className="hidden lg:flex lg:w-[42%] flex-col justify-between p-14 relative overflow-hidden"
        style={{ background: "linear-gradient(145deg, #4338CA 0%, #5B21B6 50%, #1D4ED8 100%)" }}>

        {/* Orbs */}
        <div className="pointer-events-none absolute -top-20 -right-20 h-72 w-72 rounded-full blur-[80px]"
          style={{ background: "rgba(167,139,250,0.35)" }} />
        <div className="pointer-events-none absolute bottom-0 left-0 h-64 w-64 rounded-full blur-[80px]"
          style={{ background: "rgba(99,210,255,0.20)" }} />
        <div className="pointer-events-none absolute inset-0"
          style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)", backgroundSize: "28px 28px" }} />

        {/* Brand */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl overflow-hidden bg-white/15 ring-1 ring-white/30">
            {isExternalLogo
              ? <img src={logoSrc} alt={siteTitle} className="h-full w-full object-cover" />
              : <Image src={logoSrc} alt={siteTitle} width={36} height={36} className="object-cover" priority />
            }
          </div>
          <div>
            <p className="text-sm font-extrabold text-white leading-tight">{siteTitle}</p>
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/60">The Focus Hub</p>
          </div>
        </div>

        {/* Middle content */}
        <div className="relative z-10 space-y-8">
          <div>
            <h2 className="text-3xl font-extrabold text-white leading-tight mb-3">
              Welcome back! <br/>
              <span style={{ color: "#BAE6FD" }}>Your study session is waiting.</span>
            </h2>
            <p className="text-sm text-white/70 leading-relaxed">
              Join today's session — see how many students are already studying with you.
            </p>
          </div>

          {/* Stats cards */}
          <div className="space-y-3">
            {[
              { emoji: "🔥", label: "Average 7-day streak", sub: "among consistent students" },
              { emoji: "📚", label: "500+ study hours daily", sub: "across the community" },
              { emoji: "🏆", label: "India's top aspirants", sub: "UPSC, JEE, NEET, GATE" },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 rounded-2xl px-4 py-3"
                style={{ background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.15)" }}>
                <span className="text-2xl">{item.emoji}</span>
                <div>
                  <p className="text-sm font-bold text-white">{item.label}</p>
                  <p className="text-[11px] text-white/55">{item.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom quote */}
        <div className="relative z-10">
          <p className="text-xs text-white/40 italic">
            "Studying alone is hard — here it becomes easier with everyone around you."
          </p>
        </div>
      </div>

      {/* ── RIGHT PANEL — FORM ── */}
      <div className="flex-1 flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-[420px]">

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="h-10 w-10 overflow-hidden rounded-xl"
              style={{ boxShadow: "0 4px 12px rgba(99,102,241,0.25)" }}>
              {isExternalLogo
                ? <img src={logoSrc} alt={siteTitle} className="h-full w-full object-cover" />
                : <Image src={logoSrc} alt={siteTitle} width={40} height={40} className="object-cover" priority />
              }
            </div>
            <div>
              <p className="text-sm font-extrabold" style={{ color: "var(--foreground)" }}>{siteTitle}</p>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: "var(--accent)" }}>The Focus Hub</p>
            </div>
          </div>

          {/* Heading */}
          <div className="mb-7">
            <h1 className="text-2xl font-extrabold" style={{ color: "var(--foreground)" }}>
              Welcome Back! 👋
            </h1>
            <p className="mt-1 text-sm" style={{ color: "var(--muted-text)" }}>
              Enter your email and password — your session is ready
            </p>
          </div>

          {/* Success banners */}
          {verified && (
            <div className="mb-5 flex items-center gap-2.5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
              <span className="text-lg">✅</span>
              <p className="text-sm font-semibold text-emerald-700">
                Email verified! You can now log in.
              </p>
            </div>
          )}
          {!verified && registered && (
            <div className="mb-5 flex items-center gap-2.5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
              <span className="text-lg">✅</span>
              <p className="text-sm font-semibold text-emerald-700">
                Account created! You can now log in.
              </p>
            </div>
          )}

          {/* Form card */}
          <div className="rounded-2xl border bg-white p-7"
            style={{ borderColor: "var(--border)", boxShadow: "var(--shadow-md)" }}>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

              {/* Email */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-extrabold uppercase tracking-widest" style={{ color: "var(--foreground)" }}>
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "var(--muted-text)" }} />
                  <input {...register("email")} type="email" placeholder="your@email.com"
                    className="w-full rounded-xl border pl-10 py-2.5 text-sm font-medium outline-none transition focus:ring-2"
                    style={{ borderColor: "var(--border)", color: "var(--foreground)" }} />
                </div>
                {errors.email && <p className="text-xs font-semibold text-red-500">{errors.email.message}</p>}
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-extrabold uppercase tracking-widest" style={{ color: "var(--foreground)" }}>
                    Password
                  </label>
                  <Link href="/forgot-password"
                    className="text-[11px] font-bold hover:underline" style={{ color: "var(--accent)" }}>
                    Forgot?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "var(--muted-text)" }} />
                  <input {...register("password")} type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className="w-full rounded-xl border pl-10 pr-10 py-2.5 text-sm font-medium outline-none transition focus:ring-2"
                    style={{ borderColor: "var(--border)", color: "var(--foreground)" }} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors hover:text-[var(--accent)]"
                    style={{ color: "var(--muted-text)" }}>
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-xs font-semibold text-red-500">{errors.password.message}</p>}
              </div>

              {/* Unverified email — guide to OTP in profile */}
              {unverifiedEmail && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 space-y-1">
                  <p className="text-sm font-semibold text-amber-700">
                    Email not verified.
                  </p>
                  <p className="text-xs text-amber-600">
                    Log in — then go to Profile in the Dashboard to verify via OTP.
                  </p>
                </div>
              )}

              {/* Generic error */}
              {submitError && !unverifiedEmail && (
                <div className="flex items-center gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                  <span>❌</span>
                  <p className="text-sm font-semibold text-red-600">{submitError}</p>
                </div>
              )}

              {/* Submit */}
              <button type="submit" disabled={isSubmitting}
                className="group relative mt-1 flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl py-3 text-sm font-extrabold text-white transition-all hover:scale-[1.02] disabled:opacity-60"
                style={{
                  background: "linear-gradient(135deg, #6366F1, #8B5CF6)",
                  boxShadow: "0 6px 20px rgba(99,102,241,0.40)",
                }}>
                <span className="absolute inset-0 translate-x-[-100%] skew-x-12 bg-white/10 transition-transform duration-500 group-hover:translate-x-[100%]" />
                {isSubmitting
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Checking…</>
                  : "Start Studying →"
                }
              </button>
            </form>
          </div>

          {/* Bottom link */}
          <p className="mt-5 text-center text-sm" style={{ color: "var(--muted-text)" }}>
            New here?{" "}
            <Link href="/signup" className="font-extrabold hover:underline ml-1" style={{ color: "var(--accent)" }}>
              Create a Free Account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--page-bg)" }}>
        <div className="h-8 w-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--accent)" }} />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
