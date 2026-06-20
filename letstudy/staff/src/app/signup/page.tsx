"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { User, Mail, Lock, Eye, EyeOff, Loader2, Clock } from "lucide-react";
import { passwordSchema } from "@/lib/password-schema";

const schema = z.object({
  name:            z.string().min(1, "Name is required"),
  email:           z.string().email("Please enter a valid email"),
  password:        passwordSchema,
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine(d => d.password === d.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});
type FormData = z.infer<typeof schema>;

export default function StaffSignupPage() {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", email: "", password: "", confirmPassword: "" },
  });

  async function onSubmit(data: FormData) {
    setSubmitError(null);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: data.name, email: data.email, password: data.password }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (json.error && typeof json.error === "object") {
          const first = Object.values(json.error as Record<string, string[]>)[0];
          setSubmitError(Array.isArray(first) ? first[0] : "Signup failed.");
        } else setSubmitError(typeof json.error === "string" ? json.error : "Signup failed.");
        return;
      }
      setSubmitted(true);
    } catch { setSubmitError("Something went wrong. Please try again."); }
  }

  if (submitted) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center px-5" style={{ background: "var(--page-bg)" }}>
        <div className="w-full max-w-md rounded-2xl border bg-white p-8 text-center" style={{ borderColor: "var(--border)", boxShadow: "var(--shadow-md)" }}>
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: "var(--amber-pale)" }}>
            <Clock className="h-7 w-7 text-amber-600" />
          </div>
          <h1 className="text-xl font-extrabold" style={{ color: "var(--foreground)" }}>Request submitted</h1>
          <p className="mt-2 text-sm" style={{ color: "var(--muted-text)" }}>
            Your staff account is pending approval. An administrator needs to approve your account
            and assign permissions before you can sign in. You'll be able to log in once that's done.
          </p>
          <Link href="/login" className="mt-6 inline-flex w-full items-center justify-center rounded-xl py-3 text-sm font-bold text-white transition hover:opacity-90"
            style={{ background: "linear-gradient(135deg, #312E81, #1E3A8A)" }}>
            Back to Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] flex items-center justify-center px-5 py-12" style={{ background: "var(--page-bg)" }}>
      <div className="w-full max-w-[420px]">
        <div className="mb-7">
          <h1 className="text-2xl font-extrabold" style={{ color: "var(--foreground)" }}>Request Staff Access</h1>
          <p className="mt-1 text-sm" style={{ color: "var(--muted-text)" }}>
            Submit your details — an administrator will review and approve your account.
          </p>
        </div>

        <div className="rounded-2xl border bg-white p-7" style={{ borderColor: "var(--border)", boxShadow: "var(--shadow-md)" }}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-[11px] font-extrabold uppercase tracking-widest" style={{ color: "var(--foreground)" }}>Full Name</label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "var(--muted-text)" }} />
                <input {...register("name")} type="text" placeholder="Your name"
                  className="w-full rounded-xl border pl-10 py-2.5 text-sm font-medium outline-none transition focus:ring-2"
                  style={{ borderColor: "var(--border)", color: "var(--foreground)" }} />
              </div>
              {errors.name && <p className="text-xs font-semibold text-red-500">{errors.name.message}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-extrabold uppercase tracking-widest" style={{ color: "var(--foreground)" }}>Email Address</label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "var(--muted-text)" }} />
                <input {...register("email")} type="email" placeholder="you@lstudy.in"
                  className="w-full rounded-xl border pl-10 py-2.5 text-sm font-medium outline-none transition focus:ring-2"
                  style={{ borderColor: "var(--border)", color: "var(--foreground)" }} />
              </div>
              {errors.email && <p className="text-xs font-semibold text-red-500">{errors.email.message}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-extrabold uppercase tracking-widest" style={{ color: "var(--foreground)" }}>Password</label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "var(--muted-text)" }} />
                <input {...register("password")} type={showPassword ? "text" : "password"} placeholder="Create a strong password"
                  className="w-full rounded-xl border pl-10 pr-10 py-2.5 text-sm font-medium outline-none transition focus:ring-2"
                  style={{ borderColor: "var(--border)", color: "var(--foreground)" }} />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2" style={{ color: "var(--muted-text)" }}>
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs font-semibold text-red-500">{errors.password.message}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-extrabold uppercase tracking-widest" style={{ color: "var(--foreground)" }}>Confirm Password</label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "var(--muted-text)" }} />
                <input {...register("confirmPassword")} type={showPassword ? "text" : "password"} placeholder="Same password again"
                  className="w-full rounded-xl border pl-10 py-2.5 text-sm font-medium outline-none transition focus:ring-2"
                  style={{ borderColor: "var(--border)", color: "var(--foreground)" }} />
              </div>
              {errors.confirmPassword && <p className="text-xs font-semibold text-red-500">{errors.confirmPassword.message}</p>}
            </div>

            {submitError && (
              <div className="flex items-center gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                <span>❌</span>
                <p className="text-sm font-semibold text-red-600">{submitError}</p>
              </div>
            )}

            <button type="submit" disabled={isSubmitting}
              className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-extrabold text-white transition-all hover:scale-[1.02] disabled:opacity-60"
              style={{ background: "linear-gradient(135deg, #312E81, #1E3A8A)" }}>
              {isSubmitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Submitting…</> : "Submit Request"}
            </button>
          </form>
        </div>

        <p className="mt-5 text-center text-sm" style={{ color: "var(--muted-text)" }}>
          Already approved?{" "}
          <Link href="/login" className="font-extrabold hover:underline ml-1" style={{ color: "var(--accent)" }}>
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
