"use client";

import { useState } from "react";
import toast from "react-hot-toast";

export function FooterNewsletterForm({ buttonText }: { buttonText: string }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      const res = await fetch("/api/lead-form/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: "NEWSLETTER_FOOTER", fields: { email } }),
      });
      if (res.ok) { toast.success("Subscribed!"); setEmail(""); }
      else toast.error("Failed. Try again.");
    } catch { toast.error("Something went wrong!"); }
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="mt-5 flex flex-col sm:flex-row gap-3">
      <label htmlFor="footer-email" className="sr-only">Email address</label>
      <input
        id="footer-email"
        type="email"
        required
        value={email}
        onChange={e => setEmail(e.target.value)}
        className="min-w-0 flex-1 appearance-none rounded-xl border bg-white px-3 py-2 text-xs font-semibold text-[#0F172A] placeholder-[#94A3B8] outline-none transition focus:ring-2 focus:ring-[#6366F1]/30 focus:border-[#6366F1]"
        style={{ borderColor: "var(--border)" }}
        placeholder="your@email.com"
        disabled={loading}
      />
      <button
        type="submit"
        disabled={loading}
        className="shrink-0 rounded-xl px-4 py-2 text-xs font-bold text-white transition-all hover:scale-105 hover:opacity-90 disabled:opacity-50"
        style={{
          background: "linear-gradient(135deg, #6366F1, #8B5CF6)",
          boxShadow: "0 4px 14px rgba(99,102,241,0.35)",
        }}
      >
        {loading ? "Sending…" : buttonText}
      </button>
    </form>
  );
}
