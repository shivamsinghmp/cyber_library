"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ChevronLeft, Mail, FileText, Send, Clock, Users, PenSquare, Info } from "lucide-react";
import { EmailTemplatesTab }  from "./_components/EmailTemplatesTab";
import { EmailDraftsTab }     from "./_components/EmailDraftsTab";
import { EmailComposeTab }    from "./_components/EmailComposeTab";
import { EmailLogsTab }       from "./_components/EmailLogsTab";
import { EmailBulkSendTab }   from "./_components/EmailBulkSendTab";
import { EmailSignaturesTab } from "./_components/EmailSignaturesTab";
import type { EmailTemplate, EmailDraft, EmailLog, EmailSignature } from "./_components/types";

type Tab = "logs" | "compose" | "bulk" | "templates" | "signatures" | "drafts";

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "logs",       label: "Logs & Analytics", icon: <Clock     className="h-4 w-4" /> },
  { id: "compose",    label: "Send Email",        icon: <Send      className="h-4 w-4" /> },
  { id: "bulk",       label: "Bulk Send",         icon: <Users     className="h-4 w-4" /> },
  { id: "templates",  label: "Templates",         icon: <Mail      className="h-4 w-4" /> },
  { id: "signatures", label: "Signatures",        icon: <PenSquare className="h-4 w-4" /> },
  { id: "drafts",     label: "Drafts",            icon: <FileText  className="h-4 w-4" /> },
];

export default function EmailDashboardPage() {
  const [activeTab,  setActiveTab]  = useState<Tab>("logs");
  const [templates,  setTemplates]  = useState<EmailTemplate[]>([]);
  const [drafts,     setDrafts]     = useState<EmailDraft[]>([]);
  const [signatures, setSignatures] = useState<EmailSignature[]>([]);
  const [logs,       setLogs]       = useState<EmailLog[]>([]);
  const [statsMap,   setStatsMap]   = useState<Record<string, number>>({});
  const [logsTotal,  setLogsTotal]  = useState(0);
  const [loadingTmpls,  setLoadingTmpls]  = useState(true);
  const [loadingDrafts, setLoadingDrafts] = useState(true);
  const [loadingLogs,   setLoadingLogs]   = useState(false);

  const fetchTemplates  = useCallback(async () => { setLoadingTmpls(true);  const r = await fetch("/api/admin/email/templates",  { credentials: "include" }); if (r.ok) setTemplates(await r.json());  setLoadingTmpls(false);  }, []);
  const fetchDrafts     = useCallback(async () => { setLoadingDrafts(true); const r = await fetch("/api/admin/email/drafts",     { credentials: "include" }); if (r.ok) setDrafts(await r.json());     setLoadingDrafts(false); }, []);
  const fetchSignatures = useCallback(async () => {                          const r = await fetch("/api/admin/email/signatures", { credentials: "include" }); if (r.ok) setSignatures(await r.json());                          }, []);
  const fetchLogs       = useCallback(async () => {
    setLoadingLogs(true);
    const r = await fetch("/api/admin/email/logs", { credentials: "include" });
    if (r.ok) { const d = await r.json(); setLogs(d.logs ?? []); setStatsMap(d.statsMap ?? {}); setLogsTotal(d.total ?? 0); }
    setLoadingLogs(false);
  }, []);

  useEffect(() => { fetchTemplates(); fetchDrafts(); fetchSignatures(); fetchLogs(); }, []);

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6">
      <div>
        <Link href="/admin" className="inline-flex items-center gap-1 text-sm font-medium text-[var(--cream-muted)] hover:text-[var(--accent)]">
          <ChevronLeft className="h-4 w-4" /> Back to Admin
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-[var(--cream)] flex items-center gap-2">
          <Mail className="h-7 w-7 text-[var(--accent)]" /> Email Dashboard
        </h1>
        <p className="mt-1 text-sm text-[var(--cream-muted)]">Resend API se email bhejo — delivery, open, click sab track hoga webhook se.</p>
      </div>

      <div className="flex items-start gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm">
        <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-blue-900">Resend Webhook Setup (one time)</p>
          <p className="text-blue-700 mt-0.5">
            Resend Dashboard → Webhooks →{" "}
            <code className="rounded bg-blue-100 px-1.5 font-mono text-xs">https://yourdomain.com/api/webhooks/resend</code>
            {" "}· Enable: email.delivered, email.opened, email.clicked, email.bounced
          </p>
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto rounded-xl border border-[var(--border)] bg-white p-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-all ${
              activeTab === tab.id
                ? "bg-[var(--accent)] text-white shadow-sm"
                : "text-[var(--cream-muted)] hover:text-[var(--foreground)]"
            }`}
          >
            {tab.icon}{tab.label}
          </button>
        ))}
      </div>

      {activeTab === "logs"       && <EmailLogsTab       logs={logs} loading={loadingLogs} statsMap={statsMap} total={logsTotal} onRefresh={fetchLogs} />}
      {activeTab === "compose"    && <EmailComposeTab    signatures={signatures} drafts={drafts} />}
      {activeTab === "bulk"       && <EmailBulkSendTab   signatures={signatures} drafts={drafts} />}
      {activeTab === "templates"  && <EmailTemplatesTab  templates={templates}  loading={loadingTmpls}  onRefresh={fetchTemplates} />}
      {activeTab === "signatures" && <EmailSignaturesTab signatures={signatures} onRefresh={fetchSignatures} />}
      {activeTab === "drafts"     && <EmailDraftsTab     drafts={drafts} loading={loadingDrafts} onRefresh={fetchDrafts} />}
    </div>
  );
}
