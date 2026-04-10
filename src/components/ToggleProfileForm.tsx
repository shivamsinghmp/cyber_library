"use client";

import { useState, useEffect } from "react";
import { User, Phone, Target, FileText, Pencil, Camera, Mail, Calendar, BookOpen, Award, Check, AlertOctagon } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { ProfileDisplay } from "./ProfileDisplay";
import { motion, AnimatePresence } from "framer-motion";

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
  const [newAvatarUrl, setNewAvatarUrl] = useState<string | null>(null);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);

  const [whatsappError, setWhatsappError] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await fetch("/api/user/profile", { cache: "no-store" });
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
      setNewAvatarUrl(null);
    }
    setWhatsappError("");
    setIsEditing(false);
    setShowAvatarPicker(false);
  }

  const AVATAR_SEEDS = ["Felix", "Aneka", "Jasper", "Luna", "Nala", "Zeus", "Oliver", "Maya", "Leo"];

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
          ...(newAvatarUrl && { profilePicUrl: newAvatarUrl }),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to save");
      }
      const updated = await res.json();
      setProfile(updated);
      toast.success("Profile updated", { id: toastId });
      window.dispatchEvent(new Event("profileUpdated"));
      setIsEditing(false);
      setShowAvatarPicker(false);
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

  const displayName = profile?.fullName?.trim() || "Student";
  const displayPhone = (profile?.phone || profile?.whatsappNumber)?.trim() || "Not provided";
  const displayGoal = profile?.studyGoal?.trim() || "Set your goal";
  const displayTargetExam = profile?.targetExam?.trim() || "Set exam";
  const displayTargetYear = profile?.targetYear?.trim() || "Set year";
  const displayBio = profile?.bio?.trim() || "Write a little bit about your journey...";
  const avatarUrl = newAvatarUrl || profile?.profilePicUrl?.trim();

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.4, staggerChildren: 0.1 } },
    exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 },
  };

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
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-black/40 shadow-2xl backdrop-blur-xl">
        {/* Dynamic Glowing Background Header */}
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-r from-[var(--accent)]/20 via-emerald-500/10 to-transparent blur-2xl" />
        <div className="absolute inset-x-0 top-0 h-32 border-b border-white/5 bg-gradient-to-br from-white/5 to-transparent backdrop-blur-md" />

        <div className="relative p-6 px-6 pt-12 md:px-10 md:pt-16 md:pb-10">
          
          {/* Header Row: Left (Avatar + Text) & Right (Edit Button) */}
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-end sm:justify-between">
            
            {/* Left Box */}
            <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-end">
              
              {/* Avatar Section */}
              <div className="relative">
                <motion.div 
                  whileHover={{ scale: 1.05 }}
                  onClick={() => isEditing && setShowAvatarPicker(!showAvatarPicker)}
                  className={`group relative flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-black bg-[var(--accent)] shadow-2xl ring-1 ring-white/10 ${isEditing ? "cursor-pointer" : ""}`}
                >
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-4xl font-extrabold text-[var(--ink)]">
                      {displayName.charAt(0).toUpperCase()}
                    </span>
                  )}

                  {/* Hover Overlay Camera */}
                  {isEditing && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/60 opacity-0 backdrop-blur-sm transition-all duration-300 group-hover:opacity-100">
                      <Camera className="h-6 w-6 text-white" />
                    </div>
                  )}
                </motion.div>

                {/* Avatar Picker Logic */}
                {isEditing && showAvatarPicker && (
                  <div className="absolute top-28 left-0 z-20 mt-2 flex sm:left-auto sm:top-14 sm:ml-32">
                    <div className="flex w-64 snap-x snap-mandatory overflow-x-auto rounded-2xl border border-white/10 bg-black/60 p-2 shadow-2xl backdrop-blur-xl no-scrollbar space-x-2">
                      {AVATAR_SEEDS.map((seed) => {
                        const generatedUrl = `https://api.dicebear.com/9.x/notionists/svg?seed=${seed}`;
                        const isSelected = newAvatarUrl === generatedUrl;
                        return (
                          <button
                            key={seed}
                            type="button"
                            onClick={() => {
                              setNewAvatarUrl(generatedUrl);
                              setShowAvatarPicker(false); // Auto-close after selection
                            }}
                            className={`shrink-0 snap-center transition-all ${isSelected ? "scale-110 opacity-100 ring-2 ring-[var(--accent)]" : "opacity-60 grayscale hover:scale-105 hover:opacity-100 hover:grayscale-0"} h-14 w-14 overflow-hidden rounded-full border border-white/10 bg-white/5 shadow-md`}
                          >
                            <img src={generatedUrl} alt={seed} className="h-full w-full object-cover" />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Header Text */}
              <div className="text-center sm:pb-2 sm:text-left">
                <h1 className="text-2xl font-bold tracking-tight text-[var(--cream)] md:text-3xl">
                  {displayName}
                </h1>
                <p className="mt-1 flex items-center justify-center gap-2 text-sm text-[var(--cream-muted)] sm:justify-start">
                  <Target className="h-4 w-4 text-[var(--accent)]" /> {displayGoal} Goal
                </p>
              </div>

            </div> {/* Close Left Box */}

            {/* Toggle Button */}
            {!isEditing && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsEditing(true)}
                className="group mt-4 flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-6 py-2.5 text-sm font-medium text-[var(--cream)] shadow-lg backdrop-blur-md transition-colors hover:bg-white/10 hover:text-white sm:mt-0"
              >
                <Pencil className="h-4 w-4 text-[var(--cream-muted)] transition-colors group-hover:text-white" />
                Edit Profile
              </motion.button>
            )}

          </div> {/* Close Header Row */}

          {/* Spacer */}
          <div className="mt-8 border-t border-white/5" />

          {/* Form or Display View */}
          <AnimatePresence mode="wait">
            {isEditing ? (
              <motion.form 
                key="edit-form"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                onSubmit={handleSave} 
                className="mt-8 space-y-6"
              >
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <motion.div variants={itemVariants} className="space-y-1">
                    <label className="ml-1 text-xs font-semibold tracking-wider text-[var(--cream-muted)] uppercase">Full Name</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-3 flex items-center text-[var(--cream-muted)] transition-colors group-focus-within:text-[var(--accent)]">
                        <User className="h-5 w-5" />
                      </div>
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="John Doe"
                        className="w-full rounded-2xl border border-white/10 bg-black/50 py-3.5 pl-11 pr-4 text-sm font-medium text-[var(--cream)] shadow-inner transition-all hover:bg-black/70 focus:border-[var(--accent)] focus:bg-black focus:outline-none focus:ring-1 focus:ring-[var(--accent)]/50"
                      />
                    </div>
                  </motion.div>

                  <motion.div variants={itemVariants} className="space-y-1">
                    <label className="ml-1 text-xs font-semibold tracking-wider text-[var(--cream-muted)] uppercase">WhatsApp / Phone</label>
                    <div className="relative group">
                      <div className={`absolute inset-y-0 left-3 flex items-center transition-colors ${whatsappError ? "text-red-400" : "text-[var(--cream-muted)] group-focus-within:text-[var(--accent)]"}`}>
                        <Phone className="h-5 w-5" />
                      </div>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => { setPhone(e.target.value); setWhatsappError(""); }}
                        placeholder="10-digit mobile number"
                        className={`w-full rounded-2xl border bg-black/50 py-3.5 pl-11 pr-4 text-sm font-medium text-[var(--cream)] shadow-inner transition-all hover:bg-black/70 focus:bg-black focus:outline-none focus:ring-1 ${
                          whatsappError ? "border-red-500/50 focus:border-red-500 focus:ring-red-500/50" : "border-white/10 focus:border-[var(--accent)] focus:ring-[var(--accent)]/50"
                        }`}
                      />
                    </div>
                    {whatsappError && <p className="ml-1 mt-1 text-xs text-red-400 flex items-center gap-1"><AlertOctagon className="h-3 w-3"/>{whatsappError}</p>}
                  </motion.div>

                  <motion.div variants={itemVariants} className="space-y-1">
                    <label className="ml-1 text-xs font-semibold tracking-wider text-[var(--cream-muted)] uppercase">Study Goal</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-3 flex items-center text-[var(--cream-muted)] transition-colors group-focus-within:text-[var(--accent)]">
                        <Target className="h-5 w-5" />
                      </div>
                      <select
                        value={studyGoal}
                        onChange={(e) => setStudyGoal(e.target.value)}
                        className="w-full appearance-none rounded-2xl border border-white/10 bg-black/50 py-3.5 pl-11 pr-10 text-sm font-medium text-[var(--cream)] shadow-inner transition-all hover:bg-black/70 focus:border-[var(--accent)] focus:bg-black focus:outline-none focus:ring-1 focus:ring-[var(--accent)]/50"
                      >
                        <option value="" className="bg-black text-[var(--cream-muted)]">Select your primary goal</option>
                        {STUDY_GOALS.map((g) => <option key={g} value={g} className="bg-black">{g}</option>)}
                      </select>
                    </div>
                  </motion.div>

                  <motion.div variants={itemVariants} className="space-y-1 flex gap-4">
                    <div className="w-1/2 space-y-1">
                      <label className="ml-1 text-xs font-semibold tracking-wider text-[var(--cream-muted)] uppercase">Target Exam</label>
                      <div className="relative group">
                         <div className="absolute inset-y-0 left-3 flex items-center text-[var(--cream-muted)] transition-colors group-focus-within:text-[var(--accent)]">
                            <BookOpen className="h-5 w-5" />
                         </div>
                        <select
                          value={targetExam}
                          onChange={(e) => setTargetExam(e.target.value)}
                          className="w-full appearance-none rounded-2xl border border-white/10 bg-black/50 py-3.5 pl-11 pr-8 text-sm font-medium text-[var(--cream)] shadow-inner transition-all hover:bg-black/70 focus:border-[var(--accent)] focus:bg-black focus:outline-none focus:ring-1 focus:ring-[var(--accent)]/50"
                        >
                          <option value="" className="bg-black text-[var(--cream-muted)]">Exam</option>
                          {TARGET_EXAMS.map((opt) => <option key={opt} value={opt} className="bg-black">{opt}</option>)}
                        </select>
                      </div>
                    </div>

                    <div className="w-1/2 space-y-1">
                      <label className="ml-1 text-xs font-semibold tracking-wider text-[var(--cream-muted)] uppercase">Year</label>
                      <div className="relative group">
                          <div className="absolute inset-y-0 left-3 flex items-center text-[var(--cream-muted)] transition-colors group-focus-within:text-[var(--accent)]">
                            <Calendar className="h-5 w-5" />
                          </div>
                        <select
                          value={targetYear}
                          onChange={(e) => setTargetYear(e.target.value)}
                          className="w-full appearance-none rounded-2xl border border-white/10 bg-black/50 py-3.5 pl-11 pr-8 text-sm font-medium text-[var(--cream)] shadow-inner transition-all hover:bg-black/70 focus:border-[var(--accent)] focus:bg-black focus:outline-none focus:ring-1 focus:ring-[var(--accent)]/50"
                        >
                          <option value="" className="bg-black text-[var(--cream-muted)]">Year</option>
                          {TARGET_YEARS.map((y) => <option key={y} value={y} className="bg-black">{y}</option>)}
                        </select>
                      </div>
                    </div>
                  </motion.div>
                </div>

                <motion.div variants={itemVariants} className="space-y-1">
                  <label className="ml-1 text-xs font-semibold tracking-wider text-[var(--cream-muted)] uppercase">Bio / About Me</label>
                  <div className="relative group">
                    <div className="absolute top-3.5 left-3 text-[var(--cream-muted)] transition-colors group-focus-within:text-[var(--accent)]">
                      <FileText className="h-5 w-5" />
                    </div>
                    <textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Share your background or study focus..."
                      rows={4}
                      className="w-full resize-none rounded-2xl border border-white/10 bg-black/50 py-3.5 pl-11 pr-4 text-sm font-medium text-[var(--cream)] shadow-inner transition-all hover:bg-black/70 focus:border-[var(--accent)] focus:bg-black focus:outline-none focus:ring-1 focus:ring-[var(--accent)]/50 leading-relaxed"
                    />
                  </div>
                </motion.div>

                <motion.div variants={itemVariants} className="flex flex-col-reverse gap-3 pt-4 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={handleCancel}
                    disabled={saving}
                    className="rounded-full px-8 py-3 text-sm font-semibold text-[var(--cream-muted)] transition-all hover:bg-white/5 hover:text-white disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="relative flex items-center justify-center gap-2 overflow-hidden rounded-full bg-gradient-to-r from-[var(--accent)] to-emerald-400 px-10 py-3 text-sm font-bold text-black shadow-lg shadow-[var(--accent)]/20 transition-all hover:scale-[1.02] hover:shadow-[var(--accent)]/30 disabled:opacity-70 disabled:hover:scale-100"
                  >
                    {saving ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/80 border-t-transparent" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4" /> Save Profile
                      </>
                    )}
                  </button>
                </motion.div>
              </motion.form>
            ) : (
              <motion.div 
                key="display-mode"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="mt-8"
              >
                {/* Dossier Grid Display */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div className="flex items-start gap-4">
                      <div className="flex shrink-0 h-10 w-10 items-center justify-center rounded-xl bg-white/5 border border-white/10 shadow-inner">
                        <Phone className="h-5 w-5 text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--cream-muted)]/70">Contact Number</p>
                        <p className="mt-1 text-[15px] font-medium text-[var(--cream)]">{displayPhone}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-4">
                      <div className="flex shrink-0 h-10 w-10 items-center justify-center rounded-xl bg-white/5 border border-white/10 shadow-inner">
                        <BookOpen className="h-5 w-5 text-[var(--accent)]" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--cream-muted)]/70">Current Exam Focus</p>
                        <p className="mt-1 text-[15px] font-medium text-[var(--cream)]">{displayTargetExam} <span className="text-[var(--cream-muted)]">({displayTargetYear})</span></p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="flex items-start gap-4">
                      <div className="flex shrink-0 h-10 w-10 items-center justify-center rounded-xl bg-white/5 border border-white/10 shadow-inner">
                        <FileText className="h-5 w-5 text-orange-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--cream-muted)]/70">About Me / Bio</p>
                        <p className="mt-1 text-[14px] leading-relaxed text-[var(--cream)]/90">{displayBio}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </div> {/* Close DOM element `div.relative.p-6...` */}
      </div> {/* Close DOM element `div.relative.overflow-hidden...` */}
    </>
  );
}
