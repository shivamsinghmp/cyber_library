import bcrypt from "bcrypt";
import { prisma } from "./prisma";

type OtpPurpose = "verify" | "reset";

const OTP_EXP_MINUTES = 10;

function buildIdentifier(purpose: OtpPurpose, email: string) {
  return `${purpose}:${email.toLowerCase()}`;
}

function generateNumericCode(length = 6): string {
  const min = 10 ** (length - 1);
  const max = 10 ** length - 1;
  return String(Math.floor(Math.random() * (max - min + 1)) + min);
}

export async function createOtp(email: string, purpose: OtpPurpose): Promise<string> {
  const identifier = buildIdentifier(purpose, email);
  const code = generateNumericCode(6);
  const hashed = await bcrypt.hash(code, 12);
  const expires = new Date(Date.now() + OTP_EXP_MINUTES * 60 * 1000);

  // Remove old tokens for this identifier
  await prisma.verificationToken.deleteMany({ where: { identifier } });

  await prisma.verificationToken.create({
    data: {
      identifier,
      token: hashed,
      expires,
    },
  });

  return code;
}

export async function verifyOtp(
  email: string,
  purpose: OtpPurpose,
  code: string
): Promise<boolean> {
  const identifier = buildIdentifier(purpose, email);
  const record = await prisma.verificationToken.findFirst({
    where: { identifier },
    orderBy: { expires: "desc" },
  });
  if (!record) return false;
  if (record.expires < new Date()) {
    await prisma.verificationToken.deleteMany({ where: { identifier } });
    return false;
  }
  const ok = await bcrypt.compare(code, record.token);
  if (!ok) return false;
  await prisma.verificationToken.deleteMany({ where: { identifier } });
  return true;
}

