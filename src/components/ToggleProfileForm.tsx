"use client";

import { useState, useEffect } from "react";
import {
  User, Phone, Target, FileText, Pencil, Camera, Mail,
  Calendar, BookOpen, Check, AlertOctagon, ShieldCheck,
  ShieldAlert, Loader2, KeyRound, X, Save,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";

const STUDY_GOALS   = ["UPSC", "JEE", "NEET", "GATE", "CAT", "Other"];
const TARGET_EXAMS  = ["UPSC", "SSC", "JEE", "NEET", "GATE", "Coding", "Other"];
const TARGET_YEARS  = ["2025", "2026", "2027", "2028", "2029"];
const AVATAR_SEEDS  = ["Felix", "Aneka", "Jasper", "Luna", "Nala", "Zeus", "Oliver", "Maya", "Leo"];

function validateWhatsApp(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  const ten = digits.length === 10 ? digits
    : digits.length === 12 && digits.startsWith("91") ? digits.slice(2)
    : null;
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
  email: string | null;
  emailVerified: boolean;
};

/* ─── small reusable pieces ────────────────────────────── */

function InfoCard({
  icon,
  label,
  value,
  accent = "indigo",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent?: "indigo" | "emerald" | "amber" | "sky";
}) {
  const bg: Record<string, string> = {
    indigo:  "bg-indigo-500/10 border-indigo-500/20 text-indigo-400",
    emerald: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
    amber:   "bg-amber-500/10  border-amber-500/20  text-amber-400",
    sky:     "bg-sky-500/10    border-sky-500/20    text-sky-400",
  };
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-white/5 bg-white/[0.03] p-4 transition hover:bg-white/[0.06]">
      <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${bg[accent]}`}>
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-widest text-white/30">{label}</p>
        <p className="mt-0.5 truncate text-sm font-semibold text-white/85">{value}</p>
      </div>
    </div>
  );
}

function FieldWrap({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[10px] font-bold uppercase tracking-widest text-white/40">{label}</label>
      {children}
      {error && (
        <p className="flex items-center gap-1 text-xs text-red-400">
          <AlertOctagon className="h-3 w-3" /> {error}
        </p>
      )}
    </div>
  );
}

/* ─── main component ────────────────────────────────────── */

export function ToggleProfileForm() {
  const router = useRouter();
  const [isEditing,    setIsEditing]    = useState(false);
  const [loading,      setLoading]      = useState(true);
  const [saving,       setSaving]       = useState(false);

  const [fullName,    setFullName]    = useState("");
  const [phone,       setPhone]       = useState("");
  const [studyGoal,   setStudyGoal]   = useState("");
  const [targetExam,  setTargetExam]  = useState("");
  const [targetYear,  setTargetYear]  = useState("");
  const [bio,         setBio]         = useState("");
  const [newAvatarUrl, setNewAvatarUrl] = useState<string | null>(null);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [whatsappError, setWhatsappError] = useState("");
  const [profile,  setProfile]  = useState<Profile | null>(null);

  const [otpStep,     setOtpStep]     = useState<"idle"|"sending"|"input"|"verifying"|"done">("idle");
  const [otpCode,     setOtpCode]     = useState("");
  const [otpError,    setOtpError]    = useState<string | null>(null);
  const [otpCooldown, setOtpCooldown] = useState(0);

  /* fetch */
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/user/profile", { cache: "no-store" });
        if (!res.ok) { if (res.status !== 401) throw new Error(); return; }
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
      } catch { toast.error("Could not load profile"); }
      finally   { setLoading(false); }
    })();
  }, []);

  useEffect(() => {
    if (otpCooldown <= 0) return;
    const t = setTimeout(() => setOtpCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [otpCooldown]);

  function handleCancel() {
    if (profile) {
      setFullName(profile.fullName ?? "");
      setPhone(profile.phone ?? profile.whatsappNumber ?? "");
      setStudyGoal(profile.studyGoal ?? "");
      setTargetExam(profile.targetExam ?? "");
      setTargetYear(profile.targetYear ?? "");
      setBio(profile.bio ?? "");
      setNewAvatarUrl(null);
    }
    setWhatsappError("");
    setIsEditing(false);
    setShowAvatarPicker(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const wa = phone.trim();
    if (wa && !validateWhatsApp(wa)) {
      setWhatsappError("Valid 10-digit number daalo (e.g. 9876543210)");
      return;
    }
    setWhatsappError("");
    setSaving(true);
    const tid = toast.loading("Saving…");
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
          ...(newAvatarUrl && { profilePicUrl: newAvatarUrl }),
        }),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error ?? "Failed"); }
      const updated = await res.json();
      setProfile(updated);
      toast.success("Profile updated!", { id: tid });
      window.dispatchEvent(new Event("profileUpdated"));
      setIsEditing(false);
      setShowAvatarPicker(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed", { id: tid });
    } finally { setSaving(false); }
  }

  async function handleSendOtp() {
    setOtpStep("sending"); setOtpError(null);
    try {
      const res  = await fetch("/api/auth/verify-email/send-otp", { method: "POST", credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setOtpError(data.error ?? "OTP nahi bheja."); setOtpStep("idle"); return; }
      if (data.alreadyVerified) {
        setOtpStep("done");
        setProfile(p => p ? { ...p, emailVerified: true } : p);
        router.refresh();
        return;
      }
      setOtpStep("input"); setOtpCooldown(60);
    } catch { setOtpError("Network error."); setOtpStep("idle"); }
  }

  async function handleConfirmOtp() {
    if (otpCode.length !== 6) { setOtpError("6 digit OTP daalo."); return; }
    setOtpStep("verifying"); setOtpError(null);
    try {
      const res  = await fetch("/api/auth/verify-email/confirm-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ code: otpCode }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setOtpError(data.error ?? "OTP galat hai."); setOtpStep("input"); return; }
      setOtpStep("done");
      setProfile(p => p ? { ...p, emailVerified: true } : p);
      toast.success("Email verify ho gaya! ✅");
      router.refresh();
    } catch { setOtpError("Network error."); setOtpStep("input"); }
  }

  /* ── derived display values ── */
  const displayName      = profile?.fullName?.trim()       || "Student";
  const displayPhone     = (profile?.phone || profile?.whatsappNumber)?.trim() || "Not set";
  const displayGoal      = profile?.studyGoal?.trim()      || "Set your goal";
  const displayTargetExam = profile?.targetExam?.trim()    || "—";
  const displayTargetYear = profile?.targetYear?.trim()    || "—";
  const displayBio       = profile?.bio?.trim()            || "No bio yet.";
  const avatarUrl        = newAvatarUrl || profile?.profilePicUrl?.trim();
  const isVerified       = profile?.emailVerified || otpStep === "done";

  const inputCls = "w-full rounded-2xl border border-white/10 bg-white/5 py-3 pl-11 pr-4 text-sm text-white placeholder-white/25 outline-none transition focus:border-indigo-500/60 focus:bg-white/8 focus:ring-1 focus:ring-indigo-500/30";
  const selectCls = "w-full appearance-none rounded-2xl border border-white/10 bg-white/5 py-3 pl-11 pr-4 text-sm text-white outline-none transition focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30";

  /* ── loading skeleton ── */
  if (loading) return (
    <div className="space-y-4">
      {[120, 80, 80].map((h, i) => (
        <div key={i} className={`h-${h} animate-pulse rounded-3xl bg-white/5`} style={{ height: h }} />
      ))}
    </div>
  );

  return (
    <>
      <Toaster position="top-center" toastOptions={{
        style: { background: "rgba(15,11,7,0.95)", color: "#fff", border: "1px solid rgba(255,255,255,0.1)" },
      }} />

      {/* ══════════════════════════════════════════════
          HERO CARD
      ══════════════════════════════════════════════ */}
      <div className="relative overflow-hidden rounded-3xl border border-white/8 shadow-2xl">

        {/* gradient banner */}
        <div className="h-32 w-full bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700">
          <div className="absolute inset-0 h-32 opacity-30"
            style={{ backgroundImage: "radial-gradient(circle at 20% 50%, #818cf8 0%, transparent 60%), radial-gradient(circle at 80% 20%, #c084fc 0%, transparent 55%)" }} />
          <div className="absolute inset-0 h-32"
            style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Ccircle fill='rgba(255,255,255,0.04)' cx='20' cy='20' r='1'/%3E%3C/g%3E%3C/svg%3E\")" }} />
        </div>

        {/* card body */}
        <div className="relative bg-[#0d0d14] px-6 pb-6">

          {/* avatar + edit button row */}
          <div className="flex items-end justify-between">
            <div className="relative -mt-12">
              <motion.div
                whileHover={isEditing ? { scale: 1.04 } : {}}
                onClick={() => isEditing && setShowAvatarPicker(v => !v)}
                className={`group relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-4 border-[#0d0d14] bg-gradient-to-br from-indigo-500 to-violet-600 shadow-xl ${isEditing ? "cursor-pointer" : ""}`}
              >
                {avatarUrl
                  ? <img src={avatarUrl} alt="avatar" className="h-full w-full object-cover" />
                  : <span className="text-3xl font-black text-white">{displayName.charAt(0).toUpperCase()}</span>
                }
                {isEditing && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 backdrop-blur-sm transition group-hover:opacity-100">
                    <Camera className="h-5 w-5 text-white" />
                  </div>
                )}
              </motion.div>

              {/* avatar picker */}
              <AnimatePresence>
                {isEditing && showAvatarPicker && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    className="absolute top-28 left-0 z-30 mt-1"
                  >
                    <div className="flex w-64 snap-x snap-mandatory overflow-x-auto rounded-2xl border border-white/10 bg-black/80 p-2 shadow-2xl backdrop-blur-xl no-scrollbar gap-2">
                      {AVATAR_SEEDS.map(seed => {
                        const url = `https://api.dicebear.com/9.x/notionists/svg?seed=${seed}`;
                        return (
                          <button key={seed} type="button"
                            onClick={() => { setNewAvatarUrl(url); setShowAvatarPicker(false); }}
                            className={`shrink-0 snap-center h-14 w-14 overflow-hidden rounded-full border transition-all
                              ${newAvatarUrl === url ? "border-indigo-500 ring-2 ring-indigo-500/50 scale-110" : "border-white/10 opacity-50 hover:opacity-100 hover:scale-105"}`}
                          >
                            <img src={url} alt={seed} className="h-full w-full object-cover" />
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* edit / cancel */}
            <div className="flex gap-2 pb-1">
              {isEditing ? (
                <button type="button" onClick={handleCancel}
                  className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white/60 transition hover:bg-white/10 hover:text-white">
                  <X className="h-3.5 w-3.5" /> Cancel
                </button>
              ) : (
                <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-2 rounded-xl bg-indigo-500/15 border border-indigo-500/30 px-5 py-2 text-sm font-semibold text-indigo-300 transition hover:bg-indigo-500/25 hover:text-indigo-200">
                  <Pencil className="h-4 w-4" /> Edit Profile
                </motion.button>
              )}
            </div>
          </div>

          {/* name + goal */}
          <div className="mt-3">
            <h1 className="text-2xl font-black tracking-tight text-white">{displayName}</h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/15 border border-indigo-500/25 px-3 py-1 text-xs font-bold text-indigo-300">
                <Target className="h-3 w-3" /> {displayGoal}
              </span>
              {isVerified
                ? <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/25 px-3 py-1 text-xs font-bold text-emerald-300"><ShieldCheck className="h-3 w-3" /> Verified</span>
                : <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 border border-amber-500/25 px-3 py-1 text-xs font-bold text-amber-300"><ShieldAlert className="h-3 w-3" /> Unverified</span>
              }
            </div>
          </div>

        </div>
      </div>

      {/* ══════════════════════════════════════════════
          VIEW / EDIT BODY
      ══════════════════════════════════════════════ */}
      <AnimatePresence mode="wait">
        {isEditing ? (

          /* ── EDIT FORM ── */
          <motion.form key="edit"
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.22 }}
            onSubmit={handleSave}
            className="rounded-3xl border border-white/8 bg-[#0d0d14] p-6 shadow-xl space-y-5"
          >
            <p className="text-xs font-bold uppercase tracking-widest text-white/30">Edit Profile Info</p>

            <div className="grid gap-5 sm:grid-cols-2">

              <FieldWrap label="Full Name">
                <div className="relative">
                  <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/25" />
                  <input value={fullName} onChange={e => setFullName(e.target.value)}
                    type="text" placeholder="Aman Singh" className={inputCls} />
                </div>
              </FieldWrap>

              <FieldWrap label="WhatsApp / Phone" error={whatsappError}>
                <div className="relative">
                  <Phone className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/25" />
                  <input value={phone} onChange={e => { setPhone(e.target.value); setWhatsappError(""); }}
                    type="tel" placeholder="9876543210" className={inputCls} />
                </div>
              </FieldWrap>

              <FieldWrap label="Study Goal">
                <div className="relative">
                  <Target className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/25" />
                  <select value={studyGoal} onChange={e => setStudyGoal(e.target.value)} className={selectCls}>
                    <option value="" className="bg-[#0d0d14] text-white/40">Choose goal…</option>
                    {STUDY_GOALS.map(g => <option key={g} value={g} className="bg-[#0d0d14]">{g}</option>)}
                  </select>
                </div>
              </FieldWrap>

              <div className="grid grid-cols-2 gap-3">
                <FieldWrap label="Target Exam">
                  <div className="relative">
                    <BookOpen className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/25" />
                    <select value={targetExam} onChange={e => setTargetExam(e.target.value)} className={selectCls}>
                      <option value="" className="bg-[#0d0d14] text-white/40">Exam</option>
                      {TARGET_EXAMS.map(x => <option key={x} value={x} className="bg-[#0d0d14]">{x}</option>)}
                    </select>
                  </div>
                </FieldWrap>

                <FieldWrap label="Target Year">
                  <div className="relative">
                    <Calendar className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/25" />
                    <select value={targetYear} onChange={e => setTargetYear(e.target.value)} className={selectCls}>
                      <option value="" className="bg-[#0d0d14] text-white/40">Year</option>
                      {TARGET_YEARS.map(y => <option key={y} value={y} className="bg-[#0d0d14]">{y}</option>)}
                    </select>
                  </div>
                </FieldWrap>
              </div>
            </div>

            <FieldWrap label="Bio / About Me">
              <div className="relative">
                <FileText className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-white/25" />
                <textarea value={bio} onChange={e => setBio(e.target.value)}
                  placeholder="Share your background or study focus…" rows={3}
                  className="w-full resize-none rounded-2xl border border-white/10 bg-white/5 py-3 pl-11 pr-4 text-sm text-white placeholder-white/25 outline-none transition focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30 leading-relaxed" />
              </div>
            </FieldWrap>

            <div className="flex justify-end gap-3 pt-1">
              <button type="button" onClick={handleCancel} disabled={saving}
                className="rounded-xl border border-white/10 px-6 py-2.5 text-sm font-semibold text-white/50 transition hover:bg-white/5 hover:text-white disabled:opacity-40">
                Cancel
              </button>
              <button type="submit" disabled={saving}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-7 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/20 transition hover:from-indigo-400 hover:to-violet-400 hover:scale-[1.02] disabled:opacity-60 disabled:hover:scale-100">
                {saving
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>
                  : <><Save className="h-4 w-4" /> Save Changes</>
                }
              </button>
            </div>
          </motion.form>

        ) : (

          /* ── VIEW MODE INFO GRID ── */
          <motion.div key="view"
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.22 }}
            className="space-y-3"
          >
            <div className="grid gap-3 sm:grid-cols-3">
              <InfoCard icon={<Phone className="h-4 w-4" />}  label="Contact"      value={displayPhone}      accent="emerald" />
              <InfoCard icon={<BookOpen className="h-4 w-4" />} label="Target Exam" value={displayTargetExam}  accent="sky" />
              <InfoCard icon={<Calendar className="h-4 w-4" />} label="Target Year" value={displayTargetYear}  accent="amber" />
            </div>

            {/* bio */}
            <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-5">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-white/30">About Me</p>
              <p className="text-sm leading-relaxed text-white/70">{displayBio}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════════════
          EMAIL VERIFICATION CARD
      ══════════════════════════════════════════════ */}
      {profile !== null && (
        <div className={`rounded-3xl border overflow-hidden shadow-xl transition-all
          ${isVerified
            ? "border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-[#0d0d14]"
            : "border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-[#0d0d14]"
          }`}
        >
          {/* header */}
          <div className="flex items-center gap-3 px-6 py-4 border-b border-white/5">
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border
              ${isVerified ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-amber-500/10 border-amber-500/20 text-amber-400"}`}>
              {isVerified ? <ShieldCheck className="h-5 w-5" /> : <ShieldAlert className="h-5 w-5" />}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white">Email Verification</p>
              <p className="truncate text-xs text-white/40">{profile.email ?? "—"}</p>
            </div>
            {isVerified && (
              <span className="shrink-0 rounded-full bg-emerald-500/15 border border-emerald-500/25 px-3 py-1 text-xs font-bold text-emerald-400">
                ✓ Verified
              </span>
            )}
          </div>

          {/* body — only when not verified */}
          {!isVerified && (
            <div className="px-6 py-5 space-y-4">

              {otpStep === "idle" && (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-white/50">
                    Email abhi verify nahi hua. OTP aapki email pe jayega.
                  </p>
                  <button onClick={handleSendOtp}
                    className="shrink-0 flex items-center gap-2 rounded-xl bg-amber-500/15 border border-amber-500/25 px-5 py-2.5 text-sm font-semibold text-amber-300 transition hover:bg-amber-500/25 hover:text-amber-200">
                    <Mail className="h-4 w-4" /> OTP Bhejo
                  </button>
                </div>
              )}

              {otpStep === "sending" && (
                <div className="flex items-center gap-2.5 text-sm text-white/50">
                  <Loader2 className="h-4 w-4 animate-spin text-amber-400" />
                  OTP bheja ja raha hai…
                </div>
              )}

              {(otpStep === "input" || otpStep === "verifying") && (
                <div className="space-y-3">
                  <p className="text-sm text-white/50">
                    <span className="font-semibold text-white/70">{profile.email}</span> pe 6-digit OTP bheja gaya hai.
                  </p>
                  <div className="flex gap-3">
                    <div className="relative max-w-[180px]">
                      <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/25" />
                      <input
                        type="text" inputMode="numeric" maxLength={6}
                        value={otpCode}
                        onChange={e => { setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6)); setOtpError(null); }}
                        placeholder="000000"
                        className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-3 text-sm font-mono tracking-[0.35em] text-white outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30"
                      />
                    </div>
                    <button onClick={handleConfirmOtp}
                      disabled={otpStep === "verifying" || otpCode.length !== 6}
                      className="flex items-center gap-1.5 rounded-xl bg-indigo-500 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-400 disabled:opacity-50">
                      {otpStep === "verifying"
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : <Check className="h-4 w-4" />
                      }
                      Verify
                    </button>
                  </div>
                  {otpError && <p className="text-xs text-red-400">{otpError}</p>}
                  <button onClick={handleSendOtp}
                    disabled={otpCooldown > 0 || otpStep === "verifying"}
                    className="text-xs text-white/30 underline underline-offset-2 hover:text-white/60 disabled:no-underline disabled:opacity-30">
                    {otpCooldown > 0 ? `Resend in ${otpCooldown}s` : "OTP dobara bhejo"}
                  </button>
                </div>
              )}

              {otpError && otpStep === "idle" && (
                <p className="text-xs text-red-400">{otpError}</p>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
}
