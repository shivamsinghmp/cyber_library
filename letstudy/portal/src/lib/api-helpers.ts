import { auth } from "@/auth";
import { createApiHelpers, serverError, badRequest, notFound, zodError } from "@cyberlib/shared/api-helpers";
import type { AuthUser } from "@cyberlib/shared/api-helpers";

export const { requireUser, requireAdmin, requireSuperAdmin } = createApiHelpers(auth);
export { serverError, badRequest, notFound, zodError };
export type { AuthUser };
