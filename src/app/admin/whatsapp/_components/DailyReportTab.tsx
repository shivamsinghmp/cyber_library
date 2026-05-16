"use client";

import { useState, useEffect } from "react";
import { Save, Send, RefreshCw, Eye, Code, Sparkles } from "lucide-react";
import toast from "react-hot-toast";

const VARIABLES = [
  { key: "{{name}}",           desc: "Student ka naam" },
  { key: "{{studyHours}}",     desc: "Aaj ke study hours (e.g. 2.5)" },
  { key: "{{studyMins}}",      desc: "Aaj ke study minutes" },
  { key: "{{tasksCompleted}}", desc: "Aaj complete kiye gaye tasks" },
  { key: "{{totalTasks}}",     desc: "Aaj ke total tasks" },
  { key: "{{streak}}",         desc: "Current streak (days)" },
  { key: "{{coins}}",          desc: "Total coin balance" },
  { key: "{{coinsToday}}",     desc: "Aaj ke earned coins" },
  { key: "{{quote}}",          desc: "Random motivational quote" },
];

const SAMPLE_VARS: Record<string, string> = {
  name: "Rahul Sharma",
  studyHours: "3.5",
  studyMins: "210",
  tasksCompleted: "4",
  totalTasks: "5",
  streak: "12",
  coins: "320",
  coinsToday: "28",
  quote: "मेहनत इतनी खामोशी से करो कि सफलता शोर मचा दे।",
};

function previewTemplate(template: string): string {
  return Object.entries(SAMPLE_VARS).reduce(
    (str, [key, val]) => str.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), val),
    template
  );
}

// Render WhatsApp-style formatting: *bold*, _italic_, ~strikethrough~
function renderWA(text: string): string {
  return text
    .replace(/\*(.*?)\*/g,   "<strong>$1</strong>")
    .replace(/_(.*?)_/g,     "<em>$1</em>")
    .replace(/~(.*?)~/g,     "<del>$1</del>")
    .replace(/\n/g,          "<br>");
}

