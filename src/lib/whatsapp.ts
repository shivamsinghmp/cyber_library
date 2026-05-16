/**
 * Meta WhatsApp Business Cloud API.
 * Credentials from .env: WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_ACCESS_TOKEN
 */

import { getAppSetting } from "./app-settings";

const WA_TIMEOUT_MS = 10_000;

async function getCredentials() {
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

/**
 * Send a plain text WhatsApp message.
 * Returns the wamid (Meta message ID) on success, null on failure.
 * wamid is used by the webhook to match delivery/read status updates.
 */
export async function sendWhatsAppText(toPhoneNumber: string, text: string): Promise<string | null> {
  const { phoneId, token } = await getCredentials();
  if (!phoneId || !token) {
    console.warn("⚠️ WhatsApp credentials missing — skipping message to " + toPhoneNumber);
    return null;
  }
  const to = toPhoneNumber.replace(/\D/g, "");
  try {
    const res  = await waFetch(`https://graph.facebook.com/v20.0/${phoneId}/messages`, {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "text",
      text: { preview_url: true, body: text },
    }, token);
    const data = await res.json() as { messages?: { id: string }[]; error?: unknown };
    if (!res.ok) { console.error("WhatsApp send failed:", JSON.stringify(data)); return null; }
    const wamid = data.messages?.[0]?.id ?? null;
    console.log(`WhatsApp queued for ${to} — wamid: ${wamid}`);
    return wamid;
  } catch (e) {
    if ((e as Error).name === "AbortError") console.error("WhatsApp timeout for", to);
    else console.error("WhatsApp error:", e);
    return null;
  }
}

/**
 * Send a WhatsApp Template message.
 * Returns wamid on success, null on failure.
 */
export async function sendWhatsAppTemplate(
  toPhoneNumber: string,
  templateName: string,
  languageCode = "en",
  parameters: string[] = []
): Promise<string | null> {
  const { phoneId, token } = await getCredentials();
  if (!phoneId || !token) {
    console.warn(`⚠️ WhatsApp credentials missing — skipping template '${templateName}'`);
    return null;
  }
  const to = toPhoneNumber.replace(/\D/g, "");
  const components = parameters.length > 0
    ? [{ type: "body", parameters: parameters.map((p) => ({ type: "text", text: p })) }]
    : [];
  try {
    const res  = await waFetch(`https://graph.facebook.com/v20.0/${phoneId}/messages`, {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "template",
      template: { name: templateName, language: { code: languageCode }, components },
    }, token);
    const data = await res.json() as { messages?: { id: string }[]; error?: unknown };
    if (!res.ok) { console.error(`WhatsApp template '${templateName}' failed:`, JSON.stringify(data)); return null; }
    const wamid = data.messages?.[0]?.id ?? null;
    console.log(`WhatsApp template '${templateName}' queued for ${to} — wamid: ${wamid}`);
    return wamid;
  } catch (e) {
    if ((e as Error).name === "AbortError") console.error("WhatsApp template timeout for", to);
    else console.error("WhatsApp template error:", e);
    return null;
  }
}
