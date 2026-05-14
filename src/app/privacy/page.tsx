import Link from "next/link";
import type { Metadata } from "next";
import {
  Shield, Eye, Database, Share2, Lock,
  UserCheck, Mail, ArrowRight,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How The Cyber Library collects, uses, and protects your personal information.",
};

const SECTIONS = [
  {
    icon: Shield,
    num: "01",
    title: "Introduction",
    color: "text-[var(--accent)] bg-[var(--accent-pale)]",
    content: (
      <p>
        The Cyber Library (&ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;us&rdquo;) is committed to protecting your
        privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your
        information when you use our website and services, including focus sessions, slot bookings,
        and payments.
      </p>
    ),
  },
  {
    icon: Eye,
    num: "02",
    title: "Information We Collect",
    color: "text-violet-600 bg-violet-50",
    content: (
      <ul className="space-y-2 list-none">
        {[
          "Name, email address, and phone number when you sign up, book a slot, or checkout",
          "Payment and transaction details (processed by our payment provider; we do not store full card numbers)",
          "Usage data such as session times, pages visited, and device/browser information",
          "Communications you send to us (e.g. support or feedback)",
        ].map((item) => (
          <li key={item} className="flex items-start gap-2.5">
            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-violet-400 shrink-0" />
            {item}
          </li>
        ))}
      </ul>
    ),
  },
  {
    icon: Database,
    num: "03",
    title: "How We Use Your Information",
    color: "text-cyan-600 bg-cyan-50",
    content: (
      <p>
        We use your information to provide and improve our services, process payments, send booking
        confirmations and reminders, respond to inquiries, send relevant updates (with your consent
        where required), and to comply with applicable law.
      </p>
    ),
  },
  {
    icon: Share2,
    num: "04",
    title: "Sharing & Disclosure",
    color: "text-amber-600 bg-amber-50",
    content: (
      <p>
        We do not sell your personal data. We may share data with service providers (e.g. hosting,
        payment processors, email delivery) only to the extent necessary to operate our services. We
        may disclose information if required by law or to protect our rights and safety.
      </p>
    ),
  },
  {
    icon: Lock,
    num: "05",
    title: "Data Security & Retention",
    color: "text-emerald-600 bg-emerald-50",
    content: (
      <p>
        We implement appropriate technical and organisational measures to protect your data. We
        retain your information only as long as needed for the purposes described in this policy or
        as required by law.
      </p>
    ),
  },
  {
    icon: UserCheck,
    num: "06",
    title: "Your Rights",
    color: "text-rose-600 bg-rose-50",
    content: (
      <p>
        Depending on your location, you may have rights to access, correct, delete, or restrict
        processing of your personal data, or to withdraw consent. Contact us using the details on
        our website to exercise these rights.
      </p>
    ),
  },
  {
    icon: Mail,
    num: "07",
    title: "Contact",
    color: "text-[var(--accent)] bg-[var(--accent-pale)]",
    content: (
      <p>
        For privacy-related questions or requests, contact us at{" "}
        <a
          href="mailto:support@cyberlib.in"
          className="text-[var(--accent)] font-semibold underline underline-offset-2 hover:text-[var(--accent-hover)] transition-colors"
        >
          support@cyberlib.in
        </a>
        .
      </p>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <div className="bg-[var(--page-bg)] min-h-screen">

      {/* ── Hero ── */}
      <section className="relative overflow-hidden pt-28 pb-14 px-4">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_center,_rgba(99,102,241,0.07)_0%,_transparent_60%)]" />
        <div className="relative mx-auto max-w-2xl text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[var(--accent-pale)] border border-[var(--accent-border)] mb-6 mx-auto">
            <Shield className="w-8 h-8 text-[var(--accent)]" />
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-[var(--foreground)] leading-tight mb-4">
            Privacy Policy
          </h1>
          <p className="text-[var(--muted-text)] text-base mb-5">
            Last updated: <span className="font-semibold text-[var(--body-text)]">March 2025</span>
          </p>
          <p className="text-[var(--body-text)] text-lg leading-relaxed max-w-xl mx-auto">
            We believe privacy is a right, not an afterthought. Here&apos;s exactly what we collect,
            why, and how we protect it.
          </p>
        </div>
      </section>

      {/* ── Highlight Strip ── */}
      <div className="mx-auto max-w-4xl px-4 mb-12">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: "No data selling", icon: "🚫" },
            { label: "Encrypted payments", icon: "🔐" },
            { label: "Your rights respected", icon: "✅" },
          ].map(({ label, icon }) => (
            <div
              key={label}
              className="flex items-center gap-3 bg-white border border-[var(--border)] rounded-2xl px-5 py-4 shadow-[var(--shadow-sm)]"
            >
              <span className="text-xl">{icon}</span>
              <span className="font-semibold text-[var(--foreground)] text-sm">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Sections ── */}
      <div className="mx-auto max-w-4xl px-4 pb-24 space-y-5">
        {SECTIONS.map(({ icon: Icon, num, title, color, content }) => (
          <div
            key={num}
            className="bg-white rounded-2xl border border-[var(--border)] shadow-[var(--shadow-sm)] p-7 hover:shadow-[var(--shadow-md)] transition-shadow"
          >
            <div className="flex items-start gap-4">
              <div className={`shrink-0 w-11 h-11 rounded-xl flex items-center justify-center ${color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-xs font-bold text-[var(--muted-text)] tracking-widest uppercase">{num}</span>
                  <h2 className="text-lg font-bold text-[var(--foreground)]">{title}</h2>
                </div>
                <div className="text-[var(--body-text)] text-sm leading-relaxed">{content}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Related Pages ── */}
      <div className="mx-auto max-w-4xl px-4 pb-20">
        <div className="bg-[var(--accent-pale)] border border-[var(--accent-border)] rounded-3xl p-8 text-center">
          <p className="text-[var(--muted-text)] text-sm mb-4 font-medium uppercase tracking-wide">Related Policies</p>
          <div className="flex flex-wrap justify-center gap-3">
            {[
              { label: "Terms & Conditions", href: "/terms" },
              { label: "Refund Policy", href: "/refund" },
              { label: "Support", href: "/support" },
            ].map(({ label, href }) => (
              <Link
                key={href}
                href={href}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-white border border-[var(--accent-border)] rounded-full text-sm font-semibold text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white transition-all"
              >
                {label} <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
