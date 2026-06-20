export type ProfileForCompletion = {
  fullName?: string | null;
  phone?: string | null;
  whatsappNumber?: string | null;
  institution?: string | null;
  bio?: string | null;
  profilePicUrl?: string | null;
  studyGoal?: string | null;
};

function isFilled(value: string | null | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Phone counts if either phone or whatsappNumber is filled.
 */
function hasPhone(profile: ProfileForCompletion): boolean {
  return isFilled(profile.phone) || isFilled(profile.whatsappNumber);
}

export function calculateCompletion(profile: ProfileForCompletion | null): number {
  if (!profile) return 0;
  let filled = 0;
  const total = 6; // fullName, phone (or whatsapp), institution, bio, profilePicUrl, studyGoal
  if (isFilled(profile.fullName)) filled++;
  if (hasPhone(profile)) filled++;
  if (isFilled(profile.institution)) filled++;
  if (isFilled(profile.bio)) filled++;
  if (isFilled(profile.profilePicUrl)) filled++;
  if (isFilled(profile.studyGoal)) filled++;
  return Math.round((filled / total) * 100);
}
