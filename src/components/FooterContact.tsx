"use client";

import { useState, useEffect } from "react";
import { MessageCircle, Mail } from "lucide-react";

export function FooterContact() {
  const [whatsapp, setWhatsapp] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/support-info")
      .then((r) => (r.ok ? r.json() : {}))
      .then((data: { whatsapp?: string | null; email?: string | null }) => {
        setWhatsapp(data.whatsapp ?? null);
        setEmail(data.email ?? null);
      })
      .catch(() => {});
  }, []);

  if (!whatsapp && !email) return null;

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      {whatsapp && (
        <a
          href={`https://wa.me/${whatsapp}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-[var(--cream)]/80 transition hover:text-[var(--cream)]"
        >
          <MessageCircle className="h-4 w-4 text-emerald-400" />
          Contact support (WhatsApp)
        </a>
      )}
      {email && (
        <a
          href={`mailto:${email}`}
          className="inline-flex items-center gap-1.5 text-[var(--cream)]/80 transition hover:text-[var(--cream)]"
        >
          <Mail className="h-4 w-4" />
          Contact support (Email)
        </a>
      )}
    </div>
  );
}
