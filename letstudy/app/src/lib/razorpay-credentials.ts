/** Razorpay credentials — read from .env only. Server-side use only. */
export async function getRazorpayCredentials(): Promise<{
  keyId: string;
  keySecret: string;
} | null> {
  const keyId     = process.env.RAZORPAY_KEY_ID?.trim();
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
  if (keyId && keySecret) return { keyId, keySecret };
  console.error("[razorpay] RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET not set in .env");
  return null;
}
