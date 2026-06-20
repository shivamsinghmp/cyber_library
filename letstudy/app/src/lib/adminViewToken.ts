import { createHmac, timingSafeEqual } from "crypto";

function getSecret(): string {
  const s = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET must be set for admin view token signing");
  return s;
}

const TTL_MS = 15 * 60 * 1000; // 15 minutes

export type AdminViewPayload = {
  adminId:   string;
  adminName: string;
  studentId: string;
  exp:       number;
};

function b64url(buf: Buffer): string { return buf.toString("base64url"); }
function fromb64url(s: string): Buffer { return Buffer.from(s, "base64url"); }

export function signAdminViewToken(adminId: string, adminName: string, studentId: string): string {
  const payload = JSON.stringify({ adminId, adminName, studentId, exp: Date.now() + TTL_MS });
  const payloadB64 = b64url(Buffer.from(payload, "utf8"));
  const sig = createHmac("sha256", getSecret()).update(payloadB64).digest();
  return `${payloadB64}.${b64url(sig)}`;
}

export function verifyAdminViewToken(token: string): AdminViewPayload | null {
  try {
    const [payloadB64, sigB64] = token.split(".");
    if (!payloadB64 || !sigB64) return null;
    const expectedSig = createHmac("sha256", getSecret()).update(payloadB64).digest();
    const actualSig   = fromb64url(sigB64);
    if (expectedSig.length !== actualSig.length || !timingSafeEqual(expectedSig, actualSig)) return null;
    const payload = JSON.parse(fromb64url(payloadB64).toString("utf8")) as AdminViewPayload;
    if (payload.exp < Date.now()) return null;
    if (!payload.adminId || !payload.studentId) return null;
    return payload;
  } catch {
    return null;
  }
}
