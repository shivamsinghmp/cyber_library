import { auth } from "@/auth";
import { createPermissions, invalidatePermissionCache } from "@cyberlib/shared/permissions";

export const { requireAdminModule, checkAdminModuleApi, autoCheckApiAccess } = createPermissions(auth);
export { invalidatePermissionCache };
export * from "@cyberlib/shared/permissions-client";
