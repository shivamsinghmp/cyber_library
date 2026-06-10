"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Mail, Clock, ShieldCheck, Send, Loader2,
  MessageSquare, CheckCircle2, ArrowRight, Headphones,
} from "lucide-react";
import type { Metadata } from "next";

const CONTACT_CARDS = [
  {
    icon: Mail,
    title: "Email Support",
    desc: "For general inquiries and technical help.",
    value: "support@lstudy.in",
    href: "mailto:support@lstudy.in",
    color: "text-[var(--accent)] bg-[var(--accent-pale)]",
  },
  {
    icon: Clock,
    title: "Response Time",
    desc: "We reply to all messages within 24 hours on working days.",
    value: "< 24 hours",
    href: null,
    color: "text-emerald-600 bg-emerald-50",
  },
  {
    icon: ShieldCheck,
    title: "Privacy Guaranteed",
    desc: "Your data is used only to resolve your ticket. Nothing else.",
    value: "100% Confidential",
    href: null,
    color: "text-violet-600 bg-violet-50",
  },
];

const QUICK_LINKS = [
  { label: "Refund Policy", href: "/refund" },
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms & Conditions", href: "/terms" },
];

export default function SupportPage() {
  const [formData, setFormData] = useState({ name: "", email: "", subject: "", message: "" });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit");
      setSuccess(true);
      setFormData({ name: "", email: "", subject: "", message: "" });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[var(--page-bg)] min-h-screen">
      {/* ── Hero ── */}
      <section className="relative overflow-hidden pt-28 pb-16 px-4">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_center,_rgba(99,102,241,0.08)_0%,_transparent_60%)]" />
        <div className="relative mx-auto max-w-2xl text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[var(--accent-pale)] border border-[var(--accent-border)] text-[var(--accent)] text-sm font-semibold mb-6">
            <Headphones className="w-4 h-4" /> Support Center
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-[var(--foreground)] leading-tight mb-4">
            How can we <span className="text-[var(--accent)]">help you?</span>
          </h1>
          <p className="text-[var(--muted-text)] text-lg leading-relaxed">
            Questions about sessions, bookings, payments, or anything else — our team is here.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 pb-24 space-y-12">

        {/* ── Contact Cards ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {CONTACT_CARDS.map(({ icon: Icon, title, desc, value, href, color }) => (
            <div
              key={title}
              className="bg-white rounded-2xl border border-[var(--border)] p-6 shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] transition-all"
            >
              <div className={`inline-flex items-center justify-center w-11 h-11 rounded-xl mb-4 ${color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-[var(--foreground)] text-base mb-1">{title}</h3>
              <p className="text-[var(--muted-text)] text-sm mb-3 leading-relaxed">{desc}</p>
              {href ? (
                <a href={href} className="text-[var(--accent)] font-semibold text-sm hover:text-[var(--accent-hover)] transition-colors">
                  {value}
                </a>
              ) : (
                <span className="text-[var(--foreground)] font-semibold text-sm">{value}</span>
              )}
            </div>
          ))}
        </div>

        {/* ── Form + Sidebar ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">

          {/* Form */}
          <div className="lg:col-span-2 bg-white rounded-3xl border border-[var(--border)] shadow-[var(--shadow-md)] p-8 md:p-10">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-xl bg-[var(--accent-pale)] flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-[var(--accent)]" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-[var(--foreground)]">Send a Message</h2>
                <p className="text-[var(--muted-text)] text-sm">We'll get back to you within 24 hrs</p>
              </div>
            </div>

            {success ? (
              <div className="flex flex-col items-center py-14 text-center space-y-4 animate-in fade-in zoom-in duration-500">
                <div className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center border border-emerald-200">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                </div>
                <h3 className="text-2xl font-bold text-[var(--foreground)]">Message Sent!</h3>
                <p className="text-[var(--muted-text)] max-w-sm">
                  Thank you for reaching out. Our team will review your message and reply via email shortly.
                </p>
                <button
                  onClick={() => setSuccess(false)}
                  className="mt-4 px-6 py-2.5 bg-[var(--accent-pale)] hover:bg-[var(--accent-border)] text-[var(--accent)] font-semibold rounded-full text-sm transition-colors"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-[var(--foreground)]">Full Name</label>
                    <input
                      required
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="John Doe"
                      className="w-full bg-[var(--page-bg)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--foreground)] placeholder:text-[var(--placeholder)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/15 transition-all text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-[var(--foreground)]">Email Address</label>
                    <input
                      required
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="john@example.com"
                      className="w-full bg-[var(--page-bg)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--foreground)] placeholder:text-[var(--placeholder)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/15 transition-all text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-[var(--foreground)]">Subject</label>
                  <input
                    required
                    type="text"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    placeholder="How can we help?"
                    className="w-full bg-[var(--page-bg)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--foreground)] placeholder:text-[var(--placeholder)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/15 transition-all text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-[var(--foreground)]">Message</label>
                  <textarea
                    required
                    rows={5}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="Describe your issue in detail..."
                    className="w-full bg-[var(--page-bg)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--foreground)] placeholder:text-[var(--placeholder)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/15 transition-all resize-none text-sm"
                  />
                </div>

                {error && (
                  <p className="text-rose-600 text-sm font-medium bg-rose-50 border border-rose-200 rounded-xl px-4 py-3">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-60 shadow-[var(--shadow-brand)] hover:shadow-[var(--shadow-hover)] text-sm"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>Send Message <Send className="w-4 h-4" /></>
                  )}
                </button>
              </form>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-5">
            <div className="bg-white rounded-2xl border border-[var(--border)] shadow-[var(--shadow-sm)] p-6">
              <h3 className="font-bold text-[var(--foreground)] mb-4 text-sm uppercase tracking-wide">
                Quick Links
              </h3>
              <ul className="space-y-2">
                {QUICK_LINKS.map(({ label, href }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      className="flex items-center justify-between px-3 py-2.5 rounded-xl text-sm text-[var(--body-text)] hover:bg-[var(--accent-pale)] hover:text-[var(--accent)] transition-all group"
                    >
                      {label}
                      <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-[var(--accent-pale)] rounded-2xl border border-[var(--accent-border)] p-6">
              <h3 className="font-bold text-[var(--accent)] mb-2 text-sm">Before you write</h3>
              <p className="text-[var(--muted-text)] text-sm leading-relaxed">
                Check our{" "}
                <Link href="/rules" className="text-[var(--accent)] underline underline-offset-2 font-semibold">
                  Rules
                </Link>{" "}
                and{" "}
                <Link href="/refund" className="text-[var(--accent)] underline underline-offset-2 font-semibold">
                  Refund Policy
                </Link>{" "}
                — your answer might already be there.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