export function DailyReportTab() {
  const [template, setTemplate] = useState("");
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [sending,  setSending]  = useState(false);
  const [view,     setView]     = useState<"edit" | "preview">("edit");
  const [result,   setResult]   = useState<{ sent: number; failed: number; total: number } | null>(null);

  useEffect(() => {
    fetch("/api/admin/whatsapp/daily-report", { credentials: "include" })
      .then((r) => r.ok ? r.json() : {})
      .then((d: { template?: string }) => { if (d.template) setTemplate(d.template); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/whatsapp/daily-report", {
        method: "POST", headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "save", template }),
      });
      if (res.ok) toast.success("Template saved!");
      else toast.error("Save failed");
    } catch { toast.error("Error"); }
    finally { setSaving(false); }
  }

  async function handleSend() {
    if (!template.trim()) { toast.error("Template empty hai"); return; }
    if (!confirm("Sabhi students ko Daily Report WhatsApp bhejoge? Sure?")) return;
    setSending(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/whatsapp/daily-report", {
        method: "POST", headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "send", template }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult(data);
        toast.success(`${data.sent}/${data.total} messages sent!`);
      } else { toast.error(data.error || "Send failed"); }
    } catch { toast.error("Network error"); }
    finally { setSending(false); }
  }

  function insertVar(v: string) {
    setTemplate((prev) => prev + v);
  }

  if (loading) return <div className="py-14 text-center text-sm text-[var(--cream-muted)] animate-pulse">Loading template…</div>;

  return (
    <div className="space-y-5 max-w-3xl">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 font-bold text-[var(--foreground)]">
            <Sparkles className="h-5 w-5 text-[var(--accent)]" />
            Daily Report Template
          </h2>
          <p className="mt-1 text-sm text-[var(--cream-muted)]">
            Har student ko personalized WhatsApp message jaayega — study hours, tasks, streak, coins aur motivational quote ke saath.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setView(view === "edit" ? "preview" : "edit")}
            className="flex items-center gap-1.5 rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-xs font-semibold text-[var(--cream-muted)] hover:text-[var(--foreground)]"
          >
            {view === "edit" ? <><Eye className="h-3.5 w-3.5" /> Preview</> : <><Code className="h-3.5 w-3.5" /> Edit</>}
          </button>
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-xs font-semibold text-[var(--foreground)] hover:bg-[var(--background)] disabled:opacity-50">
            <Save className="h-3.5 w-3.5" /> {saving ? "Saving…" : "Save"}
          </button>
          <button onClick={handleSend} disabled={sending} className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50">
            <Send className="h-3.5 w-3.5" /> {sending ? "Sending…" : "Send to All"}
          </button>
        </div>
      </div>

      {/* Variable chips */}
      <div>
        <p className="mb-2 text-xs font-semibold text-[var(--cream-muted)] uppercase tracking-wider">Variables — click to insert</p>
        <div className="flex flex-wrap gap-2">
          {VARIABLES.map((v) => (
            <button
              key={v.key}
              onClick={() => insertVar(v.key)}
              title={v.desc}
              className="rounded-full border border-[var(--border)] bg-white px-2.5 py-1 font-mono text-[11px] text-[var(--foreground)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"
            >
              {v.key}
            </button>
          ))}
        </div>
      </div>

      {/* Editor / Preview */}
      {view === "edit" ? (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-xs font-semibold text-[var(--cream-muted)] uppercase tracking-wider">Template</p>
            <p className="text-[10px] text-[var(--cream-muted)]">WhatsApp formatting: *bold* _italic_</p>
          </div>
          <textarea
            value={template}
            onChange={(e) => setTemplate(e.target.value)}
            rows={18}
            className="w-full rounded-2xl border border-[var(--border)] bg-gray-50 px-4 py-3 text-sm font-mono text-[var(--foreground)] outline-none focus:border-[var(--accent)] resize-y leading-relaxed"
            placeholder="Template likhein… {{name}}, {{studyHours}} etc. use karein"
          />
        </div>
      ) : (
        <div>
          <p className="mb-1.5 text-xs font-semibold text-[var(--cream-muted)] uppercase tracking-wider">Preview (sample data ke saath)</p>
          <div className="rounded-2xl border border-[var(--border)] bg-white p-4">
            {/* WhatsApp-style chat bubble */}
            <div className="flex justify-end">
              <div className="max-w-sm rounded-2xl rounded-tr-sm bg-[#dcf8c6] px-4 py-3 text-sm leading-relaxed shadow-sm">
                <div
                  dangerouslySetInnerHTML={{ __html: renderWA(previewTemplate(template)) }}
                  className="text-gray-900"
                />
                <p className="mt-2 text-right text-[10px] text-gray-400">10:30 AM ✓✓</p>
              </div>
            </div>
          </div>
          <p className="mt-2 text-[10px] text-[var(--cream-muted)] text-center">
            Sample data se preview — actual message mein real stats honge
          </p>
        </div>
      )}

      {/* Variable reference */}
      <div className="rounded-2xl border border-[var(--border)] bg-white overflow-hidden">
        <div className="border-b border-[var(--border)] bg-[var(--background)] px-4 py-2.5">
          <p className="text-xs font-bold text-[var(--foreground)] uppercase tracking-wider">Variable Reference</p>
        </div>
        <div className="divide-y divide-[var(--border)]">
          {VARIABLES.map((v) => (
            <div key={v.key} className="flex items-center gap-3 px-4 py-2">
              <code className="shrink-0 rounded-lg bg-gray-100 px-2 py-0.5 font-mono text-xs text-gray-900">{v.key}</code>
              <p className="text-xs text-[var(--cream-muted)]">{v.desc}</p>
              <span className="ml-auto text-[10px] text-[var(--cream-muted)] font-mono">{SAMPLE_VARS[v.key.replace(/\{\{|\}\}/g, "")] ?? ""}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Send result */}
      {result && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4">
          <p className="font-bold text-emerald-900">Send complete!</p>
          <div className="mt-2 flex gap-6 text-sm">
            <span className="text-emerald-700">✅ Sent: <strong>{result.sent}</strong></span>
            <span className="text-red-600">❌ Failed: <strong>{result.failed}</strong></span>
            <span className="text-[var(--cream-muted)]">Total: <strong>{result.total}</strong></span>
          </div>
        </div>
      )}
    </div>
  );
}
