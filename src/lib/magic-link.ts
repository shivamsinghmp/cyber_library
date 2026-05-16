import { prisma } from "./prisma";

const LINK_EXP_HOURS = 24;

function buildIdentifier(email: string) {
  return `email-verify:${email.toLowerCase()}`;
}

function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Buffer.from(bytes).toString("base64url");
}

async function hashToken(token: string): Promise<string> {
  const data = new TextEncoder().encode(token);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Buffer.from(buf).toString("hex");
}

export async function createMagicLinkToken(email: string): Promise<string> {
  const identifier = buildIdentifier(email);
  const token = generateToken();
  const hashed = await hashToken(token);
  const expires = new Date(Date.now() + LINK_EXP_HOURS * 60 * 60 * 1000);

  await prisma.verificationToken.deleteMany({ where: { identifier } });
  await prisma.verificationToken.create({ data: { identifier, token: hashed, expires } });

  return token;
}

export async function verifyMagicLinkToken(email: string, token: string): Promise<boolean> {
  const identifier = buildIdentifier(email);
  const hashed = await hashToken(token);

  const record = await prisma.verificationToken.findFirst({ where: { identifier, token: hashed } });
  if (!record) return false;

  if (record.expires < new Date()) {
    await prisma.verificationToken.deleteMany({ where: { identifier } });
    return false;
  }

  await prisma.verificationToken.deleteMany({ where: { identifier } });
  return true;
}
