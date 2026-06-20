"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { RefreshCw, Plus, Mail, Phone, X } from "lucide-react";
import toast from "react-hot-toast";

type Contact = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  stage: string;
  source: string;
  assignedToId: string | null;
  assigneeName: string | null;
  updatedAt: string;
};

type TeamMember = { id: string; name: string | null; email: string };

const STAGES = ["NEW", "CONTACTED", "TRIAL", "CONVERTED", "LOST"] as const;
const STAGE_LABELS: Record<string, string> = {
  NEW: "New", CONTACTED: "Contacted", TRIAL: "Trial", CONVERTED: "Converted", LOST: "Lost",
};
const STAGE_COLORS: Record<string, string> = {
  NEW: "border-blue-200 bg-blue-50",
  CONTACTED: "border-amber-200 bg-amber-50",
  TRIAL: "border-violet-200 bg-violet-50",
  CONVERTED: "border-emerald-200 bg-emerald-50",
  LOST: "border-gray-200 bg-gray-50",
};
const SOURCE_LABELS: Record<string, string> = {
  LEAD_SUBMISSION: "Form lead", SIGNUP: "Signup", MANUAL: "Manual",
};

export default function PipelinePage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({ name: "", email: "", phone: "" });
  const [addSaving, setAddSaving] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [contactsRes, teamRes] = await Promise.all([
        fetch("/api/admin/pipeline", { credentials: "include" }),
        fetch("/api/admin/team", { credentials: "include" }),
      ]);
      if (contactsRes.ok) setContacts((await contactsRes.json()).contacts ?? []);
      if (teamRes.ok) setTeam((await teamRes.json()).team ?? []);
    } catch { toast.error("Failed to load pipeline."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function handleSync() {
    setSyncing(true);
    try {
      const res = await fetch("/api/admin/pipeline/sync", { method: "POST" });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        toast.success(`Synced ${json.created ?? 0} new contact${json.created === 1 ? "" : "s"}.`);
        fetchData();
      } else toast.error(json.error ?? "Sync failed.");
    } catch { toast.error("Sync failed."); }
    finally { setSyncing(false); }
  }

  async function moveStage(contact: Contact, stage: string) {
    setContacts(prev => prev.map(c => c.id === contact.id ? { ...c, stage } : c));
    try {
      const res = await fetch(`/api/admin/pipeline/${contact.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage }),
      });
      if (!res.ok) { toast.error("Failed to move contact."); fetchData(); }
    } catch { toast.error("Failed to move contact."); fetchData(); }
  }

  async function assignTo(contact: Contact, assignedToId: string) {
    setContacts(prev => prev.map(c => c.id === contact.id ? { ...c, assignedToId } : c));
    try {
      const res = await fetch(`/api/admin/pipeline/${contact.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignedToId: assignedToId || null }),
      });
      if (res.ok) fetchData();
      else toast.error("Failed to assign.");
    } catch { toast.error("Failed to assign."); }
  }

  async function handleAddContact(e: React.FormEvent) {
    e.preventDefault();
    setAddSaving(true);
    try {
      const res = await fetch("/api/admin/pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addForm),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        toast.success("Contact added.");
        setAddOpen(false);
        setAddForm({ name: "", email: "", phone: "" });
        fetchData();
      } else toast.error(typeof json.error === "string" ? json.error : "Failed to add contact.");
    } catch { toast.error("Failed to add contact."); }
    finally { setAddSaving(false); }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 md:text-3xl">Admissions Pipeline</h1>
          <p className="mt-1 text-sm text-gray-500">{contacts.length} contact{contacts.length === 1 ? "" : "s"} in the pipeline</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setAddOpen(true)}
            className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
            <Plus className="h-4 w-4" /> Add Contact
          </button>
          <button onClick={handleSync} disabled={syncing}
            className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            style={{ background: "linear-gradient(135deg, #9A3412, #C2410C)" }}>
            <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} /> {syncing ? "Syncing…" : "Sync Leads"}
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-5">
          {STAGES.map(stage => {
            const items = contacts.filter(c => c.stage === stage);
            return (
              <div key={stage} className={`rounded-2xl border p-3 ${STAGE_COLORS[stage]}`}>
                <div className="mb-3 flex items-center justify-between px-1">
                  <h2 className="text-sm font-bold text-gray-800">{STAGE_LABELS[stage]}</h2>
                  <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-gray-600">{items.length}</span>
                </div>
                <div className="space-y-2">
                  {items.length === 0 && (
                    <p className="px-1 py-3 text-center text-xs text-gray-400">No contacts</p>
                  )}
                  {items.map(c => (
                    <div key={c.id} className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
                      <Link href={`/admin/pipeline/${c.id}`} className="block">
                        <p className="text-sm font-semibold text-gray-900">{c.name || "Unnamed contact"}</p>
                        {c.email && <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-500"><Mail className="h-3 w-3" /> {c.email}</p>}
                        {c.phone && <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-500"><Phone className="h-3 w-3" /> {c.phone}</p>}
                        <span className="mt-1.5 inline-block rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600">
                          {SOURCE_LABELS[c.source] ?? c.source}
                        </span>
                      </Link>
                      <div className="mt-2 flex flex-col gap-1.5 border-t border-gray-100 pt-2">
                        <select value={c.stage} onChange={e => moveStage(c, e.target.value)}
                          className="rounded-lg border border-gray-200 px-2 py-1 text-xs text-gray-700">
                          {STAGES.map(s => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
                        </select>
                        <select value={c.assignedToId ?? ""} onChange={e => assignTo(c, e.target.value)}
                          className="rounded-lg border border-gray-200 px-2 py-1 text-xs text-gray-700">
                          <option value="">Unassigned</option>
                          {team.map(t => <option key={t.id} value={t.id}>{t.name || t.email}</option>)}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {addOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Add Contact</h2>
              <button onClick={() => setAddOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleAddContact} className="space-y-3">
              <input value={addForm.name} onChange={e => setAddForm({ ...addForm, name: e.target.value })}
                placeholder="Name" className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm" />
              <input value={addForm.email} onChange={e => setAddForm({ ...addForm, email: e.target.value })}
                placeholder="Email" type="email" className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm" />
              <input value={addForm.phone} onChange={e => setAddForm({ ...addForm, phone: e.target.value })}
                placeholder="Phone" className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm" />
              <button type="submit" disabled={addSaving}
                className="w-full rounded-xl py-2.5 text-sm font-bold text-white disabled:opacity-60"
                style={{ background: "linear-gradient(135deg, #9A3412, #C2410C)" }}>
                {addSaving ? "Adding…" : "Add Contact"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
