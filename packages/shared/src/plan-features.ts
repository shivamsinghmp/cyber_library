/**
 * Plan-based feature gating system.
 * Stores feature map in AppSetting (key: PLAN_FEATURE_MAP) as JSON.
 * Falls back to DEFAULT_PLAN_FEATURES if DB has nothing.
 */

const PLAN_MAP_KEY     = "PLAN_FEATURE_MAP";
const PLAN_FLAG_KEY    = "PLAN_FEATURES_ENABLED";   // master on/off toggle
const PLAN_CACHE_TTL_MS  = 5 * 60 * 1000;  // 5 min
const USER_PLAN_TTL_MS   = 30 * 1000;       // 30 sec per-user plan cache

// In-process cache for the flag
let _flagCache: { value: boolean; expiresAt: number } | null = null;

export async function isPlanGatingEnabled(): Promise<boolean> {
  if (_flagCache && Date.now() < _flagCache.expiresAt) return _flagCache.value;
  try {
    const { prisma } = await import("./prisma");
    const row = await prisma.appSetting.findUnique({ where: { key: PLAN_FLAG_KEY } });
    const value = row?.valueEncrypted === "true";
    _flagCache = { value, expiresAt: Date.now() + PLAN_CACHE_TTL_MS };
    return value;
  } catch {
    return false; // fail safe — off by default
  }
}

export async function setPlanGatingEnabled(enabled: boolean): Promise<void> {
  const { prisma } = await import("./prisma");
  await prisma.appSetting.upsert({
    where:  { key: PLAN_FLAG_KEY },
    create: { key: PLAN_FLAG_KEY, valueEncrypted: String(enabled), iv: null },
    update: { valueEncrypted: String(enabled) },
  });
  _flagCache = null;
}

// ── Feature dependency map ────────────────────────────────────────────────────
// key = feature that HAS a dependency, value = features it REQUIRES
export const FEATURE_DEPS: Record<string, string[]> = {
  studymate:   ["wallet"],    // AI chatbot deducts coins
  rewards:     ["wallet"],    // redeeming rewards spends coins
  refer:       ["wallet"],    // referral bonus credited as coins
  leaderboard: ["streaks"],   // leaderboard ranks by streak data
  "meet-addon":["wallet"],    // Meet add-on AI also deducts coins
};

// ── Known plan types ──────────────────────────────────────────────────────────
export const KNOWN_PLANS = ["TRIAL", "MONTHLY", "YEARLY"] as const;
export type PlanType = (typeof KNOWN_PLANS)[number] | string;

// ── Default feature map (used when DB has no config) ─────────────────────────
export const DEFAULT_PLAN_FEATURES: Record<string, string[]> = {
  TRIAL: [
    "tasks", "streaks", "profile", "settings", "feedback", "profile-form",
  ],
  MONTHLY: [
    "tasks", "streaks", "leaderboard", "study-room",
    "studymate", "wallet", "rewards", "refer",
    "transactions", "profile", "settings", "feedback", "profile-form",
  ],
  YEARLY: [
    "tasks", "streaks", "leaderboard", "quiz", "studymate",
    "study-room", "meet-addon", "wallet", "rewards", "products",
    "transactions", "refer", "profile-form", "feedback", "profile", "settings",
  ],
};

// ── In-process caches ─────────────────────────────────────────────────────────
let _planMapCache: { value: Record<string, string[]>; expiresAt: number } | null = null;
const _userPlanCache = new Map<string, { planType: string | null; expiresAt: number }>();

// ── Plan feature map (DB + cache) ─────────────────────────────────────────────
export async function getPlanFeatureMap(): Promise<Record<string, string[]>> {
  if (_planMapCache && Date.now() < _planMapCache.expiresAt) return _planMapCache.value;
  try {
    const { prisma } = await import("./prisma");
    const row = await prisma.appSetting.findUnique({ where: { key: PLAN_MAP_KEY } });
    const parsed = row?.valueEncrypted ? JSON.parse(row.valueEncrypted) : null;
    const value = parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed
      : DEFAULT_PLAN_FEATURES;
    _planMapCache = { value, expiresAt: Date.now() + PLAN_CACHE_TTL_MS };
    return value;
  } catch {
    return DEFAULT_PLAN_FEATURES;
  }
}

export async function setPlanFeatureMap(map: Record<string, string[]>): Promise<void> {
  const { prisma } = await import("./prisma");
  await prisma.appSetting.upsert({
    where:  { key: PLAN_MAP_KEY },
    create: { key: PLAN_MAP_KEY, valueEncrypted: JSON.stringify(map), iv: null },
    update: { valueEncrypted: JSON.stringify(map) },
  });
  _planMapCache = null;
}

// ── Per-user plan type (DB + short cache) ─────────────────────────────────────
export async function getUserPlanType(userId: string): Promise<string | null> {
  const cached = _userPlanCache.get(userId);
  if (cached && Date.now() < cached.expiresAt) return cached.planType;
  try {
    const { prisma } = await import("./prisma");
    const sub = await prisma.userSubscription.findFirst({
      where: { userId, status: "ACTIVE", endDate: { gt: new Date() } },
      orderBy: { endDate: "desc" },
      select: { planType: true },
    });
    const planType = sub?.planType ?? null;
    _userPlanCache.set(userId, { planType, expiresAt: Date.now() + USER_PLAN_TTL_MS });
    return planType;
  } catch {
    return null;
  }
}

/** Invalidate user plan cache (call on plan purchase / expiry). */
export function invalidateUserPlanCache(userId: string) {
  _userPlanCache.delete(userId);
}

// ── Core check ────────────────────────────────────────────────────────────────
/**
 * Returns true if the module is allowed for the user's current plan.
 * Fails open — if plan system errors, access is granted (avoids 500s).
 */
export async function isPlanFeatureEnabled(userId: string, moduleId: string): Promise<boolean> {
  try {
    // If master toggle is OFF, skip plan gating entirely
    const gatingOn = await isPlanGatingEnabled();
    if (!gatingOn) return true;

    const [planType, planMap] = await Promise.all([
      getUserPlanType(userId),
      getPlanFeatureMap(),
    ]);
    if (!planType) return false;
    const allowed = planMap[planType] ?? [];
    return allowed.includes(moduleId);
  } catch {
    return true; // fail open
  }
}

// ── Dependency helpers (used by admin UI) ─────────────────────────────────────
/** Given a set of features, return them + all their required dependencies. */
export function resolveWithDeps(features: string[]): string[] {
  const result = new Set(features);
  for (const f of features) {
    (FEATURE_DEPS[f] ?? []).forEach(d => result.add(d));
  }
  return [...result];
}

/** Returns features that would break if `featureId` is disabled. */
export function getDependents(featureId: string): string[] {
  return Object.entries(FEATURE_DEPS)
    .filter(([, deps]) => deps.includes(featureId))
    .map(([feat]) => feat);
}
