"use client";

import { useState, useEffect } from "react";
import { User, Phone, Building2, Target, MessageCircle, Calendar, Award } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

const STUDY_GOALS = ["UPSC", "JEE", "NEET", "GATE", "CAT", "Other"];
const TARGET_EXAMS = ["UPSC", "SSC", "JEE", "Coding", "Others"];
const TARGET_YEARS = ["2026", "2027", "2028"];
const PAIN_POINTS = [
  "Time Management",
  "Concept Clarity",
  "Consistency",
  "Test Practice",
];

function validateWhatsApp(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  const ten = digits.length === 10 ? digits : digits.length === 12 && digits.startsWith("91") ? digits.slice(2) : null;
  return !!ten && ten.length === 10 && /^[6-9]\d{9}$/.test(ten);
}

type FieldDef = {
  id: string;
  key: string;
  label: string;
  type: string;
  required: boolean;
  options: string[] | null;
};

type Profile = {
  id?: string;
  fullName: string | null;
  phone: string | null;
  whatsappNumber: string | null;
  studyGoal: string | null;
  targetExam: string | null;
  targetYear: string | null;
  primaryPainPoint: string | null;
  institution: string | null;
  bio: string | null;
  totalStudyHours?: number;
  profilePicUrl?: string | null;
  customFields?: Record<string, string | null> | null;
  fieldDefinitions?: FieldDef[];
};

