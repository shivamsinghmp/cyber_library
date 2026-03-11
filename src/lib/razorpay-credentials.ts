import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/encrypt";

/** Get Razorpay Key ID and Secret (from DB if set, else from env). For server-side use only. */
export async function getRazorpayCredentials(): Promise<{
  keyId: string | null;
  keySecret: string | null;
} | null> {
  const row = await prisma.razorpaySetting.findFirst({
    orderBy: { updatedAt: "desc" },
  });
  if (row?.keyId?.trim() && row?.keySecretEncrypted && row?.iv) {
    try {
      const secret = decrypt(row.keySecretEncrypted, row.iv);
      return { keyId: row.keyId.trim(), keySecret: secret };
    } catch {
      return null;
    }
  }
  const keyId = process.env.RAZORPAY_KEY_ID?.trim();
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
  if (keyId && keySecret) return { keyId, keySecret };
  return null;
}
