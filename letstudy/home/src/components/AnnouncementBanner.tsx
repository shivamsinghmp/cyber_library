"use client";

import { useState } from "react";
import { Megaphone, X } from "lucide-react";

type Props = { initialMessage?: string | null };

export function AnnouncementBanner({ initialMessage }: Props = {}) {
  // Initialised from server — no client fetch needed
  const [message] = useState<string | null>(initialMessage ?? null);
  const [dismissed, setDismissed] = useState(false);

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
