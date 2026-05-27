"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Brain, ChevronLeft, CheckCircle, AlertCircle,
  Eye, EyeOff, Save, Loader2, ExternalLink, FlaskConical, Music2,
} from "lucide-react";
import toast from "react-hot-toast";

type KeyStatus = { hasValue: boolean };
type AllStatus = Record<string, KeyStatus>;

type ProviderConfig = {
  id: "ANTHROPIC_API_KEY" | "OPENAI_API_KEY" | "YOUTUBE_API_KEY";
  label: string;
  provider: string;
  color: string;
  bg: string;
  border: string;
  placeholder: string;
  docsUrl: string;
  docsLabel: string;
  hint: string;
};

const PROVIDERS: ProviderConfig[] = [
  {
    id: "ANTHROPIC_API_KEY",
    label: "Anthropic Claude",
    provider: "Anthropic Console",
    color: "text-amber-600",
    bg: "bg-amber-50",
    border: "border-amber-200",
    placeholder: "sk-ant-...",
    docsUrl: "https://console.anthropic.com/account/keys",
    docsLabel: "Get Anthropic key",
    hint: "Claude Haiku, Sonnet, Opus — mid to premium tier",
  },
  {
    id: "OPENAI_API_KEY",
    label: "OpenAI",
    provider: "OpenAI Platform",
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    placeholder: "sk-...",
    docsUrl: "https://platform.openai.com/api-keys",
    docsLabel: "Get OpenAI key",
    hint: "GPT-4o mini, GPT-4.1, GPT-4o, o1 — wide range of tiers",
  },
  {
    id: "YOUTUBE_API_KEY",
    label: "YouTube Data API v3",
    provider: "Google Cloud Console",
    color: "text-red-600",
    bg: "bg-red-50",
    border: "border-red-200",
    placeholder: "AIza...",
    docsUrl: "https://console.cloud.google.com/apis/credentials",
    docsLabel: "Get YouTube key",
    hint: "Meet Addon music player mein search feature ke liye — YouTube Data API v3",
  },
];

