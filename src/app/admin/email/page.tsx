"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ChevronLeft, Mail, Plus, Trash2, Key, Save, Send, Clock, CheckCircle2, XCircle, Filter, FileText, Eye, Code } from "lucide-react";
import DOMPurify from "isomorphic-dompurify";
import toast from "react-hot-toast";

type EmailAccount = {
  id: string;
  email: string;
  purpose: string;
  isActive: boolean;
  senderName: string;
  createdAt: string;
};

type EmailTemplate = {
  id: string;
  purpose: string;
  subject: string;
  bodyHtml: string;
  variables: any;
};

type EmailDraft = {
  id: string;
  name: string;
  subject: string;
  bodyHtml: string;
  createdAt: string;
};

type EmailLogType = {
  id: string;
  toEmail: string;
  subject: string;
  purpose: string;
  status: string;
  errorMessage: string | null;
  senderEmail: string | null;
  createdAt: string;
};

const TEMPLATE_PURPOSES = [
  { id: "OTP_VERIFY", label: "Account Verification OTP", vars: ["{{code}}"] },
  { id: "OTP_RESET", label: "Password Reset OTP", vars: ["{{code}}"] },
  { id: "SUPPORT_REPLY", label: "Support Ticket Reply", vars: ["{{name}}", "{{message}}"] },
];

