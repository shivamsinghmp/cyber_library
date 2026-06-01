/**
 * Fire-and-forget trial event logger.
 * Never throws, never blocks the request.
 */
import { prisma } from "@/lib/prisma";

export type TrialEvent =
  | "enrolled"
  | "expired"
  | "converted"
  | "retrial_blocked"
  | "dashboard_locked"
  | "admin_reset";

export function logTrialEvent(params: {
  userId:     string;
  event:      TrialEvent;
  detail?:    string;
  ipAddress?: string;
  userAgent?: string;
  planBought?: string;
  daysUsed?:  number;
}): void {
  prisma.trialLog.create({
    data: {
      userId:    params.userId,
      event:     params.event,
      detail:    params.detail    ?? null,
      ipAddress: params.ipAddress ?? null,
      userAgent: params.userAgent ?? null,
      planBought: params.planBought ?? null,
      daysUsed:  params.daysUsed  ?? null,
    },
  }).catch(() => {});
}

/** Read trial days from AppSetting, defaulting to 7 */
export async function getTrialDays(): Promise<number> {
  try {
    const { getAppSetting } = await import("@/lib/app-settings");
    const raw = await getAppSetting("TRIAL_DAYS");
    const n = raw ? parseInt(raw, 10) : NaN;
    return Number.isFinite(n) && n > 0 ? n : 7;
  } catch { return 7; }
}
