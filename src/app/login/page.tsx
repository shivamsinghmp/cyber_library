"use client";

import { useState, Suspense, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { signIn, getSession } from "next-auth/react";
import Image from "next/image";
import { Mail, Lock, ChevronDown, User } from "lucide-react";

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
  const [siteTitle, setSiteTitle] = useState("Virtual Library");

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
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-[var(--background)]">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-black/30 p-6 shadow-xl">
        <div className="mb-6 flex items-center gap-2">
          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl">
            {isExternalLogo ? (
              <img src={logoSrc} alt={siteTitle} width={40} height={40} className="h-10 w-10 object-cover" />
            ) : (
              <Image src={logoSrc} alt={siteTitle} width={40} height={40} className="object-cover" priority />
            )}
          </div>
          <div>
            <h1 className="text-lg font-semibold text-[var(--cream)]">
              {siteTitle}
            </h1>
            <p className="text-xs text-[var(--cream-muted)]">Welcome back</p>
          </div>
        </div>

        {registered && (
          <p className="mb-4 rounded-lg bg-emerald-500/15 px-3 py-2 text-xs text-emerald-200">
            Account created. You can log in now.
          </p>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--cream-muted)]">
              Login as
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--cream-muted)]" />
              <select
                value={loginAs}
                onChange={(e) => setLoginAs(e.target.value)}
                className="w-full appearance-none rounded-xl border border-white/10 bg-black/40 py-2.5 pl-10 pr-8 text-sm text-[var(--cream)] focus:border-[var(--accent)]/70 focus:outline-none"
              >
                {LOGIN_AS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 pointer-events-none text-[var(--cream-muted)]" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--cream-muted)]">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--cream-muted)]" />
              <input
                {...register("email")}
                type="email"
                placeholder="you@example.com"
                className="w-full rounded-xl border border-white/10 bg-black/40 py-2.5 pl-10 pr-3 text-sm text-[var(--cream)] placeholder:text-[var(--cream-muted)]/60 focus:border-[var(--accent)]/70 focus:outline-none"
              />
            </div>
            {errors.email && (
              <p className="mt-1 text-xs text-red-400">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--cream-muted)]">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--cream-muted)]" />
              <input
                {...register("password")}
                type="password"
                placeholder="••••••••"
                className="w-full rounded-xl border border-white/10 bg-black/40 py-2.5 pl-10 pr-3 text-sm text-[var(--cream)] placeholder:text-[var(--cream-muted)]/60 focus:border-[var(--accent)]/70 focus:outline-none"
              />
            </div>
            <div className="mt-1 flex items-center justify-between">
              {errors.password && (
                <p className="text-xs text-red-400">
                  {errors.password.message}
                </p>
              )}
              <Link
                href="/forgot-password"
                className="text-xs font-medium text-[var(--accent)] hover:underline ml-auto"
              >
                Forgot password?
              </Link>
            </div>
          </div>

          {submitError && (
            <p className="text-xs text-red-400">{submitError}</p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-[var(--accent)] py-2.5 text-sm font-semibold text-[var(--ink)] shadow-lg transition hover:bg-[var(--accent-hover)] disabled:opacity-60"
          >
            {isSubmitting ? "Signing in…" : "Log in"}
          </button>
        </form>

        <p className="mt-5 text-center text-xs text-[var(--cream-muted)]">
          Don&apos;t have an account?{" "}
          <Link
            href="/signup"
            className="text-[var(--accent)] underline-offset-2 hover:underline"
          >
            Sign up
          </Link>
        </p>
      </div>
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
