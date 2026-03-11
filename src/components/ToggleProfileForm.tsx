"use client";

import { useState, useEffect } from "react";
import { User, Phone, Target, FileText, Pencil, Camera } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { ProfileDisplay } from "./ProfileDisplay";

const STUDY_GOALS = ["UPSC", "JEE", "NEET", "GATE", "CAT", "Other"];
const TARGET_EXAMS = ["UPSC", "SSC", "JEE", "NEET", "GATE", "Coding", "Other"];
const TARGET_YEARS = ["2025", "2026", "2027", "2028", "2029"];

function validateWhatsApp(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  const ten = digits.length === 10 ? digits : digits.length === 12 && digits.startsWith("91") ? digits.slice(2) : null;
  return !!ten && ten.length === 10 && /^[6-9]\d{9}$/.test(ten);
}

type Profile = {
  fullName: string | null;
  phone: string | null;
  whatsappNumber: string | null;
  studyGoal: string | null;
  targetExam: string | null;
  targetYear: string | null;
  institution: string | null;
  bio: string | null;
  profilePicUrl: string | null;
};

export function ToggleProfileForm() {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [studyGoal, setStudyGoal] = useState("");
  const [targetExam, setTargetExam] = useState("");
  const [targetYear, setTargetYear] = useState("");
  const [bio, setBio] = useState("");

  const [whatsappError, setWhatsappError] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);

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
          setProfile(data);
          setFullName(data.fullName ?? "");
          setPhone(data.phone ?? data.whatsappNumber ?? "");
          setStudyGoal(data.studyGoal ?? "");
          setTargetExam(data.targetExam ?? "");
          setTargetYear(data.targetYear ?? "");
          setBio(data.bio ?? "");
        }
      } catch {
        toast.error("Could not load profile");
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, []);

  function handleCancel() {
    if (profile) {
      setFullName(profile.fullName ?? "");
      setPhone(profile.phone ?? profile.whatsappNumber ?? "");
      setStudyGoal(profile.studyGoal ?? "");
      setTargetExam(profile.targetExam ?? "");
      setTargetYear(profile.targetYear ?? "");
      setBio(profile.bio ?? "");
    }
    setWhatsappError("");
    setIsEditing(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const wa = phone.trim();
    if (wa && !validateWhatsApp(wa)) {
      setWhatsappError("Enter a valid 10-digit number (e.g. 9876543210)");
      return;
    }
    setWhatsappError("");
    setSaving(true);
    const toastId = toast.loading("Saving…");
    try {
      const res = await fetch("/api/profile/update", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: fullName.trim() || null,
          phone: wa || null,
          whatsappNumber: wa || null,
          studyGoal: studyGoal.trim() || null,
          targetExam: targetExam.trim() || null,
          targetYear: targetYear.trim() || null,
          bio: bio.trim() || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to save");
      }
      const updated = await res.json();
      setProfile(updated);
      toast.success("Profile updated", { id: toastId });
      setIsEditing(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save profile", { id: toastId });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-black/30 p-6 shadow-xl">
        <div className="flex justify-center py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
        </div>
      </div>
    );
  }

  const displayName = profile?.fullName?.trim() || "—";
  const displayPhone = (profile?.phone || profile?.whatsappNumber)?.trim() || "—";
  const displayGoal = profile?.studyGoal?.trim() || "—";
  const displayTargetExam = profile?.targetExam?.trim() || "—";
  const displayTargetYear = profile?.targetYear?.trim() || "—";
  const displayBio = profile?.bio?.trim() || "—";
  const avatarUrl = profile?.profilePicUrl?.trim();

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
      <div
        className={`rounded-2xl border p-6 shadow-xl transition-colors md:p-8 ${
          isEditing
            ? "border-[var(--accent)]/50 bg-[var(--accent)]/5"
            : "border-white/10 bg-black/30"
        }`}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[var(--cream)] md:text-xl">
            Student Profile
          </h2>
          {!isEditing && (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm font-medium text-[var(--cream)] transition hover:bg-white/5"
            >
              <Pencil className="h-4 w-4" />
              Edit Profile
            </button>
          )}
        </div>

        {/* Avatar: always show, "Change Avatar" on hover */}
        <div className="mt-6 flex justify-center">
          <div className="group relative">
            <div className="flex h-24 w-24 overflow-hidden rounded-full border-2 border-white/10 bg-black/40">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-2xl font-bold text-[var(--cream-muted)]">
                  {(displayName !== "—" ? displayName : "?").charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
              <span className="flex items-center gap-1 rounded-lg bg-black/70 px-2 py-1 text-xs font-medium text-[var(--cream)]">
                <Camera className="h-3.5 w-3.5" />
                Change Avatar
              </span>
            </div>
          </div>
        </div>

        {isEditing ? (
          <form onSubmit={handleSave} className="mt-6 space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--cream-muted)]">Full Name</label>
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
              <label className="mb-1 block text-xs font-medium text-[var(--cream-muted)]">Phone</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--cream-muted)]" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    setWhatsappError("");
                  }}
                  placeholder="10-digit mobile number"
                  className={`w-full rounded-xl border bg-black/40 py-2.5 pl-10 pr-3 text-sm text-[var(--cream)] placeholder:text-[var(--cream-muted)]/60 focus:outline-none ${
                    whatsappError ? "border-red-400/70" : "border-white/10 focus:border-[var(--accent)]/70"
                  }`}
                />
              </div>
              {whatsappError && <p className="mt-1 text-xs text-red-400">{whatsappError}</p>}
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--cream-muted)]">Goal</label>
              <div className="relative">
                <Target className="absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-[var(--cream-muted)]" />
                <select
                  value={studyGoal}
                  onChange={(e) => setStudyGoal(e.target.value)}
                  className="w-full appearance-none rounded-xl border border-white/10 bg-black/40 py-2.5 pl-10 pr-8 text-sm text-[var(--cream)] focus:border-[var(--accent)]/70 focus:outline-none"
                >
                  <option value="">Select goal</option>
                  {STUDY_GOALS.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--cream-muted)]">Target Exam</label>
              <select
                value={targetExam}
                onChange={(e) => setTargetExam(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-[var(--cream)] focus:border-[var(--accent)]/70 focus:outline-none"
              >
                <option value="">Select target exam</option>
                {TARGET_EXAMS.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--cream-muted)]">Target Year</label>
              <select
                value={targetYear}
                onChange={(e) => setTargetYear(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-[var(--cream)] focus:border-[var(--accent)]/70 focus:outline-none"
              >
                <option value="">Select year</option>
                {TARGET_YEARS.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--cream-muted)]">Bio</label>
              <div className="relative">
                <FileText className="absolute left-3 top-3 h-4 w-4 text-[var(--cream-muted)]" />
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="A short bio"
                  rows={3}
                  className="w-full resize-none rounded-xl border border-white/10 bg-black/40 py-2.5 pl-10 pr-3 text-sm text-[var(--cream)] placeholder:text-[var(--cream-muted)]/60 focus:border-[var(--accent)]/70 focus:outline-none"
                />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 rounded-xl bg-[var(--accent)] py-2.5 text-sm font-semibold text-[var(--ink)] shadow-md transition hover:bg-[var(--accent-hover)] disabled:opacity-70"
              >
                {saving ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--ink)] border-t-transparent" />
                    Saving…
                  </span>
                ) : (
                  "Save Changes"
                )}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                disabled={saving}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-[var(--cream-muted)] transition hover:bg-white/10 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="mt-6 space-y-4">
            <ProfileDisplay label="Name" value={displayName === "—" ? null : displayName} />
            <ProfileDisplay label="Phone" value={displayPhone === "—" ? null : displayPhone} />
            <ProfileDisplay label="Goal" value={displayGoal === "—" ? null : displayGoal} />
            <ProfileDisplay label="Target Exam" value={displayTargetExam === "—" ? null : displayTargetExam} />
            <ProfileDisplay label="Target Year" value={displayTargetYear === "—" ? null : displayTargetYear} />
            <ProfileDisplay label="Bio" value={displayBio === "—" ? null : displayBio} />
          </div>
        )}
      </div>
    </>
  );
}
