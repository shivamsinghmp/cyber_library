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
        data.form.fields.forEach((f: FormField) => {
          initial[f.id] = "";
        });
        setValues(initial);
      }
    } catch {
      setForm(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchForm();
  }, []);

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
        // Re-fetch to update the history list dynamically
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
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
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
          <p className="text-sm font-semibold uppercase tracking-widest text-[var(--cream-muted)] animate-pulse">Loading Forms...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Link href="/dashboard" className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-[var(--cream-muted)] transition-colors hover:text-[var(--accent)]">
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboard
      </Link>

      <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-8">
        
        {/* ACTIVE FORM SECTION */}
        <motion.div variants={itemVariants} className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-black/40 p-6 shadow-2xl backdrop-blur-xl md:p-8">
          <div className="absolute -left-10 -top-10 h-32 w-32 rounded-full bg-[var(--accent)]/10 blur-[40px] pointer-events-none"></div>
          
          <div className="relative z-10 mb-6 flex items-center justify-between border-b border-white/5 pb-4">
             <h2 className="flex items-center gap-2 text-lg font-bold text-[var(--cream)]">
               <Sparkles className="h-5 w-5 text-[var(--accent)]" />
               Active Requirement
             </h2>
             {!form || alreadySubmitted ? (
               <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-400 border border-emerald-500/20">
                 <CheckCircle2 className="h-3 w-3" /> All Caught Up
               </span>
             ) : (
               <span className="inline-flex animate-pulse items-center gap-1 rounded-full bg-[var(--accent)]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--accent)] border border-[var(--accent)]/20">
                 Action Required
               </span>
             )}
          </div>

          <div className="relative z-10">
            {!form ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <ClipboardList className="mb-4 h-12 w-12 text-white/20" />
                <p className="text-base font-semibold text-[var(--cream)]">No Pending Forms</p>
                <p className="mt-1 text-sm text-[var(--cream-muted)]">You have no active forms assigned to you at this time.</p>
              </div>
            ) : alreadySubmitted ? (
              <div className="flex flex-col items-center justify-center py-8 text-center group cursor-default">
                <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 mb-4 transition-transform group-hover:scale-110 duration-300">
                   <div className="absolute inset-0 rounded-full bg-emerald-500/20 blur-xl"></div>
                   <CheckCircle2 className="relative z-10 h-8 w-8 text-emerald-500" />
                </div>
                <p className="text-base font-bold text-[var(--cream)]">Form Completed Successfully</p>
                <p className="mt-1 text-sm text-[var(--cream-muted)] max-w-sm">Thank you for submitting "{form.title}". A copy has been saved to your archive.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <h3 className="text-xl font-bold text-[var(--cream)]">{form.title}</h3>
                  {form.description && (
                    <p className="mt-1 text-sm text-[var(--cream-muted)]">{form.description}</p>
                  )}
                </div>

                <div className="space-y-4 pt-2">
                  {form.fields.map((field) => (
                    <div key={field.id} className="group relative">
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[var(--cream-muted)] transition-colors group-focus-within:text-[var(--accent)]">
                        {field.label} {field.required && <span className="text-[var(--accent)]">*</span>}
                      </label>
                      <div className="relative">
                        {field.type === "TEXTAREA" ? (
                          <textarea
                            value={values[field.id] ?? ""}
                            onChange={(e) => setField(field.id, e.target.value)}
                            required={field.required}
                            rows={3}
                            placeholder={`Enter ${field.label.toLowerCase()}...`}
                            className="w-full appearance-none rounded-xl border border-white/10 bg-black/50 px-4 py-3 text-sm font-medium text-[var(--cream)] shadow-inner transition-all hover:bg-black/70 focus:border-[var(--accent)] focus:bg-black focus:outline-none focus:ring-1 focus:ring-[var(--accent)]/50 placeholder:text-white/20"
                          />
                        ) : field.type === "SELECT" ? (
                          <select
                            value={values[field.id] ?? ""}
                            onChange={(e) => setField(field.id, e.target.value)}
                            required={field.required}
                            className="w-full appearance-none rounded-xl border border-white/10 bg-black/50 px-4 py-3 text-sm font-medium text-[var(--cream)] shadow-inner transition-all hover:bg-black/70 focus:border-[var(--accent)] focus:bg-black focus:outline-none focus:ring-1 focus:ring-[var(--accent)]/50"
                          >
                            <option value="" className="bg-black text-[var(--cream-muted)]">Select an option...</option>
                            {(field.options ?? []).map((opt) => (
                              <option key={opt} value={opt} className="bg-black">{opt}</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type={field.type === "NUMBER" ? "number" : field.type === "EMAIL" ? "email" : "text"}
                            value={values[field.id] ?? ""}
                            onChange={(e) => setField(field.id, e.target.value)}
                            required={field.required}
                            placeholder={`Enter ${field.label.toLowerCase()}...`}
                            className="w-full appearance-none rounded-xl border border-white/10 bg-black/50 px-4 py-3 text-sm font-medium text-[var(--cream)] shadow-inner transition-all hover:bg-black/70 focus:border-[var(--accent)] focus:bg-black focus:outline-none focus:ring-1 focus:ring-[var(--accent)]/50 placeholder:text-white/20"
                          />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="pt-6">
                  <button
                    type="submit"
                    disabled={saving}
                    className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-[var(--accent)] px-8 py-3.5 text-sm font-bold tracking-wide text-[var(--ink)] shadow-[0_0_20px_rgba(var(--accent-rgb),0.3)] transition-all hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(var(--accent-rgb),0.5)] disabled:scale-100 disabled:opacity-70"
                  >
                    {saving ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        <Send className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                        Submit Form
                      </>
                    )}
                    <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent transition-transform duration-1000 ease-in-out group-hover:translate-x-full" />
                  </button>
                </div>
              </form>
            )}
          </div>
        </motion.div>

        {/* SUBMISSION ARCHIVE LOG */}
        <motion.div variants={itemVariants} className="pt-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-[var(--cream-muted)]">
               <History className="h-4 w-4" />
               Submission Archive
            </h3>
            <span className="text-xs font-medium text-white/30">{pastSubmissions.length} Record(s)</span>
          </div>

          <div className="space-y-3">
             <AnimatePresence mode="popLayout">
               {pastSubmissions.length === 0 ? (
                 <motion.div 
                   initial={{ opacity: 0, scale: 0.95 }} 
                   animate={{ opacity: 1, scale: 1 }} 
                   className="rounded-2xl border border-white/5 bg-black/20 p-6 text-center shadow-inner"
                 >
                   <p className="text-xs font-semibold uppercase tracking-wider text-[var(--cream-muted)]">History is empty</p>
                 </motion.div>
               ) : (
                 pastSubmissions.map((sub, i) => (
                   <motion.div 
                     key={sub.id}
                     initial={{ opacity: 0, y: 10 }}
                     animate={{ opacity: 1, y: 0 }}
                     transition={{ delay: i * 0.05 }}
                     className="group flex flex-col gap-2 rounded-2xl border border-white/5 bg-black/30 p-4 transition-all hover:border-[var(--accent)]/30 hover:bg-black/50 sm:flex-row sm:items-center sm:justify-between"
                   >
                     <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--accent)]/10 text-[var(--accent)]">
                          <ClipboardList className="h-4 w-4" />
                        </div>
                        <div>
                           <p className="text-sm font-bold text-[var(--cream)] transition-colors group-hover:text-[var(--accent)]">{sub.title}</p>
                           <p className="text-xs font-medium text-[var(--cream-muted)]">{new Date(sub.submittedAt).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' })} at {new Date(sub.submittedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                     </div>
                     <div className="flex items-center gap-1.5 self-start sm:self-auto rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
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
