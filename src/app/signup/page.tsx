"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Image from "next/image";
import { User, Mail, Lock, Target, Phone, Eye, EyeOff, ShieldCheck, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

const schema = z.object({
  name:            z.string().min(1, "Naam daalna zaroori hai"),
  email:           z.string().email("Valid email chahiye"),
  whatsappNumber:  z.string().min(10, "Valid mobile number chahiye (e.g. +919876543210)"),
  password:        z.string().min(8, "Password kam se kam 8 characters ka hona chahiye"),
  confirmPassword: z.string().min(1, "Password dobara daalo"),
  goal:            z.string().min(1, "Apna exam goal choose karo"),
}).refine(d => d.password === d.confirmPassword, {
  message: "Dono passwords match nahi kar rahe",
  path: ["confirmPassword"],
});

type FormData = z.infer<typeof schema>;

const GOAL_OPTIONS = ["UPSC", "JEE", "NEET", "GATE", "CAT", "Other"];

const ICON = "pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2";

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[11px] font-extrabold uppercase tracking-widest" style={{ color: "var(--foreground)" }}>
        {label}
      </label>
      {children}
      {error && <p className="text-xs font-semibold text-red-500">{error}</p>}
    </div>
  );
}

function SignupContent() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const refCode      = searchParams.get("ref");

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showPassword, setShowPassword]             = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [logoUrl, setLogoUrl]   = useState<string | null>(null);
  const [siteTitle, setSiteTitle] = useState("The Cyber Library");

  const [otpSent, setOtpSent]         = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpValue, setOtpValue]       = useState("");
  const [otpError, setOtpError]       = useState<string | null>(null);
  const [sendingOtp, setSendingOtp]   = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    fetch("/api/site-branding")
      .then(r => r.ok ? r.json() : {})
      .then((d: { logoUrl?: string | null; title?: string | null }) => {
        if (d.logoUrl) setLogoUrl(d.logoUrl);
        if (d.title)   setSiteTitle(d.title);
      }).catch(() => {});
  }, []);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const logoSrc      = logoUrl?.trim() || "/logo.svg";
  const isExternalLogo = logoSrc.startsWith("http");

  const { register, handleSubmit, getValues, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", email: "", whatsappNumber: "", password: "", confirmPassword: "", goal: "" },
  });

  function formatNumber(raw: string) {
    return raw.startsWith("+") ? raw : `+91${raw.replace(/^0+/, "")}`;
  }

  async function handleSendOtp() {
    const raw = getValues("whatsappNumber");
    if (!raw || raw.length < 10) { setOtpError("Pehle valid mobile number daalo."); return; }
    const phoneNumber = formatNumber(raw);
    const emailVal = getValues("email").trim().toLowerCase();
    setSendingOtp(true); setOtpError(null);
    try {
      const res  = await fetch("/api/auth/whatsapp-otp/send", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber, ...(emailVal ? { email: emailVal } : {}) }),
      });
      const json = await res.json();
      if (!res.ok) { setOtpError(json.error || "OTP nahi gaya. Dobara try karo."); return; }
      setOtpSent(true); setOtpVerified(false); setOtpValue(""); setResendCooldown(180);
      toast.success("OTP bhej diya gaya!");
    } catch { setOtpError("Kuch gadbad ho gayi. Try karo."); }
    finally { setSendingOtp(false); }
  }

  async function handleVerifyOtp() {
    if (otpValue.length !== 6) { setOtpError("6-digit OTP daalo."); return; }
    const phoneNumber = formatNumber(getValues("whatsappNumber"));
    setVerifyingOtp(true); setOtpError(null);
    try {
      const res  = await fetch("/api/auth/whatsapp-otp/verify", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber, otp: otpValue }),
      });
      const json = await res.json();
      if (!res.ok) { setOtpError(json.error || "OTP galat hai. Dobara check karo."); return; }
      setOtpVerified(true); setOtpError(null);
      toast.success("Mobile number verify ho gaya! ✅");
    } catch { setOtpError("Kuch gadbad ho gayi. Try karo."); }
    finally { setVerifyingOtp(false); }
  }

  async function onSubmit(data: FormData) {
    if (!otpVerified) { setSubmitError("Pehle mobile number verify karo."); return; }
    setSubmitError(null);
    try {
      const res  = await fetch("/api/auth/signup", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, whatsappNumber: formatNumber(data.whatsappNumber), otp: otpValue, ref: refCode || undefined }),
      });
      const json = await res.json();
      if (!res.ok) {
        if (json.error?.email)           setSubmitError(json.error.email[0]);
        else if (json.error?.whatsappNumber) setSubmitError(json.error.whatsappNumber[0]);
        else if (json.error?.otp)        setSubmitError(json.error.otp[0]);
        else if (json.error) {
          if (typeof json.error === "object" && Object.keys(json.error).length > 0) {
            const k = Object.keys(json.error)[0];
            setSubmitError(Array.isArray(json.error[k]) ? json.error[k][0] : String(json.error[k]));
          } else setSubmitError(String(json.error));
        } else setSubmitError("Signup fail ho gaya.");
        return;
      }
      toast.success("Account ban gaya! Email verify karo. 🎉");
      router.push(`/verify-email?email=${encodeURIComponent(data.email)}`);
    } catch { setSubmitError("Kuch gadbad ho gayi. Dobara try karo."); }
  }

  const inputCls = "w-full rounded-xl border pl-10 py-2.5 text-sm font-medium outline-none transition focus:ring-2 bg-white";
  const inputStyle = { borderColor: "var(--border)", color: "var(--foreground)" };

  return (
    <div className="min-h-[100dvh] flex items-stretch" style={{ background: "var(--page-bg)" }}>

      {/* ── LEFT PANEL ── */}
      <div className="hidden lg:flex lg:w-[38%] flex-col justify-between p-14 relative overflow-hidden"
        style={{ background: "linear-gradient(145deg, #4338CA 0%, #5B21B6 50%, #1D4ED8 100%)" }}>

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

        {/* Middle */}
        <div className="relative z-10 space-y-7">
          <div>
            <h2 className="text-3xl font-extrabold text-white leading-tight mb-3">
              Padhai seriously<br />
              <span style={{ color: "#BAE6FD" }}>leni hai? Sahi jagah aa gaye.</span>
            </h2>
            <p className="text-sm text-white/70 leading-relaxed">
              Free account banao aur aaj se hi study sessions join karna shuru karo. Koi payment nahi, koi credit card nahi.
            </p>
          </div>

          {/* Benefits */}
          <div className="space-y-3">
            {[
              { emoji: "✅", text: "Bilkul Free hai", sub: "Koi hidden charges nahi" },
              { emoji: "⚡", text: "Sirf 2 minute mein ready", sub: "Quick signup, instant access" },
              { emoji: "🎯", text: "Apna goal set karo", sub: "UPSC, JEE, NEET, GATE, CAT" },
              { emoji: "📱", text: "Mobile number se secure", sub: "OTP verification hogi" },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 rounded-2xl px-4 py-3"
                style={{ background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.15)" }}>
                <span className="text-xl shrink-0">{item.emoji}</span>
                <div>
                  <p className="text-sm font-bold text-white">{item.text}</p>
                  <p className="text-[11px] text-white/55">{item.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10">
          <p className="text-xs text-white/40 italic">
            "Pehle din se hi fark feel hoga — try karo."
          </p>
        </div>
      </div>

      {/* ── RIGHT PANEL — FORM ── */}
      <div className="flex-1 flex items-center justify-center px-5 py-10 overflow-y-auto">
        <div className="w-full max-w-[440px]">

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-7">
            <div className="h-10 w-10 overflow-hidden rounded-xl" style={{ boxShadow: "0 4px 12px rgba(99,102,241,0.25)" }}>
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
          <div className="mb-6">
            <h1 className="text-2xl font-extrabold" style={{ color: "var(--foreground)" }}>
              Account Banao — Free Hai! 🚀
            </h1>
            <p className="mt-1 text-sm" style={{ color: "var(--muted-text)" }}>
              2 minute mein done — aur aaj se padhai shuru
            </p>
          </div>

          {/* Form card */}
          <div className="rounded-2xl border bg-white p-6"
            style={{ borderColor: "var(--border)", boxShadow: "var(--shadow-md)" }}>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

              {/* Name */}
              <Field label="Tera Naam" error={errors.name?.message}>
                <div className="relative">
                  <User className={ICON} style={{ color: "var(--muted-text)" }} />
                  <input {...register("name")} type="text" placeholder="Aman Singh" className={inputCls} style={inputStyle} />
                </div>
              </Field>

              {/* Email */}
              <Field label="Email Address" error={errors.email?.message}>
                <div className="relative">
                  <Mail className={ICON} style={{ color: "var(--muted-text)" }} />
                  <input {...register("email")} type="email" placeholder="tumhari@email.com" className={inputCls} style={inputStyle} />
                </div>
              </Field>

              {/* Mobile + OTP */}
              <Field label="Mobile Number (WhatsApp)" error={errors.whatsappNumber?.message || (!otpSent && otpError ? otpError : undefined)}>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Phone className={ICON} style={{ color: "var(--muted-text)" }} />
                    <input {...register("whatsappNumber")} type="tel" placeholder="+91 9876543210"
                      className={inputCls} style={inputStyle} disabled={otpVerified}
                      onChange={() => { if (otpError) setOtpError(null); }} />
                  </div>
                  <button type="button" onClick={handleSendOtp}
                    disabled={sendingOtp || resendCooldown > 0 || otpVerified}
                    className="shrink-0 rounded-xl px-3.5 text-xs font-extrabold transition-all disabled:opacity-50"
                    style={otpVerified
                      ? { background: "#ECFDF5", color: "#065F46", border: "1.5px solid #A7F3D0" }
                      : { background: "var(--accent-pale)", color: "var(--accent)", border: "1.5px solid var(--accent-border)" }
                    }>
                    {otpVerified ? "✓ Verified" : sendingOtp ? "…" : resendCooldown > 0 ? `${Math.floor(resendCooldown / 60)}:${String(resendCooldown % 60).padStart(2, "0")}` : otpSent ? "Resend" : "Send OTP"}
                  </button>
                </div>
              </Field>

              {/* OTP Input */}
              {otpSent && !otpVerified && (
                <Field label="OTP Daalo (6 digit)" error={otpError || undefined}>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <ShieldCheck className={ICON} style={{ color: "var(--muted-text)" }} />
                      <input type="text" inputMode="numeric" maxLength={6} placeholder="• • • • • •"
                        value={otpValue}
                        onChange={e => setOtpValue(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        className="w-full rounded-xl border bg-white pl-10 py-2.5 text-sm font-mono tracking-[0.4em] text-center outline-none transition focus:ring-2"
                        style={inputStyle} />
                    </div>
                    <button type="button" onClick={handleVerifyOtp}
                      disabled={verifyingOtp || otpValue.length !== 6}
                      className="shrink-0 rounded-xl px-4 text-xs font-extrabold text-white transition-all disabled:opacity-50"
                      style={{ background: "linear-gradient(135deg, #6366F1, #8B5CF6)", boxShadow: "0 4px 12px rgba(99,102,241,0.35)" }}>
                      {verifyingOtp ? "…" : "Verify"}
                    </button>
                  </div>
                </Field>
              )}

              {otpVerified && (
                <div className="flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5">
                  <span className="text-lg">✅</span>
                  <p className="text-sm font-semibold text-emerald-700">Mobile verify ho gaya!</p>
                </div>
              )}

              {/* Password */}
              <Field label="Password (min 8 characters)" error={errors.password?.message}>
                <div className="relative">
                  <Lock className={ICON} style={{ color: "var(--muted-text)" }} />
                  <input {...register("password")} type={showPassword ? "text" : "password"}
                    placeholder="Strong password daalo" className={`${inputCls} pr-10`} style={inputStyle} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors hover:text-[var(--accent)]"
                    style={{ color: "var(--muted-text)" }}>
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </Field>

              {/* Confirm Password */}
              <Field label="Password Dobara Daalo" error={errors.confirmPassword?.message}>
                <div className="relative">
                  <Lock className={ICON} style={{ color: "var(--muted-text)" }} />
                  <input {...register("confirmPassword")} type={showConfirmPassword ? "text" : "password"}
                    placeholder="Same password again" className={`${inputCls} pr-10`} style={inputStyle} />
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors hover:text-[var(--accent)]"
                    style={{ color: "var(--muted-text)" }}>
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </Field>

              {/* Goal */}
              <Field label="Tera Exam Goal" error={errors.goal?.message}>
                <div className="relative">
                  <Target className={ICON} style={{ color: "var(--muted-text)" }} />
                  <select {...register("goal")}
                    className="w-full appearance-none rounded-xl border bg-white pl-10 pr-8 py-2.5 text-sm font-medium outline-none transition focus:ring-2 cursor-pointer"
                    style={inputStyle}>
                    <option value="">Exam choose karo…</option>
                    {GOAL_OPTIONS.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                  <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--muted-text)]">▾</span>
                </div>
              </Field>

              {/* Submit error */}
              {submitError && (
                <div className="flex items-center gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                  <span>❌</span>
                  <p className="text-sm font-semibold text-red-600">{submitError}</p>
                </div>
              )}

              {/* Submit */}
              <button type="submit" disabled={isSubmitting || !otpVerified}
                className="group relative mt-1 flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl py-3 text-sm font-extrabold text-white transition-all hover:scale-[1.02] disabled:opacity-60"
                style={{
                  background: "linear-gradient(135deg, #6366F1, #8B5CF6)",
                  boxShadow: "0 6px 20px rgba(99,102,241,0.40)",
                }}>
                <span className="absolute inset-0 translate-x-[-100%] skew-x-12 bg-white/10 transition-transform duration-500 group-hover:translate-x-[100%]" />
                {isSubmitting
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Account ban raha hai…</>
                  : "Account Banao — Free Hai! 🎉"
                }
              </button>
            </form>
          </div>

          <p className="mt-5 text-center text-sm" style={{ color: "var(--muted-text)" }}>
            Pehle se account hai?{" "}
            <Link href="/login" className="font-extrabold hover:underline ml-1" style={{ color: "var(--accent)" }}>
              Login Karo
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--page-bg)" }}>
        <div className="h-8 w-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--accent)" }} />
      </div>
    }>
      <SignupContent />
    </Suspense>
  );
}
