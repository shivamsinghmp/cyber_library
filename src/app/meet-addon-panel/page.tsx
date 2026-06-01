"use client";

import { useEffect, useState, useRef, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";

// ─── Types ────────────────────────────────────────────────────────────────────

type Screen = "login" | "detecting" | "waiting" | "confirmed" | "no_slot" | "error";
type SlotInfo = { id: string; name: string; timeLabel: string; roomId: string };

const REQUIRED_SECONDS = 10 * 60;

function extractMeetCode(raw: string): string {
  return raw.replace("https://meet.google.com/", "").split("?")[0].trim();
}

// ─── Panel ───────────────────────────────────────────────────────────────────

function AddonPanel() {
  const searchParams = useSearchParams();
  const meetCodeFromUrl = extractMeetCode(
    searchParams.get("meetingCode") ??
    searchParams.get("meeting_code") ??
    searchParams.get("meetingId") ?? ""
  );

  const [screen, setScreen]           = useState<Screen>("login");
  const [codeInput, setCodeInput]     = useState("");
  const [email, setEmail]             = useState("");
  const [password, setPassword]       = useState("");
  const [authError, setAuthError]     = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  const [token, setToken]             = useState<string | null>(null);
  const [userName, setUserName]       = useState("");
  const [slot, setSlot]               = useState<SlotInfo | null>(null);
  const [sessionId, setSessionId]     = useState<string | null>(null);
  const [meetCode, setMeetCode]       = useState(meetCodeFromUrl);
  const [manualInput, setManualInput] = useState("");
  const [elapsed, setElapsed]         = useState(0);
  const [confirming, setConfirming]   = useState(false);
  const [alreadyCheckedIn, setAlreadyCheckedIn] = useState(false);

  const heartbeatRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const confirmedRef  = useRef(false);

  // ── Restore saved token ──────────────────────────────────────────────────────
  useEffect(() => {
    const saved = localStorage.getItem("meet_addon_token");
    if (saved) setToken(saved);
  }, []);

  // ── Link code login ──────────────────────────────────────────────────────────
  async function loginWithCode() {
    if (codeInput.length !== 6) { setAuthError("6-digit code daalo."); return; }
    setAuthLoading(true); setAuthError(null);
    const res = await fetch("/api/meet-addon/link-with-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: codeInput }),
    }).catch(() => null);
    if (!res?.ok) {
      setAuthError((await res?.json().catch(() => ({}))).error || "Code galat hai.");
      setAuthLoading(false); return;
    }
    const d = await res.json();
    localStorage.setItem("meet_addon_token", d.token);
    setToken(d.token); setAuthLoading(false);
  }

  // ── Fallback: password login ───────────────────────────────────────────────
  async function loginWithPassword() {
    if (!email || !password) { setAuthError("Email aur password daalo."); return; }
    setAuthLoading(true); setAuthError(null);
    const res = await fetch("/api/meet-addon/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    }).catch(() => null);
    if (!res?.ok) {
      setAuthError((await res?.json().catch(() => ({}))).error || "Login fail hua.");
      setAuthLoading(false); return;
    }
    const d = await res.json();
    localStorage.setItem("meet_addon_token", d.token);
    setToken(d.token); setUserName(d.name || ""); setAuthLoading(false);
  }

  // ── Fetch user name ───────────────────────────────────────────────────────
  const fetchMe = useCallback(async (tok: string) => {
    const res = await fetch("/api/meet-addon/me", { headers: { Authorization: `Bearer ${tok}` } });
    if (res.status === 401) { localStorage.removeItem("meet_addon_token"); setToken(null); return; }
    if (res.ok) setUserName((await res.json()).name || "");
  }, []);

  // ── Join presence + detect slot ───────────────────────────────────────────
  const startSession = useCallback(async (tok: string, code: string) => {
    setScreen("detecting");
    try {
      const res = await fetch("/api/meet-addon/presence", {
        method: "POST",
        headers: { Authorization: `Bearer ${tok}`, "Content-Type": "application/json" },
        body: JSON.stringify({ roomKey: code, event: "join" }),
      });
      const data = await res.json();
      if (!res.ok) { setScreen("error"); return; }
      setSessionId(data.sessionId ?? null);
      if (data.detectedSlot) {
        setSlot(data.detectedSlot);
        setScreen("waiting");
        startTracking(tok, code, data.sessionId);
      } else {
        setScreen("no_slot");
      }
    } catch { setScreen("error"); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Heartbeat + 10-min countdown ─────────────────────────────────────────
  function startTracking(tok: string, code: string, sid: string | null) {
    confirmedRef.current = false;
    heartbeatRef.current = setInterval(async () => {
      await fetch("/api/meet-addon/presence", {
        method: "POST",
        headers: { Authorization: `Bearer ${tok}`, "Content-Type": "application/json" },
        body: JSON.stringify({ roomKey: code, event: "ping" }),
      }).catch(() => {});
    }, 30_000);
    let count = 0;
    elapsedRef.current = setInterval(async () => {
      count++;
      setElapsed(count);
      if (count >= REQUIRED_SECONDS && !confirmedRef.current) {
        confirmedRef.current = true;
        clearInterval(elapsedRef.current!);
        await confirmAttendance(tok, sid);
      }
    }, 1000);
  }

  const confirmAttendance = useCallback(async (tok: string, sid: string | null) => {
    setConfirming(true);
    setSlot(prev => {
      if (!prev) return prev;
      (async () => {
        const res = await fetch("/api/meet-addon/confirm-attendance", {
          method: "POST",
          headers: { Authorization: `Bearer ${tok}`, "Content-Type": "application/json" },
          body: JSON.stringify({ slotId: prev.id, sessionId: sid }),
        });
        if (res.ok) {
          const d = await res.json();
          setAlreadyCheckedIn(d.alreadyCheckedIn);
          setScreen("confirmed");
        }
        setConfirming(false);
      })();
      return prev;
    });
  }, []);

  // ── On token ready → start flow ───────────────────────────────────────────
  useEffect(() => {
    if (!token || !meetCode) return;
    fetchMe(token);
    startSession(token, meetCode);
    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      if (elapsedRef.current)   clearInterval(elapsedRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, meetCode]);

  function logout() {
    [heartbeatRef, elapsedRef].forEach(r => { if (r.current) clearInterval(r.current); });
    localStorage.removeItem("meet_addon_token");
    setToken(null); setScreen("login"); setSlot(null); setElapsed(0); setSessionId(null);
  }

  const remaining = Math.max(0, REQUIRED_SECONDS - elapsed);
  const progressPct = Math.min(100, (elapsed / REQUIRED_SECONDS) * 100);

  // ─── UI ────────────────────────────────────────────────────────────────────
  return (
    <div style={s.wrap}>

      {/* Header */}
      <div style={s.header}>
        <img src="/logo.png" alt="" style={{ height: 20, width: 20, borderRadius: 5 }} />
        <span style={s.brand}>Let's Study</span>
        {token && <button style={s.logoutBtn} onClick={logout}>Logout</button>}
      </div>

      {/* ── LOGIN ── */}
      {screen === "login" && (
        <div style={s.section}>
          {!token ? (
            <>
              <p style={s.heading}>Login karo</p>
              <p style={s.hint}>Dashboard → Meet Add-on → "Code Generate Karo"</p>
              <input style={s.input} placeholder="6-digit code" inputMode="numeric"
                maxLength={6} value={codeInput}
                onChange={e => setCodeInput(e.target.value.replace(/\D/g,"").slice(0,6))} />
              <button style={s.btn} disabled={authLoading} onClick={loginWithCode}>
                {authLoading ? "Logging in…" : "Code se Login"}
              </button>
              {authError && <p style={s.err}>{authError}</p>}
              <details style={{ marginTop: 4 }}>
                <summary style={{ ...s.linkBtn, cursor: "pointer" }}>Password se login karo</summary>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
                  <input style={s.input} placeholder="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} />
                  <input style={s.input} placeholder="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} />
                  <button style={s.btn} disabled={authLoading} onClick={loginWithPassword}>Login</button>
                </div>
              </details>
            </>
          ) : (
            // Logged in but no meetCode from URL
            <>
              {userName && <p style={s.hint}>👋 {userName}</p>}
              <p style={s.heading}>Meet link daalo</p>
              <input style={s.input} placeholder="meet.google.com/abc-def-ghi"
                value={manualInput} onChange={e => setManualInput(e.target.value)} />
              <button style={s.btn} onClick={() => {
                const c = extractMeetCode(manualInput);
                if (c) setMeetCode(c);
              }}>Detect Karo</button>
            </>
          )}
        </div>
      )}

      {/* ── DETECTING ── */}
      {screen === "detecting" && (
        <div style={{ ...s.section, alignItems: "center", justifyContent: "center", flex: 1 }}>
          <div style={s.spinner} />
          <p style={{ ...s.hint, marginTop: 10 }}>Slot detect ho rahi hai…</p>
        </div>
      )}

      {/* ── WAITING ── */}
      {screen === "waiting" && slot && (
        <div style={s.section}>
          {userName && <p style={{ ...s.hint, marginBottom: 4 }}>👋 {userName}</p>}
          <div style={s.slotCard}>
            <p style={s.slotLabel}>📚 Slot Detected</p>
            <p style={s.slotName}>{slot.name}</p>
            <p style={s.slotTime}>{slot.timeLabel}</p>
          </div>
          <div style={s.progressWrap}>
            <div style={{ ...s.progressBar, width: `${progressPct}%` }} />
          </div>
          <p style={s.waitText}>
            {confirming
              ? "Attendance record ho rahi hai…"
              : remaining > 0
              ? `${Math.floor(remaining / 60)}m ${remaining % 60}s baad attendance mark hogi`
              : "Confirming…"}
          </p>
        </div>
      )}

      {/* ── CONFIRMED ── */}
      {screen === "confirmed" && slot && (
        <div style={{ ...s.section, alignItems: "center" }}>
          <div style={s.checkmark}>✓</div>
          <p style={s.confirmedText}>
            {alreadyCheckedIn ? "Aaj pehle se mark hai!" : "Attendance ho gayi!"}
          </p>
          {userName && <p style={s.hint}>{userName}</p>}
          <div style={{ ...s.slotCard, width: "100%" }}>
            <p style={s.slotLabel}>📚 {slot.name}</p>
            <p style={s.slotTime}>{slot.timeLabel}</p>
          </div>
        </div>
      )}

      {/* ── NO SLOT ── */}
      {screen === "no_slot" && (
        <div style={s.section}>
          <p style={{ textAlign: "center", fontSize: 26, margin: 0 }}>🔍</p>
          <p style={s.heading}>Slot nahi mila</p>
          <p style={s.hint}>Is Meet se koi study room match nahi hua. Admin se check karo ki slot ka Meet link correct set hai.</p>
          <input style={{ ...s.input, marginTop: 6 }} placeholder="Aur Meet link try karo"
            value={manualInput} onChange={e => setManualInput(e.target.value)} />
          <button style={s.btn} onClick={() => {
            const c = extractMeetCode(manualInput);
            if (c && token) { setMeetCode(c); startSession(token, c); }
          }}>Try Karo</button>
        </div>
      )}

      {/* ── ERROR ── */}
      {screen === "error" && (
        <div style={{ ...s.section, alignItems: "center" }}>
          <p style={{ fontSize: 26 }}>⚠️</p>
          <p style={s.heading}>Kuch gadbad ho gayi</p>
          <button style={s.btn} onClick={() => { if (token && meetCode) startSession(token, meetCode); }}>
            Dobara Try Karo
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s: Record<string, React.CSSProperties> = {
  wrap: {
    fontFamily: "system-ui, -apple-system, sans-serif",
    background: "#0f0f13", minHeight: "100dvh", color: "#f5f2ea",
    display: "flex", flexDirection: "column",
  },
  header: {
    display: "flex", alignItems: "center", gap: 8,
    padding: "10px 14px", borderBottom: "1px solid rgba(255,255,255,0.07)",
  },
  brand: { fontSize: 12, fontWeight: 700, flex: 1, color: "#c3bfb3" },
  logoutBtn: { fontSize: 10, color: "#555", background: "none", border: "none", cursor: "pointer" },
  section: { padding: "14px", display: "flex", flexDirection: "column", gap: 10, flex: 1 },
  heading: { fontSize: 14, fontWeight: 800, color: "#f5f2ea", margin: 0 },
  hint: { fontSize: 11, color: "#888", margin: 0, lineHeight: 1.5 },
  input: {
    width: "100%", boxSizing: "border-box" as const,
    background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 8, padding: "8px 10px", color: "#f5f2ea", fontSize: 13, outline: "none",
  },
  btn: {
    width: "100%", background: "linear-gradient(135deg,#6366F1,#8B5CF6)",
    color: "#fff", border: "none", borderRadius: 8, padding: "10px",
    fontSize: 13, fontWeight: 700, cursor: "pointer",
  },
  linkBtn: { fontSize: 11, color: "#818cf8", background: "none", border: "none", cursor: "pointer", textAlign: "left" as const, padding: 0 },
  err: { fontSize: 11, color: "#f87171", margin: 0 },
  slotCard: {
    background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)",
    borderRadius: 12, padding: "12px 14px",
  },
  slotLabel: { fontSize: 9, fontWeight: 800, color: "#818cf8", textTransform: "uppercase" as const, letterSpacing: "0.12em", margin: "0 0 4px" },
  slotName: { fontSize: 15, fontWeight: 800, color: "#f5f2ea", margin: 0 },
  slotTime: { fontSize: 11, color: "#888", margin: "2px 0 0" },
  progressWrap: { height: 4, background: "rgba(255,255,255,0.07)", borderRadius: 99, overflow: "hidden" },
  progressBar: { height: "100%", background: "linear-gradient(90deg,#6366F1,#8B5CF6)", borderRadius: 99, transition: "width 1s linear" },
  waitText: { fontSize: 12, color: "#a5b4fc", fontWeight: 600, textAlign: "center" as const },
  checkmark: {
    width: 52, height: 52, borderRadius: "50%",
    background: "rgba(16,185,129,0.12)", border: "2px solid rgba(16,185,129,0.35)",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 22, color: "#10b981", margin: "4px auto 0",
  },
  confirmedText: { fontSize: 15, fontWeight: 800, textAlign: "center" as const, color: "#10b981" },
  spinner: {
    width: 24, height: 24, borderRadius: "50%",
    border: "2px solid rgba(255,255,255,0.08)", borderTopColor: "#6366F1",
    animation: "spin 0.8s linear infinite",
  },
};

export default function MeetAddonPanelPage() {
  return (
    <Suspense fallback={
      <div style={{ background: "#0f0f13", minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "#555", fontSize: 12 }}>Loading…</p>
      </div>
    }>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <AddonPanel />
    </Suspense>
  );
}