export default function EmailDashboardPage() {
  const [activeTab, setActiveTab] = useState<"accounts" | "templates" | "drafts" | "compose" | "logs">("accounts");
  
  // Accounts State
  const [accounts, setAccounts] = useState<EmailAccount[]>([]);
  const [actEmail, setActEmail] = useState("");
  const [actPass, setActPass] = useState("");
  const [actPurpose, setActPurpose] = useState("GENERAL");
  const [actName, setActName] = useState("The Cyber Library");
  const [actSmtpHost, setActSmtpHost] = useState("smtp.gmail.com");
  const [actSmtpPort, setActSmtpPort] = useState("2525");
  const [loadingActs, setLoadingActs] = useState(true);

  // Templates State
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>(TEMPLATE_PURPOSES[0].id);
  const [tmplSubject, setTmplSubject] = useState("");
  const [tmplBodyHtml, setTmplBodyHtml] = useState("");
  const [tmplShowPreview, setTmplShowPreview] = useState(false);
  const [loadingTmpls, setLoadingTmpls] = useState(true);

  // Drafts State
  const [drafts, setDrafts] = useState<EmailDraft[]>([]);
  const [selectedDraftId, setSelectedDraftId] = useState<string>("");
  const [draftName, setDraftName] = useState("");
  const [draftSubject, setDraftSubject] = useState("");
  const [draftBodyHtml, setDraftBodyHtml] = useState("");
  const [draftShowPreview, setDraftShowPreview] = useState(false);
  const [loadingDrafts, setLoadingDrafts] = useState(true);

  // Compose State
  const [composeAccountId, setComposeAccountId] = useState("");
  const [composeTo, setComposeTo] = useState("");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeMsg, setComposeMsg] = useState("");
  const [sending, setSending] = useState(false);

  // Logs State
  const [logs, setLogs] = useState<EmailLogType[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [logFilterStatus, setLogFilterStatus] = useState("ALL");
  const [logFilterPurpose, setLogFilterPurpose] = useState("ALL");
  const [logFilterSearch, setLogFilterSearch] = useState("");

  const filteredLogs = logs.filter(log => {
    if (logFilterStatus !== "ALL" && log.status !== logFilterStatus) return false;
    if (logFilterPurpose !== "ALL" && log.purpose !== logFilterPurpose) return false;
    if (logFilterSearch && !log.toEmail.toLowerCase().includes(logFilterSearch.toLowerCase())) return false;
    return true;
  });

  useEffect(() => {
    fetchAccounts();
    fetchTemplates();
    fetchDrafts();
  }, []);

  useEffect(() => {
    if (activeTab === "logs") fetchLogs();
  }, [activeTab]);

  useEffect(() => {
    // When selected draft changes, load its data or reset
    const existing = drafts.find(d => d.id === selectedDraftId);
    if (existing) {
      setDraftName(existing.name);
      setDraftSubject(existing.subject);
      setDraftBodyHtml(existing.bodyHtml);
    } else {
      setDraftName("");
      setDraftSubject("");
      setDraftBodyHtml("");
    }
  }, [selectedDraftId, drafts]);

  useEffect(() => {
    // When selected template changes, load its data
    const existing = templates.find(t => t.purpose === selectedTemplate);
    if (existing) {
      setTmplSubject(existing.subject);
      setTmplBodyHtml(existing.bodyHtml);
    } else {
      setTmplSubject("");
      setTmplBodyHtml("");
    }
  }, [selectedTemplate, templates]);

  const fetchAccounts = async () => {
    setLoadingActs(true);
    try {
      const res = await fetch("/api/admin/email/accounts");
      if (res.ok) setAccounts(await res.json());
    } finally {
      setLoadingActs(false);
    }
  };

  const fetchTemplates = async () => {
    setLoadingTmpls(true);
    try {
      const res = await fetch("/api/admin/email/templates");
      if (res.ok) setTemplates(await res.json());
    } finally {
      setLoadingTmpls(false);
    }
  };

  const fetchDrafts = async () => {
    setLoadingDrafts(true);
    try {
      const res = await fetch("/api/admin/email/drafts");
      if (res.ok) setDrafts(await res.json());
    } finally {
      setLoadingDrafts(false);
    }
  };

  const fetchLogs = async () => {
    setLoadingLogs(true);
    try {
      const res = await fetch("/api/admin/email/logs");
      if (res.ok) setLogs(await res.json());
    } finally {
      setLoadingLogs(false);
    }
  };

  const addAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/admin/email/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: actEmail, password: actPass, purpose: actPurpose, senderName: actName, smtpHost: actSmtpHost, smtpPort: Number(actSmtpPort) }),
    });
    if (res.ok) {
      toast.success("Account added securely");
      fetchAccounts();
      setActEmail("");
      setActPass("");
    } else {
      toast.error((await res.json()).error || "Failed to add account");
    }
  };

  const deleteAccount = async (id: string) => {
    if (!confirm("Remove this email account?")) return;
    const res = await fetch(`/api/admin/email/accounts?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Account removed");
      fetchAccounts();
    } else {
      toast.error("Failed to delete");
    }
  };

  const updateAccountStatus = async (id: string, purpose: string) => {
    const res = await fetch(`/api/admin/email/accounts`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, purpose }),
    });
    if (res.ok) fetchAccounts();
  };

  const saveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    const meta = TEMPLATE_PURPOSES.find(t => t.id === selectedTemplate);
    const res = await fetch("/api/admin/email/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        purpose: selectedTemplate,
        subject: tmplSubject,
        bodyHtml: tmplBodyHtml,
        variables: meta?.vars || [],
      }),
    });
    if (res.ok) {
      toast.success("Template saved");
      fetchTemplates();
    } else {
      toast.error("Failed to save template");
    }
  };

  const saveDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/admin/email/drafts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: selectedDraftId || undefined,
        name: draftName,
        subject: draftSubject,
        bodyHtml: draftBodyHtml,
      }),
    });
    if (res.ok) {
      toast.success("Draft saved");
      fetchDrafts();
      if (!selectedDraftId) {
        const newer = await res.json();
        setSelectedDraftId(newer.id);
      }
    } else {
      toast.error("Failed to save draft");
    }
  };

  const deleteDraft = async (id: string) => {
    if (!confirm("Are you sure you want to delete this draft?")) return;
    const res = await fetch(`/api/admin/email/drafts?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Draft deleted");
      if (selectedDraftId === id) setSelectedDraftId("");
      fetchDrafts();
    } else toast.error("Failed to delete draft");
  };

  const sendCustomMail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!composeTo || !composeSubject || !composeMsg) return;

    setSending(true);
    try {
      const res = await fetch("/api/admin/email/send-custom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          to: composeTo, 
          subject: composeSubject, 
          message: composeMsg,
          accountId: composeAccountId || undefined
        }),
      });

      if (res.ok) {
        toast.success("Support Email sent successfully!");
        setComposeTo("");
        setComposeSubject("");
        setComposeMsg("");
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to send email");
      }
    } catch {
      toast.error("Network error");
    }
    setSending(false);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-6">
      <div>
        <Link
          href="/admin"
          className="inline-flex items-center gap-1 text-sm font-medium text-[var(--cream-muted)] hover:text-[var(--accent)]"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Admin
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-[var(--cream)] flex items-center gap-2">
          <Mail className="h-7 w-7 text-[var(--accent)]" />
          Email & Gmail Dashboard
        </h1>
        <p className="mt-1 text-sm text-[var(--cream-muted)]">
          Manage outgoing Gmail accounts via App Passwords and configure dynamic email templates.
        </p>
      </div>

      <div className="flex gap-4 border-b border-white/10 pb-4">
        <button
          onClick={() => setActiveTab("accounts")}
          className={`flex items-center gap-2 px-4 py-2 font-semibold transition rounded-xl ${
            activeTab === "accounts" ? "bg-[var(--accent)] text-[var(--ink)]" : "text-[var(--cream-muted)] hover:bg-white/5"
          }`}
        >
          Sending Accounts
        </button>
        <button
          onClick={() => setActiveTab("templates")}
          className={`flex items-center gap-2 px-4 py-2 font-semibold transition rounded-xl ${
            activeTab === "templates" ? "bg-[var(--accent)] text-[var(--ink)]" : "text-[var(--cream-muted)] hover:bg-white/5"
          }`}
        >
          HTML Templates
        </button>
        <button
          onClick={() => setActiveTab("drafts")}
          className={`flex items-center gap-2 px-4 py-2 font-semibold transition rounded-xl ${
            activeTab === "drafts" ? "bg-[var(--accent)] text-[var(--ink)]" : "text-[var(--cream-muted)] hover:bg-white/5"
          }`}
        >
          <FileText className="w-4 h-4" /> Drafts Library
        </button>
        <button
          onClick={() => setActiveTab("compose")}
          className={`flex items-center gap-2 px-4 py-2 font-semibold transition rounded-xl ${
            activeTab === "compose" ? "bg-[var(--accent)] text-[var(--ink)]" : "text-[var(--cream-muted)] hover:bg-white/5"
          }`}
        >
          <Send className="w-4 h-4" /> Send Email
        </button>
        <button
          onClick={() => setActiveTab("logs")}
          className={`flex items-center gap-2 px-4 py-2 font-semibold transition rounded-xl ${
            activeTab === "logs" ? "bg-[var(--accent)] text-[var(--ink)]" : "text-[var(--cream-muted)] hover:bg-white/5"
          }`}
        >
          <Clock className="w-4 h-4" /> Activity Logs
        </button>
      </div>

      {activeTab === "accounts" && (
        <div className="space-y-8">
          <form onSubmit={addAccount} className="rounded-2xl border border-white/10 bg-black/30 p-6 md:p-8">
            <h2 className="text-lg font-semibold text-[var(--cream)] mb-4 flex items-center gap-2">
              <Key className="h-5 w-5 text-amber-500" /> Connect Gmail Account
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-xs text-[var(--cream-muted)] block mb-1">Sender Name (e.g. CYBERLIB Support)</label>
                <input required value={actName} onChange={e => setActName(e.target.value)} className="w-full rounded-xl bg-black/20 border border-white/10 px-3 py-2 text-sm text-[var(--cream)]" />
              </div>
              <div>
                <label className="text-xs text-[var(--cream-muted)] block mb-1">Email Address</label>
                <input required type="email" value={actEmail} onChange={e => setActEmail(e.target.value)} placeholder="no-reply@gmail.com" className="w-full rounded-xl bg-black/20 border border-white/10 px-3 py-2 text-sm text-[var(--cream)]" />
              </div>
              <div>
                <label className="text-xs text-[var(--cream-muted)] block mb-1">Password / App Password</label>
                <input required type="password" value={actPass} onChange={e => setActPass(e.target.value)} placeholder="• • • • • • • • • • • • • • • •" className="w-full rounded-xl bg-black/20 border border-white/10 px-3 py-2 text-sm text-[var(--cream)]" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[var(--cream-muted)] block mb-1">SMTP Host</label>
                  <input value={actSmtpHost} onChange={e => setActSmtpHost(e.target.value)} placeholder="smtp.gmail.com" className="w-full rounded-xl bg-black/20 border border-white/10 px-3 py-2 text-sm text-[var(--cream)]" />
                </div>
                <div>
                  <label className="text-xs text-[var(--cream-muted)] block mb-1">SMTP Port</label>
                  <input type="number" value={actSmtpPort} onChange={e => setActSmtpPort(e.target.value)} placeholder="2525" className="w-full rounded-xl bg-black/20 border border-white/10 px-3 py-2 text-sm text-[var(--cream)]" />
                </div>
              </div>
              <div>
                <label className="text-xs text-[var(--cream-muted)] block mb-1">Primary Routing Purpose</label>
                <select value={actPurpose} onChange={e => setActPurpose(e.target.value)} className="w-full rounded-xl bg-black/20 border border-white/10 px-3 py-2 text-sm text-[var(--cream)]">
                  <option value="OTP">OTP Verification & Reset</option>
                  <option value="SUPPORT">Support Desk Replies</option>
                  <option value="GENERAL">General / Newsletter</option>
                </select>
              </div>
            </div>
            <button type="submit" className="flex items-center gap-2 rounded-xl bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-[var(--ink)] hover:opacity-90">
              <Plus className="h-4 w-4" /> Add Account & Encrypt Token
            </button>
          </form>

          <div className="rounded-2xl border border-white/10 bg-black/30 overflow-hidden">
            <table className="w-full text-left text-sm text-[var(--cream-muted)]">
              <thead className="bg-white/5 text-[var(--cream)] border-b border-white/10">
                <tr>
                  <th className="px-4 py-3 font-semibold text-xs uppercase">Email Sender</th>
                  <th className="px-4 py-3 font-semibold text-xs uppercase">Purpose Routing</th>
                  <th className="px-4 py-3 font-semibold text-xs uppercase">Status</th>
                  <th className="px-4 py-3 font-semibold text-xs uppercase text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loadingActs ? <tr><td colSpan={4} className="p-4 text-center">Loading...</td></tr> : accounts.map((act) => (
                  <tr key={act.id} className="hover:bg-white/5">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-[var(--cream)]">{act.senderName}</div>
                      <div className="text-xs opacity-70">{act.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <select 
                        value={act.purpose} 
                        onChange={(e) => updateAccountStatus(act.id, e.target.value)}
                        className="bg-black/50 border border-white/10 rounded-lg px-2 py-1 text-xs text-[var(--cream)]"
                      >
                        <option value="OTP">OTP</option>
                        <option value="SUPPORT">SUPPORT</option>
                        <option value="GENERAL">GENERAL</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      {act.isActive ? <span className="text-emerald-400 text-xs bg-emerald-400/10 px-2 py-1 rounded-full">Active</span> : <span className="text-red-400">Inactive</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => deleteAccount(act.id)} className="text-red-400 hover:bg-red-400/10 p-1.5 rounded-lg border border-transparent hover:border-red-400/20">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "templates" && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="w-full md:w-1/3 space-y-4">
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-[var(--cream)] mb-3">Active System Templates</h3>
                {TEMPLATE_PURPOSES.map(tmpl => (
                  <button
                    key={tmpl.id}
                    onClick={() => setSelectedTemplate(tmpl.id)}
                    className={`w-full text-left px-4 py-3 rounded-xl border transition ${selectedTemplate === tmpl.id ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]' : 'border-white/10 bg-black/20 text-[var(--cream-muted)] hover:bg-white/5'}`}
                  >
                    <div className="font-semibold text-sm">{tmpl.label}</div>
                    <div className="text-[10px] mt-1 opacity-60">ID: {tmpl.id}</div>
                  </button>
                ))}
              </div>

              {drafts.length > 0 && (
                <div className="pt-4 border-t border-white/10">
                  <label className="text-xs text-[var(--cream-muted)] block mb-2">Load HTML from a saved Draft:</label>
                  <select 
                    onChange={e => {
                      const d = drafts.find(x => x.id === e.target.value);
                      if (d) {
                        setTmplSubject(d.subject);
                        setTmplBodyHtml(d.bodyHtml);
                        toast.success(`Loaded draft: ${d.name}`);
                      }
                      e.target.value = "";
                    }}
                    className="w-full rounded-xl bg-black/40 border border-white/10 px-3 py-2 text-sm text-[var(--cream)] cursor-pointer"
                  >
                    <option value="">-- Select a draft to load --</option>
                    {drafts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
              )}
            </div>

            <div className="w-full md:w-2/3">
              <form onSubmit={saveTemplate} className="rounded-2xl border border-white/10 bg-black/30 p-6 space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
                  <h2 className="text-lg font-semibold text-[var(--cream)]">Edit HTML content</h2>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <button type="button" onClick={() => setTmplShowPreview(!tmplShowPreview)} className="flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold text-[var(--cream)] hover:bg-white/20">
                      {tmplShowPreview ? <Code className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      {tmplShowPreview ? "Show Code" : "Live Preview"}
                    </button>
                    <button type="submit" className="flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--ink)] hover:opacity-90">
                      <Save className="h-4 w-4" /> Save Template
                    </button>
                  </div>
                </div>

                <div className="bg-sky-500/10 border border-sky-500/20 rounded-xl p-3">
                  <p className="text-xs text-sky-400 font-semibold mb-1">Available Variables for this template:</p>
                  <div className="flex gap-2">
                    {TEMPLATE_PURPOSES.find(t => t.id === selectedTemplate)?.vars.map(v => (
                      <span key={v} className="bg-sky-500/20 text-sky-300 font-mono text-[10px] px-2 py-0.5 rounded">{v}</span>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs text-[var(--cream-muted)] block mb-1">Subject Line</label>
                  <input required value={tmplSubject} onChange={e => setTmplSubject(e.target.value)} placeholder="e.g. Action Required: Please verify your email" className="w-full rounded-xl bg-black/20 border border-white/10 px-3 py-2 text-sm text-[var(--cream)]" />
                </div>
                
                <div className="flex-1">
                  <label className="text-xs text-[var(--cream-muted)] block mb-1">Email Body</label>
                  {tmplShowPreview ? (
                    <div className="w-full rounded-xl bg-white border border-white/10 text-black p-4 min-h-[300px] overflow-auto shadow-inner" style={{ fontFamily: "Arial, sans-serif" }} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(tmplBodyHtml || "<p style='color:gray'>No HTML content...</p>") }} />
                  ) : (
                    <textarea 
                      required 
                      value={tmplBodyHtml} 
                      onChange={e => setTmplBodyHtml(e.target.value)} 
                      placeholder="<p>Hello! Your code is {{code}}.</p>" 
                      className="w-full rounded-xl bg-black/20 border border-[var(--wood)]/20 focus:border-[var(--accent)] outline-none transition px-3 py-3 text-sm text-[var(--cream)] font-mono min-h-[300px]" 
                    />
                  )}
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {activeTab === "drafts" && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="w-full md:w-1/3 space-y-4">
              <button onClick={() => setSelectedDraftId("")} className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed text-sm font-semibold transition ${!selectedDraftId ? "bg-[var(--accent)]/10 text-[var(--accent)] border-[var(--accent)]" : "text-[var(--cream-muted)] border-white/20 hover:border-white/50 hover:bg-white/5"}`}>
                <Plus className="w-4 h-4" /> Create New Draft
              </button>
              
              <div className="space-y-2">
                {loadingDrafts ? <div className="text-sm text-center opacity-50 py-4">Loading drafts...</div> : drafts.length === 0 ? <div className="text-sm text-center opacity-50 py-4">No drafts saved yet.</div> : drafts.map(d => (
                  <div key={d.id} className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedDraftId(d.id)}
                      className={`flex-1 text-left px-4 py-3 rounded-xl border transition truncate ${selectedDraftId === d.id ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]' : 'border-white/10 bg-black/20 text-[var(--cream-muted)] hover:bg-white/5'}`}
                    >
                      <div className="font-semibold text-sm truncate">{d.name}</div>
                      <div className="text-[10px] mt-1 opacity-60 truncate">Subj: {d.subject}</div>
                    </button>
                    <button onClick={() => deleteDraft(d.id)} className="p-3 border border-white/5 hover:border-red-500/50 hover:bg-red-500/10 text-red-400 rounded-xl transition">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="w-full md:w-2/3">
              <form onSubmit={saveDraft} className="rounded-2xl border border-dashed border-white/20 bg-black/20 p-6 space-y-4">
                <div className="flex justify-between items-center mb-2">
                  <h2 className="text-lg font-semibold text-[var(--cream)]">{selectedDraftId ? "Edit Draft" : "New Blank Draft"}</h2>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setDraftShowPreview(!draftShowPreview)} className="flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold text-[var(--cream)] hover:bg-white/20">
                      {draftShowPreview ? <Code className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      {draftShowPreview ? "Code" : "Preview"}
                    </button>
                    <button type="submit" className="flex items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--ink)] hover:opacity-90">
                      <Save className="h-4 w-4" /> Save Draft
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-[var(--cream-muted)] block mb-1">Draft Internal Name</label>
                  <input required value={draftName} onChange={e => setDraftName(e.target.value)} placeholder="e.g. Diwali Special Promo" className="w-full rounded-xl bg-black/40 border border-white/10 px-3 py-2 text-sm text-[var(--cream)]" />
                </div>
                
                <div>
                  <label className="text-xs text-[var(--cream-muted)] block mb-1">Email Subject Line</label>
                  <input required value={draftSubject} onChange={e => setDraftSubject(e.target.value)} placeholder="e.g. Happy Diwali!" className="w-full rounded-xl bg-black/40 border border-white/10 px-3 py-2 text-sm text-[var(--cream)]" />
                </div>
                
                <div className="flex-1">
                  <label className="text-xs text-[var(--cream-muted)] block mb-1">Email HTML Body</label>
                  {draftShowPreview ? (
                    <div className="w-full rounded-xl bg-white border border-white/10 text-black p-4 min-h-[300px] overflow-auto shadow-inner" style={{ fontFamily: "Arial, sans-serif" }} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(draftBodyHtml || "<p style='color:gray'>No HTML content...</p>") }} />
                  ) : (
                    <textarea 
                      required 
                      value={draftBodyHtml} 
                      onChange={e => setDraftBodyHtml(e.target.value)} 
                      placeholder="<h1>Hello World</h1>" 
                      className="w-full rounded-xl bg-black/40 border border-[var(--wood)]/20 outline-none focus:border-[var(--accent)] px-3 py-3 text-sm text-[var(--cream)] font-mono min-h-[300px]" 
                    />
                  )}
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {activeTab === "compose" && (
        <div className="space-y-6">
          <form onSubmit={sendCustomMail} className="rounded-2xl border border-white/10 bg-black/30 p-6 md:p-8 max-w-2xl">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-[var(--cream)] flex items-center gap-2">
                <Send className="h-5 w-5 text-[var(--wood)]" /> Compose Support Mail
              </h2>
              <p className="text-sm text-[var(--cream-muted)] mt-1">
                Emails sent from here will use the <span className="font-semibold text-[var(--accent)]">SUPPORT</span> Gmail account config and the <span className="font-semibold text-emerald-400">SUPPORT_REPLY</span> HTML template.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs text-[var(--cream)]/60 mb-1">Send using Account</label>
                <select 
                  value={composeAccountId} 
                  onChange={e => setComposeAccountId(e.target.value)} 
                  className="w-full bg-black/40 border border-[var(--wood)]/20 rounded-xl px-4 py-2.5 text-sm text-[var(--cream)] focus:border-[var(--accent)] outline-none transition"
                >
                  <option value="">Auto-Detect (Use default SUPPORT account)</option>
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.senderName} ({acc.email})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-[var(--cream)]/60 mb-1">To Email Address</label>
                <input required type="email" value={composeTo} onChange={e => setComposeTo(e.target.value)} placeholder="student@example.com" className="w-full bg-black/40 border border-[var(--wood)]/20 rounded-xl px-4 py-2.5 text-sm text-[var(--cream)] focus:border-[var(--accent)] outline-none transition" />
              </div>
              <div>
                <label className="block text-xs text-[var(--cream)]/60 mb-1">Subject</label>
                <input required type="text" value={composeSubject} onChange={e => setComposeSubject(e.target.value)} placeholder="Important: Your Support Ticket" className="w-full bg-black/40 border border-[var(--wood)]/20 rounded-xl px-4 py-2.5 text-sm text-[var(--cream)] focus:border-[var(--accent)] outline-none transition" />
              </div>
              <div>
                <label className="block text-xs text-[var(--cream)]/60 mb-1">Message Content (will be beautifully injected into <b>{`{{message}}`}</b> space)</label>
                <textarea required rows={6} value={composeMsg} onChange={e => setComposeMsg(e.target.value)} placeholder="Type your response here..." className="w-full bg-black/40 border border-[var(--wood)]/20 rounded-xl px-4 py-2.5 text-sm text-[var(--cream)] focus:border-[var(--accent)] outline-none transition resize-none" />
              </div>

              <div className="pt-2">
                <button type="submit" disabled={sending} className="w-full flex justify-center items-center gap-2 bg-[var(--accent)] text-[var(--ink)] font-bold py-3 rounded-xl hover:opacity-90 transition disabled:opacity-50">
                  <Send className="w-4 h-4" /> {sending ? "Sending..." : "Send Custom Email"}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {activeTab === "logs" && (
        <div className="space-y-6">
          <div className="bg-black/30 border border-white/10 p-4 rounded-2xl flex flex-col sm:flex-row gap-4 items-center">
            <div className="flex items-center gap-2 text-[var(--cream-muted)] font-semibold text-sm">
              <Filter className="w-4 h-4" /> Filters:
            </div>
            <select 
              value={logFilterStatus} 
              onChange={e => setLogFilterStatus(e.target.value)} 
              className="bg-black/40 border border-[var(--wood)]/20 rounded-xl px-3 py-2 text-xs text-[var(--cream)] focus:border-[var(--accent)] outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="SUCCESS">Success Only</option>
              <option value="FAILED">Failed Only</option>
            </select>
            <select 
              value={logFilterPurpose} 
              onChange={e => setLogFilterPurpose(e.target.value)} 
              className="bg-black/40 border border-[var(--wood)]/20 rounded-xl px-3 py-2 text-xs text-[var(--cream)] focus:border-[var(--accent)] outline-none"
            >
              <option value="ALL">All Purposes (OTP, Support, General)</option>
              <option value="OTP">OTP Verification</option>
              <option value="SUPPORT">Support Desk</option>
              <option value="GENERAL">General / Newsletter</option>
            </select>
            <input 
              type="text" 
              placeholder="Search Recipient Email ID..." 
              value={logFilterSearch}
              onChange={e => setLogFilterSearch(e.target.value)}
              className="flex-1 min-w-[200px] bg-black/40 border border-[var(--wood)]/20 rounded-xl px-4 py-2 text-xs text-[var(--cream)] focus:border-[var(--accent)] outline-none"
            />
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/30 overflow-hidden">
            <table className="w-full text-left text-sm text-[var(--cream-muted)]">
              <thead className="bg-white/5 text-[var(--cream)] border-b border-white/10">
                <tr>
                  <th className="px-4 py-3 font-semibold text-xs uppercase">Timestamp</th>
                  <th className="px-4 py-3 font-semibold text-xs uppercase">Recipient & Subject</th>
                  <th className="px-4 py-3 font-semibold text-xs uppercase">Purpose</th>
                  <th className="px-4 py-3 font-semibold text-xs uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loadingLogs ? (
                  <tr><td colSpan={4} className="p-4 text-center">Loading logs...</td></tr>
                ) : filteredLogs.length === 0 ? (
                  <tr><td colSpan={4} className="p-8 text-center opacity-50">No logs match these filters.</td></tr>
                ) : (
                  filteredLogs.map(log => (
                    <tr key={log.id} className="hover:bg-white/5 transition">
                      <td className="px-4 py-3 whitespace-nowrap text-xs">
                        {new Date(log.createdAt).toLocaleString("en-IN", {
                          day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-[var(--cream)]">{log.toEmail}</div>
                        <div className="text-xs truncate max-w-[200px] md:max-w-xs">{log.subject}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[10px] uppercase font-bold tracking-wider bg-white/5 border border-white/10 px-2 py-1 rounded inline-block">
                          {log.purpose}
                        </span>
                        <div className="text-[10px] mt-1 opacity-50 max-w-[120px] truncate" title={log.senderEmail || ""}>
                          {log.senderEmail}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {log.status === "SUCCESS" ? (
                          <div className="flex items-center gap-1.5 text-emerald-400">
                            <CheckCircle2 className="w-4 h-4" />
                            <span className="text-xs font-semibold">Sent</span>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-1 text-red-400" title={log.errorMessage || "Unknown Error"}>
                            <div className="flex items-center gap-1.5">
                              <XCircle className="w-4 h-4" />
                              <span className="text-xs font-semibold">Failed</span>
                            </div>
                            {log.errorMessage && (
                              <div className="text-[10px] max-w-[200px] truncate opacity-80">{log.errorMessage}</div>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
