import {
  CheckCircle, Flame, Trophy, HelpCircle, Sparkles, BookOpen, Video,
  Gift, Package, Receipt, UserPlus, ClipboardList, MessageSquare,
  UserCircle, Settings, Coins,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type StudentModuleSection = "Main" | "Study" | "Account";

export type StudentModule = {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  section: StudentModuleSection;
};

export const STUDENT_MODULES: StudentModule[] = [
  { id: "tasks",        label: "Tasks",        href: "/dashboard/tasks",        icon: CheckCircle,   section: "Main" },
  { id: "streaks",      label: "Streaks",       href: "/dashboard/streaks",      icon: Flame,         section: "Main" },
  { id: "leaderboard",  label: "Leaderboard",   href: "/dashboard/leaderboard",  icon: Trophy,        section: "Main" },
  { id: "quiz",         label: "Quiz",          href: "/dashboard/quiz",         icon: HelpCircle,    section: "Main" },
  { id: "studymate",    label: "StudyMate AI",  href: "/dashboard/studymate",    icon: Sparkles,      section: "Study" },
  { id: "study-room",   label: "Study Room",    href: "/dashboard/subscription", icon: BookOpen,      section: "Study" },
  { id: "meet-addon",   label: "Meet Add-on",   href: "/dashboard/meet-addon",   icon: Video,         section: "Study" },
  { id: "wallet",       label: "Coin Wallet",   href: "/dashboard/wallet",       icon: Coins,         section: "Account" },
  { id: "rewards",      label: "My Rewards",    href: "/dashboard/rewards",      icon: Gift,          section: "Account" },
  { id: "products",     label: "My Products",   href: "/dashboard/downloads",    icon: Package,       section: "Account" },
  { id: "transactions", label: "Transactions",  href: "/dashboard/transactions", icon: Receipt,       section: "Account" },
  { id: "refer",        label: "Refer & Earn",  href: "/dashboard/refer",        icon: UserPlus,      section: "Account" },
  { id: "profile-form", label: "Profile Form",  href: "/dashboard/student-form", icon: ClipboardList, section: "Account" },
  { id: "feedback",     label: "Feedback",      href: "/dashboard/feedback",     icon: MessageSquare, section: "Account" },
  { id: "profile",      label: "Profile",       href: "/dashboard/profile",      icon: UserCircle,    section: "Account" },
  { id: "settings",     label: "Settings",      href: "/dashboard/settings",     icon: Settings,      section: "Account" },
];

export const MODULE_BY_HREF = new Map(STUDENT_MODULES.map(m => [m.href, m]));
export const MODULE_BY_ID   = new Map(STUDENT_MODULES.map(m => [m.id,   m]));

const DB_KEY = "STUDENT_MODULES_DISABLED";

/** Returns list of disabled module IDs from DB (server-side only). */
export async function getDisabledModules(): Promise<string[]> {
  try {
    const { prisma } = await import("./prisma");
    const row = await prisma.appSetting.findUnique({ where: { key: DB_KEY } });
    if (!row?.valueEncrypted) return [];
    const parsed = JSON.parse(row.valueEncrypted);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Saves the list of disabled module IDs to DB. */
export async function setDisabledModules(ids: string[]): Promise<void> {
  const { prisma } = await import("./prisma");
  const value = JSON.stringify(ids.filter(id => MODULE_BY_ID.has(id)));
  await prisma.appSetting.upsert({
    where:  { key: DB_KEY },
    create: { key: DB_KEY, valueEncrypted: value, iv: null },
    update: { valueEncrypted: value },
  });
}

/**
 * Returns true if the student can access the module.
 * Checks both global disabled list and per-student overrides.
 */
export async function canAccessModule(userId: string, moduleId: string): Promise<boolean> {
  const { prisma } = await import("./prisma");
  const [globalDisabled, studentOverride] = await Promise.all([
    getDisabledModules(),
    prisma.studentModuleAccess.findUnique({
      where: { userId_moduleId: { userId, moduleId } },
    }),
  ]);
  if (globalDisabled.includes(moduleId)) return false;
  if (studentOverride?.disabled) return false;
  return true;
}

/** Returns all per-student disabled module IDs for a given user. */
export async function getStudentDisabledModules(userId: string): Promise<string[]> {
  const { prisma } = await import("./prisma");
  const rows = await prisma.studentModuleAccess.findMany({
    where: { userId, disabled: true },
    select: { moduleId: true },
  });
  return rows.map(r => r.moduleId);
}

/** Set per-student disabled modules (replaces all existing overrides for that user). */
export async function setStudentDisabledModules(userId: string, disabledIds: string[]): Promise<void> {
  const { prisma } = await import("./prisma");
  const validIds = disabledIds.filter(id => MODULE_BY_ID.has(id));

  await prisma.$transaction([
    prisma.studentModuleAccess.deleteMany({ where: { userId } }),
    ...(validIds.length > 0
      ? [prisma.studentModuleAccess.createMany({
          data: validIds.map(moduleId => ({ userId, moduleId, disabled: true })),
        })]
      : []),
  ]);
}

export function filterEnabledModules(
  modules: StudentModule[],
  disabledIds: string[],
): StudentModule[] {
  const disabled = new Set(disabledIds);
  return modules.filter(m => !disabled.has(m.id));
}