export function ProfileSection() {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [institution, setInstitution] = useState("");
  const [studyGoal, setStudyGoal] = useState("");
  const [targetExam, setTargetExam] = useState("");
  const [targetYear, setTargetYear] = useState("");
  const [primaryPainPoint, setPrimaryPainPoint] = useState("");
  const [whatsappError, setWhatsappError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fieldDefinitions, setFieldDefinitions] = useState<FieldDef[]>([]);
  const [customFieldsValues, setCustomFieldsValues] = useState<Record<string, string>>({});

  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await fetch("/api/user/profile");
        if (!res.ok) {
          if (res.status === 401) return;
          throw new Error("Failed to load profile");
        }
        const data: Profile | null = await res.json();
        if (data) {
          setFullName(data.fullName ?? "");
          setPhone(data.phone ?? "");
          setWhatsappNumber(data.whatsappNumber ?? "");
          setInstitution(data.institution ?? "");
          setStudyGoal(data.studyGoal ?? "");
          setTargetExam(data.targetExam ?? "");
          setTargetYear(data.targetYear ?? "");
          setPrimaryPainPoint(data.primaryPainPoint ?? "");
          setFieldDefinitions(data.fieldDefinitions ?? []);
          const cf = data.customFields && typeof data.customFields === "object" ? data.customFields as Record<string, string | null> : {};
          const init: Record<string, string> = {};
          (data.fieldDefinitions ?? []).forEach((f: FieldDef) => {
            init[f.key] = (cf[f.key] != null ? String(cf[f.key]) : "") ?? "";
          });
          setCustomFieldsValues(init);
        }
      } catch {
        toast.error("Could not load profile");
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const wa = whatsappNumber.trim();
    if (wa && !validateWhatsApp(wa)) {
      setWhatsappError("Enter a valid 10-digit number (e.g. 9876543210)");
      return;
    }
    setWhatsappError("");
    setSaving(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: fullName.trim() || null,
          phone: phone.trim() || null,
          whatsappNumber: wa || null,
          institution: institution.trim() || null,
          studyGoal: studyGoal.trim() || null,
          targetExam: targetExam.trim() || null,
          targetYear: targetYear.trim() || null,
          primaryPainPoint: primaryPainPoint.trim() || null,
          customFields: fieldDefinitions.length ? customFieldsValues : undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to save");
      }
      toast.success("Profile updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save profile");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-black/30 p-6 shadow-xl">
        <div className="flex items-center justify-center py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
        </div>
      </div>
    );
  }

  return (
    <>
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: "rgba(15, 11, 7, 0.95)",
            color: "var(--cream)",
            border: "1px solid rgba(255,255,255,0.1)",
          },
        }}
      />
      <div className="rounded-2xl border border-white/10 bg-black/30 p-6 shadow-xl md:p-8">
        <h2 className="text-lg font-semibold text-[var(--cream)] md:text-xl">
          Student Profile
        </h2>
        <p className="mt-1 text-xs text-[var(--cream-muted)] md:text-sm">
          Update your details. These help us personalise your experience.
        </p>
        <div className="mt-3 rounded-xl border border-[var(--accent)]/30 bg-[var(--accent)]/5 px-4 py-3">
          <p className="text-xs text-[var(--cream-muted)] md:text-sm">
            <strong className="text-[var(--cream)]">Why we need this:</strong>{" "}
            We use your exam, year, and pain points to recommend personalised study material, tips, and product offers. Your WhatsApp number helps us send session reminders and useful updates.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--cream-muted)]">
              Full Name
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--cream-muted)]" />
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your full name"
                className="w-full rounded-xl border border-white/10 bg-black/40 py-2.5 pl-10 pr-3 text-sm text-[var(--cream)] placeholder:text-[var(--cream-muted)]/60 focus:border-[var(--accent)]/70 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--cream-muted)]">
              Phone
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--cream-muted)]" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="10-digit mobile number"
                className="w-full rounded-xl border border-white/10 bg-black/40 py-2.5 pl-10 pr-3 text-sm text-[var(--cream)] placeholder:text-[var(--cream-muted)]/60 focus:border-[var(--accent)]/70 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--cream-muted)]">
              WhatsApp Number
            </label>
            <div className="relative">
              <MessageCircle className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--cream-muted)]" />
              <input
                type="tel"
                value={whatsappNumber}
                onChange={(e) => {
                  setWhatsappNumber(e.target.value);
                  setWhatsappError("");
                }}
                placeholder="e.g. 9876543210 or +91 9876543210"
                className={`w-full rounded-xl border bg-black/40 py-2.5 pl-10 pr-3 text-sm text-[var(--cream)] placeholder:text-[var(--cream-muted)]/60 focus:outline-none ${
                  whatsappError ? "border-red-400/70" : "border-white/10 focus:border-[var(--accent)]/70"
                }`}
              />
            </div>
            {whatsappError && (
              <p className="mt-1 text-xs text-red-400">{whatsappError}</p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--cream-muted)]">
              Institution
            </label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--cream-muted)]" />
              <input
                type="text"
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                placeholder="School, college, or organisation"
                className="w-full rounded-xl border border-white/10 bg-black/40 py-2.5 pl-10 pr-3 text-sm text-[var(--cream)] placeholder:text-[var(--cream-muted)]/60 focus:border-[var(--accent)]/70 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--cream-muted)]">
              Study Goal
            </label>
            <div className="relative">
              <Target className="absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-[var(--cream-muted)]" />
              <select
                value={studyGoal}
                onChange={(e) => setStudyGoal(e.target.value)}
                className="w-full appearance-none rounded-xl border border-white/10 bg-black/40 py-2.5 pl-10 pr-8 text-sm text-[var(--cream)] focus:border-[var(--accent)]/70 focus:outline-none"
              >
                <option value="">Select goal</option>
                {STUDY_GOALS.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--cream-muted)]">
              Target Exam
            </label>
            <div className="relative">
              <Award className="absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-[var(--cream-muted)]" />
              <select
                value={targetExam}
                onChange={(e) => setTargetExam(e.target.value)}
                className="w-full appearance-none rounded-xl border border-white/10 bg-black/40 py-2.5 pl-10 pr-8 text-sm text-[var(--cream)] focus:border-[var(--accent)]/70 focus:outline-none"
              >
                <option value="">Select target exam</option>
                {TARGET_EXAMS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--cream-muted)]">
              Target Year
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-[var(--cream-muted)]" />
              <select
                value={targetYear}
                onChange={(e) => setTargetYear(e.target.value)}
                className="w-full appearance-none rounded-xl border border-white/10 bg-black/40 py-2.5 pl-10 pr-8 text-sm text-[var(--cream)] focus:border-[var(--accent)]/70 focus:outline-none"
              >
                <option value="">Select target year</option>
                {TARGET_YEARS.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--cream-muted)]">
              Primary Pain Point
            </label>
            <div className="relative">
              <Target className="absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-[var(--cream-muted)]" />
              <select
                value={primaryPainPoint}
                onChange={(e) => setPrimaryPainPoint(e.target.value)}
                className="w-full appearance-none rounded-xl border border-white/10 bg-black/40 py-2.5 pl-10 pr-8 text-sm text-[var(--cream)] focus:border-[var(--accent)]/70 focus:outline-none"
              >
                <option value="">Select your main challenge</option>
                {PAIN_POINTS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {fieldDefinitions.length > 0 && (
            <div className="space-y-4 border-t border-white/10 pt-4">
              <p className="text-xs font-medium text-[var(--cream-muted)]">Additional details</p>
              {fieldDefinitions.map((f) => (
                <div key={f.id}>
                  <label className="mb-1 block text-xs font-medium text-[var(--cream-muted)]">
                    {f.label}{f.required ? " *" : ""}
                  </label>
                  {f.type === "textarea" ? (
                    <textarea
                      value={customFieldsValues[f.key] ?? ""}
                      onChange={(e) => setCustomFieldsValues((prev) => ({ ...prev, [f.key]: e.target.value }))}
                      rows={3}
                      className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-[var(--cream)] placeholder:text-[var(--cream-muted)]/60 focus:border-[var(--accent)]/70 focus:outline-none"
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
                      className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-[var(--cream)] placeholder:text-[var(--cream-muted)]/60 focus:border-[var(--accent)]/70 focus:outline-none"
                      required={f.required}
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] py-2.5 text-sm font-semibold text-[var(--ink)] shadow-md transition hover:bg-[var(--accent-hover)] disabled:opacity-70"
          >
            {saving ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--ink)] border-t-transparent" />
                Saving…
              </>
            ) : (
              "Save Changes"
            )}
          </button>
        </form>
      </div>
    </>
  );
}
