"use client";

import { useState } from "react";

export function CopyReferralButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="shrink-0 rounded-xl border border-[var(--accent)]/50 bg-[var(--accent)]/10 px-4 py-2.5 text-sm font-medium text-[var(--cream)] transition hover:bg-[var(--accent)]/20"
    >
      {copied ? "Copied!" : "Copy link"}
    </button>
  );
}
