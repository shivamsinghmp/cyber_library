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
        body: JSON.stringify({
          source: "NEWSLETTER_FOOTER",
          fields: { email },
        }),
      });

      if (res.ok) {
        toast.success("Subscribed successfully!");
        setEmail("");
      } else {
        toast.error("Subscription failed. Please try again.");
      }
    } catch {
      toast.error("Something went wrong!");
    }
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 sm:flex sm:max-w-md">
      <label htmlFor="email-address" className="sr-only">
        Email address
      </label>
      <input
        type="email"
        name="email"
        id="email-address"
        autoComplete="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full min-w-0 appearance-none rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-base text-[var(--cream)] placeholder-white/30 shadow-sm focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] sm:w-64 sm:text-sm"
        placeholder="Enter your email"
        disabled={loading}
      />
      <div className="mt-4 sm:flex-shrink-0 sm:mt-0 sm:ml-4">
        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-bold text-[var(--ink)] shadow-sm hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50"
        >
          {loading ? "..." : buttonText}
        </button>
      </div>
    </form>
  );
}
