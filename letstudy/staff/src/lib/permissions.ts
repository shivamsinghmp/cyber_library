import { NextResponse } from "next/server";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { AuthUser } from "@cyberlib/shared/api-helpers";
import { ADMIN_MODULES, hasModuleAccess } from "@cyberlib/shared/permissions-client";
import type { AdminModuleIds } from "@cyberlib/shared/permissions-client";

export { ADMIN_MODULES, hasModuleAccess };
export type { AdminModuleIds };

type AuthResult =
  | { user: AuthUser; error?: never }
  | { user?: never; error: NextResponse };

/**
 * Direct, uncached DB read — matches DashboardShell.tsx's existing style.
 * Staff is low-traffic enough that the 5-min Redis TTL the portal-wide
 * factory uses isn't worth a second cache-invalidation surface here.
 */
async function loadStaffUser(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, employeeStatus: true },
  });
}

/** Server Component page guard. Redirects to /login if not an approved
 *  EMPLOYEE, or to /staff if the specific module isn't granted. */
export async function requireStaffModule(requiredModule: AdminModuleIds): Promise<void> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!session?.user || !userId) redirect("/login");

  const dbUser = await loadStaffUser(userId);
  if (!dbUser || dbUser.role !== "EMPLOYEE" || dbUser.employeeStatus !== "APPROVED") {
    redirect("/login");
  }

  const perm = await prisma.employeePermission.findUnique({ where: { userId } });
  if (!hasModuleAccess("EMPLOYEE", perm?.modules ?? [], requiredModule)) {
    redirect("/staff");
  }
}

/** API route guard — same { user } | { error } shape as requireAdmin/requireSuperAdmin
 *  in @cyberlib/shared/api-helpers, so call sites read identically. */
export async function checkStaffModuleApi(requiredModule: AdminModuleIds): Promise<AuthResult> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!session?.user || !userId) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const dbUser = await loadStaffUser(userId);
  if (!dbUser || dbUser.role !== "EMPLOYEE" || dbUser.employeeStatus !== "APPROVED") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  const perm = await prisma.employeePermission.findUnique({ where: { userId } });
  if (!hasModuleAccess("EMPLOYEE", perm?.modules ?? [], requiredModule)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { user: { id: userId, role: "EMPLOYEE", email: session.user.email } };
}
