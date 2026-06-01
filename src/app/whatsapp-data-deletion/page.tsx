import { Mail, MessageCircle, Clock, ShieldCheck, Trash2, FileText } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "WhatsApp Data Deletion Request — Let's Study",
  description: "Request deletion of your WhatsApp data from Let's Study. We comply with Meta's data deletion policies.",
};

export default function WhatsAppDataDeletionPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-16 px-4">
      <div className="mx-auto max-w-2xl space-y-8">

        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-100 border border-emerald-200 mb-2">
            <MessageCircle className="w-7 h-7 text-emerald-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">
            WhatsApp Data Deletion Request
          </h1>
          <p className="text-gray-600 text-base max-w-lg mx-auto">
            In accordance with Meta&apos;s WhatsApp Business Platform policies, you have the right to request deletion of your personal data that we have collected via WhatsApp.
          </p>
        </div>

        {/* How to request */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 space-y-4">
          <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900">
            <Mail className="w-5 h-5 text-indigo-600" />
            How to Request Data Deletion
          </h2>
          <p className="text-sm text-gray-600">
            To request deletion of your WhatsApp data, please send an email to:
          </p>
          <a
            href="mailto:admin@cyberlib.in?subject=WhatsApp%20Data%20Deletion%20Request"
            className="flex items-center gap-3 rounded-xl border-2 border-indigo-500 bg-indigo-50 px-5 py-4 hover:bg-indigo-100 transition-colors group"
          >
            <Mail className="w-5 h-5 text-indigo-600 shrink-0" />
            <div>
              <p className="font-bold text-indigo-700 group-hover:underline">admin@cyberlib.in</p>
              <p className="text-xs text-indigo-500">Click to open email with pre-filled subject</p>
            </div>
          </a>

          <div className="rounded-xl bg-gray-50 border border-gray-200 p-4 text-sm space-y-2">
            <p className="font-semibold text-gray-900">Please include in your email:</p>
            <ul className="space-y-1.5 text-gray-600">
              <li className="flex items-start gap-2">
                <span className="text-indigo-600 mt-0.5 font-bold">•</span>
                Your full name as registered with us
              </li>
              <li className="flex items-start gap-2">
                <span className="text-indigo-600 mt-0.5 font-bold">•</span>
                Your WhatsApp phone number (with country code, e.g. +919876543210)
              </li>
              <li className="flex items-start gap-2">
                <span className="text-indigo-600 mt-0.5 font-bold">•</span>
                Your registered email address
              </li>
              <li className="flex items-start gap-2">
                <span className="text-indigo-600 mt-0.5 font-bold">•</span>
                Subject line: <span className="font-mono bg-gray-200 text-gray-800 px-1.5 py-0.5 rounded text-xs ml-1">WhatsApp Data Deletion Request</span>
              </li>
            </ul>
          </div>
        </div>

        {/* What data we hold */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 space-y-4">
          <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900">
            <FileText className="w-5 h-5 text-indigo-600" />
            What Data We Collect via WhatsApp
          </h2>
          <div className="space-y-3 text-sm">
            {[
              { label: "Phone number", desc: "Your WhatsApp number used for communication" },
              { label: "Message content", desc: "Messages exchanged between you and our team (stored encrypted)" },
              { label: "Timestamps", desc: "Date and time of messages for support records" },
              { label: "OTP records", desc: "Temporary one-time passwords — automatically deleted after 10 minutes" },
            ].map(({ label, desc }) => (
              <div key={label} className="flex items-start gap-3 rounded-xl bg-gray-50 border border-gray-200 px-4 py-3">
                <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-gray-900">{label}</p>
                  <p className="text-gray-600 mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* What happens after request */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 space-y-4">
          <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900">
            <Trash2 className="w-5 h-5 text-indigo-600" />
            What Happens After Your Request
          </h2>
          <div className="space-y-3 text-sm">
            {[
              { step: "1", text: "We will verify your identity using the details you provide." },
              { step: "2", text: "All WhatsApp messages linked to your phone number will be permanently deleted from our database." },
              { step: "3", text: "Your phone number will be removed from our WhatsApp contact records." },
              { step: "4", text: "You will receive a confirmation email once deletion is complete." },
            ].map(({ step, text }) => (
              <div key={step} className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center text-xs font-bold text-indigo-700">
                  {step}
                </span>
                <p className="text-gray-700 pt-0.5">{text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Timeline */}
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 flex items-start gap-3">
          <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-900">Response Timeline</p>
            <p className="text-sm text-amber-800 mt-0.5">
              We will process your data deletion request within <strong>30 days</strong> of receiving it, in compliance with Meta&apos;s WhatsApp Business Platform policies and applicable data protection regulations.
            </p>
          </div>
        </div>

        {/* Important note */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 text-sm space-y-2">
          <p className="font-semibold text-gray-900">Important Note</p>
          <p className="text-gray-600">
            This page covers data held by <strong className="text-gray-900">Let's Study</strong>. For data held directly by Meta (WhatsApp Inc.), please visit{" "}
            <a href="https://www.whatsapp.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline font-medium">
              WhatsApp&apos;s Privacy Policy
            </a>{" "}
            and use the in-app data deletion options.
          </p>
          <p className="text-gray-600">
            Questions? Contact us at{" "}
            <a href="mailto:admin@cyberlib.in" className="text-indigo-600 hover:underline font-medium">admin@cyberlib.in</a>
          </p>
        </div>

        {/* Back link */}
        <div className="text-center pt-4">
          <Link href="/" className="text-sm text-gray-500 hover:text-indigo-600 transition-colors">
            ← Back to Let's Study
          </Link>
        </div>

      </div>
    </div>
  );
}
