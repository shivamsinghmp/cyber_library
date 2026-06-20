import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createApiHelpers, serverError, badRequest, notFound, zodError } from "@cyberlib/shared/api-helpers";
import type { AuthUser } from "@cyberlib/shared/api-helpers";

export const { requireUser, requireAdmin, requireSuperAdmin } = createApiHelpers(auth);
export { serverError, badRequest, notFound, zodError };
export type { AuthUser };

type AuthResult =
  | { user: AuthUser; error?: never }
  | { user?: never; error: NextResponse };

/**
 * ADMIN always passes. EMPLOYEE passes only with the "SALES" module in
 * their EmployeePermission. Kept local — this dual-role gate is specific
 * to this app, not a concept the other 5 apps need.
 */
export async function requireSales(): Promise<AuthResult> {
  const result = await requireUser();
  if (result.error) return result;

  if (result.user.role === "ADMIN") return result;
  if (result.user.role === "EMPLOYEE") {
    const perm = await prisma.employeePermission.findUnique({ where: { userId: result.user.id } });
    if (perm?.modules.includes("SALES")) return result;
  }
  return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
}
