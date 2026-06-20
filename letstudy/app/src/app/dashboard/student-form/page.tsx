"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ClipboardList, ArrowLeft, CheckCircle2, History, Loader2, Sparkles, Send } from "lucide-react";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";

type FormField = {
  id: string;
  label: string;
  type: string;
  required: boolean;
  options: string[] | null;
  order: number;
};

type FormData = {
  id: string;
  title: string;
  description: string | null;
  fields: FormField[];
};

type PastSubmission = {
  id: string;
  title: string;
  submittedAt: string;
  data: Record<string, string>;
};

export default function StudentFormPage() {
  const [form, setForm] = useState<FormData | null>(null);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [pastSubmissions, setPastSubmissions] = useState<PastSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  async function fetchForm() {
    try {
      setLoading(true);
      const res = await fetch("/api/student/form", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setForm(data.form ?? null);
      setAlreadySubmitted(data.alreadySubmitted ?? false);
      setPastSubmissions(data.pastSubmissions || []);
      if (data.form?.fields && !data.alreadySubmitted) {
        const initial: Record<string, string> = {};
        data.form.fields.forEach((f: FormField) => { initial[f.id] = ""; });
        setValues(initial);
      }
    } catch {
      setForm(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchForm(); }, []);

  function setField(fieldId: string, value: string) {
    setValues((prev) => ({ ...prev, [fieldId]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    const missing = form.fields.filter((f) => f.required && !(values[f.id]?.trim()));
    if (missing.length) {
      toast.error(`Please fill: ${missing.map((m) => m.label).join(", ")}`);
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/student/form", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formId: form.id, data: values }),
      });
      if (res.ok) {
        toast.success("Form submitted successfully!");
        setAlreadySubmitted(true);
        fetchForm();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err?.error ?? "Failed to submit");
      }
    } catch {
      toast.error("Failed to submit");
    } finally {
      setSaving(false);
    }
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } },
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="flex h-[60vh] flex-col items-center justify-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-[var(--accent)]" />
          <p className="text-sm font-semibold uppercase tracking-widest text-gray-400 animate-pulse">Loading Forms...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Link href="/dashboard" className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-gray-500 transition-colors hover:text-[var(--accent)]">
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboard
      </Link>

      <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">

        {/* ACTIVE FORM SECTION */}
        <motion.div variants={itemVariants} className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">

          {/* Card header */}
          <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
            <h2 className="flex items-center gap-2 text-base font-bold text-gray-900">
              <Sparkles className="h-5 w-5 text-[var(--accent)]" />
              Active Requirement
            </h2>
            {!form || alreadySubmitted ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                <CheckCircle2 className="h-3 w-3" /> All Caught Up
              </span>
            ) : (
              <span className="inline-flex animate-pulse items-center gap-1 rounded-full bg-indigo-100 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-indigo-700">
                Action Required
              </span>
            )}
          </div>

          {/* Card body */}
          <div className="px-6 py-6">
            {!form ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100">
                  <ClipboardList className="h-7 w-7 text-gray-400" />
                </div>
                <p className="text-base font-semibold text-gray-700">No Pending Forms</p>
                <p className="mt-1 text-sm text-gray-500">You have no active forms assigned to you at this time.</p>
              </div>
            ) : alreadySubmitted ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100">
                  <CheckCircle2 className="h-7 w-7 text-emerald-600" />
                </div>
                <p className="text-base font-bold text-gray-900">Form Completed Successfully</p>
                <p className="mt-1 text-sm text-gray-500 max-w-sm">
                  Thank you for submitting &ldquo;{form.title}&rdquo;. A copy has been saved to your archive.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{form.title}</h3>
                  {form.description && (
                    <p className="mt-1 text-sm text-gray-500">{form.description}</p>
                  )}
                </div>

                <div className="space-y-4 pt-1">
                  {form.fields.map((field) => (
                    <div key={field.id} className="group">
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500 transition-colors group-focus-within:text-[var(--accent)]">
                        {field.label} {field.required && <span className="text-[var(--accent)]">*</span>}
                      </label>
                      {field.type === "TEXTAREA" ? (
                        <textarea
                          value={values[field.id] ?? ""}
                          onChange={(e) => setField(field.id, e.target.value)}
                          required={field.required}
                          rows={3}
                          placeholder={`Enter ${field.label.toLowerCase()}...`}
                          className="admin-input"
                        />
                      ) : field.type === "SELECT" ? (
                        <select
                          value={values[field.id] ?? ""}
                          onChange={(e) => setField(field.id, e.target.value)}
                          required={field.required}
                          className="admin-input"
                        >
                          <option value="">Select an option...</option>
                          {(field.options ?? []).map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type={field.type === "NUMBER" ? "number" : field.type === "EMAIL" ? "email" : "text"}
                          value={values[field.id] ?? ""}
                          onChange={(e) => setField(field.id, e.target.value)}
                          required={field.required}
                          placeholder={`Enter ${field.label.toLowerCase()}...`}
                          className="admin-input"
                        />
                      )}
                    </div>
                  ))}
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={saving}
                    className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-[var(--accent)] px-8 py-3.5 text-sm font-bold tracking-wide text-white shadow-md transition-all hover:bg-[var(--accent-hover)] hover:shadow-lg disabled:opacity-70"
                  >
                    {saving ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        <Send className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                        Submit Form
                      </>
                    )}
                    <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                  </button>
                </div>
              </form>
            )}
          </div>
        </motion.div>

        {/* SUBMISSION ARCHIVE LOG */}
        <motion.div variants={itemVariants}>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-gray-500">
              <History className="h-4 w-4" />
              Submission Archive
            </h3>
            <span className="text-xs font-medium text-gray-400">{pastSubmissions.length} Record(s)</span>
          </div>

          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {pastSubmissions.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="rounded-2xl border border-gray-200 bg-gray-50 p-6 text-center"
                >
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">History is empty</p>
                </motion.div>
              ) : (
                pastSubmissions.map((sub, i) => (
                  <motion.div
                    key={sub.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="group flex flex-col gap-2 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition-all hover:border-indigo-200 hover:shadow-md sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-[var(--accent)]">
                        <ClipboardList className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900 transition-colors group-hover:text-[var(--accent)]">{sub.title}</p>
                        <p className="text-xs font-medium text-gray-500">
                          {new Date(sub.submittedAt).toLocaleDateString("en-US", { weekday: "short", year: "numeric", month: "long", day: "numeric" })}
                          {" at "}
                          {new Date(sub.submittedAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 self-start rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700 sm:self-auto">
                      <CheckCircle2 className="h-3 w-3" /> Processed
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </motion.div>

      </motion.div>
    </div>
  );
}
