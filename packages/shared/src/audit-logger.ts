import { prisma } from "./prisma";

// ENV_SUPERADMIN is a synthetic, stateless id (no DB row) — same sentinel
// used in lib/coins.ts and auth/record-login. Logging against it would
// violate AdminAuditLog's userId FK, so skip rather than fail.
const ENV_SUPERADMIN_ID = "ENV_SUPERADMIN";

export async function logAdminAction(
  userId: string,
  action: "CREATE" | "UPDATE" | "DELETE" | "GRANT" | "REVOKE",
  module: string,
  details: string,
  ipAddress?: string
) {
  if (userId === ENV_SUPERADMIN_ID) return;
  try {
    // We execute this asynchronously so it does not block the API response
    // by not awaiting it in the parent context where not absolutely necessary, or just await it.
    await prisma.adminAuditLog.create({
      data: {
        userId,
        action,
        module,
        details,
        ipAddress: ipAddress || null,
      },
    });
  } catch (error) {
    console.error(`[AUDIT LOG FAILED] action: ${action}, module: ${module}`, error);
  }
}
