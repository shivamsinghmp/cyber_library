import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createApiHelpers, serverError, badRequest, notFound, zodError } from "@cyberlib/shared/api-helpers";
import type { AuthUser } from "@cyberlib/shared/api-helpers";

export const { requireUser, requireAdmin, requireSuperAdmin } = createApiHelpers(auth);
export { serverError, badRequest, notFound, zodError };
export type { AuthUser };

type AuthResult =
  | { user: AuthUser; error?: never }
  | { user?: never; error: NextResponse };

/**
 * Auth + module access check combined — student dashboard feature gating.
 * Kept local rather than in @cyberlib/shared since it depends on
 * ./student-modules, which is specific to this app.
 */
export async function requireModule(moduleId: string): Promise<AuthResult> {
  const authResult = await requireUser();
  if (authResult.error) return authResult;

  const { canAccessModule } = await import("./student-modules");
  const allowed = await canAccessModule(authResult.user.id, moduleId);
  if (!allowed) {
    return {
      error: NextResponse.json(
        { error: "This feature is not available for your account." },
        { status: 403 }
      ),
    };
  }
  return authResult;
}
