"use client";

import { useState } from "react";
import { Send, FileText } from "lucide-react";
import toast from "react-hot-toast";
import type { EmailSignature, EmailDraft } from "./types";

type Props = {
  signatures: EmailSignature[];
  drafts: EmailDraft[];
};

export function EmailComposeTab({ signatures, drafts }: Props) {
  const [to,          setTo]          = useState("");
  const [toName,      setToName]      = useState("");
  const [subject,     setSubject]     = useState("");
  const [html,        setHtml]        = useState("");
  const [signatureId, setSignatureId] = useState(signatures.find((s) => s.isDefault)?.id ?? "");
  const [sending,     setSending]     = useState(false);

  function loadDraft(draft: EmailDraft) {
    setSubject(draft.subject);
    setHtml(draft.bodyHtml);
  }

  async function sendMail(e: React.FormEvent) {
    e.preventDefault();
    if (!to || !subject || !html) return;
    setSending(true);
    try {
      const res = await fetch("/api/admin/email/send-custom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ to, toName: toName || undefined, subject, html, purpose: "MANUAL", signatureId: signatureId || undefined }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Email sent via Resend!");
        setTo(""); setToName(""); setSubject(""); setHtml("");
      } else {
        toast.error(data.error || "Send failed");
      }
    } catch { toast.error("Network error"); }
    setSending(false);
  }

  return (
    <div className="space-y-6">
      <form onSubmit={sendMail} className="space-y-4 rounded-2xl border border-[var(--border)] bg-white p-6">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-bold text-[var(--foreground)] uppercase tracking-wider">
            <Send className="h-4 w-4 text-[var(--accent)]" /> Send Email
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--cream-muted)] mb-1.5">To Email *</label>
            <input required type="email" value={to} onChange={(e) => setTo(e.target.value)} placeholder="student@example.com" className="w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)]" />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--cream-muted)] mb-1.5">Recipient Name</label>
            <input value={toName} onChange={(e) => setToName(e.target.value)} placeholder="Rahul Sharma" className="w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)]" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--cream-muted)] mb-1.5">Subject *</label>
          <input required value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject…" className="w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)]" />
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
            required
            rows={10}
            value={html}
            onChange={(e) => setHtml(e.target.value)}
            placeholder="<div style='font-family:sans-serif;padding:24px;'><h1>Hi {{name}},</h1><p>Message here…</p></div>"
            className="w-full rounded-xl border border-[var(--border)] bg-gray-50 px-3 py-2.5 text-sm font-mono outline-none focus:border-[var(--accent)] resize-y"
          />
          <p className="mt-1 text-[10px] text-[var(--cream-muted)]">
            Use <code className="rounded bg-gray-100 px-1 font-mono">{"{{name}}"}</code> to insert recipient name.
          </p>
        </div>

        {html && (
          <details className="rounded-xl border border-[var(--border)] overflow-hidden">
            <summary className="cursor-pointer px-4 py-2.5 text-xs font-semibold text-[var(--cream-muted)] bg-[var(--background)]">Preview</summary>
            <div className="p-4 bg-white">
              <iframe srcDoc={html} className="w-full rounded-lg border border-[var(--border)]" style={{ height: "300px" }} title="Email preview" />
            </div>
          </details>
        )}

        <button type="submit" disabled={sending || !to || !subject || !html} className="flex items-center gap-2 rounded-xl bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-[var(--ink)] hover:opacity-90 disabled:opacity-50">
          <Send className="h-4 w-4" /> {sending ? "Sending…" : "Send via Resend"}
        </button>
      </form>
    </div>
  );
}
