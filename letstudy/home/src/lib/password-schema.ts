import { z } from "zod";

/**
 * Shared password strength schema — used by signup API, reset API, and frontend forms.
 * Imported on both server and client (no Node-only APIs used).
 *
 * Rules:
 *  • 8–72 chars  (72 = bcrypt input limit — anything longer is silently truncated by bcrypt)
 *  • At least 1 uppercase letter
 *  • At least 1 digit
 *  • At least 1 special character
 */
export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(72, "Password is too long (max 72 characters)")
  .refine((p) => /[A-Z]/.test(p), {
    message: "Must contain at least 1 uppercase letter (e.g. A–Z)",
  })
  .refine((p) => /[0-9]/.test(p), {
    message: "Must contain at least 1 number (0–9)",
  })
  .refine((p) => /[^A-Za-z0-9]/.test(p), {
    message: "Must contain at least 1 special character (e.g. !@#$%&*)",
  });

/**
 * Visual strength score 0–4 for a password strength indicator.
 * 0 = very weak, 4 = strong.
 */
export function passwordStrength(password: string): {
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
  color: string;
} {
  if (!password) return { score: 0, label: "", color: "" };

  let score = 0;
  if (password.length >= 8)              score++;
  if (password.length >= 12)             score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password))            score++;
  if (/[^A-Za-z0-9]/.test(password))    score++;

  // Cap at 4
  const capped = Math.min(score, 4) as 0 | 1 | 2 | 3 | 4;

  const labels: Record<0 | 1 | 2 | 3 | 4, string> = {
    0: "",
    1: "Very Weak",
    2: "Weak",
    3: "Fair",
    4: "Strong",
  };
  const colors: Record<0 | 1 | 2 | 3 | 4, string> = {
    0: "",
    1: "#ef4444",
    2: "#f97316",
    3: "#eab308",
    4: "#22c55e",
  };

  return { score: capped, label: labels[capped], color: colors[capped] };
}
