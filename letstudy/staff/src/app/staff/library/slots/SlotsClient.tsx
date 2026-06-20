"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ChevronLeft, Loader2, Plus, Radio, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";

type Slot = {
  id: string;
  roomId: string | null;
  name: string;
  timeLabel: string;
  goal: string | null;
  slotType: string;
  meetLink: string | null;
  calendarEventId: string | null;
  capacity: number;
  price: number;
  isActive: boolean;
};

type LiveSlot = {
  slotId: string;
  slotName: string;
  liveCount: number;
  todayCheckins: number;
};

const EMPTY = {
  name: "", timeLabel: "", goal: "", slotType: "STUDY",
  meetLink: "", capacity: "10", price: "0", isActive: true,
};

export default function SlotsClient() {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [live, setLive] = useState<Record<string, LiveSlot>>({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/staff/slots", { credentials: "include" });
      if (res.ok) setSlots(await res.json());
    } finally { setLoading(false); }
  }, []);

  const refetchLive = useCallback(async () => {
    try {
      const res = await fetch("/api/staff/slots/live", { credentials: "include" });
      if (res.ok) {
        const json = await res.json();
        const map: Record<string, LiveSlot> = {};
        for (const s of json.slots) map[s.slotId] = s;
        setLive(map);
      }
    } catch { /* non-fatal */ }
  }, []);

  useEffect(() => { refetch(); refetchLive(); }, [refetch, refetchLive]);

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY);
    setShowForm(true);
  }

  function openEdit(s: Slot) {
    setEditingId(s.id);
    setForm({
      name: s.name, timeLabel: s.timeLabel, goal: s.goal ?? "", slotType: s.slotType,
      meetLink: s.meetLink ?? "", capacity: String(s.capacity), price: String(s.price), isActive: s.isActive,
    });
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: form.name, timeLabel: form.timeLabel, goal: form.goal || null,
        slotType: form.slotType, meetLink: form.meetLink || null,
        capacity: Number(form.capacity) || 10, price: Number(form.price) || 0,
        isActive: form.isActive,
      };
      const res = await fetch(editingId ? `/api/staff/slots/${editingId}` : "/api/staff/slots", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(editingId ? "Slot updated" : "Slot created");
        setShowForm(false);
        refetch();
      } else {
        toast.error(data.error?.name?.[0] || data.error || "Failed to save slot");
      }
    } finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this slot? Students enrolled won't be able to join.")) return;
    const res = await fetch(`/api/staff/slots/${id}`, { method: "DELETE", credentials: "include" });
    if (res.ok) { toast.success("Slot deleted"); refetch(); }
    else toast.error("Failed to delete");
  }

  async function handleSyncCalendar(id: string) {
    const res = await fetch("/api/staff/slots/sync-calendar", {
      method: "POST", headers: { "Content-Type": "application/json" },
      credentials: "include", body: JSON.stringify({ slotId: id }),
    });
    const data = await res.json();
    if (res.ok) toast.success(`Synced: ${data.added} added, ${data.failed} failed`);
    else toast.error(data.error || "Sync failed");
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/staff/library" className="inline-flex items-center gap-1 text-sm text-[var(--cream-muted)] hover:text-[var(--accent)]">
            <ChevronLeft className="h-4 w-4" /> Library
          </Link>
          <h1 className="mt-1 text-2xl font-semibold text-[var(--cream)]">Study Room Slots</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={refetchLive} className="flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2.5 text-sm text-[var(--cream-muted)]">
            <RefreshCw className="h-4 w-4" /> Refresh live
          </button>
          <button onClick={openCreate} className="flex items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[var(--ink)]">
            <Plus className="h-4 w-4" /> New slot
          </button>
        </div>
      </div>

      {showForm && (
        <div className="rounded-2xl border border-white/10 bg-black/30 p-6">
          <h2 className="mb-4 text-base font-semibold text-[var(--cream)]">{editingId ? "Edit slot" : "Create slot"}</h2>
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
            <Field label="Name"><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" required /></Field>
            <Field label="Time label"><input value={form.timeLabel} onChange={(e) => setForm({ ...form, timeLabel: e.target.value })} placeholder="8:00 AM – 12:00 PM" className="input" required /></Field>
            <Field label="Goal (optional)"><input value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value })} placeholder="UPSC, JEE…" className="input" /></Field>
            <Field label="Type">
              <select value={form.slotType} onChange={(e) => setForm({ ...form, slotType: e.target.value })} className="input">
                <option value="STUDY">Study</option>
                <option value="MENTORSHIP">Mentorship</option>
                <option value="MENTAL">Mental</option>
              </select>
            </Field>
            <Field label="Capacity"><input type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} className="input" /></Field>
            <Field label="Price (₹, 0 = free)"><input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="input" /></Field>
            <Field label="Google Meet link (optional)">
              <input value={form.meetLink} onChange={(e) => setForm({ ...form, meetLink: e.target.value })} placeholder="https://meet.google.com/…" className="input" />
            </Field>
            <label className="flex items-center gap-2 self-end pb-2 text-sm text-[var(--cream-muted)]">
              <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
              Active
            </label>
            <div className="col-span-2 flex gap-2">
              <button type="submit" disabled={saving} className="flex items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--ink)]">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />} {editingId ? "Update" : "Create"}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="rounded-xl border border-white/10 px-4 py-2 text-sm text-[var(--cream-muted)]">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/30">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-[var(--cream-muted)]">
            <Loader2 className="h-5 w-5 animate-spin" /> Loading…
          </div>
        ) : slots.length === 0 ? (
          <p className="py-12 text-center text-sm text-[var(--cream-muted)]">No slots yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left">
                {["Slot", "Time", "Capacity", "Live", "Actions"].map((h) => (
                  <th key={h} className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-[var(--cream-muted)]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {slots.map((s) => (
                <tr key={s.id}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-[var(--cream)]">{s.name}</p>
                    <p className="text-xs text-[var(--cream-muted)]">{s.slotType} · {s.isActive ? "Active" : "Inactive"}</p>
                  </td>
                  <td className="px-4 py-3 text-[var(--cream-muted)]">{s.timeLabel}</td>
                  <td className="px-4 py-3 text-[var(--cream-muted)]">{s.capacity}</td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1 text-emerald-400">
                      <Radio className="h-3.5 w-3.5" /> {live[s.id]?.liveCount ?? 0}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(s)} className="text-xs font-semibold text-[var(--accent)] hover:underline">Edit</button>
                      {s.calendarEventId && (
                        <button onClick={() => handleSyncCalendar(s.id)} className="text-xs font-semibold text-indigo-400 hover:underline">Sync Calendar</button>
                      )}
                      <button onClick={() => handleDelete(s.id)} className="text-xs font-semibold text-red-400 hover:underline">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <style jsx global>{`
        .input {
          width: 100%;
          border-radius: 0.75rem;
          border: 1px solid rgba(255,255,255,0.1);
          background: rgba(0,0,0,0.4);
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          color: var(--cream);
          outline: none;
        }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--cream-muted)]">{label}</span>
      {children}
    </label>
  );
}
