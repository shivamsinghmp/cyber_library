"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Image from "next/image";
import { User, Mail, Lock, Target, Phone } from "lucide-react";
import toast from "react-hot-toast";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  whatsappNumber: z
    .string()
    .min(10, "Valid WhatsApp number is required (e.g. +919876543210)"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  goal: z.string().min(1, "Study goal is required"),
});

type FormData = z.infer<typeof schema>;

const GOAL_OPTIONS = ["UPSC", "JEE", "NEET", "GATE", "CAT", "Other"];

function SignupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const refCode = searchParams.get("ref");

  const [submitError, setSubmitError] = useState<string | null>(null);
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
    defaultValues: {
      name: "",
      email: "",
      whatsappNumber: "",
      password: "",
      goal: "",
    },
  });

  async function onSubmit(data: FormData) {
    setSubmitError(null);
    try {
      const formattedNumber = data.whatsappNumber.startsWith("+")
        ? data.whatsappNumber
        : `+91${data.whatsappNumber.replace(/^0+/, "")}`;

      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          whatsappNumber: formattedNumber,
          ref: refCode || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        if (json.error?.email) setSubmitError(json.error.email[0]);
        else if (json.error?.whatsappNumber)
          setSubmitError(json.error.whatsappNumber[0]);
        else if (json.error)
          setSubmitError(
            typeof json.error === "string"
              ? json.error
              : JSON.stringify(json.error)
          );
        else setSubmitError("Signup failed");
        return;
      }

      toast.success("Account created successfully!");
      router.push(
        `/login?registered=true&email=${encodeURIComponent(data.email)}`
      );
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
              <img
                src={logoSrc}
                alt={siteTitle}
                width={40}
                height={40}
                className="h-10 w-10 object-cover"
              />
            ) : (
              <Image
                src={logoSrc}
                alt={siteTitle}
                width={40}
                height={40}
                className="object-cover"
                priority
              />
            )}
          </div>
          <div>
            <h1 className="text-lg font-semibold text-[var(--cream)]">
              {siteTitle}
            </h1>
            <p className="text-xs text-[var(--cream-muted)]">
              Create your account
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--cream-muted)]">
              Name
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--cream-muted)]" />
              <input
                {...register("name")}
                type="text"
                placeholder="Your name"
                className="w-full rounded-xl border border-white/10 bg-black/40 py-2.5 pl-10 pr-3 text-sm text-[var(--cream)] placeholder:text-[var(--cream-muted)]/60 focus:border-[var(--accent)]/70 focus:outline-none"
              />
            </div>
            {errors.name && (
              <p className="mt-1 text-xs text-red-400">{errors.name.message}</p>
            )}
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
              <p className="mt-1 text-xs text-red-400">
                {errors.email.message}
              </p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--cream-muted)]">
              WhatsApp Number
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--cream-muted)]" />
              <input
                {...register("whatsappNumber")}
                type="tel"
                placeholder="9876543210"
                className="w-full rounded-xl border border-white/10 bg-black/40 py-2.5 pl-10 pr-3 text-sm text-[var(--cream)] placeholder:text-[var(--cream-muted)]/60 focus:border-[var(--accent)]/70 focus:outline-none"
              />
            </div>
            {errors.whatsappNumber && (
              <p className="mt-1 text-xs text-red-400">
                {errors.whatsappNumber.message}
              </p>
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
                placeholder="Min 8 characters"
                className="w-full rounded-xl border border-white/10 bg-black/40 py-2.5 pl-10 pr-3 text-sm text-[var(--cream)] placeholder:text-[var(--cream-muted)]/60 focus:border-[var(--accent)]/70 focus:outline-none"
              />
            </div>
            {errors.password && (
              <p className="mt-1 text-xs text-red-400">
                {errors.password.message}
              </p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--cream-muted)]">
              Study goal
            </label>
            <div className="relative">
              <Target className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--cream-muted)]" />
              <select
                {...register("goal")}
                className="w-full appearance-none rounded-xl border border-white/10 bg-black/40 py-2.5 pl-10 pr-8 text-sm text-[var(--cream)] focus:border-[var(--accent)]/70 focus:outline-none"
              >
                <option value="">Select goal</option>
                {GOAL_OPTIONS.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>
            {errors.goal && (
              <p className="mt-1 text-xs text-red-400">{errors.goal.message}</p>
            )}
          </div>

          {submitError && (
            <p className="text-xs text-red-400">{submitError}</p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-[var(--accent)] py-2.5 text-sm font-semibold text-[var(--ink)] shadow-lg transition hover:bg-[var(--accent-hover)] disabled:opacity-60"
          >
            {isSubmitting ? "Creating account…" : "Sign up"}
          </button>
        </form>

        <div className="my-4 flex items-center gap-2 text-xs text-[var(--cream-muted)]">
          <span className="h-px flex-1 bg-white/10" />
          or sign up with
          <span className="h-px flex-1 bg-white/10" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            className="flex items-center justify-center gap-2 rounded-xl border border-white/10 py-2.5 text-sm font-medium text-[var(--cream)] transition hover:bg-white/5"
          >
            Google
          </button>
          <button
            type="button"
            className="flex items-center justify-center gap-2 rounded-xl border border-white/10 py-2.5 text-sm font-medium text-[var(--cream)] transition hover:bg-white/5"
          >
            GitHub
          </button>
        </div>

        <p className="mt-5 text-center text-xs text-[var(--cream-muted)]">
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-[var(--accent)] underline-offset-2 hover:underline"
          >
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[var(--background)] text-[var(--cream-muted)]">
          Loading…
        </div>
      }
    >
      <SignupContent />
    </Suspense>
  );
}