export default function AiSettingsPage() {
  const [status, setStatus] = useState<AllStatus>({});
  const [loading, setLoading] = useState(true);
  const [values, setValues] = useState<Record<string, string>>({
    ANTHROPIC_API_KEY: "",
    OPENAI_API_KEY: "",
    YOUTUBE_API_KEY: "",
  });
  const [show,    setShow]    = useState<Record<string, boolean>>({});
  const [saving,  setSaving]  = useState<Record<string, boolean>>({});
  const [testing, setTesting] = useState<Record<string, boolean>>({});
  const [testResult, setTestResult] = useState<Record<string, { ok: boolean; msg: string }>>({});

  // Vertex AI fields
  const [vertexProjectId, setVertexProjectId] = useState("");
  const [vertexLocation,  setVertexLocation]  = useState("");
  const [vertexApiKey,    setVertexApiKey]    = useState("");
  const [vertexSaving,    setVertexSaving]    = useState(false);
  const [vertexTesting,   setVertexTesting]   = useState(false);
  const [vertexShowKey,   setVertexShowKey]   = useState(false);
  const [vertexTestResult, setVertexTestResult] = useState<{ ok: boolean; msg: string } | null>(null);

  // YouTube cookies (for music player bot-detection bypass)
  const [ytCookies,      setYtCookies]      = useState("");
  const [ytCookiesSaved, setYtCookiesSaved] = useState(false);
  const [ytCookiesSaving, setYtCookiesSaving] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/settings", { credentials: "include" });
      if (!res.ok) return;
      const data: AllStatus = await res.json();
      setStatus(data);
      setYtCookiesSaved(!!data["YOUTUBE_COOKIES"]?.hasValue);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  async function handleSaveYtCookies() {
    setYtCookiesSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ key: "YOUTUBE_COOKIES", value: ytCookies.trim() || null }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(d.error ?? "Save failed"); return; }
      toast.success(ytCookies.trim() ? "YouTube cookies saved" : "YouTube cookies removed");
      setYtCookies("");
      await fetchStatus();
    } catch {
      toast.error("Network error");
    } finally {
      setYtCookiesSaving(false);
    }
  }

  async function handleTestVertex() {
    setVertexTesting(true);
    setVertexTestResult(null);
    try {
      const res = await fetch("/api/admin/ai-settings/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          provider: "vertex",
          ...(vertexProjectId.trim() ? { projectId: vertexProjectId.trim() } : {}),
          ...(vertexLocation.trim()  ? { location:  vertexLocation.trim()  } : {}),
          ...(vertexApiKey.trim()    ? { apiKey:     vertexApiKey.trim()    } : {}),
        }),
      });
      const d = await res.json() as { ok: boolean; message?: string; error?: string };
      setVertexTestResult({ ok: d.ok, msg: d.ok ? (d.message ?? "Valid ✓") : (d.error ?? "Failed") });
    } catch {
      setVertexTestResult({ ok: false, msg: "Network error" });
    } finally {
      setVertexTesting(false);
    }
  }

  async function handleSaveVertex() {
    // Only save fields that were actually filled in — sending null would delete existing values
    const toSave = [
      { key: "VERTEX_PROJECT_ID", value: vertexProjectId.trim() },
      { key: "VERTEX_LOCATION",   value: vertexLocation.trim()  },
      { key: "VERTEX_API_KEY",    value: vertexApiKey.trim()    },
    ].filter(f => f.value !== "");

    if (toSave.length === 0) {
      toast.error("Koi field fill nahi ki — values enter karo phir save karo");
      return;
    }

    setVertexSaving(true);
    try {
      const results = await Promise.all(toSave.map(f =>
        fetch("/api/admin/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ key: f.key, value: f.value }),
        })
      ));
      if (results.some(r => !r.ok)) { toast.error("Save failed — dobara try karo"); return; }
      toast.success("Vertex AI settings saved");
      setVertexProjectId(""); setVertexLocation(""); setVertexApiKey("");
      await fetchStatus();
    } catch {
      toast.error("Network error");
    } finally {
      setVertexSaving(false);
    }
  }

  async function handleRemoveVertex() {
    if (!confirm("Vertex AI settings remove kar doge? Google models band ho jaayenge.")) return;
    setVertexSaving(true);
    try {
      await Promise.all(
        ["VERTEX_PROJECT_ID", "VERTEX_LOCATION", "VERTEX_API_KEY"].map(key =>
          fetch("/api/admin/settings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ key, value: null }),
          })
        )
      );
      toast.success("Vertex AI settings removed");
      setVertexProjectId(""); setVertexLocation(""); setVertexApiKey("");
      await fetchStatus();
    } catch {
      toast.error("Network error");
    } finally {
      setVertexSaving(false);
    }
  }

  async function handleTest(id: ProviderConfig["id"]) {
    const providerMap: Record<string, string> = {
      ANTHROPIC_API_KEY: "anthropic", OPENAI_API_KEY: "openai",
    };
    const provider = providerMap[id];
    if (!provider) { toast.error("Test not supported for this key"); return; }
    setTesting(t => ({ ...t, [id]: true }));
    setTestResult(r => ({ ...r, [id]: { ok: false, msg: "" } }));
    try {
      const value = values[id].trim() || undefined;
      const res = await fetch("/api/admin/ai-settings/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ provider, ...(value ? { value } : {}) }),
      });
      const d = await res.json() as { ok: boolean; message?: string; error?: string };
      setTestResult(r => ({ ...r, [id]: { ok: d.ok, msg: d.ok ? (d.message ?? "Valid ✓") : (d.error ?? "Failed") } }));
    } catch {
      setTestResult(r => ({ ...r, [id]: { ok: false, msg: "Network error" } }));
    } finally {
      setTesting(t => ({ ...t, [id]: false }));
    }
  }

  async function handleSave(id: ProviderConfig["id"]) {
    const value = values[id].trim();
    setSaving(s => ({ ...s, [id]: true }));
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ key: id, value: value || null }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(d.error ?? "Save failed");
        return;
      }
      toast.success(value ? "API key saved" : "API key removed");
      setValues(v => ({ ...v, [id]: "" }));
      await fetchStatus();
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(s => ({ ...s, [id]: false }));
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-6">
      {/* Header */}
      <div>
        <Link
          href="/admin"
          className="inline-flex items-center gap-1 text-sm font-medium text-[var(--cream-muted)] hover:text-[var(--accent)]"
        >
          <ChevronLeft className="h-4 w-4" /> Back to Admin
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-[var(--cream)] flex items-center gap-2">
          <Brain className="h-7 w-7 text-[var(--accent)]" />
          AI API Keys
        </h1>
        <p className="mt-1 text-sm text-[var(--cream-muted)]">
          StudyMate ke liye AI provider keys configure karo. Keys encrypted होके DB mein store hoti hain.
          <br />
          <span className="text-xs">Env variable set hai to wo hamesha override karega.</span>
        </p>
      </div>

      {/* Vertex AI card */}
      {(() => {
        const configured = !!(status["VERTEX_PROJECT_ID"]?.hasValue && status["VERTEX_LOCATION"]?.hasValue && status["VERTEX_API_KEY"]?.hasValue);
        return (
          <div className="rounded-2xl border border-[var(--border)] bg-white overflow-hidden shadow-sm">
            <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-3 bg-blue-50">
              <h2 className="flex items-center gap-2 text-sm font-bold text-blue-600">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg border border-blue-200 bg-white text-xs font-black text-blue-600">G</span>
                Google Gemini (Vertex AI)
              </h2>
              <a href="https://console.cloud.google.com/vertex-ai" target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline">
                Google Cloud Console <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            <div className="p-5 space-y-4">
              {loading ? (
                <div className="flex items-center gap-2 text-sm text-gray-400"><Loader2 className="h-4 w-4 animate-spin" /> Checking…</div>
              ) : configured ? (
                <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
                  <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span className="text-sm font-semibold text-emerald-700">Configured — Vertex AI active hai</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
                  <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
                  <span className="text-sm font-semibold text-amber-700">Not configured — Gemini models unavailable hain</span>
                </div>
              )}
              <p className="text-xs text-gray-500">
                Gemini 2.5 Flash, 2.0 Flash, 1.5 Pro, 2.5 Pro — Google Cloud Vertex AI via API key.
                <br />Step 1: Google Cloud Console → APIs &amp; Services → Enable <strong>Vertex AI API</strong>.
                <br />Step 2: APIs &amp; Services → Credentials → Create API Key (restrict to Vertex AI API).
              </p>

              {/* Project ID */}
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Project ID</label>
                <input
                  type="text"
                  value={vertexProjectId}
                  onChange={e => setVertexProjectId(e.target.value)}
                  placeholder={status["VERTEX_PROJECT_ID"]?.hasValue ? "••• (change karne ke liye type karo)" : "my-project-123"}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 px-3 text-sm font-mono text-gray-900 outline-none focus:border-blue-400 focus:bg-white transition"
                />
              </div>

              {/* Location */}
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Region / Location</label>
                <input
                  type="text"
                  value={vertexLocation}
                  onChange={e => setVertexLocation(e.target.value)}
                  placeholder={status["VERTEX_LOCATION"]?.hasValue ? "••• (change karne ke liye type karo)" : "us-central1"}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 px-3 text-sm font-mono text-gray-900 outline-none focus:border-blue-400 focus:bg-white transition"
                />
              </div>

              {/* API Key */}
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">API Key</label>
                <div className="relative flex-1">
                  <input
                    type={vertexShowKey ? "text" : "password"}
                    value={vertexApiKey}
                    onChange={e => setVertexApiKey(e.target.value)}
                    placeholder={status["VERTEX_API_KEY"]?.hasValue ? "••••••••••••••••••••• (change karne ke liye type karo)" : "AIza..."}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-3 pr-10 text-sm font-mono text-gray-900 outline-none focus:border-blue-400 focus:bg-white transition"
                  />
                  <button type="button" onClick={() => setVertexShowKey(s => !s)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {vertexShowKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button onClick={handleTestVertex} disabled={vertexTesting || vertexSaving}
                  className="flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-bold transition-all disabled:opacity-60 bg-gray-100 text-gray-600 border border-gray-200 hover:opacity-80">
                  {vertexTesting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FlaskConical className="h-4 w-4" />}
                  Test
                </button>
                <button onClick={handleSaveVertex} disabled={vertexSaving}
                  className="flex shrink-0 items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-bold transition-all disabled:opacity-60 bg-blue-50 text-blue-600 border border-blue-200 hover:opacity-80">
                  {vertexSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save
                </button>
              </div>

              {/* Test result */}
              {vertexTestResult?.msg && (
                <div className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium ${
                  vertexTestResult.ok ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"
                }`}>
                  {vertexTestResult.ok ? <CheckCircle className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
                  {vertexTestResult.msg}
                </div>
              )}

              {configured && (
                <button type="button" onClick={handleRemoveVertex} className="text-xs text-red-500 hover:underline">
                  Remove Vertex AI settings
                </button>
              )}
            </div>
          </div>
        );
      })()}

      {/* Provider cards (Anthropic + OpenAI + YouTube) */}
      {PROVIDERS.map((p) => {
        const configured  = status[p.id]?.hasValue ?? false;
        const isSaving    = saving[p.id]  ?? false;
        const isTesting   = testing[p.id] ?? false;
        const isShown     = show[p.id]    ?? false;
        const val         = values[p.id]  ?? "";
        const testRes     = testResult[p.id];
        const canTest     = p.id !== "YOUTUBE_API_KEY";

        return (
          <div key={p.id} className="rounded-2xl border border-[var(--border)] bg-white overflow-hidden shadow-sm">
            {/* Card header */}
            <div className={`flex items-center justify-between border-b border-[var(--border)] px-5 py-3 ${p.bg}`}>
              <h2 className={`flex items-center gap-2 text-sm font-bold ${p.color}`}>
                <span className={`flex h-6 w-6 items-center justify-center rounded-lg border ${p.border} bg-white text-xs font-black ${p.color}`}>
                  {p.label[0]}
                </span>
                {p.label}
              </h2>
              <a
                href={p.docsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center gap-1 text-xs font-semibold ${p.color} hover:underline`}
              >
                {p.docsLabel} <ExternalLink className="h-3 w-3" />
              </a>
            </div>

            <div className="p-5 space-y-4">
              {/* Status */}
              {loading ? (
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Loader2 className="h-4 w-4 animate-spin" /> Checking…
                </div>
              ) : configured ? (
                <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
                  <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span className="text-sm font-semibold text-emerald-700">Configured — key active hai</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
                  <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
                  <span className="text-sm font-semibold text-amber-700">Not configured — is provider ke models unavailable hain</span>
                </div>
              )}

              {/* Hint */}
              <p className="text-xs text-gray-500">{p.hint}</p>

              {/* Input */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type={isShown ? "text" : "password"}
                    value={val}
                    onChange={e => setValues(v => ({ ...v, [p.id]: e.target.value }))}
                    placeholder={configured ? "••••••••••••••••••••• (change karne ke liye type karo)" : p.placeholder}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-3 pr-10 text-sm font-mono text-gray-900 outline-none focus:border-[var(--accent)] focus:bg-white transition"
                    onKeyDown={e => { if (e.key === "Enter" && val.trim()) handleSave(p.id); }}
                  />
                  <button
                    type="button"
                    onClick={() => setShow(s => ({ ...s, [p.id]: !isShown }))}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {isShown ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {canTest && (
                  <button
                    onClick={() => handleTest(p.id)}
                    disabled={isTesting || isSaving}
                    title="Test key validity"
                    className="flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-bold transition-all disabled:opacity-60 bg-gray-100 text-gray-600 border border-gray-200 hover:opacity-80"
                  >
                    {isTesting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <FlaskConical className="h-4 w-4" />
                    )}
                    Test
                  </button>
                )}
                <button
                  onClick={() => handleSave(p.id)}
                  disabled={isSaving}
                  className={`flex shrink-0 items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-bold transition-all disabled:opacity-60 ${p.bg} ${p.color} border ${p.border} hover:opacity-80`}
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Save
                </button>
              </div>

              {/* Test result */}
              {testRes?.msg && (
                <div className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium ${
                  testRes.ok
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-red-200 bg-red-50 text-red-700"
                }`}>
                  {testRes.ok
                    ? <CheckCircle className="h-4 w-4 shrink-0" />
                    : <AlertCircle className="h-4 w-4 shrink-0" />}
                  {testRes.msg}
                </div>
              )}

              {/* Remove link */}
              {configured && (
                <button
                  type="button"
                  onClick={() => {
                    if (!confirm("Yeh API key remove kar doge? Is provider ke models band ho jaayenge.")) return;
                    setValues(v => ({ ...v, [p.id]: "" }));
                    handleSave(p.id);
                  }}
                  className="text-xs text-red-500 hover:underline"
                >
                  Remove key
                </button>
              )}
            </div>
          </div>
        );
      })}

      {/* YouTube Cookies card */}
      <div className="rounded-2xl border border-[var(--border)] bg-white overflow-hidden shadow-sm">
        <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-3 bg-red-50">
          <h2 className="flex items-center gap-2 text-sm font-bold text-red-600">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg border border-red-200 bg-white text-xs font-black text-red-600">
              <Music2 className="h-3.5 w-3.5" />
            </span>
            YouTube Cookies (Music Player)
          </h2>
        </div>
        <div className="p-5 space-y-4">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Loader2 className="h-4 w-4 animate-spin" /> Checking…
            </div>
          ) : ytCookiesSaved ? (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
              <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
              <span className="text-sm font-semibold text-emerald-700">Cookies configured — music player bot-detection bypass active</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
              <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
              <span className="text-sm font-semibold text-amber-700">No cookies — YouTube bot-detection se music fail ho sakta hai</span>
            </div>
          )}
          <p className="text-xs text-gray-500">
            Meet Add-on music player YouTube se audio stream karta hai. YouTube ka bot-detection server requests block karta hai.
            Fix: Chrome mein YouTube kholo → F12 → Application → Cookies → https://www.youtube.com →
            saare cookies copy karo (naam=value; format mein) aur yahan paste karo.
          </p>
          <textarea
            rows={4}
            value={ytCookies}
            onChange={e => setYtCookies(e.target.value)}
            placeholder={ytCookiesSaved ? "Naye cookies paste karo (purane replace honge)" : "VISITOR_INFO1_LIVE=xxx; YSC=yyy; CONSENT=YES+...; ..."}
            className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 px-3 text-xs font-mono text-gray-900 outline-none focus:border-red-400 focus:bg-white transition resize-none"
          />
          <div className="flex items-center justify-between">
            <button
              onClick={handleSaveYtCookies}
              disabled={ytCookiesSaving}
              className="flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-bold transition-all disabled:opacity-60 bg-red-50 text-red-600 border border-red-200 hover:opacity-80"
            >
              {ytCookiesSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Cookies
            </button>
            {ytCookiesSaved && (
              <button
                type="button"
                onClick={() => {
                  if (!confirm("YouTube cookies remove kar doge? Music player fail ho sakta hai.")) return;
                  setYtCookies("");
                  handleSaveYtCookies();
                }}
                className="text-xs text-red-500 hover:underline"
              >
                Remove cookies
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Info note */}
      <div className="rounded-2xl border border-gray-200 bg-gray-50 px-5 py-4 text-xs text-gray-500 space-y-1">
        <p className="font-semibold text-gray-700">Important notes:</p>
        <p>• Env variable (`.env`) mein set key hamesha DB key ko override karti hai.</p>
        <p>• Keys AES-256 encrypted hoti hain DB mein — <code className="font-mono bg-white px-1 rounded">ENCRYPTION_KEY</code> `.env` mein required hai.</p>
        <p>• Key save karne ke baad StudyMate turant use karna shuru kar deta hai — server restart ki zarurat nahi.</p>
        <p>• Koi bhi provider configure na ho to StudyMate kaam nahi karega. Vertex AI (Gemini) recommended hai (sabse sasta).</p>
      </div>
    </div>
  );
}
