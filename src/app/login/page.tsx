"use client";

import { useState, Suspense, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { signIn, getSession } from "next-auth/react";
import Image from "next/image";
import { Mail, Lock, ChevronDown, User, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

const LOGIN_AS_OPTIONS = [
  { value: "STUDENT", label: "Student" },
  { value: "ADMIN", label: "Admin" },
  { value: "EMPLOYEE", label: "Staff" },
  { value: "INFLUENCER", label: "Influencer" },
  { value: "AUTHOR", label: "Author" },
] as const;

const schema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password is required"),
});

type FormData = z.infer<typeof schema>;

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const registered = searchParams.get("registered") === "1";
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loginAs, setLoginAs] = useState<string>("STUDENT");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [siteTitle, setSiteTitle] = useState("The Cyber Library");

  useEffect(() => {
    fetch("/api/site-branding")
      .then((r) => (r.ok ? r.json() : {}))
      .then((d: { logoUrl?: string | null; title?: string | null }) => {
        if (d.logoUrl) setLogoUrl(d.logoUrl);
        if (d.title) setSiteTitle(d.title);
      })
      .catch(() => {});
  }, []);

  const logoSrc = logoUrl?.trim() || "/logo.svg";
  const isExternalLogo = logoSrc.startsWith("http");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(data: FormData) {
    setSubmitError(null);
    try {
      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        loginAsRole: loginAs,
        redirect: false,
      });
      if (result?.error) {
        setSubmitError(
          "Invalid email or password, or this account is not a " +
            LOGIN_AS_OPTIONS.find((o) => o.value === loginAs)?.label.toLowerCase() +
            " account. Select the correct role and try again."
        );
        return;
      }
      if (result?.ok) {
        await router.refresh();
        try {
          await fetch("/api/auth/record-login", { method: "POST" });
        } catch {
          // ignore
        }
        const session = await getSession();
        const role = (session?.user as { role?: string } | undefined)?.role ?? "STUDENT";
        if (role === "ADMIN") router.push("/admin");
        else if (role === "EMPLOYEE") router.push("/staff");
        else if (role === "INFLUENCER") router.push("/affiliate");
        else if (role === "AUTHOR") router.push("/author");
        else router.push("/dashboard");
        return;
      }
      setSubmitError("Something went wrong. Please try again.");
    } catch {
      setSubmitError("Something went wrong. Please try again.");
    }
  }

  return (
    <div className="relative min-h-[100dvh] flex items-center justify-center px-4 py-8 bg-[var(--background)] overflow-hidden">
      {/* Premium Animated Mesh Background */}
      <div className="pointer-events-none absolute inset-0 opacity-40 mix-blend-hard-light animate-[mesh] bg-[radial-gradient(circle_at_50%_0%,_var(--accent)_0%,_transparent_60%),radial-gradient(circle_at_80%_80%,_var(--wood)_0%,_transparent_50%),radial-gradient(circle_at_10%_80%,_var(--accent)_0%,_transparent_40%)]" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }} 
        className="relative z-10 w-full max-w-md glass-panel p-8 md:p-10 shadow-[0_30px_80px_rgba(0,0,0,0.6)]"
      >
        <div className="mb-8 flex items-center justify-center flex-col gap-4">
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl shadow-inner border border-[var(--wood)]/20 bg-[var(--background)]/50 backdrop-blur-md p-1">
            {isExternalLogo ? (
              <img src={logoSrc} alt={siteTitle} className="h-full w-full object-contain rounded-xl" />
            ) : (
              <Image src={logoSrc} alt={siteTitle} width={64} height={64} className="object-contain rounded-xl" priority />
            )}
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-extrabold tracking-tight text-[var(--cream)] drop-shadow-sm">
              {siteTitle}
            </h1>
            <p className="text-sm font-medium text-[var(--cream-muted)] mt-1 tracking-wide">Enter your credentials to continue</p>
          </div>
        </div>

        {registered && (
          <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mb-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-400 text-center">
            Account created successfully. You can log in now.
          </motion.p>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="group">
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-[var(--wood)] group-focus-within:text-[var(--accent)] transition-colors">
              Role
            </label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--wood)] group-focus-within:text-[var(--accent)] transition-colors" />
              <select
                value={loginAs}
                onChange={(e) => setLoginAs(e.target.value)}
                className="w-full appearance-none rounded-[1.2rem] border border-[var(--wood)]/20 bg-[var(--ink)]/40 backdrop-blur-md py-3.5 pl-12 pr-8 text-sm font-medium text-[var(--cream)] shadow-inner hover:border-[var(--wood)]/40 focus:border-[var(--accent)]/60 focus:bg-[var(--ink)]/60 focus:outline-none transition-all cursor-pointer"
              >
                {LOGIN_AS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value} className="bg-[var(--background)] text-[var(--cream)]">
                    {opt.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 pointer-events-none text-[var(--wood)] group-focus-within:text-[var(--accent)] transition-colors" />
            </div>
          </div>
          <div className="group">
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-[var(--wood)] group-focus-within:text-[var(--accent)] transition-colors">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--wood)] group-focus-within:text-[var(--accent)] transition-colors" />
              <input
                {...register("email")}
                type="email"
                placeholder="you@example.com"
                className="w-full rounded-[1.2rem] border border-[var(--wood)]/20 bg-[var(--ink)]/40 backdrop-blur-md py-3.5 pl-12 pr-4 text-sm font-medium text-[var(--cream)] shadow-inner placeholder:text-[var(--wood)]/40 hover:border-[var(--wood)]/40 focus:border-[var(--accent)]/60 focus:bg-[var(--ink)]/60 focus:outline-none transition-all"
              />
            </div>
            {errors.email && (
              <p className="mt-2 text-xs font-bold text-red-400 pl-1">{errors.email.message}</p>
            )}
          </div>

          <div className="group">
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold uppercase tracking-widest text-[var(--wood)] group-focus-within:text-[var(--accent)] transition-colors">
                Password
              </label>
              <Link
                href="/forgot-password"
                className="text-[10px] font-bold uppercase tracking-widest text-[var(--wood)] hover:text-[var(--cream)] transition-colors"
              >
                Forgot?
              </Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--wood)] group-focus-within:text-[var(--accent)] transition-colors" />
              <input
                {...register("password")}
                type="password"
                placeholder="••••••••"
                className="w-full rounded-[1.2rem] border border-[var(--wood)]/20 bg-[var(--ink)]/40 backdrop-blur-md py-3.5 pl-12 pr-4 text-sm font-medium text-[var(--cream)] shadow-inner placeholder:text-[var(--wood)]/40 hover:border-[var(--wood)]/40 focus:border-[var(--accent)]/60 focus:bg-[var(--ink)]/60 focus:outline-none transition-all"
              />
            </div>
            {errors.password && (
              <p className="mt-2 text-xs font-bold text-red-400 pl-1">
                {errors.password.message}
              </p>
            )}
          </div>

          {submitError && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-400 text-center shadow-inner">
              {submitError}
            </motion.p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="group w-full rounded-full bg-[var(--accent)] py-4 mt-2 text-sm font-extrabold uppercase tracking-widest text-[var(--ink)] shadow-[0_4px_16px_rgba(154,130,100,0.3)] transition-all hover:-translate-y-1 hover:shadow-[0_8px_24px_rgba(154,130,100,0.4)] disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-[0_4px_16px_rgba(154,130,100,0.3)] flex justify-center items-center gap-2"
          >
            {isSubmitting ? (
               <Loader2 className="w-5 h-5 animate-spin" />
            ) : "Access Library"}
          </button>
        </form>

        <div className="mt-8 text-center border-t border-[var(--wood)]/10 pt-6">
          <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--wood)]">
            Don&apos;t have an account?{" "}
            <Link
              href="/signup"
              className="text-[var(--cream)] hover:text-[var(--accent)] transition-colors ml-1"
            >
              Request Access
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[var(--background)] text-[var(--cream-muted)]">Loading…</div>}>
      <LoginForm />
    </Suspense>
  );
}
