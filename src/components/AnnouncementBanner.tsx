"use client";

import { useState, useEffect } from "react";
import { Megaphone, X } from "lucide-react";

export function AnnouncementBanner() {
  const [message, setMessage] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    fetch("/api/announcement")
      .then((r) => (r.ok ? r.json() : {}))
      .then((data: { message?: string | null }) => {
        setMessage(data.message ?? null);
      })
      .catch(() => {});
  }, []);

  if (!message || dismissed) return null;

  return (
    <div className="sticky top-0 z-50 flex items-center justify-center gap-2 border-b border-amber-500/30 bg-amber-500/15 px-4 py-2.5 text-center text-sm text-[var(--cream)]">
      <Megaphone className="h-4 w-4 shrink-0 text-amber-400" />
      <span className="flex-1">{message}</span>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="shrink-0 rounded p-1 text-[var(--cream-muted)] hover:bg-white/10 hover:text-[var(--cream)]"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
