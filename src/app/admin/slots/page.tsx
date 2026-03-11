"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Calendar,
  ArrowRight,
  Plus,
  Pencil,
  Trash2,
  Link as LinkIcon,
  Copy,
} from "lucide-react";
import { Modal } from "@/components/Modal";
import toast from "react-hot-toast";

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

export default function AdminSlotsPage() {
  const [slots, setSlots] = useState<StudySlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editSlot, setEditSlot] = useState<StudySlot | null>(null);
  const [saving, setSaving] = useState(false);
  const [formName, setFormName] = useState("");
  const [formStartTime, setFormStartTime] = useState(""); // HH:MM
  const [formEndTime, setFormEndTime] = useState(""); // HH:MM
  const [formGoal, setFormGoal] = useState("");
  const [formMeetLink, setFormMeetLink] = useState("");
  const [formCalendarEventId, setFormCalendarEventId] = useState("");
  const [formAutoGenerateMeet, setFormAutoGenerateMeet] = useState(false);
  const [formCapacity, setFormCapacity] = useState(10);
  const [formPrice, setFormPrice] = useState(0);
  const [formIsActive, setFormIsActive] = useState(true);
  const [formSlotType, setFormSlotType] = useState<"STUDY" | "MENTORSHIP" | "MENTAL">("STUDY");

  const fetchSlots = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/slots");
      if (res.ok) {
        const data = await res.json();
        setSlots(data);
      }
    } catch {
      setSlots([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSlots();
  }, [fetchSlots]);

  function openCreate() {
    setFormName("");
    setFormStartTime("");
    setFormEndTime("");
    setFormGoal("");
    setFormSlotType("STUDY");
    setFormMeetLink("");
    setFormCalendarEventId("");
    setFormAutoGenerateMeet(false);
    setFormCapacity(10);
    setFormPrice(0);
    setFormIsActive(true);
    setCreateOpen(true);
  }

  function openEdit(slot: StudySlot) {
    setEditSlot(slot);
    setFormName(slot.name);
    setFormStartTime("");
    setFormEndTime("");
    setFormGoal(slot.goal ?? "");
    setFormSlotType((slot.slotType === "MENTORSHIP" || slot.slotType === "MENTAL") ? slot.slotType : "STUDY");
    setFormMeetLink(slot.meetLink ?? "");
    setFormCalendarEventId(slot.calendarEventId ?? "");
    setFormAutoGenerateMeet(false);
    setFormCapacity(slot.capacity);
    setFormPrice(slot.price ?? 0);
    setFormIsActive(slot.isActive);
  }

  function closeModals() {
    setCreateOpen(false);
    setEditSlot(null);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!formName.trim() || !formStartTime || !formEndTime) {
      toast.error("Name, Start Time, and End Time are required");
      return;
    }
    setSaving(true);

    try {
      // Build dummy dates for today, applying the HH:MM times if auto-generating
      let isoStartTime: string | undefined = undefined;
      let isoEndTime: string | undefined = undefined;
      
      const today = new Date();
      const [startH, startM] = formStartTime.split(":");
      const [endH, endM] = formEndTime.split(":");
      
      const sd = new Date(today);
      sd.setHours(Number(startH), Number(startM), 0, 0);
      const ed = new Date(today);
      ed.setHours(Number(endH), Number(endM), 0, 0);
      
      // Compute a clean text label like "8:00 AM - 12:00 PM"
      const formatTime = (d: Date) => d.toLocaleTimeString("en-US", { hour: 'numeric', minute: '2-digit', hour12: true });
      const dynamicTimeLabel = `${formatTime(sd)} - ${formatTime(ed)}`;
         
      if (formAutoGenerateMeet) {
         isoStartTime = sd.toISOString();
         isoEndTime = ed.toISOString();
      }

      const res = await fetch("/api/admin/slots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName.trim(),
          timeLabel: dynamicTimeLabel,
          startTime: isoStartTime,
          endTime: isoEndTime,
          goal: formGoal.trim() || null,
          slotType: formSlotType,
          meetLink: formMeetLink.trim() || null,
          calendarEventId: formCalendarEventId.trim() || null,
          autoGenerateMeet: formAutoGenerateMeet,
          capacity: formCapacity,
          price: formPrice,
          isActive: formIsActive,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        toast.error(j.error?.name?.[0] || j.error || "Failed to create");
        setSaving(false);
        return;
      }
      toast.success("Slot created");
      closeModals();
      fetchSlots();
    } catch {
      toast.error("Something went wrong");
    }
    setSaving(false);
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editSlot || !formName.trim() || !formStartTime || !formEndTime) {
       toast.error("Name, Start Time, and End Time are required");
       return;
    }
    setSaving(true);
    try {
      const today = new Date();
      const [startH, startM] = formStartTime.split(":");
      const [endH, endM] = formEndTime.split(":");
      const sd = new Date(today);
      sd.setHours(Number(startH), Number(startM), 0, 0);
      const ed = new Date(today);
      ed.setHours(Number(endH), Number(endM), 0, 0);
      
      const formatTime = (d: Date) => d.toLocaleTimeString("en-US", { hour: 'numeric', minute: '2-digit', hour12: true });
      const dynamicTimeLabel = `${formatTime(sd)} - ${formatTime(ed)}`;

      const res = await fetch(`/api/admin/slots/${editSlot.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName.trim(),
          timeLabel: dynamicTimeLabel,
          goal: formGoal.trim() || null,
          slotType: formSlotType,
          meetLink: formMeetLink.trim() || null,
          calendarEventId: formCalendarEventId.trim() || null,
          capacity: formCapacity,
          price: formPrice,
          isActive: formIsActive,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        toast.error(j.error || "Failed to update");
        setSaving(false);
        return;
      }
      toast.success("Slot updated");
      closeModals();
      fetchSlots();
    } catch {
      toast.error("Something went wrong");
    }
    setSaving(false);
  }

  async function handleDelete(slot: StudySlot) {
    if (!confirm(`Delete slot "${slot.name}"?`)) return;
    try {
      const res = await fetch(`/api/admin/slots/${slot.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        toast.error("Failed to delete");
        return;
      }
      toast.success("Slot deleted");
      fetchSlots();
    } catch {
      toast.error("Something went wrong");
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--cream)] md:text-3xl">
            Study Room Management
          </h1>
          <p className="mt-1 text-sm text-[var(--cream-muted)]">
            Create, edit, and manage study rooms
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/study-room"
            className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-medium text-[var(--cream-muted)] transition hover:bg-white/10 hover:text-[var(--cream)]"
          >
            View study room page
            <ArrowRight className="h-4 w-4" />
          </Link>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[var(--ink)] shadow-lg transition hover:bg-[var(--accent-hover)]"
          >
            <Plus className="h-4 w-4" />
            Create room
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-black/30 p-6 shadow-xl">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-[var(--cream)]">
          <Calendar className="h-5 w-5 text-[var(--accent)]" />
          All study rooms ({slots.length})
        </h2>
        {loading ? (
          <p className="mt-4 text-sm text-[var(--cream-muted)]">Loading…</p>
        ) : slots.length === 0 ? (
          <p className="mt-4 text-sm text-[var(--cream-muted)]">
            No study rooms yet. Admin must create a room to show it here.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[400px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left">
                  <th className="py-2 pr-3 font-medium text-[var(--cream-muted)]">Room ID</th>
                  <th className="py-2 pr-3 font-medium text-[var(--cream-muted)]">Name</th>
                  <th className="py-2 pr-3 font-medium text-[var(--cream-muted)]">Time</th>
                  <th className="py-2 pr-3 font-medium text-[var(--cream-muted)]">Goal</th>
                  <th className="py-2 pr-3 font-medium text-[var(--cream-muted)]">Capacity</th>
                  <th className="py-2 pr-3 font-medium text-[var(--cream-muted)]">Price</th>
                  <th className="py-2 pr-3 font-medium text-[var(--cream-muted)]">Status</th>
                  <th className="py-2 font-medium text-[var(--cream-muted)]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {slots.map((slot) => (
                  <tr key={slot.id} className="border-b border-white/5">
                    <td className="py-2.5 pr-3 font-mono text-xs font-medium text-[var(--cream)]">
                      {slot.roomId ?? "—"}
                    </td>
                    <td className="py-2.5 pr-3 font-medium text-[var(--cream)]">{slot.name}</td>
                    <td className="py-2.5 pr-3 text-[var(--cream-muted)]">{slot.timeLabel}</td>
                    <td className="py-2.5 pr-3 text-[var(--cream-muted)]">{slot.goal ?? "—"}</td>
                    <td className="py-2.5 pr-3 text-[var(--cream)]">{slot.capacity}</td>
                    <td className="py-2.5 pr-3 text-[var(--cream)]">₹{slot.price ?? 0}</td>
                    <td className="py-2.5 pr-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          slot.isActive
                            ? "bg-emerald-500/20 text-emerald-400"
                            : "bg-white/10 text-[var(--cream-muted)]"
                        }`}
                      >
                        {slot.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="py-2.5">
                      <div className="flex items-center gap-2">
                        {slot.meetLink && (
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(slot.meetLink!);
                              toast.success("Meet link copied to clipboard");
                            }}
                            className="rounded-lg border border-white/10 bg-white/5 p-1.5 text-blue-400/80 transition hover:bg-white/10 hover:text-blue-400"
                            title="Copy Meet Link"
                          >
                            <LinkIcon className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => openEdit(slot)}
                          className="rounded-lg border border-white/10 bg-white/5 p-1.5 text-[var(--cream-muted)] transition hover:bg-white/10 hover:text-[var(--cream)]"
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(slot)}
                          className="rounded-lg border border-white/10 bg-white/5 p-1.5 text-red-400/80 transition hover:bg-red-500/20 hover:text-red-400"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create modal */}
      <Modal isOpen={createOpen} title="Create room" onClose={closeModals}>
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--cream-muted)]">Name</label>
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="e.g. Morning"
              className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-[var(--cream)] placeholder:text-[var(--cream-muted)]/60 focus:border-[var(--accent)]/70 focus:outline-none"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--cream-muted)]">Start Time</label>
              <input
                type="time"
                value={formStartTime}
                onChange={(e) => setFormStartTime(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-[var(--cream)] placeholder:text-[var(--cream-muted)]/60 focus:border-[var(--accent)]/70 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--cream-muted)]">End Time</label>
              <input
                type="time"
                value={formEndTime}
                onChange={(e) => setFormEndTime(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-[var(--cream)] placeholder:text-[var(--cream-muted)]/60 focus:border-[var(--accent)]/70 focus:outline-none"
                required
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--cream-muted)]">Goal</label>
            <select
              value={formGoal}
              onChange={(e) => setFormGoal(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-[var(--cream)] focus:border-[var(--accent)]/70 focus:outline-none"
            >
              {GOAL_OPTIONS.map((g) => (
                <option key={g || "any"} value={g}>
                  {g || "Any"}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--cream-muted)]">Type</label>
            <select
              value={formSlotType}
              onChange={(e) => setFormSlotType(e.target.value as "STUDY" | "MENTORSHIP" | "MENTAL")}
              className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-[var(--cream)] focus:border-[var(--accent)]/70 focus:outline-none"
            >
              {SLOT_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-2 flex items-center space-x-2 text-sm text-[var(--cream)] cursor-pointer">
               <input
                type="checkbox"
                checked={formAutoGenerateMeet}
                onChange={(e) => setFormAutoGenerateMeet(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-[var(--accent)] focus:ring-[var(--accent)]"
              />
              <span>Generate Google Meet and Calendar Event Automatically</span>
            </label>
          </div>
          {formAutoGenerateMeet && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--cream-muted)]">Event Start Time</label>
                <input
                  type="time"
                  value={formStartTime}
                  onChange={(e) => setFormStartTime(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-[var(--cream)] placeholder:text-[var(--cream-muted)]/60 focus:border-[var(--accent)]/70 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--cream-muted)]">Event End Time</label>
                <input
                  type="time"
                  value={formEndTime}
                  onChange={(e) => setFormEndTime(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-[var(--cream)] placeholder:text-[var(--cream-muted)]/60 focus:border-[var(--accent)]/70 focus:outline-none"
                  required
                />
              </div>
            </div>
          )}
          {!formAutoGenerateMeet && (
            <>
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--cream-muted)]">Google Meet Link</label>
                <input
                  type="url"
                  value={formMeetLink}
                  onChange={(e) => setFormMeetLink(e.target.value)}
                  placeholder="https://meet.google.com/..."
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-[var(--cream)] placeholder:text-[var(--cream-muted)]/60 focus:border-[var(--accent)]/70 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--cream-muted)]">Google Calendar Event ID (for Auto-Admit)</label>
                <input
                  type="text"
                  value={formCalendarEventId}
                  onChange={(e) => setFormCalendarEventId(e.target.value)}
                  placeholder="Optional: Paste event ID here"
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-[var(--cream)] placeholder:text-[var(--cream-muted)]/60 focus:border-[var(--accent)]/70 focus:outline-none"
                />
              </div>
            </>
          )}
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--cream-muted)]">Capacity</label>
            <input
              type="number"
              min={0}
              value={formCapacity}
              onChange={(e) => setFormCapacity(Number(e.target.value) || 0)}
              className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-[var(--cream)] focus:border-[var(--accent)]/70 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--cream-muted)]">Price (₹)</label>
            <input
              type="number"
              min={0}
              value={formPrice}
              onChange={(e) => setFormPrice(Number(e.target.value) || 0)}
              placeholder="0 = free"
              className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-[var(--cream)] placeholder:text-[var(--cream-muted)]/60 focus:border-[var(--accent)]/70 focus:outline-none"
            />
          </div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formIsActive}
              onChange={(e) => setFormIsActive(e.target.checked)}
              className="rounded border-white/20 bg-black/40 text-[var(--accent)] focus:ring-[var(--accent)]"
            />
            <span className="text-sm text-[var(--cream-muted)]">Active (visible on slots page)</span>
          </label>
          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[var(--ink)] disabled:opacity-60"
            >
              {saving ? "Creating…" : "Create"}
            </button>
            <button
              type="button"
              onClick={closeModals}
              className="rounded-xl border border-white/15 px-4 py-2.5 text-sm text-[var(--cream-muted)] hover:bg-white/5"
            >
              Cancel
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit modal */}
      <Modal
        isOpen={!!editSlot}
        title="Edit slot"
        onClose={closeModals}
      >
        {editSlot && (
          <form onSubmit={handleUpdate} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--cream-muted)]">Name</label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Morning"
                className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-[var(--cream)] placeholder:text-[var(--cream-muted)]/60 focus:border-[var(--accent)]/70 focus:outline-none"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--cream-muted)]">Start Time</label>
                <input
                  type="time"
                  value={formStartTime}
                  onChange={(e) => setFormStartTime(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-[var(--cream)] placeholder:text-[var(--cream-muted)]/60 focus:border-[var(--accent)]/70 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--cream-muted)]">End Time</label>
                <input
                  type="time"
                  value={formEndTime}
                  onChange={(e) => setFormEndTime(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-[var(--cream)] placeholder:text-[var(--cream-muted)]/60 focus:border-[var(--accent)]/70 focus:outline-none"
                  required
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--cream-muted)]">Goal</label>
              <select
                value={formGoal}
                onChange={(e) => setFormGoal(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-[var(--cream)] focus:border-[var(--accent)]/70 focus:outline-none"
              >
                {GOAL_OPTIONS.map((g) => (
                  <option key={g || "any"} value={g}>
                    {g || "Any"}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--cream-muted)]">Type</label>
              <select
                value={formSlotType}
                onChange={(e) => setFormSlotType(e.target.value as "STUDY" | "MENTORSHIP" | "MENTAL")}
                className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-[var(--cream)] focus:border-[var(--accent)]/70 focus:outline-none"
              >
                {SLOT_TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--cream-muted)]">Google Meet Link</label>
              <input
                type="url"
                value={formMeetLink}
                onChange={(e) => setFormMeetLink(e.target.value)}
                placeholder="https://meet.google.com/..."
                className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-[var(--cream)] placeholder:text-[var(--cream-muted)]/60 focus:border-[var(--accent)]/70 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--cream-muted)]">Google Calendar Event ID (for Auto-Admit)</label>
              <input
                type="text"
                value={formCalendarEventId}
                onChange={(e) => setFormCalendarEventId(e.target.value)}
                placeholder="Optional: Paste event ID here"
                className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-[var(--cream)] placeholder:text-[var(--cream-muted)]/60 focus:border-[var(--accent)]/70 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--cream-muted)]">Capacity</label>
              <input
                type="number"
                min={0}
                value={formCapacity}
                onChange={(e) => setFormCapacity(Number(e.target.value) || 0)}
                className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-[var(--cream)] focus:border-[var(--accent)]/70 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--cream-muted)]">Price (₹)</label>
              <input
                type="number"
                min={0}
                value={formPrice}
                onChange={(e) => setFormPrice(Number(e.target.value) || 0)}
                placeholder="0 = free"
                className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-[var(--cream)] placeholder:text-[var(--cream-muted)]/60 focus:border-[var(--accent)]/70 focus:outline-none"
              />
            </div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formIsActive}
                onChange={(e) => setFormIsActive(e.target.checked)}
                className="rounded border-white/20 bg-black/40 text-[var(--accent)] focus:ring-[var(--accent)]"
              />
              <span className="text-sm text-[var(--cream-muted)]">Active</span>
            </label>
            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[var(--ink)] disabled:opacity-60"
              >
                {saving ? "Saving…" : "Save"}
              </button>
              <button
                type="button"
                onClick={closeModals}
                className="rounded-xl border border-white/15 px-4 py-2.5 text-sm text-[var(--cream-muted)] hover:bg-white/5"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
