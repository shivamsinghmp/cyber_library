"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ClipboardList, ArrowLeft } from "lucide-react";
import toast from "react-hot-toast";

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

export default function StudentFormPage() {
  const [form, setForm] = useState<FormData | null>(null);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function fetchForm() {
      try {
        const res = await fetch("/api/student/form");
        if (!res.ok) throw new Error("Failed to load");
        const data = await res.json();
        setForm(data.form ?? null);
        setAlreadySubmitted(data.alreadySubmitted ?? false);
        if (data.form?.fields) {
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

  if (loading) {
    return (
      <div className="mx-auto max-w-xl px-4 py-8">
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
        </div>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="mx-auto max-w-xl px-4 py-8">
        <Link href="/dashboard" className="mb-4 inline-flex items-center gap-2 text-sm text-[var(--cream-muted)] hover:text-[var(--cream)]">
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
        <div className="rounded-2xl border border-white/10 bg-black/30 p-8 text-center">
          <ClipboardList className="mx-auto mb-3 h-12 w-12 text-[var(--cream-muted)]" />
          <p className="text-[var(--cream)]">No form available right now.</p>
          <p className="mt-1 text-sm text-[var(--cream-muted)]">Check back later or contact support.</p>
        </div>
      </div>
    );
  }

  if (alreadySubmitted) {
    return (
      <div className="mx-auto max-w-xl px-4 py-8">
        <Link href="/dashboard" className="mb-4 inline-flex items-center gap-2 text-sm text-[var(--cream-muted)] hover:text-[var(--cream)]">
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-8 text-center">
          <p className="font-medium text-emerald-300">You have already submitted this form.</p>
          <p className="mt-1 text-sm text-[var(--cream-muted)]">Thank you!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <Link href="/dashboard" className="mb-4 inline-flex items-center gap-2 text-sm text-[var(--cream-muted)] hover:text-[var(--cream)]">
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboard
      </Link>
      <div className="rounded-2xl border border-white/10 bg-black/30 p-6 md:p-8">
        <h1 className="mb-1 flex items-center gap-2 text-xl font-semibold text-[var(--cream)]">
          <ClipboardList className="h-5 w-5 text-[var(--accent)]" />
          {form.title}
        </h1>
        {form.description && <p className="mb-6 text-sm text-[var(--cream-muted)]">{form.description}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          {form.fields.map((field) => (
            <div key={field.id}>
              <label className="mb-1 block text-xs font-medium text-[var(--cream-muted)]">
                {field.label} {field.required && "*"}
              </label>
              {field.type === "TEXTAREA" ? (
                <textarea
                  value={values[field.id] ?? ""}
                  onChange={(e) => setField(field.id, e.target.value)}
                  required={field.required}
                  rows={3}
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-[var(--cream)] focus:border-[var(--accent)]/70 focus:outline-none"
                />
              ) : field.type === "SELECT" ? (
                <select
                  value={values[field.id] ?? ""}
                  onChange={(e) => setField(field.id, e.target.value)}
                  required={field.required}
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-[var(--cream)] focus:border-[var(--accent)]/70 focus:outline-none"
                >
                  <option value="">Select</option>
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
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-[var(--cream)] focus:border-[var(--accent)]/70 focus:outline-none"
                />
              )}
            </div>
          ))}
          <div className="pt-4">
            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-xl bg-[var(--accent)] py-2.5 text-sm font-semibold text-[var(--ink)] disabled:opacity-60"
            >
              {saving ? "Submitting…" : "Submit"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
