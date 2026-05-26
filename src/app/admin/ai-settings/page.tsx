"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Brain, ChevronLeft, CheckCircle, AlertCircle,
  Eye, EyeOff, Save, Loader2, ExternalLink,
} from "lucide-react";
import toast from "react-hot-toast";

type KeyStatus = { hasValue: boolean };
type AllStatus = Record<string, KeyStatus>;

type ProviderConfig = {
  id: "GEMINI_API_KEY" | "ANTHROPIC_API_KEY" | "OPENAI_API_KEY" | "YOUTUBE_API_KEY";
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
    id: "GEMINI_API_KEY",
    label: "Google Gemini",
    provider: "Google AI Studio",
    color: "text-blue-600",
    bg: "bg-blue-50",
    border: "border-blue-200",
    placeholder: "AIza...",
    docsUrl: "https://aistudio.google.com/app/apikey",
    docsLabel: "Get Gemini key",
    hint: "Gemini 2.5 Flash, 2.0 Flash, 1.5 Pro, 2.5 Pro — budget to smart tier",
  },
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
    GEMINI_API_KEY: "",
    ANTHROPIC_API_KEY: "",
    OPENAI_API_KEY: "",
    YOUTUBE_API_KEY: "",
  });
  const [show, setShow] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/settings", { credentials: "include" });
      if (!res.ok) return;
      const data: AllStatus = await res.json();
      setStatus(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

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

      {/* Provider cards */}
      {PROVIDERS.map((p) => {
        const configured = status[p.id]?.hasValue ?? false;
        const isSaving = saving[p.id] ?? false;
        const isShown = show[p.id] ?? false;
        const val = values[p.id] ?? "";

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

      {/* Info note */}
      <div className="rounded-2xl border border-gray-200 bg-gray-50 px-5 py-4 text-xs text-gray-500 space-y-1">
        <p className="font-semibold text-gray-700">Important notes:</p>
        <p>• Env variable (`.env`) mein set key hamesha DB key ko override karti hai.</p>
        <p>• Keys AES-256 encrypted hoti hain DB mein — <code className="font-mono bg-white px-1 rounded">ENCRYPTION_KEY</code> `.env` mein required hai.</p>
        <p>• Key save karne ke baad StudyMate turant use karna shuru kar deta hai — server restart ki zarurat nahi.</p>
        <p>• Koi bhi provider ka key na ho to StudyMate kaam nahi karega. Gemini key recommended hai (sabse sasta).</p>
      </div>
    </div>
  );
}
