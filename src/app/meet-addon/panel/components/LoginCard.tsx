"use client";

import { useState } from "react";
import { Loader2, KeyRound, Mail, Eye, EyeOff } from "lucide-react";

type Props = { onLogin: (token: string) => void };

export function LoginCard({ onLogin }: Props) {
  const [authTab, setAuthTab] = useState<"code" | "email">("code");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [linkCode, setLinkCode] = useState("");
  const [linkCodeError, setLinkCodeError] = useState("");
  const [linkCodeLoading, setLinkCodeLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginError("");
    if (!email.toLowerCase().endsWith("@gmail.com")) {
      setLoginError("Only @gmail.com emails are allowed");
      return;
    }
    setLoginLoading(true);
    try {
      const res = await fetch("/api/meet-addon/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (res.ok && data.token) {
        if (data.name) localStorage.setItem("vl_meet_addon_name", data.name);
        onLogin(data.token);
      } else {
        setLoginError(data.error || "Login failed");
      }
    } catch {
      setLoginError("Network connection error");
    } finally {
      setLoginLoading(false);
    }
  }

  async function handleLinkWithCode(e: React.FormEvent) {
    e.preventDefault();
    const code = linkCode.replace(/\D/g, "").slice(0, 6);
    if (code.length !== 6) return setLinkCodeError("Enter 6 digits");
    setLinkCodeError("");
    setLinkCodeLoading(true);
    try {
      const res = await fetch("/api/meet-addon/link-with-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (res.ok && data.token) {
        if (data.name) localStorage.setItem("vl_meet_addon_name", data.name);
        onLogin(data.token);
      } else {
        setLinkCodeError(data.error || "Invalid code");
      }
    } catch {
      setLinkCodeError("Network error");
    } finally {
      setLinkCodeLoading(false);
    }
  }

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center p-4 relative overflow-hidden" style={{ background: "var(--page-bg)" }}>

      {/* Home-page style background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(circle, #6366F122 1px, transparent 1px)", backgroundSize: "28px 28px" }} />
        <div className="absolute -top-32 right-0 h-[400px] w-[400px] rounded-full blur-[100px]"
          style={{ background: "radial-gradient(circle, rgba(139,92,246,0.18) 0%, rgba(99,102,241,0.08) 60%, transparent 100%)" }} />
        <div className="absolute bottom-0 -left-16 h-[300px] w-[300px] rounded-full blur-[80px]"
          style={{ background: "radial-gradient(circle, rgba(6,182,212,0.12) 0%, transparent 70%)" }} />
      </div>

      <div className="w-full max-w-sm z-10 space-y-5">

        {/* Brand */}
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-[0_8px_32px_rgba(99,102,241,0.25)]"
            style={{ background: "linear-gradient(135deg, #6366F1, #8B5CF6)" }}>
            <span className="text-2xl">📚</span>
          </div>
          <h1 className="text-lg font-black tracking-widest text-[#0F172A] uppercase">Cyber Library</h1>
          <p className="text-xs text-[#64748B] mt-1">Sign in to sync your study session</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-[#C7D2FE] shadow-[0_8px_40px_rgba(99,102,241,0.12)] overflow-hidden">

          {/* Gradient top bar */}
          <div className="h-1" style={{ background: "linear-gradient(135deg, #6366F1, #8B5CF6, #06B6D4)" }} />

          {/* Tabs */}
          <div className="flex border-b border-[#E2E8F0] text-[11px] uppercase tracking-widest font-bold">
            <button onClick={() => setAuthTab("code")}
              className={`flex-1 py-3.5 text-center transition-colors ${authTab === "code"
                ? "bg-[#EEF2FF] text-[#6366F1] shadow-[inset_0_-2px_0_#6366F1]"
                : "text-[#94A3B8] hover:bg-[#F8FAFF] hover:text-[#334155]"}`}>
              Passcode
            </button>
            <button onClick={() => setAuthTab("email")}
              className={`flex-1 py-3.5 text-center transition-colors ${authTab === "email"
                ? "bg-[#EEF2FF] text-[#6366F1] shadow-[inset_0_-2px_0_#6366F1]"
                : "text-[#94A3B8] hover:bg-[#F8FAFF] hover:text-[#334155]"}`}>
              Web Email
            </button>
          </div>

          <div className="p-6">
            {authTab === "code" ? (
              <form onSubmit={handleLinkWithCode} className="space-y-4">
                <div className="text-center">
                  <div className="w-10 h-10 rounded-xl bg-[#EEF2FF] border border-[#C7D2FE] flex items-center justify-center mx-auto mb-3">
                    <KeyRound className="w-5 h-5 text-[#6366F1]" />
                  </div>
                  <p className="text-xs text-[#64748B] leading-relaxed">
                    Go to <strong className="text-[#334155]">Dashboard → Meet Add-on</strong> and generate a 6-digit link code
                  </p>
                </div>
                <input
                  type="text" inputMode="numeric" pattern="[0-9]*" maxLength={6}
                  placeholder="000 000"
                  value={linkCode}
                  onChange={(e) => { setLinkCode(e.target.value.replace(/\D/g, "").slice(0, 6)); setLinkCodeError(""); }}
                  className="w-full rounded-xl border border-[#C7D2FE] bg-[#F8FAFF] px-4 py-3.5 text-center font-mono text-2xl tracking-[0.4em] text-[#0F172A] focus:border-[#6366F1] focus:ring-2 focus:ring-[#6366F1]/15 focus:outline-none transition-colors placeholder:text-[#C7D2FE]"
                />
                {linkCodeError && (
                  <p className="text-rose-500 text-[10px] text-center font-bold uppercase tracking-wider bg-rose-50 border border-rose-200 rounded-lg py-2">{linkCodeError}</p>
                )}
                <button type="submit" disabled={linkCodeLoading || linkCode.length !== 6}
                  className="w-full py-3 rounded-xl text-white font-bold text-sm transition-all disabled:opacity-40 flex items-center justify-center gap-2 shadow-[0_4px_16px_rgba(99,102,241,0.3)]"
                  style={{ background: "linear-gradient(135deg, #6366F1, #8B5CF6)" }}>
                  {linkCodeLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                  {linkCodeLoading ? "Linking…" : "Link Add-on"}
                </button>
              </form>
            ) : (
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-[#334155] block mb-1.5">Email Address</label>
                    <input type="email" placeholder="student@gmail.com"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setLoginError(""); }}
                      required
                      className="w-full rounded-xl border border-[#C7D2FE] bg-[#F8FAFF] px-4 py-3 text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:border-[#6366F1] focus:ring-2 focus:ring-[#6366F1]/15 focus:outline-none transition-colors"
                    />
                    {email && !email.toLowerCase().endsWith("@gmail.com") && (
                      <p className="text-rose-500 text-[10px] font-bold mt-1 px-1">⚠ Only @gmail.com allowed</p>
                    )}
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[#334155] block mb-1.5">Password</label>
                    <div className="relative">
                      <input type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="w-full rounded-xl border border-[#C7D2FE] bg-[#F8FAFF] px-4 py-3 pr-11 text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:border-[#6366F1] focus:ring-2 focus:ring-[#6366F1]/15 focus:outline-none transition-colors"
                      />
                      <button type="button" onClick={() => setShowPassword(p => !p)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#6366F1] transition-colors p-1">
                        {showPassword
                          ? <EyeOff className="w-4 h-4" />
                          : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {loginError && (
                  <p className="text-rose-500 text-[10px] font-bold text-center uppercase tracking-wider bg-rose-50 border border-rose-200 rounded-lg py-2">{loginError}</p>
                )}

                <button type="submit" disabled={loginLoading}
                  className="w-full py-3 rounded-xl text-white font-bold text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-[0_4px_16px_rgba(99,102,241,0.3)]"
                  style={{ background: "linear-gradient(135deg, #6366F1, #8B5CF6)" }}>
                  {loginLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                  {loginLoading ? "Signing in…" : "Sign In"}
                </button>

                <div className="pt-3 text-center border-t border-[#E2E8F0] mt-2">
                  <p className="text-[10px] text-[#94A3B8] mb-2 uppercase tracking-wider">New here?</p>
                  <a href="/signup" target="_blank" rel="noopener noreferrer"
                    className="inline-block w-full rounded-xl border-2 border-[#C7D2FE] text-[#6366F1] py-2.5 text-xs font-bold hover:bg-[#EEF2FF] hover:border-[#6366F1] transition-colors">
                    Create Account
                  </a>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
