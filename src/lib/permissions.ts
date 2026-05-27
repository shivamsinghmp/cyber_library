import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { fetchWithCache, invalidateCache } from "@/lib/redis";
import { AdminModuleIds } from "./permissions-client";

export * from "./permissions-client";

const PERM_TTL = 5 * 60; // 5 minutes — short enough to revoke access promptly

/** Redis-cached superadmin check. Avoids a DB hit on every admin page/API request. */
async function isDbSuperAdmin(userId: string): Promise<boolean> {
  const result = await fetchWithCache<boolean>(
    `perm:sa:${userId}`,
    async () => {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { isSuperAdmin: true },
      });
      return user?.isSuperAdmin === true;
    },
    PERM_TTL
  );
  return result;
}

/** Redis-cached employee permissions. */
async function getEmployeePerms(userId: string): Promise<string[] | null> {
  return fetchWithCache<string[] | null>(
    `perm:emp:${userId}`,
    async () => {
      const perm = await prisma.employeePermission.findUnique({ where: { userId } });
      return perm?.modules ?? null;
    },
    PERM_TTL
  );
}

/** Call this whenever superadmin status or employee permissions are changed. */
export async function invalidatePermissionCache(userId: string) {
  await Promise.all([
    invalidateCache(`perm:sa:${userId}`),
    invalidateCache(`perm:emp:${userId}`),
  ]);
}

export async function requireAdminModule(requiredModule: AdminModuleIds) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const userId = (session.user as { id?: string }).id;
  if (!userId) redirect("/login");

  const role = (session.user as { role?: string }).role;

  if (await isDbSuperAdmin(userId)) return;
  if (role === "ADMIN") return;
  if (role !== "EMPLOYEE") redirect("/dashboard");

  const modules = await getEmployeePerms(userId);
  if (!modules || !modules.includes(requiredModule)) redirect("/admin/unauthorized");
}

export async function checkAdminModuleApi(requiredModule: AdminModuleIds): Promise<boolean> {
  const session = await auth();
  if (!session?.user?.id) return false;

  const userId = (session.user as { id?: string }).id!;
  const role = (session.user as { role?: string }).role;

  if (await isDbSuperAdmin(userId)) return true;
  if (role === "ADMIN") return true;
  if (role !== "EMPLOYEE") return false;

  const modules = await getEmployeePerms(userId);
  return !!(modules && modules.includes(requiredModule));
}

/** Auto-infers required module from Next.js req.url */
export async function autoCheckApiAccess(req: Request): Promise<boolean> {
  const url = req.url;
  let requiredModule: AdminModuleIds = "SYSTEM_OVERVIEW";

  if (url.includes("/admin/staff") || url.includes("/admin/students") || url.includes("/admin/authors") || url.includes("/admin/referrals")) {
    requiredModule = "STAFF_MGMT";
  } else if (url.includes("/admin/transactions") || url.includes("/admin/products") || url.includes("/admin/coupons") || url.includes("/admin/rewards") || url.includes("/admin/coin-engine") || url.includes("/admin/razorpay")) {
    requiredModule = "FINANCE";
  } else if (url.includes("/admin/whatsapp") || url.includes("/admin/leads") || url.includes("/admin/forms") || url.includes("/admin/faqs") || url.includes("/admin/email") || url.includes("/admin/support") || url.includes("/admin/feedback")) {
    requiredModule = "ENGAGEMENT";
  } else if (url.includes("/admin/blog") || url.includes("/admin/export") || url.includes("/admin/bin")) {
    requiredModule = "CONTENT";
  } else if (url.includes("/admin/virtual-library") || url.includes("/admin/slots") || url.includes("/admin/meet-polls")) {
    requiredModule = "VIRTUAL_LIBRARY";
  }

  return checkAdminModuleApi(requiredModule);
}
