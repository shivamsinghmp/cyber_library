"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, Phone, Lock, ArrowLeft, Loader2, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type Step   = "request" | "reset" | "done";
type Method = "email" | "mobile";

const STEPS = [
  { key: "request", label: "Contact",        num: 1 },
  { key: "reset",   label: "Naya Password",  num: 2 },
  { key: "done",    label: "Ho Gaya!",       num: 3 },
] as const;

export default function ForgotPasswordPage() {
  const [step,   setStep]   = useState<Step>("request");
  const [method, setMethod] = useState<Method>("email");

  // identifiers
  const [email,  setEmail]  = useState("");
  const [phone,  setPhone]  = useState("");

  // display: masked email shown in UI (e.g. sh***@gmail.com)
  const [resolvedEmail,    setResolvedEmail]    = useState("");
  // actual email used in reset API call — never shown to user
  const [actualResetEmail, setActualResetEmail] = useState("");

  const [code,            setCode]            = useState("");
  const [password,        setPassword]        = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [message,    setMessage]    = useState<string | null>(null);
  const [error,      setError]      = useState<string | null>(null);
  const [showPw,     setShowPw]     = useState(false);
  const [showCpw,    setShowCpw]    = useState(false);

  const stepNum = step === "request" ? 1 : step === "reset" ? 2 : 3;

  function formatPhone(raw: string) {
    return raw.startsWith("+") ? raw : `+91${raw.replace(/^0+/, "")}`;
  }

  /* ── Step 1: send OTP ── */
  async function handleRequest(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setMessage(null);

    if (method === "email") {
      if (!email) { setError("Email daalo pehle."); return; }
      setSubmitting(true);
      try {
        const res  = await fetch("/api/auth/forgot-password/request-otp", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) { setError(data.error || "OTP nahi gaya. Dobara try karo."); return; }
        setResolvedEmail(email);
        setMessage("OTP bhej diya! Email inbox check karo.");
        setStep("reset");
      } catch { setError("Kuch gadbad ho gayi. Dobara try karo."); }
      finally   { setSubmitting(false); }

    } else {
      if (!phone || phone.length < 10) { setError("Valid mobile number daalo."); return; }
      setSubmitting(true);
      try {
        const res  = await fetch("/api/auth/forgot-password/request-otp-mobile", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phoneNumber: formatPhone(phone) }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) { setError(data.error || "OTP nahi gaya. Dobara try karo."); return; }
        // maskedEmail for display; resetEmail is the actual email used in reset API
        setResolvedEmail(data.maskedEmail || "");
        setActualResetEmail(data.resetEmail || "");
        setMessage(
          data.maskedEmail
            ? `OTP bheja gaya SMS/WhatsApp pe! (Email: ${data.maskedEmail})`
            : "Agar ye number registered hai toh OTP aa jaayega."
        );
        setStep("reset");
      } catch { setError("Kuch gadbad ho gayi. Dobara try karo."); }
      finally   { setSubmitting(false); }
    }
  }

  /* ── Step 2: verify OTP + reset password ── */
  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setMessage(null);
    if (!code || !password || !confirmPassword) { setError("Sab fields bharo."); return; }
    if (password !== confirmPassword)           { setError("Dono passwords same nahi hain."); return; }
    if (password.length < 8)                    { setError("Password kam se kam 8 characters hona chahiye."); return; }

    // For reset we always use the actual email key
    // Mobile flow: actualResetEmail holds the real email returned by OTP API
    // Email flow: user typed it directly
    const emailForReset = method === "email" ? email : actualResetEmail;
    if (!emailForReset) {
      setError("Kuch gadbad ho gayi — pehle se shuru karo.");
      setStep("request");
      return;
    }

    setSubmitting(true);
    try {
      const res  = await fetch("/api/auth/forgot-password/reset", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailForReset, code, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error || "Reset nahi hua. Code check karo aur dobara try karo."); return; }
      setStep("done");
    } catch { setError("Kuch gadbad ho gayi. Dobara try karo."); }
    finally   { setSubmitting(false); }
  }

  const inputCls = "w-full rounded-xl border bg-white py-2.5 text-sm font-medium outline-none transition focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--accent)]";
  const inputStyle = { borderColor: "var(--border)", color: "var(--foreground)" };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center px-4 py-16 relative overflow-hidden"
      style={{ background: "var(--page-bg)" }}>

      {/* Ambient orbs */}
      <div className="pointer-events-none absolute top-0 right-0 h-[400px] w-[400px] rounded-full blur-[120px]"
        style={{ background: "radial-gradient(circle, rgba(99,102,241,0.10), transparent)" }} />
      <div className="pointer-events-none absolute bottom-0 left-0 h-[300px] w-[300px] rounded-full blur-[100px]"
        style={{ background: "radial-gradient(circle, rgba(139,92,246,0.08), transparent)" }} />

      <div className="relative z-10 w-full max-w-[420px]">

        {/* Back link */}
        <Link href="/login"
          className="mb-6 inline-flex items-center gap-2 text-sm font-bold transition-colors hover:text-[var(--accent)]"
          style={{ color: "var(--muted-text)" }}>
          <ArrowLeft className="h-4 w-4" />
          Login pe wapas jao
        </Link>

        {/* Step progress */}
        <div className="mb-7 flex items-center gap-2">
          {STEPS.map((s, i) => {
            const done   = stepNum > s.num;
            const active = stepNum === s.num;
            return (
              <div key={s.key} className="flex items-center gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-extrabold transition-all duration-300"
                    style={{
                      background: done   ? "linear-gradient(135deg, #6366F1, #8B5CF6)"
                                : active ? "var(--foreground)"
                                :          "var(--border)",
                      color: done || active ? "white" : "var(--muted-text)",
                      boxShadow: active ? "0 4px 10px rgba(99,102,241,0.35)" : "none",
                    }}>
                    {done ? "✓" : s.num}
                  </div>
                  <span className="hidden sm:block text-xs font-bold"
                    style={{ color: active ? "var(--foreground)" : "var(--muted-text)" }}>
                    {s.label}
                  </span>
                </div>
                {i < 2 && (
                  <div className="mx-1 h-[2px] w-8 rounded-full transition-all duration-500"
                    style={{ background: stepNum > s.num ? "var(--accent)" : "var(--border)" }} />
                )}
              </div>
            );
          })}
        </div>

        {/* Card */}
        <div className="overflow-hidden rounded-2xl border bg-white"
          style={{ borderColor: "var(--border)", boxShadow: "var(--shadow-lg)" }}>

          {/* Top gradient strip */}
          <div className="h-[3px] w-full"
            style={{ background: "linear-gradient(to right, #6366F1, #8B5CF6, #06B6D4)" }} />

          <div className="p-7">
            <AnimatePresence mode="wait">

              {/* ── STEP 1: Method select + identifier input ── */}
              {step === "request" && (
                <motion.div key="request"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.25 }}>

                  {/* Icon */}
                  <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl"
                    style={{
                      background: method === "email"
                        ? "linear-gradient(145deg, #818CF8, #4F46E5)"
                        : "linear-gradient(145deg, #34D399, #059669)",
                      boxShadow: method === "email"
                        ? "0 2px 0 rgba(255,255,255,0.15) inset, 0 -3px 0 rgba(0,0,0,0.12) inset, 0 8px 20px rgba(99,102,241,0.40)"
                        : "0 2px 0 rgba(255,255,255,0.15) inset, 0 -3px 0 rgba(0,0,0,0.12) inset, 0 8px 20px rgba(5,150,105,0.40)",
                    }}>
                    {method === "email"
                      ? <Mail className="h-6 w-6 text-white" />
                      : <Phone className="h-6 w-6 text-white" />
                    }
                  </div>

                  <h1 className="text-xl font-extrabold mb-1" style={{ color: "var(--foreground)" }}>
                    Password Bhool Gaye? 😅
                  </h1>
                  <p className="text-sm mb-5" style={{ color: "var(--muted-text)" }}>
                    OTP kahan bhejna hai — pehle ye choose karo:
                  </p>

                  {/* Method toggle */}
                  <div className="mb-5 grid grid-cols-2 gap-2 rounded-xl border p-1"
                    style={{ borderColor: "var(--border)", background: "var(--page-bg)" }}>
                    {(["email", "mobile"] as Method[]).map((m) => (
                      <button key={m} type="button" onClick={() => { setMethod(m); setError(null); }}
                        className="flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-bold transition-all"
                        style={method === m ? {
                          background: "linear-gradient(135deg, #6366F1, #8B5CF6)",
                          color: "white",
                          boxShadow: "0 4px 12px rgba(99,102,241,0.35)",
                        } : {
                          background: "transparent",
                          color: "var(--muted-text)",
                        }}>
                        {m === "email"
                          ? <><Mail className="h-4 w-4" /> Email</>
                          : <><Phone className="h-4 w-4" /> Mobile</>
                        }
                      </button>
                    ))}
                  </div>

                  <form onSubmit={handleRequest} className="space-y-4">

                    <AnimatePresence mode="wait">
                      {method === "email" ? (
                        <motion.div key="email-field"
                          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                          transition={{ duration: 0.2 }}
                          className="space-y-1.5">
                          <label className="block text-[11px] font-extrabold uppercase tracking-widest"
                            style={{ color: "var(--foreground)" }}>
                            Registered Email Address
                          </label>
                          <div className="relative">
                            <Mail className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4"
                              style={{ color: "var(--muted-text)" }} />
                            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                              placeholder="tumhari@email.com"
                              className={`${inputCls} pl-10`} style={inputStyle} autoFocus />
                          </div>
                          <p className="text-[10px] font-semibold" style={{ color: "var(--muted-text)" }}>
                            OTP tumhare email inbox mein aayega
                          </p>
                        </motion.div>
                      ) : (
                        <motion.div key="mobile-field"
                          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                          transition={{ duration: 0.2 }}
                          className="space-y-1.5">
                          <label className="block text-[11px] font-extrabold uppercase tracking-widest"
                            style={{ color: "var(--foreground)" }}>
                            Registered Mobile Number
                          </label>
                          <div className="relative">
                            <Phone className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4"
                              style={{ color: "var(--muted-text)" }} />
                            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                              placeholder="+91 9876543210"
                              className={`${inputCls} pl-10`} style={inputStyle} autoFocus />
                          </div>
                          <p className="text-[10px] font-semibold" style={{ color: "var(--muted-text)" }}>
                            OTP SMS ya WhatsApp pe aayega us number pe
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {error && (
                      <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                        <span>❌</span>
                        <p className="text-sm font-semibold text-red-600">{error}</p>
                      </div>
                    )}

                    <button type="submit" disabled={submitting}
                      className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl py-3 text-sm font-extrabold text-white transition-all hover:scale-[1.02] disabled:opacity-60"
                      style={{
                        background: method === "email"
                          ? "linear-gradient(135deg, #6366F1, #8B5CF6)"
                          : "linear-gradient(135deg, #10B981, #059669)",
                        boxShadow: method === "email"
                          ? "0 6px 20px rgba(99,102,241,0.35)"
                          : "0 6px 20px rgba(16,185,129,0.35)",
                      }}>
                      <span className="absolute inset-0 translate-x-[-100%] skew-x-12 bg-white/10 transition-transform duration-500 group-hover:translate-x-[100%]" />
                      {submitting
                        ? <><Loader2 className="h-4 w-4 animate-spin" /> Bhej raha hoon…</>
                        : method === "email"
                          ? "Email pe OTP Bhejo 📨"
                          : "Mobile pe OTP Bhejo 📱"
                      }
                    </button>
                  </form>
                </motion.div>
              )}

              {/* ── STEP 2: OTP + new password ── */}
              {step === "reset" && (
                <motion.div key="reset"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.25 }}>

                  {/* Icon */}
                  <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl"
                    style={{
                      background: "linear-gradient(145deg, #A78BFA, #7C3AED)",
                      boxShadow: "0 2px 0 rgba(255,255,255,0.15) inset, 0 -3px 0 rgba(0,0,0,0.12) inset, 0 8px 20px rgba(124,58,237,0.40)",
                    }}>
                    <ShieldCheck className="h-6 w-6 text-white" />
                  </div>

                  <h1 className="text-xl font-extrabold mb-1" style={{ color: "var(--foreground)" }}>
                    OTP Check Karo 🔐
                  </h1>

                  {/* Show where OTP was sent */}
                  <div className="mb-5 flex items-center gap-2.5 rounded-xl border px-4 py-3"
                    style={{ borderColor: "var(--accent-border)", background: "var(--accent-pale)" }}>
                    {method === "email"
                      ? <Mail className="h-4 w-4 shrink-0" style={{ color: "var(--accent)" }} />
                      : <Phone className="h-4 w-4 shrink-0" style={{ color: "var(--accent)" }} />
                    }
                    <div>
                      <p className="text-xs font-extrabold uppercase tracking-wider" style={{ color: "var(--accent)" }}>
                        OTP bheja gaya {method === "email" ? "Email pe" : "Mobile pe"}
                      </p>
                      <p className="text-sm font-bold mt-0.5" style={{ color: "var(--foreground)" }}>
                        {method === "email" ? email : (resolvedEmail || formatPhone(phone))}
                      </p>
                    </div>
                  </div>

                  {message && (
                    <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                      <span>✅</span>
                      <p className="text-sm font-semibold text-emerald-700">{message}</p>
                    </div>
                  )}

                  <form onSubmit={handleReset} className="space-y-4">

                    {/* OTP box */}
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-extrabold uppercase tracking-widest"
                        style={{ color: "var(--foreground)" }}>
                        6-Digit OTP Code
                      </label>
                      <input type="text" inputMode="numeric" maxLength={6}
                        value={code}
                        onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        placeholder="• • • • • •"
                        className={`${inputCls} text-center tracking-[0.5em] font-mono text-xl`}
                        style={inputStyle} autoFocus />
                      <p className="text-[10px] font-semibold" style={{ color: "var(--muted-text)" }}>
                        Code 10 minute mein expire ho jaayega ⏱
                      </p>
                    </div>

                    {/* New password */}
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-extrabold uppercase tracking-widest"
                        style={{ color: "var(--foreground)" }}>
                        Naya Password
                      </label>
                      <div className="relative">
                        <Lock className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4"
                          style={{ color: "var(--muted-text)" }} />
                        <input type={showPw ? "text" : "password"} value={password}
                          onChange={e => setPassword(e.target.value)}
                          placeholder="Min 8 characters"
                          className={`${inputCls} pl-10 pr-10`} style={inputStyle} />
                        <button type="button" onClick={() => setShowPw(!showPw)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors hover:text-[var(--accent)]"
                          style={{ color: "var(--muted-text)" }}>
                          {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Confirm password */}
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-extrabold uppercase tracking-widest"
                        style={{ color: "var(--foreground)" }}>
                        Password Dobara Daalo
                      </label>
                      <div className="relative">
                        <Lock className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4"
                          style={{ color: "var(--muted-text)" }} />
                        <input type={showCpw ? "text" : "password"} value={confirmPassword}
                          onChange={e => setConfirmPassword(e.target.value)}
                          placeholder="Same password again"
                          className={`${inputCls} pl-10 pr-10`} style={inputStyle} />
                        <button type="button" onClick={() => setShowCpw(!showCpw)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors hover:text-[var(--accent)]"
                          style={{ color: "var(--muted-text)" }}>
                          {showCpw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    {error && (
                      <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                        <span>❌</span>
                        <p className="text-sm font-semibold text-red-600">{error}</p>
                      </div>
                    )}

                    <button type="submit" disabled={submitting}
                      className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl py-3 text-sm font-extrabold text-white transition-all hover:scale-[1.02] disabled:opacity-60"
                      style={{
                        background: "linear-gradient(135deg, #8B5CF6, #6366F1)",
                        boxShadow: "0 6px 20px rgba(139,92,246,0.35)",
                      }}>
                      <span className="absolute inset-0 translate-x-[-100%] skew-x-12 bg-white/10 transition-transform duration-500 group-hover:translate-x-[100%]" />
                      {submitting
                        ? <><Loader2 className="h-4 w-4 animate-spin" /> Update ho raha hai…</>
                        : "Password Update Karo 🔒"
                      }
                    </button>

                    <button type="button"
                      onClick={() => { setStep("request"); setError(null); setMessage(null); setCode(""); }}
                      className="w-full text-center text-xs font-bold transition-colors hover:text-[var(--accent)]"
                      style={{ color: "var(--muted-text)" }}>
                      ← Method badalna hai? Wapas jao
                    </button>
                  </form>
                </motion.div>
              )}

              {/* ── STEP 3: Done ── */}
              {step === "done" && (
                <motion.div key="done"
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  className="py-4 text-center">

                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.1, type: "spring", bounce: 0.5 }}
                    className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full text-5xl"
                    style={{
                      background: "linear-gradient(135deg, #ECFDF5, #D1FAE5)",
                      border: "3px solid #A7F3D0",
                      boxShadow: "0 8px 24px rgba(16,185,129,0.25)",
                    }}>
                    🎉
                  </motion.div>

                  <motion.h1
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-2xl font-extrabold mb-2" style={{ color: "var(--foreground)" }}>
                    Password Update Ho Gaya!
                  </motion.h1>

                  <motion.p
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="text-sm mb-8 leading-relaxed" style={{ color: "var(--muted-text)" }}>
                    Tera naya password set ho gaya. <br />
                    Ab login karke padhai shuru karo! 📚
                  </motion.p>

                  <motion.div
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}>
                    <Link href="/login"
                      className="group relative inline-flex items-center gap-2 overflow-hidden rounded-xl px-8 py-3 text-sm font-extrabold text-white transition-all hover:scale-105"
                      style={{
                        background: "linear-gradient(135deg, #6366F1, #8B5CF6)",
                        boxShadow: "0 6px 20px rgba(99,102,241,0.40)",
                      }}>
                      <span className="absolute inset-0 translate-x-[-100%] skew-x-12 bg-white/10 transition-transform duration-500 group-hover:translate-x-[100%]" />
                      Login Karo →
                    </Link>
                  </motion.div>
                </motion.div>
              )}

            </AnimatePresence>
          </div>
        </div>

        {step !== "done" && (
          <p className="mt-5 text-center text-sm" style={{ color: "var(--muted-text)" }}>
            Password yaad aa gaya?{" "}
            <Link href="/login" className="font-extrabold hover:underline" style={{ color: "var(--accent)" }}>
              Login Karo
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
