/**
 * Security audit logging — fire-and-forget, never blocks request handling.
 *
 * Usage:
 *   import { auditLog } from "@/lib/auditLog";
 *
 *   auditLog("login",        req, { userId, method: "email" });
 *   auditLog("failed_login", req, { attemptedEmail: email });
 *   auditLog("signup",       req, { userId, goal });
 *   auditLog("session_revoked", req, { userId, reason: "1_device_limit" });
 */

import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";

export type AuditEvent =
  | "login"
  | "logout"
  | "signup"
  | "failed_login"
  | "password_change"
  | "coin_transaction"
  | "admin_access"
  | "session_revoked"
  | "suspicious_activity";

interface AuditDetails {
  userId?:  string;
  [key: string]:  unknown;
}

/**
 * Log a security event — non-blocking, never throws.
 * @param event   Event type identifier
 * @param req     Optional Next.js Request (to extract IP + User-Agent)
 * @param details Additional metadata — never include passwords or tokens
 */
export function auditLog(
  event:   AuditEvent,
  req:     Request | null,
  details: AuditDetails = {},
): void {
  const ip = req
    ? (req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? req.headers.get("x-real-ip") ?? null)
    : null;
  const ua = req ? req.headers.get("user-agent")?.slice(0, 250) ?? null : null;

  const { userId, ...rest } = details;

  // Fire-and-forget — never awaited so it never blocks
  prisma.securityAuditLog
    .create({
      data: {
        eventType: event,
        userId:    userId ?? null,
        ipAddress: ip,
        userAgent: ua,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        details:   Object.keys(rest).length > 0 ? (rest as any) : undefined,
      },
    })
    .catch(err => {
      // Audit log failure must NEVER surface to the user
      console.error("[auditLog] Write failed:", err);
    });
}

/**
 * Server-component variant — reads IP from Next.js `headers()` (no Request available).
 */
export async function auditLogServer(
  event:   AuditEvent,
  details: AuditDetails = {},
): Promise<void> {
  let ip: string | null = null;
  let ua: string | null = null;
  try {
    const hdrs = await headers();
    ip = hdrs.get("x-forwarded-for")?.split(",")[0].trim() ?? hdrs.get("x-real-ip") ?? null;
    ua = hdrs.get("user-agent")?.slice(0, 250) ?? null;
  } catch {}

  const { userId, ...rest } = details;

  prisma.securityAuditLog
    .create({
      data: {
        eventType: event,
        userId:    userId ?? null,
        ipAddress: ip,
        userAgent: ua,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        details:   Object.keys(rest).length > 0 ? (rest as any) : undefined,
      },
    })
    .catch(err => console.error("[auditLog] Write failed:", err));
}
