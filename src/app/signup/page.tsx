"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Image from "next/image";
import { User, Mail, Lock, Target, Phone, Eye, EyeOff } from "lucide-react";
import toast from "react-hot-toast";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  whatsappNumber: z
    .string()
    .min(10, "Valid WhatsApp number is required (e.g. +919876543210)"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
  goal: z.string().min(1, "Study goal is required"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type FormData = z.infer<typeof schema>;

const GOAL_OPTIONS = ["UPSC", "JEE", "NEET", "GATE", "CAT", "Other"];

function SignupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const refCode = searchParams.get("ref");

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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
      confirmPassword: "",
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
    <div className="relative min-h-[100dvh] flex items-center justify-center px-4 pt-32 pb-12 bg-[var(--background)] overflow-hidden">
      {/* Premium Animated Mesh Background */}
      <div className="pointer-events-none absolute inset-0 opacity-40 mix-blend-hard-light animate-[mesh] bg-[radial-gradient(circle_at_50%_0%,_var(--accent)_0%,_transparent_60%),radial-gradient(circle_at_80%_80%,_var(--wood)_0%,_transparent_50%),radial-gradient(circle_at_10%_80%,_var(--accent)_0%,_transparent_40%)]" />

      <div className="relative z-10 w-full max-w-md glass-panel p-6 md:p-8 shadow-[0_30px_80px_rgba(0,0,0,0.6)]">
        <div className="mb-6 flex items-center justify-center flex-col gap-3">
          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl shadow-inner border border-[var(--wood)]/20 bg-[var(--background)]/50 backdrop-blur-md p-1">
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
            <p className="text-sm font-medium text-[var(--cream-muted)] mt-1 tracking-wide">Request access to the Library</p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="group">
            <label className="mb-1 block text-[11px] font-bold uppercase tracking-widest text-[var(--wood)] group-focus-within:text-[var(--accent)] transition-colors">
              Full Name
            </label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--wood)] group-focus-within:text-[var(--accent)] transition-colors" />
              <input
                {...register("name")}
                type="text"
                placeholder="Aman Singh"
                className="w-full rounded-[1.2rem] border border-[var(--wood)]/20 bg-[var(--ink)]/40 backdrop-blur-md py-3 pl-12 pr-4 text-sm font-medium text-[var(--cream)] shadow-inner placeholder:text-[var(--wood)]/40 hover:border-[var(--wood)]/40 focus:border-[var(--accent)]/60 focus:bg-[var(--ink)]/60 focus:outline-none transition-all"
              />
            </div>
            {errors.name && (
              <p className="mt-2 text-xs font-bold text-red-400 pl-1">{errors.name.message}</p>
            )}
          </div>

          <div className="group">
            <label className="mb-1 block text-[11px] font-bold uppercase tracking-widest text-[var(--wood)] group-focus-within:text-[var(--accent)] transition-colors">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--wood)] group-focus-within:text-[var(--accent)] transition-colors" />
              <input
                {...register("email")}
                type="email"
                placeholder="you@example.com"
                className="w-full rounded-[1.2rem] border border-[var(--wood)]/20 bg-[var(--ink)]/40 backdrop-blur-md py-3 pl-12 pr-4 text-sm font-medium text-[var(--cream)] shadow-inner placeholder:text-[var(--wood)]/40 hover:border-[var(--wood)]/40 focus:border-[var(--accent)]/60 focus:bg-[var(--ink)]/60 focus:outline-none transition-all"
              />
            </div>
            {errors.email && (
              <p className="mt-2 text-xs font-bold text-red-400 pl-1">
                {errors.email.message}
              </p>
            )}
          </div>

          <div className="group">
            <label className="mb-1 block text-[11px] font-bold uppercase tracking-widest text-[var(--wood)] group-focus-within:text-[var(--accent)] transition-colors">
              WhatsApp Number
            </label>
            <div className="relative">
              <Phone className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--wood)] group-focus-within:text-[var(--accent)] transition-colors" />
              <input
                {...register("whatsappNumber")}
                type="tel"
                placeholder="+91 9876543210"
                className="w-full rounded-[1.2rem] border border-[var(--wood)]/20 bg-[var(--ink)]/40 backdrop-blur-md py-3 pl-12 pr-4 text-sm font-medium text-[var(--cream)] shadow-inner placeholder:text-[var(--wood)]/40 hover:border-[var(--wood)]/40 focus:border-[var(--accent)]/60 focus:bg-[var(--ink)]/60 focus:outline-none transition-all"
              />
            </div>
            {errors.whatsappNumber && (
              <p className="mt-2 text-xs font-bold text-red-400 pl-1">
                {errors.whatsappNumber.message}
              </p>
            )}
          </div>

          <div className="group">
            <label className="mb-1 block text-[11px] font-bold uppercase tracking-widest text-[var(--wood)] group-focus-within:text-[var(--accent)] transition-colors">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--wood)] group-focus-within:text-[var(--accent)] transition-colors" />
              <input
                {...register("password")}
                type={showPassword ? "text" : "password"}
                placeholder="Min 8 characters"
                className="w-full rounded-[1.2rem] border border-[var(--wood)]/20 bg-[var(--ink)]/40 backdrop-blur-md py-3 pl-12 pr-12 text-sm font-medium text-[var(--cream)] shadow-inner placeholder:text-[var(--wood)]/40 hover:border-[var(--wood)]/40 focus:border-[var(--accent)]/60 focus:bg-[var(--ink)]/60 focus:outline-none transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--wood)] hover:text-[var(--accent)] transition-colors focus:outline-none"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="mt-2 text-xs font-bold text-red-400 pl-1">
                {errors.password.message}
              </p>
            )}
          </div>

          <div className="group">
            <label className="mb-1 block text-[11px] font-bold uppercase tracking-widest text-[var(--wood)] group-focus-within:text-[var(--accent)] transition-colors">
              Confirm Password
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--wood)] group-focus-within:text-[var(--accent)] transition-colors" />
              <input
                {...register("confirmPassword")}
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Retype password"
                className="w-full rounded-[1.2rem] border border-[var(--wood)]/20 bg-[var(--ink)]/40 backdrop-blur-md py-3 pl-12 pr-12 text-sm font-medium text-[var(--cream)] shadow-inner placeholder:text-[var(--wood)]/40 hover:border-[var(--wood)]/40 focus:border-[var(--accent)]/60 focus:bg-[var(--ink)]/60 focus:outline-none transition-all"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--wood)] hover:text-[var(--accent)] transition-colors focus:outline-none"
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="mt-2 text-xs font-bold text-red-400 pl-1">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>

          <div className="group">
            <label className="mb-1 block text-[11px] font-bold uppercase tracking-widest text-[var(--wood)] group-focus-within:text-[var(--accent)] transition-colors">
              Primary Goal
            </label>
            <div className="relative">
              <Target className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--wood)] group-focus-within:text-[var(--accent)] transition-colors" />
              <select
                {...register("goal")}
                className="w-full appearance-none rounded-[1.2rem] border border-[var(--wood)]/20 bg-[var(--ink)]/40 backdrop-blur-md py-3 pl-12 pr-8 text-sm font-medium text-[var(--cream)] shadow-inner hover:border-[var(--wood)]/40 focus:border-[var(--accent)]/60 focus:bg-[var(--ink)]/60 focus:outline-none transition-all cursor-pointer"
              >
                <option value="" className="bg-[var(--background)] text-[var(--cream)]">Select goal</option>
                {GOAL_OPTIONS.map((g) => (
                  <option key={g} value={g} className="bg-[var(--background)] text-[var(--cream)]">
                    {g}
                  </option>
                ))}
              </select>
            </div>
            {errors.goal && (
              <p className="mt-2 text-xs font-bold text-red-400 pl-1">{errors.goal.message}</p>
            )}
          </div>

          {submitError && (
             <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-400 text-center shadow-inner">
              {submitError}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="group w-full rounded-full bg-[var(--accent)] py-3.5 mt-2 text-sm font-extrabold uppercase tracking-widest text-[var(--ink)] shadow-[0_4px_16px_rgba(154,130,100,0.3)] transition-all hover:-translate-y-1 hover:shadow-[0_8px_24px_rgba(154,130,100,0.4)] disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-[0_4px_16px_rgba(154,130,100,0.3)] flex justify-center items-center"
          >
            {isSubmitting ? "Processing..." : "Create Account"}
          </button>
        </form>

        <div className="mt-6 text-center border-t border-[var(--wood)]/10 pt-5">
          <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--wood)]">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-[var(--cream)] hover:text-[var(--accent)] transition-colors ml-1"
            >
              Sign In
            </Link>
          </p>
        </div>
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

