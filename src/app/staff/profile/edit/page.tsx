"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Pencil, ArrowLeft } from "lucide-react";
import toast from "react-hot-toast";

type FieldDef = { id: string; key: string; label: string; type: string; required: boolean; options: string[] | null };

type FormData = {
  fullName: string;
  phone: string;
  institution: string;
  bio: string;
};

export default function StaffProfileEditPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fieldDefinitions, setFieldDefinitions] = useState<FieldDef[]>([]);
  const [customFieldsValues, setCustomFieldsValues] = useState<Record<string, string>>({});

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: { fullName: "", phone: "", institution: "", bio: "" },
  });

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/user/profile");
        if (res.ok) {
          const data = await res.json();
          const p = data ?? {};
          reset({
            fullName: p.fullName ?? "",
            phone: p.phone ?? "",
            institution: p.institution ?? "",
            bio: p.bio ?? "",
          });
          setFieldDefinitions(p.fieldDefinitions ?? []);
          const cf = (p.customFields && typeof p.customFields === "object") ? (p.customFields as Record<string, string | null>) : {};
          const init: Record<string, string> = {};
          (p.fieldDefinitions ?? []).forEach((f: FieldDef) => {
            init[f.key] = (cf[f.key] != null ? String(cf[f.key]) : "") ?? "";
          });
          setCustomFieldsValues(init);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [reset]);

  async function onSubmit(data: FormData) {
    setSaving(true);
    try {
      const res = await fetch("/api/profile/update", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: data.fullName.trim() || null,
          phone: data.phone.trim() || null,
          institution: data.institution.trim() || null,
          bio: data.bio.trim() || null,
          customFields: fieldDefinitions.length ? customFieldsValues : undefined,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(json.error ?? "Failed to update");
        setSaving(false);
        return;
      }
      toast.success("Profile updated");
      router.push("/staff/profile");
      router.refresh();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl space-y-8">
        <div className="h-10 w-48 animate-pulse rounded-lg bg-white/10" />
        <div className="h-64 animate-pulse rounded-2xl bg-white/5" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--cream)] md:text-3xl">
            Edit profile
          </h1>
          <p className="mt-1 text-sm text-[var(--cream-muted)]">
            Update your staff profile details
          </p>
        </div>
        <Link
          href="/staff/profile"
          className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-medium text-[var(--cream-muted)] transition hover:bg-white/10 hover:text-[var(--cream)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="rounded-2xl border border-white/10 bg-black/30 p-6 shadow-xl space-y-5"
      >
        <div>
          <label className="mb-1.5 block text-xs font-medium text-[var(--cream-muted)]">
            Full name
          </label>
          <input
            {...register("fullName")}
            type="text"
            placeholder="Your name"
            className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-[var(--cream)] placeholder:text-[var(--cream-muted)]/60 focus:border-[var(--accent)]/70 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-[var(--cream-muted)]">
            Phone
          </label>
          <input
            {...register("phone")}
            type="tel"
            placeholder="Phone number"
            className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-[var(--cream)] placeholder:text-[var(--cream-muted)]/60 focus:border-[var(--accent)]/70 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-[var(--cream-muted)]">
            Institution
          </label>
          <input
            {...register("institution")}
            type="text"
            placeholder="Institution or organisation"
            className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-[var(--cream)] placeholder:text-[var(--cream-muted)]/60 focus:border-[var(--accent)]/70 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-[var(--cream-muted)]">
            Bio
          </label>
          <textarea
            {...register("bio")}
            rows={4}
            placeholder="A short bio"
            className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-[var(--cream)] placeholder:text-[var(--cream-muted)]/60 focus:border-[var(--accent)]/70 focus:outline-none resize-none"
          />
        </div>
        {fieldDefinitions.length > 0 && (
          <div className="space-y-4 border-t border-white/10 pt-4">
            <p className="text-xs font-medium text-[var(--cream-muted)]">Additional details</p>
            {fieldDefinitions.map((f) => (
              <div key={f.id}>
                <label className="mb-1.5 block text-xs font-medium text-[var(--cream-muted)]">
                  {f.label}{f.required ? " *" : ""}
                </label>
                {f.type === "textarea" ? (
                  <textarea
                    value={customFieldsValues[f.key] ?? ""}
                    onChange={(e) => setCustomFieldsValues((prev) => ({ ...prev, [f.key]: e.target.value }))}
                    rows={3}
                    className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-[var(--cream)] focus:border-[var(--accent)]/70 focus:outline-none"
                    required={f.required}
                  />
                ) : f.type === "select" && Array.isArray(f.options) ? (
                  <select
                    value={customFieldsValues[f.key] ?? ""}
                    onChange={(e) => setCustomFieldsValues((prev) => ({ ...prev, [f.key]: e.target.value }))}
                    className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-[var(--cream)] focus:border-[var(--accent)]/70 focus:outline-none"
                    required={f.required}
                  >
                    <option value="">Select</option>
                    {f.options.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={f.type === "number" ? "number" : f.type === "email" ? "email" : "text"}
                    value={customFieldsValues[f.key] ?? ""}
                    onChange={(e) => setCustomFieldsValues((prev) => ({ ...prev, [f.key]: e.target.value }))}
                    className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-[var(--cream)] focus:border-[var(--accent)]/70 focus:outline-none"
                    required={f.required}
                  />
                )}
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[var(--ink)] shadow-lg transition hover:bg-[var(--accent-hover)] disabled:opacity-60"
          >
            <Pencil className="h-4 w-4" />
            {saving ? "Saving…" : "Save changes"}
          </button>
          <Link
            href="/staff/profile"
            className="inline-flex items-center rounded-xl border border-white/15 px-4 py-2.5 text-sm font-medium text-[var(--cream-muted)] hover:bg-white/5 hover:text-[var(--cream)]"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
