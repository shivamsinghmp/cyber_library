"use client";

import { useState } from "react";
import { Send, Users, FileText } from "lucide-react";
import toast from "react-hot-toast";
import type { EmailSignature, EmailDraft } from "./types";

type Props = {
  signatures: EmailSignature[];
  drafts: EmailDraft[];
};

const RECIPIENT_FILTERS = [
  { value: "all",        label: "All Students",        sub: "Sabhi registered students" },
  { value: "subscribed", label: "Subscribed Only",     sub: "Active subscription wale" },
];

export function EmailBulkSendTab({ signatures, drafts }: Props) {
  const [filter,      setFilter]      = useState("all");
  const [subject,     setSubject]     = useState("");
  const [html,        setHtml]        = useState("");
  const [signatureId, setSignatureId] = useState("");
  const [sending,     setSending]     = useState(false);
  const [result,      setResult]      = useState<{ sent: number; failed: number; total: number } | null>(null);

  function loadDraft(draft: EmailDraft) {
    setSubject(draft.subject);
    setHtml(draft.bodyHtml);
  }

  async function handleSend() {
    if (!subject.trim() || !html.trim()) { toast.error("Subject aur HTML body chahiye"); return; }
    if (!confirm(`Yeh email "${RECIPIENT_FILTERS.find(f => f.value === filter)?.label}" ko bhejna hai. Sure?`)) return;

    setSending(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/email/bulk-send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ recipientFilter: filter, subject, html, signatureId: signatureId || undefined }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Bulk send failed"); return; }
      setResult(data);
      toast.success(`${data.sent}/${data.total} emails sent!`);
    } catch { toast.error("Network error"); }
    finally { setSending(false); }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[var(--border)] bg-white p-5 space-y-4">
        <h2 className="flex items-center gap-2 text-sm font-bold text-[var(--foreground)] uppercase tracking-wider">
          <Users className="h-4 w-4 text-[var(--accent)]" /> Recipients
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {RECIPIENT_FILTERS.map((f) => (
            <label key={f.value} className={`flex items-start gap-3 cursor-pointer rounded-xl border p-4 transition-all ${filter === f.value ? "border-[var(--accent)] bg-[var(--accent)]/5" : "border-[var(--border)] hover:border-[var(--accent)]/40"}`}>
              <input type="radio" name="filter" value={f.value} checked={filter === f.value} onChange={() => setFilter(f.value)} className="mt-0.5" />
              <div>
                <p className="font-semibold text-sm text-[var(--foreground)]">{f.label}</p>
                <p className="text-xs text-[var(--cream-muted)]">{f.sub}</p>
              </div>
            </label>
          ))}
        </div>
        <p className="text-xs text-[var(--cream-muted)] flex items-center gap-1">
          💡 Template mein <code className="rounded bg-gray-100 px-1 font-mono">{"{{name}}"}</code> aur <code className="rounded bg-gray-100 px-1 font-mono">{"{{email}}"}</code> use karo — personalize hoga automatically.
        </p>
      </div>

      <div className="rounded-2xl border border-[var(--border)] bg-white p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-bold text-[var(--foreground)] uppercase tracking-wider">
            <Send className="h-4 w-4 text-[var(--accent)]" /> Compose
          </h2>
          {drafts.length > 0 && (
            <div className="flex items-center gap-2">
              <FileText className="h-3.5 w-3.5 text-[var(--cream-muted)]" />
              <select onChange={(e) => { const d = drafts.find(dr => dr.id === e.target.value); if (d) loadDraft(d); }} className="text-xs rounded-lg border border-[var(--border)] bg-white px-2 py-1">
                <option value="">Load draft…</option>
                {drafts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--cream-muted)] mb-1.5">Subject *</label>
          <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Email subject…" className="w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)]" />
        </div>

        {signatures.length > 0 && (
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--cream-muted)] mb-1.5">Signature</label>
            <select value={signatureId} onChange={(e) => setSignatureId(e.target.value)} className="w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2.5 text-sm">
              <option value="">No signature</option>
              {signatures.map((s) => <option key={s.id} value={s.id}>{s.name}{s.isDefault ? " (default)" : ""}</option>)}
            </select>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--cream-muted)] mb-1.5">HTML Body *</label>
          <textarea
            value={html}
            onChange={(e) => setHtml(e.target.value)}
            rows={12}
            placeholder={`<div style="font-family:sans-serif;padding:24px;">\n  <h1>Hi {{name}},</h1>\n  <p>Your message here…</p>\n</div>`}
            className="w-full rounded-xl border border-[var(--border)] bg-gray-50 px-3 py-2.5 text-sm font-mono outline-none focus:border-[var(--accent)] resize-y"
          />
        </div>

        {html && (
          <details className="rounded-xl border border-[var(--border)] overflow-hidden">
            <summary className="cursor-pointer px-4 py-2.5 text-xs font-semibold text-[var(--cream-muted)] bg-[var(--background)]">Preview</summary>
            <div className="p-4 bg-white">
              <iframe srcDoc={html} className="w-full rounded-lg border border-[var(--border)]" style={{ height: "300px" }} title="Email preview" />
            </div>
          </details>
        )}

        <button
          onClick={handleSend}
          disabled={sending || !subject.trim() || !html.trim()}
          className="flex items-center gap-2 rounded-xl bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-[var(--ink)] hover:opacity-90 disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
          {sending ? "Sending…" : `Send Bulk Email`}
        </button>

        {result && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm">
            <p className="font-bold text-emerald-900">Bulk send complete!</p>
            <p className="text-emerald-700">✓ Sent: {result.sent} &nbsp;·&nbsp; ✗ Failed: {result.failed} &nbsp;·&nbsp; Total: {result.total}</p>
          </div>
        )}
      </div>
    </div>
  );
}
