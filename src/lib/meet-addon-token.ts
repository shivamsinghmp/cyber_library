import { createHmac, timingSafeEqual } from "crypto";

const SECRET = process.env.AUTH_SECRET || "meet-addon-fallback";
const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export type MeetAddonPayload = { userId: string; exp: number };

function b64urlEncode(buf: Buffer): string {
  return buf.toString("base64url");
}

function b64urlDecode(str: string): Buffer {
  return Buffer.from(str, "base64url");
}

export function signMeetAddonToken(userId: string): string {
  const exp = Date.now() + TTL_MS;
  const payload = JSON.stringify({ userId, exp });
  const payloadB64 = b64urlEncode(Buffer.from(payload, "utf8"));
  const sig = createHmac("sha256", SECRET).update(payloadB64).digest();
  return `${payloadB64}.${b64urlEncode(sig)}`;
}

export function verifyMeetAddonToken(token: string): MeetAddonPayload | null {
  try {
    const [payloadB64, sigB64] = token.split(".");
    if (!payloadB64 || !sigB64) return null;
    const payload = JSON.parse(
      b64urlDecode(payloadB64).toString("utf8")
    ) as MeetAddonPayload;
    const expectedSig = createHmac("sha256", SECRET).update(payloadB64).digest();
    const actualSig = b64urlDecode(sigB64);
    if (expectedSig.length !== actualSig.length || !timingSafeEqual(expectedSig, actualSig)) return null;
    if (payload.exp < Date.now()) return null;
    if (!payload.userId) return null;
    return payload;
  } catch {
    return null;
  }
}
