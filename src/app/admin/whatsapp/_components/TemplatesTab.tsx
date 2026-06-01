"use client";

import { useState, useEffect, useCallback } from "react";
import { RefreshCw, Loader2, CheckCircle2, XCircle, Clock, AlertTriangle, Zap } from "lucide-react";
import toast from "react-hot-toast";
import { SignupTriggerSection } from "./SignupTriggerSection";

type WaTemplate = {
  id: string;
  name: string;
  status: string;        // APPROVED | PENDING | REJECTED | PAUSED
  category: string | null;
  language: string;
  bodyText: string;
  headerText: string | null;
  footerText: string | null;
  variableCount: number;
  triggerEvent: string | null;
  isActive: boolean;
  syncedAt: string | null;
};

const TRIGGERS = [
  { value: "",             label: "— No trigger —" },
  { value: "signup",       label: "On Signup" },
  { value: "daily_8pm",    label: "Daily 8 PM" },
  { value: "daily_9am",    label: "Daily 9 AM" },
  { value: "3days_before", label: "3 Days Before Expiry" },
  { value: "1day_before",  label: "1 Day Before Expiry" },
  { value: "on_expiry",    label: "On Expiry" },
  { value: "manual",       label: "Manual Only" },
];

function statusStyle(status: string) {
  switch (status) {
    case "APPROVED": return "bg-emerald-100 text-emerald-700 border-emerald-200";
    case "PENDING":  return "bg-amber-100  text-amber-700  border-amber-200";
    case "REJECTED": return "bg-red-100    text-red-700    border-red-200";
    case "PAUSED":   return "bg-gray-100   text-gray-600   border-gray-200";
    default:         return "bg-gray-100   text-gray-500   border-gray-200";
  }
}

function StatusIcon({ status }: { status: string }) {
  if (status === "APPROVED") return <CheckCircle2 className="h-3 w-3" />;
  if (status === "REJECTED") return <XCircle className="h-3 w-3" />;
  if (status === "PENDING")  return <Clock className="h-3 w-3" />;
  return <AlertTriangle className="h-3 w-3" />;
}

function highlightVars(text: string) {
  const parts = text.split(/(\{\{\d+\}\})/);
  return parts.map((p, i) =>
    /^\{\{\d+\}\}$/.test(p)
      ? <span key={i} className="rounded bg-amber-100 px-1 font-mono text-[11px] text-amber-700">{p}</span>
      : <span key={i}>{p}</span>
  );
}

