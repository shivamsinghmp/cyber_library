import Link from "next/link";
import type { Metadata } from "next";
import {
  RotateCcw, CheckCircle2, XCircle, ClipboardList,
  Mail, ArrowRight, BadgeIndianRupee,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Refund Policy",
  description: "Understand when and how The Cyber Library processes refunds for plan purchases.",
};

const REFUND_TABLE = [
  {
    plan: "Daily Pass",
    eligible: "Before session start & pass unused",
    notEligible: "After session has begun",
    badge: "text-emerald-600 bg-emerald-50 border-emerald-200",
  },
  {
    plan: "Monthly Focus",
    eligible: "Within 7 days of purchase, before substantial use",
    notEligible: "After 7 days or significant usage",
    badge: "text-[var(--accent)] bg-[var(--accent-pale)] border-[var(--accent-border)]",
  },
  {
    plan: "Annual Scholar",
    eligible: "Within 7 days of purchase, before substantial use",
    notEligible: "After 7 days or significant usage",
    badge: "text-violet-600 bg-violet-50 border-violet-200",
  },
];

const STEPS = [
  {
    num: "01",
    title: "Email us",
    desc: 'Send a refund request to support@cyberlib.in with subject line "Refund Request".',
    icon: Mail,
  },
  {
    num: "02",
    title: "Include your details",
    desc: "Attach the email used at purchase, plan name, date of purchase, and reason.",
    icon: ClipboardList,
  },
  {
    num: "03",
    title: "We review within 5–7 days",
    desc: "Our team will verify eligibility and send you a decision via email.",
    icon: CheckCircle2,
  },
  {
    num: "04",
    title: "Refund processed",
    desc: "Approved refunds reach your original payment method within 10–14 business days.",
    icon: BadgeIndianRupee,
  },
];

export default function RefundPage() {
  return (
    <div className="bg-[var(--page-bg)] min-h-screen">

      {/* ── Hero ── */}
      <section className="relative overflow-hidden pt-28 pb-14 px-4">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_center,_rgba(16,185,129,0.07)_0%,_transparent_60%)]" />
        <div className="relative mx-auto max-w-2xl text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 mb-6 mx-auto">
            <RotateCcw className="w-8 h-8 text-emerald-600" />
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-[var(--foreground)] leading-tight mb-4">
            Refund Policy
          </h1>
          <p className="text-[var(--muted-text)] text-base mb-5">
            Last updated: <span className="font-semibold text-[var(--body-text)]">March 2025</span>
          </p>
          <p className="text-[var(--body-text)] text-lg leading-relaxed max-w-xl mx-auto">
            We want every session to be worth it. Here&apos;s our fair and transparent refund policy for
            all plans.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-4xl px-4 pb-24 space-y-10">

        {/* ── Overview ── */}
        <div className="bg-white rounded-2xl border border-[var(--border)] shadow-[var(--shadow-sm)] p-7">
          <h2 className="text-xl font-bold text-[var(--foreground)] mb-3">Overview</h2>
          <p className="text-[var(--body-text)] text-sm leading-relaxed">
            The Cyber Library offers digital access to focus sessions and study slots. Because our
            service is delivered digitally and in real time, refunds are assessed on a case-by-case
            basis within the eligibility windows below. Duplicate or erroneous charges are always
            refunded in full upon verification.
          </p>
        </div>

        {/* ── Eligibility Table ── */}
        <div>
          <h2 className="text-xl font-bold text-[var(--foreground)] mb-5">Eligibility by Plan</h2>
          <div className="space-y-4">
            {REFUND_TABLE.map(({ plan, eligible, notEligible, badge }) => (
              <div
                key={plan}
                className="bg-white rounded-2xl border border-[var(--border)] shadow-[var(--shadow-sm)] overflow-hidden"
              >
                <div className={`px-6 py-3 border-b border-[var(--border)] flex items-center gap-3`}>
                  <span className={`text-xs font-bold px-3 py-1 rounded-full border ${badge}`}>{plan}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-[var(--border)]">
                  <div className="px-6 py-4 flex items-start gap-3">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide mb-1">Eligible</p>
                      <p className="text-[var(--body-text)] text-sm">{eligible}</p>
                    </div>
                  </div>
                  <div className="px-6 py-4 flex items-start gap-3">
                    <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold text-rose-500 uppercase tracking-wide mb-1">Not Eligible</p>
                      <p className="text-[var(--body-text)] text-sm">{notEligible}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Non-refundable callout ── */}
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 flex items-start gap-4">
          <XCircle className="w-6 h-6 text-rose-500 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-rose-700 mb-1">Non-Refundable Cases</h3>
            <p className="text-rose-600 text-sm leading-relaxed">
              We generally do not refund once the purchased period has been substantially used, or
              if the request is made after the eligibility window. Refunds are not provided for
              change of mind after use.
            </p>
          </div>
        </div>

        {/* ── How to Request ── */}
        <div>
          <h2 className="text-xl font-bold text-[var(--foreground)] mb-6">How to Request a Refund</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {STEPS.map(({ num, title, desc, icon: Icon }) => (
              <div
                key={num}
                className="bg-white rounded-2xl border border-[var(--border)] shadow-[var(--shadow-sm)] p-6 flex items-start gap-4 hover:shadow-[var(--shadow-md)] transition-shadow"
              >
                <div className="shrink-0 w-11 h-11 rounded-xl bg-[var(--accent-pale)] flex items-center justify-center">
                  <Icon className="w-5 h-5 text-[var(--accent)]" />
                </div>
                <div>
                  <p className="text-xs font-bold text-[var(--muted-text)] tracking-widest uppercase mb-1">{num}</p>
                  <h3 className="font-bold text-[var(--foreground)] text-base mb-1">{title}</h3>
                  <p className="text-[var(--body-text)] text-sm leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Contact CTA ── */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-8 text-center">
          <RotateCcw className="w-8 h-8 text-emerald-600 mx-auto mb-3" />
          <h3 className="font-bold text-[var(--foreground)] text-lg mb-2">Have a refund question?</h3>
          <p className="text-[var(--muted-text)] text-sm mb-6">
            Reach out and we&apos;ll sort it out promptly.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/support"
              className="inline-flex items-center gap-1.5 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full text-sm font-semibold transition-all"
            >
              Contact Support <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            {[
              { label: "Privacy Policy", href: "/privacy" },
              { label: "Terms & Conditions", href: "/terms" },
            ].map(({ label, href }) => (
              <Link
                key={href}
                href={href}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-white border border-emerald-200 rounded-full text-sm font-semibold text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all"
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
