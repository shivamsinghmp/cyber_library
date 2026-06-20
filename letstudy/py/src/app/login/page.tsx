"use client";

import { useState, Suspense, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { signIn, signOut, getSession } from "next-auth/react";
import Image from "next/image";
import { Mail, Lock, Loader2, Eye, EyeOff, Bot } from "lucide-react";

// Admin-only login — manages the Python server (WhatsApp bot, AI routing,
// billing). The shared authorize() rejects any non-ADMIN credentials.
const LOGIN_AS = "ADMIN";

const schema = z.object({
  email:    z.string().email("Please enter a valid email"),
  password: z.string().min(1, "Please enter your password"),
});
type FormData = z.infer<typeof schema>;

function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl  = searchParams.get("callbackUrl");

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [logoUrl, setLogoUrl]         = useState<string | null>(null);
  const [siteTitle, setSiteTitle]     = useState("Let's Study");
  const redirecting = useRef(false);

  // If already logged in with an ADMIN session, skip to the dashboard. A
  // session left over from a different app (e.g. cross-port cookie bleed
  // in dev) is signed out instead of being bounced back here in a loop.
  useEffect(() => {
    getSession().then(session => {
      if (!session?.user || redirecting.current) return;
      redirecting.current = true;
      const role = (session.user as { role?: string }).role;
      if (role !== "ADMIN") {
        signOut({ redirect: false });
        return;
      }
      const isSafe = callbackUrl?.startsWith("/") && !callbackUrl.startsWith("//");
      window.location.href = isSafe ? callbackUrl! : "/admin/whatsapp";
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

  const logoSrc        = logoUrl?.trim() || "/favicon.svg";
  const isExternalLogo = logoSrc.startsWith("http");

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(data: FormData) {
    setSubmitError(null);
    try {
      const result = await signIn("credentials", {
        email: data.email, password: data.password, loginAsRole: LOGIN_AS, redirect: false,
      });
      if (result?.error) {
        setSubmitError("Incorrect email or password, or this account is not an admin.");
        return;
      }
      if (result?.ok) {
        try { await fetch("/api/auth/record-login", { method: "POST" }); } catch {}
        const isSafe = callbackUrl?.startsWith("/") && !callbackUrl.startsWith("//");
        window.location.href = isSafe ? callbackUrl! : "/admin/whatsapp";
        return;
      }
      setSubmitError("Something went wrong. Please try again.");
    } catch { setSubmitError("Something went wrong. Please try again."); }
  }

  return (
    <div className="min-h-[100dvh] flex items-stretch" style={{ background: "var(--page-bg)" }}>

      <div className="hidden lg:flex lg:w-[42%] flex-col justify-between p-14 relative overflow-hidden"
        style={{ background: "linear-gradient(145deg, #052e2b 0%, #0d4f4a 50%, #134e4a 100%)" }}>

        <div className="pointer-events-none absolute -top-20 -right-20 h-72 w-72 rounded-full blur-[80px]"
          style={{ background: "rgba(45,212,191,0.25)" }} />
        <div className="pointer-events-none absolute bottom-0 left-0 h-64 w-64 rounded-full blur-[80px]"
          style={{ background: "rgba(56,189,248,0.15)" }} />

        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl overflow-hidden bg-white/15 ring-1 ring-white/30">
            {isExternalLogo
              ? <img src={logoSrc} alt={siteTitle} className="h-full w-full object-cover" />
              : <Image src={logoSrc} alt={siteTitle} width={36} height={36} className="object-cover" priority />
            }
          </div>
          <div>
            <p className="text-sm font-extrabold text-white leading-tight">{siteTitle}</p>
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/60">Bot Ops</p>
          </div>
        </div>

        <div className="relative z-10 space-y-6">
          <div>
            <h2 className="text-3xl font-extrabold text-white leading-tight mb-3">
              The bot's brain.
            </h2>
            <p className="text-sm text-white/70 leading-relaxed">
              System prompt, model routing, rate limits, broadcasts, and AI billing —
              the controls behind the WhatsApp AI chatbot.
            </p>
          </div>
        </div>

        <div className="relative z-10">
          <p className="text-xs text-white/40">
            Admins manage the full platform at portal.lstudy.in.
          </p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-[420px]">

          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="h-10 w-10 overflow-hidden rounded-xl">
              {isExternalLogo
                ? <img src={logoSrc} alt={siteTitle} className="h-full w-full object-cover" />
                : <Image src={logoSrc} alt={siteTitle} width={40} height={40} className="object-cover" priority />
              }
            </div>
            <div>
              <p className="text-sm font-extrabold" style={{ color: "var(--foreground)" }}>{siteTitle}</p>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: "var(--accent)" }}>Bot Ops</p>
            </div>
          </div>

          <div className="mb-7">
            <h1 className="flex items-center gap-2 text-2xl font-extrabold" style={{ color: "var(--foreground)" }}>
              <Bot className="h-6 w-6" /> Bot Ops Sign In
            </h1>
            <p className="mt-1 text-sm" style={{ color: "var(--muted-text)" }}>
              Admin credentials required.
            </p>
          </div>

          <div className="rounded-2xl border bg-white p-7" style={{ borderColor: "var(--border)", boxShadow: "var(--shadow-md)" }}>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

              <div className="space-y-1.5">
                <label className="block text-[11px] font-extrabold uppercase tracking-widest" style={{ color: "var(--foreground)" }}>Email Address</label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "var(--muted-text)" }} />
                  <input {...register("email")} type="email" placeholder="admin@lstudy.in"
                    className="w-full rounded-xl border pl-10 py-2.5 text-sm font-medium outline-none transition focus:ring-2"
                    style={{ borderColor: "var(--border)", color: "var(--foreground)" }} />
                </div>
                {errors.email && <p className="text-xs font-semibold text-red-500">{errors.email.message}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-extrabold uppercase tracking-widest" style={{ color: "var(--foreground)" }}>Password</label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "var(--muted-text)" }} />
                  <input {...register("password")} type={showPassword ? "text" : "password"} placeholder="••••••••"
                    className="w-full rounded-xl border pl-10 pr-10 py-2.5 text-sm font-medium outline-none transition focus:ring-2"
                    style={{ borderColor: "var(--border)", color: "var(--foreground)" }} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2" style={{ color: "var(--muted-text)" }}>
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-xs font-semibold text-red-500">{errors.password.message}</p>}
              </div>

              {submitError && (
                <div className="flex items-center gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                  <span>❌</span>
                  <p className="text-sm font-semibold text-red-600">{submitError}</p>
                </div>
              )}

              <button type="submit" disabled={isSubmitting}
                className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-extrabold text-white transition-all hover:scale-[1.02] disabled:opacity-60"
                style={{ background: "linear-gradient(135deg, #134e4a, #0d4f4a)" }}>
                {isSubmitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Checking…</> : "Sign In →"}
              </button>
            </form>
          </div>
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
