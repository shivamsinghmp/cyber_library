"use client";

import { Megaphone, X } from "lucide-react";

type SlotOption = { id: string; name: string; timeLabel: string };

type Props = {
  open: boolean;
  sending: boolean;
  target: "all" | "slot";
  slotId: string;
  message: string;
  recipientCount: number | null;
  slots: SlotOption[];
  onClose: () => void;
  onTargetChange: (t: "all" | "slot") => void;
  onSlotChange: (id: string) => void;
  onMessageChange: (msg: string) => void;
  onSubmit: (e: React.FormEvent) => void;
};

export function BroadcastModal({
  open, sending, target, slotId, message, recipientCount, slots,
  onClose, onTargetChange, onSlotChange, onMessageChange, onSubmit,
}: Props) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-100 p-4">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-[var(--ink)] p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[var(--cream)] flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-[var(--accent)]" />
            Broadcast Message
          </h2>
          <button
            type="button"
            onClick={() => !sending && onClose()}
            className="rounded-lg p-1 text-[var(--cream-muted)] hover:bg-gray-100 hover:text-gray-900"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500 bg-gray-50">Send to</label>
            <div className="flex gap-3">
              {(["all", "slot"] as const).map((t) => (
                <label key={t} className="flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    name="target"
                    checked={target === t}
                    onChange={() => onTargetChange(t)}
                    className="rounded border-gray-300 text-[var(--accent)]"
                  />
                  <span className="text-sm text-gray-900">
                    {t === "all" ? "All active students" : "Slot subscribers"}
                  </span>
                </label>
              ))}
            </div>
          </div>
          {target === "slot" && (
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500 bg-gray-50">Slot</label>
              <select
                value={slotId}
                onChange={(e) => onSlotChange(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900"
              >
                <option value="">Select a slot</option>
                {slots.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} – {s.timeLabel}</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500 bg-gray-50">Message</label>
            <textarea
              value={message}
              onChange={(e) => onMessageChange(e.target.value)}
              rows={4}
              placeholder="Type your broadcast message..."
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-[var(--cream)] placeholder:text-gray-300"
            />
          </div>
          {recipientCount !== null && (
            <p className="text-xs text-[var(--cream-muted)]">
              {recipientCount} recipient{recipientCount !== 1 ? "s" : ""} will receive this message.
            </p>
          )}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => !sending && onClose()}
              className="flex-1 rounded-xl border border-gray-300 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={sending || !message.trim()}
              className="flex-1 rounded-xl bg-[var(--accent)] py-2.5 text-sm font-semibold text-[var(--ink)] hover:opacity-90 disabled:opacity-50"
            >
              {sending ? "Sending…" : "Send broadcast"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
