/**
 * Meta WhatsApp Business Cloud API.
 * Credentials from .env or Admin Settings (DB).
 * Fixed: Added 10s timeout to all fetch calls.
 */

import { getAppSetting } from "./app-settings";

const WA_TIMEOUT_MS = 10_000;

async function getWhatsAppCredentials() {
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim() || (await getAppSetting("WHATSAPP_PHONE_NUMBER_ID"));
  const token   = process.env.WHATSAPP_ACCESS_TOKEN?.trim()     || (await getAppSetting("WHATSAPP_ACCESS_TOKEN"));
  return { phoneId, token };
}

function waFetch(url: string, body: object, token: string): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), WA_TIMEOUT_MS);
  return fetch(url, {
    method: "POST",
    signal: controller.signal,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).finally(() => clearTimeout(timer));
}

export async function sendWhatsAppText(toPhoneNumber: string, text: string): Promise<boolean> {
  const { phoneId, token } = await getWhatsAppCredentials();
  if (!phoneId || !token) {
    console.warn("⚠️ WhatsApp credentials missing. Skipping message to " + toPhoneNumber);
    return false;
  }
  const cleanNumber = toPhoneNumber.replace(/\D/g, "");
  try {
    const res = await waFetch(
      `https://graph.facebook.com/v20.0/${phoneId}/messages`,
      {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: cleanNumber,
        type: "text",
        text: { preview_url: true, body: text },
      },
      token
    );
    const data = await res.json();
    if (!res.ok) { console.error("Failed to send WhatsApp message:", JSON.stringify(data)); return false; }
    console.log(`WhatsApp message queued for ${cleanNumber}`);
    return true;
  } catch (error) {
    if ((error as Error).name === "AbortError") console.error("WhatsApp API timeout for", cleanNumber);
    else console.error("WhatsApp API Error:", error);
    return false;
  }
}

export async function sendWhatsAppTemplate(
  toPhoneNumber: string,
  templateName: string,
  languageCode = "en",
  parameters: string[] = []
): Promise<boolean> {
  const { phoneId, token } = await getWhatsAppCredentials();
  if (!phoneId || !token) {
    console.warn(`⚠️ WhatsApp credentials missing. Skipping template '${templateName}' to ${toPhoneNumber}`);
    return false;
  }
  const cleanNumber = toPhoneNumber.replace(/\D/g, "");
  const components = parameters.length > 0
    ? [{ type: "body", parameters: parameters.map(p => ({ type: "text", text: p })) }]
    : [];
  try {
    const res = await waFetch(
      `https://graph.facebook.com/v20.0/${phoneId}/messages`,
      {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: cleanNumber,
        type: "template",
        template: { name: templateName, language: { code: languageCode }, components },
      },
      token
    );
    const data = await res.json();
    if (!res.ok) { console.error(`Failed to send WhatsApp Template (${templateName}):`, JSON.stringify(data)); return false; }
    console.log(`WhatsApp Template '${templateName}' queued for ${cleanNumber}`);
    return true;
  } catch (error) {
    if ((error as Error).name === "AbortError") console.error("WhatsApp template API timeout for", cleanNumber);
    else console.error("WhatsApp Template API Error:", error);
    return false;
  }
}
