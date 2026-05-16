"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Calendar, ArrowRight, Link as LinkIcon, Radio, Users, RefreshCw, Clock, UserCheck, Video } from "lucide-react";
import { Modal } from "@/components/Modal";
import toast from "react-hot-toast";
import { useFetch } from "@/hooks/useFetch";
import {
  AdminPageHeader,
  AdminTh,
  AdminTd,
  FormActions,
  FormInput,
  FormSelect,
  FormCheckbox,
  StatusBadge,
  RowActions,
} from "@/components/ui";

const GOAL_OPTIONS = ["", "UPSC", "JEE", "NEET", "GATE", "CAT", "Other"];
const SLOT_TYPE_OPTIONS = [
  { value: "STUDY", label: "Study Room" },
  { value: "MENTORSHIP", label: "Mentorship" },
  { value: "MENTAL", label: "Mental Session" },
] as const;

type StudySlot = {
  id: string;
  roomId: string | null;
  name: string;
  timeLabel: string;
  goal: string | null;
  slotType?: string;
  meetLink: string | null;
  calendarEventId: string | null;
  capacity: number;
  price: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type CalendarAttendee = { email: string | null; responseStatus: string | null };

const defaultForm = {
  name: "", startTime: "", endTime: "", goal: "", slotType: "STUDY" as "STUDY" | "MENTORSHIP" | "MENTAL",
  meetLink: "", calendarEventId: "", autoGenerateMeet: false, capacity: 10, price: 0, isActive: true,
};

function buildPayload(form: typeof defaultForm) {
  const [startH, startM] = form.startTime.split(":");
  const [endH, endM] = form.endTime.split(":");
  const today = new Date();
  const sd = new Date(today); sd.setHours(Number(startH), Number(startM), 0, 0);
  const ed = new Date(today); ed.setHours(Number(endH), Number(endM), 0, 0);
  const fmt = (d: Date) => d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  return {
    name: form.name.trim(),
    timeLabel: `${fmt(sd)} - ${fmt(ed)}`,
    startTime: form.autoGenerateMeet ? sd.toISOString() : undefined,
    endTime: form.autoGenerateMeet ? ed.toISOString() : undefined,
    goal: form.goal.trim() || null,
    slotType: form.slotType,
    meetLink: form.autoGenerateMeet ? null : (form.meetLink.trim() || null),
    calendarEventId: form.autoGenerateMeet ? null : (form.calendarEventId.trim() || null),
    autoGenerateMeet: form.autoGenerateMeet,
    capacity: form.capacity,
    price: form.price,
    isActive: form.isActive,
  };
}

export default function AdminSlotsPage() {
  const { data, loading, refetch } = useFetch<StudySlot[]>("/api/admin/slots");
  const slots = data ?? [];

  const [createOpen, setCreateOpen] = useState(false);
  const [editSlot, setEditSlot] = useState<StudySlot | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);

  const [attendeesSlot, setAttendeesSlot] = useState<StudySlot | null>(null);
  const [attendees, setAttendees] = useState<CalendarAttendee[] | null>(null);
  const [attendeesLoading, setAttendeesLoading] = useState(false);
  const [syncingSlotId, setSyncingSlotId] = useState<string | null>(null);

  function openCreate() { setForm(defaultForm); setCreateOpen(true); }
  function openEdit(slot: StudySlot) {
    setForm({ ...defaultForm, name: slot.name, goal: slot.goal ?? "", slotType: (slot.slotType as typeof defaultForm.slotType) ?? "STUDY", meetLink: slot.meetLink ?? "", calendarEventId: slot.calendarEventId ?? "", capacity: slot.capacity, price: slot.price ?? 0, isActive: slot.isActive });
    setEditSlot(slot);
  }
  function closeModals() { setCreateOpen(false); setEditSlot(null); setAttendeesSlot(null); setAttendees(null); }

  async function syncCalendar(slot: StudySlot) {
    if (!slot.calendarEventId) {
      toast.error("Pehle Google Calendar Event generate karo (autoGenerateMeet).");
      return;
    }
    setSyncingSlotId(slot.id);
    try {
      const res = await fetch("/api/admin/slots/sync-calendar", {
        method: "POST", headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ slotId: slot.id }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`✓ ${data.added} students ko auto-admit diya! (${data.failed} failed)`);
      } else {
        toast.error(data.error || "Sync failed");
      }
    } catch { toast.error("Network error"); }
    finally { setSyncingSlotId(null); }
  }

  async function openAttendees(slot: StudySlot) {
    if (!slot.calendarEventId) { toast.error("No Calendar Event ID set for this slot."); return; }
    setAttendeesSlot(slot); setAttendees(null); setAttendeesLoading(true);
    try {
      const res = await fetch(`/api/admin/calendar/event-attendees?eventId=${encodeURIComponent(slot.calendarEventId)}`);
      if (!res.ok) { toast.error((await res.json().catch(() => ({}))).error || "Failed to load attendees"); setAttendeesLoading(false); return; }
      setAttendees(((await res.json()) as { attendees?: CalendarAttendee[] }).attendees ?? []);
    } catch { toast.error("Could not load attendees"); }
    setAttendeesLoading(false);
  }

  async function handleSubmit(e: React.FormEvent, isEdit: boolean) {
    e.preventDefault();
    if (!form.name.trim() || !form.startTime || !form.endTime) { toast.error("Name, Start Time, and End Time are required"); return; }
    setSaving(true);
    try {
      const url = isEdit ? `/api/admin/slots/${editSlot!.id}` : "/api/admin/slots";
      const res = await fetch(url, { method: isEdit ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(buildPayload(form)) });
      if (!res.ok) { const j = await res.json().catch(() => ({})); toast.error(j.error?.name?.[0] || j.error || `Failed to ${isEdit ? "update" : "create"}`); setSaving(false); return; }
      toast.success(isEdit ? "Slot updated" : "Slot created");
      closeModals(); refetch();
    } catch { toast.error("Something went wrong"); }
    setSaving(false);
  }

  async function handleDelete(slot: StudySlot) {
    if (!confirm(`Delete slot "${slot.name}"?`)) return;
    try {
      const res = await fetch(`/api/admin/slots/${slot.id}`, { method: "DELETE" });
      if (!res.ok) { toast.error("Failed to delete"); return; }
      toast.success("Slot deleted"); refetch();
    } catch { toast.error("Something went wrong"); }
  }

  function SlotForm({ isEdit }: { isEdit?: boolean }) {
    return (
      <form onSubmit={(e) => handleSubmit(e, !!isEdit)} className="space-y-4">
        <FormInput label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Morning" required />
        <div className="grid grid-cols-2 gap-4">
          <FormInput label="Start Time" type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} required />
          <FormInput label="End Time" type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} required />
        </div>
        <FormSelect label="Goal" value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value })}>
          {GOAL_OPTIONS.map((g) => <option key={g || "any"} value={g}>{g || "Any"}</option>)}
        </FormSelect>
        <FormSelect label="Type" value={form.slotType} onChange={(e) => setForm({ ...form, slotType: e.target.value as typeof form.slotType })}>
          {SLOT_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </FormSelect>
        {/* Google Meet section */}
        <div className={`rounded-2xl border p-4 space-y-3 ${form.autoGenerateMeet ? "border-emerald-300 bg-emerald-50" : "border-gray-200 bg-gray-50"}`}>
          <FormCheckbox
            id="auto-meet"
            label="Auto-generate Google Meet link + Calendar Event"
            checked={form.autoGenerateMeet}
            onChange={(e) => setForm({ ...form, autoGenerateMeet: e.target.checked })}
          />
          {form.autoGenerateMeet ? (
            <div className="rounded-xl border border-emerald-200 bg-white px-3 py-2.5 text-xs text-emerald-800 space-y-1">
              <p className="flex items-center gap-1.5 font-semibold"><Video className="h-3.5 w-3.5" /> Kya hoga:</p>
              <ul className="space-y-0.5 text-emerald-700 pl-5 list-disc">
                <li>Google Calendar pe ek event create hoga</li>
                <li>Us event ka Google Meet link automatically set hoga</li>
                <li>Jab bhi koi student enroll karega → uska email Calendar invite pe add hoga</li>
                <li>Calendar invite pe hone wale students ko Meet mein <strong>directly entry</strong> milegi (waiting room bypass)</li>
              </ul>
            </div>
          ) : (
            <div className="space-y-3">
              <FormInput label="Google Meet Link (manual)" type="url" value={form.meetLink} onChange={(e) => setForm({ ...form, meetLink: e.target.value })} placeholder="https://meet.google.com/xxx-xxxx-xxx" />
              <div>
                <FormInput label="Google Calendar Event ID (auto-admit ke liye)" value={form.calendarEventId} onChange={(e) => setForm({ ...form, calendarEventId: e.target.value })} placeholder="Optional — paste Calendar event ID" />
                <p className="mt-0.5 text-[10px] text-[var(--cream-muted)]">Calendar Event ID set hoga to enrolled students ko auto-admit milega.</p>
              </div>
            </div>
          )}
        </div>
        <FormInput label="Capacity" type="number" min={0} value={form.capacity} onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) || 0 })} />
        <FormInput label="Price (₹)" type="number" min={0} value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) || 0 })} placeholder="0 = free" />
        <FormCheckbox id={`slot-active-${isEdit ? "edit" : "create"}`} label="Active (visible on slots page)" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
        <FormActions onCancel={closeModals} saving={saving} isEdit={isEdit} />
      </form>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <LiveSlotView />
      <AdminPageHeader
        title="Study Room Management"
        description="Create, edit, and manage study rooms"
        addLabel="Create room"
        onAdd={openCreate}
        extra={
          <Link href="/study-room" className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-medium text-[var(--cream-muted)] transition hover:bg-gray-100 hover:text-gray-900">
            View study room page <ArrowRight className="h-4 w-4" />
          </Link>
        }
      />

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xl">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
          <Calendar className="h-5 w-5 text-[var(--accent)]" /> All study rooms ({slots.length})
        </h2>
        {loading ? (
          <p className="mt-4 text-sm text-[var(--cream-muted)]">Loading…</p>
        ) : slots.length === 0 ? (
          <p className="mt-4 text-sm text-[var(--cream-muted)]">No study rooms yet.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[400px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left">
                  <AdminTh>Room ID</AdminTh><AdminTh>Name</AdminTh><AdminTh>Time</AdminTh><AdminTh>Goal</AdminTh><AdminTh>Capacity</AdminTh><AdminTh>Price</AdminTh><AdminTh>Status</AdminTh><AdminTh>Actions</AdminTh>
                </tr>
              </thead>
              <tbody>
                {slots.map((slot) => (
                  <tr key={slot.id} className="border-b border-gray-100">
                    <AdminTd className="font-mono text-xs font-medium text-gray-900">{slot.roomId ?? "—"}</AdminTd>
                    <AdminTd className="font-medium text-gray-900">
                      <div className="flex items-center gap-1.5">
                        {slot.name}
                        {slot.meetLink && <span title="Meet link set"><Video className="h-3.5 w-3.5 text-emerald-500 shrink-0" /></span>}
                      </div>
                    </AdminTd>
                    <AdminTd>{slot.timeLabel}</AdminTd>
                    <AdminTd>{slot.goal ?? "—"}</AdminTd>
                    <AdminTd className="text-gray-900">{slot.capacity}</AdminTd>
                    <AdminTd className="text-gray-900">₹{slot.price ?? 0}</AdminTd>
                    <AdminTd><StatusBadge active={slot.isActive} /></AdminTd>
                    <AdminTd>
                      <RowActions
                        onEdit={() => openEdit(slot)}
                        onDelete={() => handleDelete(slot)}
                        extra={
                          <>
                            {slot.meetLink && (
                              <button type="button" onClick={() => { navigator.clipboard.writeText(slot.meetLink!); toast.success("Meet link copied"); }} className="rounded-lg border border-gray-200 bg-gray-50 p-1.5 text-blue-400/80 transition hover:bg-gray-100 hover:text-blue-700" title="Copy Meet Link">
                                <LinkIcon className="h-4 w-4" />
                              </button>
                            )}
                            {slot.calendarEventId && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => syncCalendar(slot)}
                                  disabled={syncingSlotId === slot.id}
                                  title="Sabhi enrolled students ko Google Meet auto-admit do"
                                  className="flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50"
                                >
                                  <UserCheck className="h-3 w-3" />
                                  {syncingSlotId === slot.id ? "Syncing…" : "Sync"}
                                </button>
                                <button type="button" onClick={() => openAttendees(slot)} className="rounded-lg border border-gray-200 bg-gray-50 px-2 py-1 text-[10px] text-[var(--cream-muted)] transition hover:bg-gray-100 hover:text-gray-900">
                                  Attendees
                                </button>
                              </>
                            )}
                          </>
                        }
                      />
                    </AdminTd>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal isOpen={createOpen} title="Create room" onClose={closeModals}>
        <SlotForm />
      </Modal>

      <Modal isOpen={!!editSlot} title="Edit slot" onClose={closeModals}>
        {editSlot && <SlotForm isEdit />}
      </Modal>

      <Modal isOpen={!!attendeesSlot} title={attendeesSlot ? `Calendar attendees – ${attendeesSlot.name}` : "Calendar attendees"} onClose={() => { setAttendeesSlot(null); setAttendees(null); }}>
        {attendeesLoading ? (
          <p className="text-sm text-[var(--cream-muted)]">Loading attendees…</p>
        ) : !attendeesSlot ? null : attendees == null ? (
          <p className="text-sm text-[var(--cream-muted)]">No data loaded. Try again.</p>
        ) : attendees.length === 0 ? (
          <p className="text-sm text-[var(--cream-muted)]">No attendees found for this Calendar event yet.</p>
        ) : (
          <div className="space-y-2 text-sm">
            {attendees.map((a, i) => (
              <div key={`${a.email ?? "no-email"}-${i}`} className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-3 py-2">
                <span className="font-mono text-xs text-gray-900">{a.email || "—"}</span>
                <span className="text-xs text-[var(--cream-muted)]">{a.responseStatus || "unknown"}</span>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}

// ─── Live Slot View ────────────────────────────────────────────────────────────

type LiveStudent = {
  userId: string; name: string | null; email: string;
  studentId: string | null; joinedAt: string; lastSeen: string; liveSeconds: number;
};
type LiveSlot = {
  slotId: string; slotName: string; timeLabel: string; meetLink: string | null;
  liveCount: number; todayCheckins: number; liveStudents: LiveStudent[];
};
type LiveData = { slots: LiveSlot[]; totalLive: number; generatedAt: string };

function fmtTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function LiveSlotView() {
  const [data, setData]       = useState<LiveData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const fetch_ = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/slots/live");
      if (res.ok) setData(await res.json());
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetch_();
    const id = setInterval(fetch_, 30_000); // auto-refresh every 30s
    return () => clearInterval(id);
  }, [fetch_]);

  const activeSlots = data?.slots.filter(s => s.liveCount > 0) ?? [];
  const totalLive = data?.totalLive ?? 0;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-3 w-3">
            {totalLive > 0 && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />}
            <span className={`relative inline-flex rounded-full h-3 w-3 ${totalLive > 0 ? "bg-red-500" : "bg-gray-300"}`} />
          </span>
          <Radio className="h-4 w-4 text-gray-600" />
          <h2 className="text-sm font-bold text-gray-900">Live — Google Meet Attendance</h2>
          {totalLive > 0 && (
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-600">
              {totalLive} live
            </span>
          )}
        </div>
        <button onClick={fetch_} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition">
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </button>
      </div>

      {loading ? (
        <p className="px-5 py-4 text-sm text-gray-400">Loading live data…</p>
      ) : activeSlots.length === 0 ? (
        <p className="px-5 py-4 text-sm text-gray-400">
          Abhi koi student Google Meet mein nahi hai.
        </p>
      ) : (
        <div className="divide-y divide-gray-50">
          {activeSlots.map(slot => {
            const isOpen = expanded.has(slot.slotId);
            return (
              <div key={slot.slotId}>
                <button
                  onClick={() => setExpanded(prev => {
                    const next = new Set(prev);
                    isOpen ? next.delete(slot.slotId) : next.add(slot.slotId);
                    return next;
                  })}
                  className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition text-left">
                  <div className="flex items-center gap-3">
                    <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{slot.slotName}</p>
                      <p className="text-xs text-gray-400">{slot.timeLabel}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      <strong className="text-red-600">{slot.liveCount} live</strong>
                    </span>
                    <span>{slot.todayCheckins} checked-in today</span>
                    <span className="text-gray-300">{isOpen ? "▲" : "▼"}</span>
                  </div>
                </button>

                {isOpen && (
                  <div className="px-5 pb-4 space-y-2">
                    {slot.liveStudents.map(s => (
                      <div key={s.userId}
                        className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-4 py-2.5">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{s.name || s.email}</p>
                          <p className="text-xs text-gray-400">{s.studentId ?? s.email}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-bold text-indigo-600 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {fmtTime(s.liveSeconds)}
                          </p>
                          <p className="text-[10px] text-gray-400">
                            Joined {new Date(s.joinedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {data && (
        <div className="px-5 py-2.5 border-t border-gray-50 text-[10px] text-gray-300">
          Last updated: {new Date(data.generatedAt).toLocaleTimeString("en-IN")} · Auto-refreshes every 30s
        </div>
      )}
    </div>
  );
}
