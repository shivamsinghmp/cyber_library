"use client";

import { useState } from "react";
import { Loader2, ClipboardList } from "lucide-react";

type Props = {
  onLogin: (token: string) => void;
};

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
    <div className="min-h-[100dvh] bg-[var(--background)] text-[var(--foreground)] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_50%_0%,_var(--accent)_0%,_transparent_60%)] mix-blend-hard-light animate-[mesh]" />

      <div className="w-full max-w-sm z-10 space-y-4">
        <div className="text-center mb-6">
          <h1 className="text-lg font-extrabold flex items-center justify-center gap-1.5 tracking-widest text-[var(--cream)] uppercase">
            <ClipboardList className="w-5 h-5 text-[var(--wood)]" />
            Identify Scholar
          </h1>
        </div>

        <div className="rounded-[1.5rem] border border-[var(--wood)]/20 bg-[var(--ink)]/40 backdrop-blur-md shadow-[0_12px_40px_rgba(0,0,0,0.5)] overflow-hidden">
          {/* Tab switcher */}
          <div className="flex border-b border-[var(--wood)]/10 text-[11px] uppercase tracking-widest font-bold">
            <button
              onClick={() => setAuthTab("code")}
              className={`flex-1 py-4 text-center transition-colors ${authTab === "code" ? "bg-[var(--accent)]/10 text-[var(--accent)] shadow-[inset_0_-2px_0_var(--accent)]" : "text-[var(--wood)] hover:bg-[var(--ink)]/40"}`}
            >
              Passcode
            </button>
            <button
              onClick={() => setAuthTab("email")}
              className={`flex-1 py-4 text-center transition-colors ${authTab === "email" ? "bg-[var(--accent)]/10 text-[var(--accent)] shadow-[inset_0_-2px_0_var(--accent)]" : "text-[var(--wood)] hover:bg-[var(--ink)]/40"}`}
            >
              Web Email
            </button>
          </div>

          <div className="p-6">
            {authTab === "code" ? (
              <form onSubmit={handleLinkWithCode} className="space-y-4">
                <input
                  type="text" inputMode="numeric" pattern="[0-9]*" maxLength={6}
                  placeholder="000 000"
                  value={linkCode}
                  onChange={(e) => { setLinkCode(e.target.value.replace(/\D/g, "").slice(0, 6)); setLinkCodeError(""); }}
                  className="w-full rounded-xl border border-[var(--wood)]/30 bg-[var(--background)]/80 px-4 py-3 text-center font-mono text-2xl tracking-[0.4em] text-[var(--cream)] shadow-inner focus:border-[var(--accent)]/50 focus:outline-none transition-colors placeholder:text-[var(--wood)]/40"
                />
                {linkCodeError && <p className="text-red-400 text-[10px] text-center font-bold uppercase tracking-wider">{linkCodeError}</p>}
                <button
                  type="submit"
                  disabled={linkCodeLoading || linkCode.length !== 6}
                  className="w-full rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--ink)] py-3 text-[11px] font-extrabold tracking-[0.2em] uppercase flex items-center justify-center gap-2 shadow-[0_4px_16px_rgba(154,130,100,0.3)] transition-all disabled:opacity-30 hover:scale-105"
                >
                  {linkCodeLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Link Add-on Dashboard"}
                </button>
                <p className="text-[9px] text-[var(--wood)] font-medium text-center uppercase tracking-wider pt-2">
                  From web app layout → get link code
                </p>
              </form>
            ) : (
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1">
                  <input
                    type="email" placeholder="Student Email (@gmail.com)"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setLoginError(""); }}
                    required
                    className="w-full rounded-[1rem] border border-[var(--wood)]/20 bg-[var(--background)]/60 px-4 py-3 text-xs font-semibold text-[var(--cream)] focus:border-[var(--accent)]/50 focus:outline-none focus:bg-[var(--background)]/90 transition-colors"
                  />
                  {email && !email.toLowerCase().endsWith("@gmail.com") && (
                    <p className="text-red-400 text-[10px] font-bold px-1">⚠ Only @gmail.com emails allowed</p>
                  )}
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Key Phrase"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full rounded-[1rem] border border-[var(--wood)]/20 bg-[var(--background)]/60 px-4 py-3 pr-11 text-xs font-semibold text-[var(--cream)] focus:border-[var(--accent)]/50 focus:outline-none focus:bg-[var(--background)]/90 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--wood)] hover:text-[var(--cream)] transition-colors p-1"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                        <line x1="1" y1="1" x2="23" y2="23"/>
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                    )}
                  </button>
                </div>
                {loginError && <p className="text-red-400 text-[10px] font-bold text-center uppercase tracking-wider">{loginError}</p>}
                <button
                  type="submit"
                  disabled={loginLoading}
                  className="w-full rounded-[1rem] border border-[var(--wood)]/30 bg-[var(--ink)] hover:bg-[var(--ink)]/80 text-[var(--cream)] py-3 text-[11px] tracking-widest uppercase font-extrabold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                  {loginLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Secure Log In"}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
