/**
 * Fast2SMS — Indian SMS gateway for OTP delivery.
 * API key read from env or Admin Settings (DB).
 * Uses the OTP route (DLT-approved transactional template).
 */

import { getAppSetting } from "./app-settings";

const SMS_TIMEOUT_MS = 10_000;

async function getApiKey(): Promise<string | null> {
  return process.env.FAST2SMS_API_KEY?.trim() || (await getAppSetting("FAST2SMS_API_KEY"));
}

function stripCountryCode(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  // Strip leading 91 if 12 digits (Indian numbers)
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  if (digits.length === 10) return digits;
  return digits;
}

/**
 * Send an OTP via Fast2SMS OTP route.
 * The `otp` parameter is the 6-digit code to deliver.
 */
export async function sendSmsOtp(phoneNumber: string, otp: string): Promise<boolean> {
  const apiKey = await getApiKey();
  if (!apiKey) {
    console.warn("⚠️ FAST2SMS_API_KEY missing. SMS OTP skipped for " + phoneNumber);
    return false;
  }

  const number = stripCountryCode(phoneNumber);
  if (number.length !== 10) {
    console.error("Invalid Indian phone number for Fast2SMS:", phoneNumber);
    return false;
  }

  const url = new URL("https://www.fast2sms.com/dev/bulkV2");
  url.searchParams.set("authorization", apiKey);
  url.searchParams.set("route", "otp");
  url.searchParams.set("variables_values", otp);
  url.searchParams.set("flash", "0");
  url.searchParams.set("numbers", number);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SMS_TIMEOUT_MS);

  try {
    const res = await fetch(url.toString(), {
      method: "GET",
      signal: controller.signal,
      headers: { "cache-control": "no-cache" },
    });
    const data = await res.json();
    if (!res.ok || data.return === false) {
      console.error("Fast2SMS error:", JSON.stringify(data));
      return false;
    }
    console.info(`[SMS] OTP sent to ${number} via Fast2SMS`);
    return true;
  } catch (err) {
    if ((err as Error).name === "AbortError") console.error("Fast2SMS timeout for", number);
    else console.error("Fast2SMS error:", err);
    return false;
  } finally {
    clearTimeout(timer);
  }
}
