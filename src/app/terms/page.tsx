import Link from "next/link";
import type { Metadata } from "next";
import {
  FileText, HandshakeIcon, Laptop, UserCog,
  CreditCard, Copyright, AlertTriangle, RefreshCw, ArrowRight,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description: "Read the Terms & Conditions for using The Cyber Library platform.",
};

const SECTIONS = [
  {
    icon: HandshakeIcon,
    num: "01",
    title: "Acceptance of Terms",
    color: "text-[var(--accent)] bg-[var(--accent-pale)]",
    content: (
      <p>
        By accessing or using The Cyber Library (&ldquo;the Service&rdquo;), you agree to be bound by these
        Terms and Conditions and our Privacy Policy. If you do not agree, please do not use the
        Service.
      </p>
    ),
  },
  {
    icon: Laptop,
    num: "02",
    title: "Description of Service",
    color: "text-violet-600 bg-violet-50",
    content: (
      <p>
        The Cyber Library provides an online focus environment via video sessions (e.g. Google
        Meet), slot bookings, and related features including body-doubling sessions and optional
        Pomodoro-style structure. Access is subject to the plan you purchase and our Code of Conduct.
      </p>
    ),
  },
  {
    icon: UserCog,
    num: "03",
    title: "Account & Conduct",
    color: "text-cyan-600 bg-cyan-50",
    content: (
      <p>
        You are responsible for maintaining the accuracy of your account information and for all
        activity under your account. You must comply with our Code of Conduct and applicable law.
        We may suspend or terminate access for breach of these terms or for conduct that harms other
        users or the Service.
      </p>
    ),
  },
  {
    icon: CreditCard,
    num: "04",
    title: "Payments & Subscriptions",
    color: "text-emerald-600 bg-emerald-50",
    content: (
      <>
        <p className="mb-3">
          Fees for plans are as displayed at checkout. Payment is processed by our designated
          payment provider. All fees are in INR unless otherwise stated. Refunds are governed by
          our Refund Policy.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
          {["Daily Pass", "Monthly Focus", "Annual Scholar"].map((plan) => (
            <div
              key={plan}
              className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-center"
            >
              <span className="text-emerald-700 font-semibold text-sm">{plan}</span>
            </div>
          ))}
        </div>
      </>
    ),
  },
  {
    icon: Copyright,
    num: "05",
    title: "Intellectual Property",
    color: "text-amber-600 bg-amber-50",
    content: (
      <p>
        The Service, including its design, branding, and content (excluding user-generated
        content), is owned by The Cyber Library or its licensors. You may not copy, modify, or
        distribute our materials without prior written permission.
      </p>
    ),
  },
  {
    icon: AlertTriangle,
    num: "06",
    title: "Limitation of Liability",
    color: "text-rose-600 bg-rose-50",
    content: (
      <p>
        The Service is provided &ldquo;as is&rdquo;. To the fullest extent permitted by law, we disclaim
        warranties and shall not be liable for indirect, incidental, or consequential damages
        arising from your use of the Service.
      </p>
    ),
  },
  {
    icon: RefreshCw,
    num: "07",
    title: "Changes & Contact",
    color: "text-[var(--accent)] bg-[var(--accent-pale)]",
    content: (
      <p>
        We may update these Terms from time to time; continued use after changes constitutes
        acceptance. For questions, contact us at{" "}
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

export default function TermsPage() {
  return (
    <div className="bg-[var(--page-bg)] min-h-screen">

      {/* ── Hero ── */}
      <section className="relative overflow-hidden pt-28 pb-14 px-4">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_center,_rgba(139,92,246,0.07)_0%,_transparent_60%)]" />
        <div className="relative mx-auto max-w-2xl text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-violet-50 border border-violet-200 mb-6 mx-auto">
            <FileText className="w-8 h-8 text-violet-600" />
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-[var(--foreground)] leading-tight mb-4">
            Terms &amp; Conditions
          </h1>
          <p className="text-[var(--muted-text)] text-base mb-5">
            Last updated: <span className="font-semibold text-[var(--body-text)]">March 2025</span>
          </p>
          <p className="text-[var(--body-text)] text-lg leading-relaxed max-w-xl mx-auto">
            Please read these terms carefully before using The Cyber Library platform and its services.
          </p>
        </div>
      </section>

      {/* ── Key Points Strip ── */}
      <div className="mx-auto max-w-4xl px-4 mb-12">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: "Use responsibly", icon: "🎯" },
            { label: "No harassment", icon: "🤝" },
            { label: "Respect others' work", icon: "📚" },
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
        <div className="bg-violet-50 border border-violet-200 rounded-3xl p-8 text-center">
          <p className="text-violet-500 text-sm mb-4 font-medium uppercase tracking-wide">Related Policies</p>
          <div className="flex flex-wrap justify-center gap-3">
            {[
              { label: "Privacy Policy", href: "/privacy" },
              { label: "Refund Policy", href: "/refund" },
              { label: "Support", href: "/support" },
            ].map(({ label, href }) => (
              <Link
                key={href}
                href={href}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-white border border-violet-200 rounded-full text-sm font-semibold text-violet-600 hover:bg-violet-600 hover:text-white transition-all"
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