export function TemplatesTab() {
  const [templates, setTemplates]   = useState<WaTemplate[]>([]);
  const [loading, setLoading]       = useState(true);
  const [syncing, setSyncing]       = useState(false);
  const [saving, setSaving]         = useState<string | null>(null); // template name being saved

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch("/api/admin/whatsapp/templates", { credentials: "include" });
      const data = await res.json();
      if (res.ok) setTemplates(Array.isArray(data) ? data : []);
      else toast.error(data.error ?? "Templates load nahi hue");
    } catch { toast.error("Network error"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  async function handleSync() {
    setSyncing(true);
    try {
      const res  = await fetch("/api/admin/whatsapp/templates", {
        method: "POST", credentials: "include",
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message ?? `${data.synced} templates sync ho gaye`);
        await fetchTemplates();
      } else {
        toast.error(data.error ?? "Sync fail ho gaya");
      }
    } catch { toast.error("Sync fail — network error"); }
    finally { setSyncing(false); }
  }

  async function saveTrigger(name: string, triggerEvent: string, isActive: boolean) {
    setSaving(name);
    try {
      const res = await fetch(`/api/admin/whatsapp/templates/${encodeURIComponent(name)}`, {
        method:  "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ triggerEvent: triggerEvent || null, isActive }),
      });
      const data = await res.json();
      if (res.ok) {
        setTemplates(prev => prev.map(t => t.name === name ? { ...t, triggerEvent: triggerEvent || null, isActive } : t));
        toast.success(`${name} updated`);
      } else {
        toast.error(data.error ?? "Save fail ho gaya");
      }
    } catch { toast.error("Save fail — network error"); }
    finally { setSaving(null); }
  }

  return (
    <div className="space-y-5">
      {/* Signup Trigger — dedicated section shown at top */}
      <SignupTriggerSection templates={templates} onRefresh={fetchTemplates} />

      {/* Header + Sync */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-gray-900">WhatsApp Template Manager</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Meta se templates sync karo, phir har template ke liye trigger event set karo.
          </p>
        </div>
        <button
          type="button"
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center gap-2 rounded-xl border border-[var(--accent)] bg-white px-4 py-2 text-sm font-semibold text-[var(--accent)] hover:bg-[var(--accent)] hover:text-[var(--ink)] transition disabled:opacity-50"
        >
          {syncing
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : <RefreshCw className="h-4 w-4" />
          }
          {syncing ? "Syncing…" : "Reload from Meta"}
        </button>
      </div>

      {/* Template list */}
      {loading ? (
        <div className="flex items-center justify-center py-16 gap-2">
          <Loader2 className="h-5 w-5 animate-spin text-[var(--accent)]" />
          <span className="text-sm text-gray-500">Loading templates…</span>
        </div>
      ) : templates.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 py-16 text-center">
          <p className="text-sm font-semibold text-gray-500">No templates yet</p>
          <p className="mt-1 text-xs text-gray-400">
            &ldquo;Reload from Meta&rdquo; button dabao — Meta pe approved templates yahan aa jayenge.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {templates.map(t => (
            <div
              key={t.id}
              className={`rounded-2xl border bg-white p-4 shadow-sm transition ${t.isActive ? "border-[var(--accent)] ring-1 ring-[var(--accent)]/20" : "border-gray-200"}`}
            >
              {/* Name + status */}
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="min-w-0">
                  <p className="font-mono text-xs font-bold text-gray-900 truncate">{t.name}</p>
                  {t.syncedAt && (
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      Synced {new Date(t.syncedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    </p>
                  )}
                </div>
                <span className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${statusStyle(t.status)}`}>
                  <StatusIcon status={t.status} /> {t.status}
                </span>
              </div>

              {/* Body preview with variable highlighting */}
              <div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5 text-xs text-gray-700 leading-relaxed mb-3 min-h-[60px] whitespace-pre-wrap">
                {highlightVars(t.bodyText.slice(0, 200))}
                {t.bodyText.length > 200 && <span className="text-gray-400">…</span>}
              </div>

              {t.variableCount > 0 && (
                <p className="text-[10px] text-gray-400 mb-3">
                  {t.variableCount} variable{t.variableCount > 1 ? "s" : ""} · {t.language}
                </p>
              )}

              {/* Trigger config (only for APPROVED) */}
              <div className="space-y-2">
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                  Trigger Event
                </label>
                <select
                  value={t.triggerEvent ?? ""}
                  disabled={t.status !== "APPROVED"}
                  onChange={e => {
                    // Optimistically update UI
                    setTemplates(prev => prev.map(x => x.name === t.name ? { ...x, triggerEvent: e.target.value || null } : x));
                  }}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-700 outline-none focus:border-[var(--accent)] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {TRIGGERS.map(tr => (
                    <option key={tr.value} value={tr.value}>{tr.label}</option>
                  ))}
                </select>

                {/* Active toggle + Save */}
                <div className="flex items-center justify-between gap-2">
                  <label className={`flex items-center gap-2 cursor-pointer ${t.status !== "APPROVED" ? "opacity-50 cursor-not-allowed" : ""}`}>
                    <input
                      type="checkbox"
                      checked={t.isActive}
                      disabled={t.status !== "APPROVED"}
                      onChange={e => setTemplates(prev => prev.map(x => x.name === t.name ? { ...x, isActive: e.target.checked } : x))}
                      className="h-4 w-4 rounded accent-[var(--accent)]"
                    />
                    <span className="text-xs text-gray-600">Active</span>
                  </label>

                  <button
                    type="button"
                    onClick={() => saveTrigger(t.name, t.triggerEvent ?? "", t.isActive)}
                    disabled={saving === t.name || t.status !== "APPROVED"}
                    className="flex items-center gap-1 rounded-lg bg-[var(--accent)] px-3 py-1.5 text-[11px] font-bold text-[var(--ink)] hover:opacity-90 disabled:opacity-50 transition"
                  >
                    {saving === t.name
                      ? <Loader2 className="h-3 w-3 animate-spin" />
                      : <Zap className="h-3 w-3" />
                    }
                    {saving === t.name ? "Saving…" : "Save"}
                  </button>
                </div>
              </div>

              {t.status !== "APPROVED" && (
                <p className="mt-2 text-[10px] text-gray-400">
                  ⚠️ Sirf APPROVED templates activate ho sakte hain
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
