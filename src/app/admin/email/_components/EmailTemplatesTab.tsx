"use client";

import { useState, useEffect } from "react";
import { Save, Eye, Code } from "lucide-react";
import DOMPurify from "isomorphic-dompurify";
import toast from "react-hot-toast";
import type { EmailTemplate, EmailDraft } from "./types";
import { TEMPLATE_PURPOSES } from "./types";

type Props = {
  templates: EmailTemplate[];
  loading?: boolean;
  onRefresh: () => void;
};

export function EmailTemplatesTab({ templates, onRefresh }: Props) {
  const [selected, setSelected] = useState<string>(TEMPLATE_PURPOSES[0].id);
  const [subject, setSubject] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    const existing = templates.find((t) => t.purpose === selected);
    setSubject(existing?.subject ?? "");
    setBodyHtml(existing?.bodyHtml ?? "");
  }, [selected, templates]);

  async function saveTemplate(e: React.FormEvent) {
    e.preventDefault();
    const meta = TEMPLATE_PURPOSES.find((t) => t.id === selected);
    const res = await fetch("/api/admin/email/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ purpose: selected, subject, bodyHtml, variables: meta?.vars ?? [] }),
    });
    if (res.ok) {
      toast.success("Template saved");
      onRefresh();
    } else {
      toast.error("Failed to save template");
    }
  }

  return (
    <div className="flex flex-col gap-6 md:flex-row">
      <div className="w-full space-y-4 md:w-1/3">
        <h3 className="mb-3 text-sm font-semibold text-[var(--cream)]">Active System Templates</h3>
        <div className="space-y-2">
          {TEMPLATE_PURPOSES.map((tmpl) => (
            <button
              key={tmpl.id}
              onClick={() => setSelected(tmpl.id)}
              className={`w-full rounded-xl border px-4 py-3 text-left transition ${
                selected === tmpl.id
                  ? "border-[var(--accent)] bg-indigo-50 text-[var(--accent)]"
                  : "border-gray-200 bg-gray-50 text-[var(--cream-muted)] hover:bg-gray-50"
              }`}
            >
              <div className="text-sm font-semibold">{tmpl.label}</div>
              <div className="mt-1 text-[10px] opacity-60">ID: {tmpl.id}</div>
            </button>
          ))}
        </div>

      </div>

      <div className="w-full md:w-2/3">
        <form onSubmit={saveTemplate} className="space-y-4 rounded-2xl border border-gray-200 bg-white p-6">
          <div className="mb-2 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <h2 className="text-lg font-semibold text-gray-900">Edit HTML content</h2>
            <div className="flex w-full gap-2 sm:w-auto">
              <button type="button" onClick={() => setShowPreview(!showPreview)} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gray-100 px-4 py-2 text-sm font-semibold text-[var(--cream)] hover:bg-white/20 sm:flex-none">
                {showPreview ? <Code className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                {showPreview ? "Show Code" : "Live Preview"}
              </button>
              <button type="submit" className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--ink)] hover:opacity-90 sm:flex-none">
                <Save className="h-4 w-4" /> Save Template
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-sky-500/20 bg-sky-500/10 p-3">
            <p className="mb-1 text-xs font-semibold text-sky-400">Available Variables:</p>
            <div className="flex gap-2">
              {TEMPLATE_PURPOSES.find((t) => t.id === selected)?.vars.map((v) => (
                <span key={v} className="rounded bg-sky-500/20 px-2 py-0.5 font-mono text-[10px] text-sky-300">{v}</span>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs text-[var(--cream-muted)]">Subject Line</label>
            <input required value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Action Required: Please verify your email" className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900" />
          </div>

          <div>
            <label className="mb-1 block text-xs text-[var(--cream-muted)]">Email Body</label>
            {showPreview ? (
              <div className="min-h-[300px] w-full overflow-auto rounded-xl border border-gray-200 bg-white p-4 text-black shadow-inner" style={{ fontFamily: "Arial, sans-serif" }} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(bodyHtml || "<p style='color:gray'>No HTML content...</p>") }} />
            ) : (
              <textarea required value={bodyHtml} onChange={(e) => setBodyHtml(e.target.value)} placeholder="<p>Hello! Your code is {{code}}.</p>" className="min-h-[300px] w-full rounded-xl border border-[var(--wood)]/20 bg-gray-50 px-3 py-3 font-mono text-sm text-[var(--cream)] outline-none transition focus:border-[var(--accent)]" />
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
