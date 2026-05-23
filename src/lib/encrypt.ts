import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

const ALGORITHM = "aes-256-gcm";
const KEY_LEN = 32;
const IV_LEN = 16;
const SALT_LEN = 16;
const TAG_LEN = 16;

function getEncryptionKey(): Buffer {
  // Dedicated key for symmetric encryption of stored secrets (Razorpay,
  // SMTP, WhatsApp). MUST be distinct from AUTH_SECRET so a JWT-secret
  // compromise does not also unwrap every stored secret in the DB.
  const secret = process.env.ENCRYPTION_KEY;
  if (!secret || secret.length < 32) {
    throw new Error("ENCRYPTION_KEY must be set (min 32 chars) and distinct from AUTH_SECRET");
  }
  return scryptSync(secret, "razorpay-salt", KEY_LEN);
}

export function encrypt(plain: string): { encrypted: string; iv: string } {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  const combined = Buffer.concat([enc, tag]);
  return {
    encrypted: combined.toString("base64url"),
    iv: iv.toString("base64url"),
  };
}

export function decrypt(encrypted: string, iv: string): string {
  const key = getEncryptionKey();
  const ivBuf = Buffer.from(iv, "base64url");
  const combined = Buffer.from(encrypted, "base64url");
  const tag = combined.subarray(-TAG_LEN);
  const enc = combined.subarray(0, -TAG_LEN);
  const decipher = createDecipheriv(ALGORITHM, key, ivBuf);
  decipher.setAuthTag(tag);
  return decipher.update(enc) + decipher.final("utf8");
}
