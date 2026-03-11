import { prisma } from "./prisma";

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // avoid confusing chars

function randomCode(length: number): string {
  let out = "";
  for (let i = 0; i < length; i++) {
    const idx = Math.floor(Math.random() * CODE_CHARS.length);
    out += CODE_CHARS[idx];
  }
  return out;
}

/** Generate a unique referral code for an influencer (e.g. INF-ABCD12). */
export async function generateReferralCodeForUser(userId: string): Promise<string> {
  return generateReferralCodeWithPrefix(userId, "INF-");
}

/** Generate a unique referral code for a student (e.g. REF-ABCD12). Use for "Refer & Earn". */
export async function generateStudentReferralCode(userId: string): Promise<string> {
  return generateReferralCodeWithPrefix(userId, "REF-");
}

function generateReferralCodeWithPrefix(userId: string, prefix: string): Promise<string> {
  return (async () => {
    for (let attempt = 0; attempt < 10; attempt++) {
      const candidate = prefix + randomCode(6);
      const existing = await prisma.user.findUnique({
        where: { referralCode: candidate },
        select: { id: true },
      });
      if (!existing) {
        await prisma.user.update({
          where: { id: userId },
          data: { referralCode: candidate },
        });
        return candidate;
      }
    }
    const fallback = prefix + userId.slice(0, 6).toUpperCase();
    await prisma.user.update({
      where: { id: userId },
      data: { referralCode: fallback },
    });
    return fallback;
  })();
}

