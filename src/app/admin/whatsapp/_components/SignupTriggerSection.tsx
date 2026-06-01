"use client";

import { useState } from "react";
import { Bell, CheckCircle2, ChevronRight, Loader2, X } from "lucide-react";
import toast from "react-hot-toast";

type WaTemplate = {
  id: string; name: string; status: string; bodyText: string;
  variableCount: number; language: string;
  triggerEvent: string | null; isActive: boolean;
};

interface Props {
  templates:  WaTemplate[];
  onRefresh:  () => void;
}

function highlightVars(text: string) {
  return text.split(/(\{\{\d+\}\})/).map((p, i) =>
    /^\{\{\d+\}\}$/.test(p)
      ? <span key={i} className="rounded bg-amber-100 px-1 font-mono text-[10px] text-amber-700">{p}</span>
      : <span key={i}>{p}</span>
  );
}

export function SignupTriggerSection({ templates, onRefresh }: Props) {
  const [saving, setSaving] = useState(false);

  const approved  = templates.filter(t => t.status === "APPROVED");
  const current   = templates.find(t => t.triggerEvent === "signup" && t.isActive) ?? null;

  async function selectTemplate(name: string) {
    setSaving(true);
    try {
      const res  = await fetch("/api/admin/whatsapp/signup-trigger", {
        method:  "PUT",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ templateName: name }),
      });
      const data = await res.json();
      if (res.ok) { toast.success(`✅ ${name} signup trigger ban gaya`); onRefresh(); }
      else         toast.error(data.error ?? "Save fail ho gaya");
    } catch { toast.error("Network error"); }
    finally { setSaving(false); }
  }

  async function clearTrigger() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/whatsapp/signup-trigger", { method: "DELETE" });
      const data = await res.json();
      if (res.ok) { toast.success("Signup trigger hata diya"); onRefresh(); }
      else         toast.error(data.error ?? "Clear fail");
    } catch { toast.error("Network error"); }
    finally { setSaving(false); }
  }

  return (
    <div className="rounded-2xl border bg-white shadow-sm overflow-hidden" style={{ borderColor: "var(--accent-border, #C7D2FE)" }}>

      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4"
        style={{ background: "var(--accent-pale, #EEF2FF)", borderBottom: "1px solid var(--accent-border, #C7D2FE)" }}>
        <div className="flex h-8 w-8 items-center justify-center rounded-xl"
          style={{ background: "var(--accent, #6366F1)", color: "white" }}>
          <Bell className="h-4 w-4" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-gray-900">Signup Trigger Template</h3>
          <p className="text-xs text-gray-500">Naya account bante hi yeh template automatically WhatsApp pe jaata hai</p>
        </div>
      </div>

      <div className="p-5 space-y-4">

        {/* Current trigger card */}
        {current ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span className="text-xs font-black uppercase tracking-widest text-emerald-700">Active Trigger</span>
              </div>
              <button onClick={clearTrigger} disabled={saving}
                className="flex items-center gap-1 rounded-lg border border-red-200 bg-white px-2.5 py-1 text-[10px] font-bold text-red-500 hover:bg-red-50 transition disabled:opacity-50">
                <X className="h-3 w-3" /> Remove
              </button>
            </div>
            <p className="font-mono text-sm font-bold text-emerald-800">{current.name}</p>
            <div className="rounded-lg border border-emerald-100 bg-white px-3 py-2 text-xs text-gray-700 leading-relaxed">
              {highlightVars(current.bodyText.slice(0, 200))}
              {current.bodyText.length > 200 && <span className="text-gray-400">…</span>}
            </div>
            {current.variableCount > 0 && (
              <p className="text-[10px] text-emerald-600 font-medium">
                {current.variableCount} variable{current.variableCount > 1 ? "s" : ""} — name, student ID, login URL se auto-fill honge
              </p>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <Bell className="h-4 w-4 text-amber-500 shrink-0" />
            <p className="text-xs font-semibold text-amber-700">
              Koi template select nahi hai — signup pe plain-text fallback jayega
            </p>
          </div>
        )}

        {/* Template picker */}
        <div className="space-y-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
            Approved Templates ({approved.length})
          </p>

          {approved.length === 0 ? (
            <p className="rounded-xl border border-dashed border-gray-200 py-6 text-center text-xs text-gray-400">
              Koi APPROVED template nahi hai — pehle Meta se sync karo
            </p>
          ) : (
            approved.map(t => {
              const isSelected = t.triggerEvent === "signup" && t.isActive;
              return (
                <div key={t.id}
                  className={`flex items-start gap-3 rounded-xl border p-3.5 transition-all ${
                    isSelected
                      ? "border-emerald-300 bg-emerald-50/70"
                      : "border-gray-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/40"
                  }`}>
                  <div className="flex-1 min-w-0 space-y-1">
                    <p className="font-mono text-xs font-bold text-gray-800">{t.name}</p>
                    <p className="text-[11px] text-gray-500 leading-relaxed">
                      {t.bodyText.slice(0, 100)}{t.bodyText.length > 100 ? "…" : ""}
                    </p>
                    {t.variableCount > 0 && (
                      <p className="text-[10px] text-gray-400">
                        {t.variableCount} var{t.variableCount > 1 ? "s" : ""} · {t.language}
                      </p>
                    )}
                  </div>

                  {isSelected ? (
                    <span className="shrink-0 flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-black text-emerald-700 whitespace-nowrap">
                      <CheckCircle2 className="h-3 w-3" /> Selected
                    </span>
                  ) : (
                    <button
                      onClick={() => selectTemplate(t.name)}
                      disabled={saving}
                      className="shrink-0 flex items-center gap-1 rounded-lg px-3 py-1.5 text-[11px] font-bold text-white transition hover:opacity-90 disabled:opacity-50 whitespace-nowrap"
                      style={{ background: "linear-gradient(135deg, var(--accent, #6366F1), #8B5CF6)" }}>
                      {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <ChevronRight className="h-3 w-3" />}
                      Select
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
