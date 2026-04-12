import { prisma } from "@/lib/prisma";

export async function logAdminAction(
  userId: string,
  action: "CREATE" | "UPDATE" | "DELETE" | "GRANT" | "REVOKE",
  module: string,
  details: string,
  ipAddress?: string
) {
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
