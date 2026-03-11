/**
 * Meta WhatsApp Business Cloud API.
 * Credentials from .env or Admin Settings (DB).
 */

import { getAppSetting } from "./app-settings";

async function getWhatsAppCredentials() {
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim() || (await getAppSetting("WHATSAPP_PHONE_NUMBER_ID"));
  const token = process.env.WHATSAPP_ACCESS_TOKEN?.trim() || (await getAppSetting("WHATSAPP_ACCESS_TOKEN"));
  return { phoneId, token };
}

/**
 * Sends a standard text message via WhatsApp.
 * Note: If using the official Meta Cloud API, sending free-form text messages 
 * to users outside of a 24-hour customer service window requires a pre-approved Message Template instead.
 * 
 * @param toPhoneNumber The recipient's phone number with country code (e.g., "919876543210")
 * @param text The message body to send
 */
export async function sendWhatsAppText(toPhoneNumber: string, text: string): Promise<boolean> {
  const { phoneId, token } = await getWhatsAppCredentials();
  if (!phoneId || !token) {
    console.warn("⚠️ WhatsApp credentials missing. Skipping message to " + toPhoneNumber);
    return false;
  }

  const cleanNumber = toPhoneNumber.replace(/\D/g, "");

  try {
    const res = await fetch(`https://graph.facebook.com/v20.0/${phoneId}/messages`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: cleanNumber,
        type: "text",
        text: {
          preview_url: true, // Attempt to render web links
          body: text,
        },
      }),
    });

    const data = await res.json();
    
    if (!res.ok) {
      console.error("Failed to send WhatsApp message:", JSON.stringify(data, null, 2));
      return false;
    }

    console.log(`WhatsApp message successfully queued for delivery to ${cleanNumber}`);
    return true;
  } catch (error) {
    console.error("WhatsApp API Error:", error);
    return false;
  }
}

/**
 * Sends a pre-approved Meta WhatsApp Message Template.
 * Required for sending outbound notifications across the 24-hour service window limit.
 * 
 * @param toPhoneNumber The recipient's phone number with country code
 * @param templateName The exact template name exactly as configured in Meta Business Manager
 * @param languageCode The locale code (e.g., "en_US", "en")
 * @param parameters Array of text variables if the template contains {{1}}, {{2}} etc.
 */
export async function sendWhatsAppTemplate(
  toPhoneNumber: string,
  templateName: string,
  languageCode: string = "en",
  parameters: string[] = []
): Promise<boolean> {
  const { phoneId, token } = await getWhatsAppCredentials();
  if (!phoneId || !token) {
    console.warn(`⚠️ WhatsApp credentials missing. Skipping template '${templateName}' to ${toPhoneNumber}`);
    return false;
  }

  const cleanNumber = toPhoneNumber.replace(/\D/g, "");
  
  const components = parameters.length > 0 ? [
    {
      type: "body",
      parameters: parameters.map(p => ({ type: "text", text: p }))
    }
  ] : [];

  try {
    const res = await fetch(`https://graph.facebook.com/v20.0/${phoneId}/messages`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: cleanNumber,
        type: "template",
        template: {
          name: templateName,
          language: { code: languageCode },
          components: components,
        },
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      console.error(`Failed to send WhatsApp Template (${templateName}):`, JSON.stringify(data, null, 2));
      return false;
    }

    console.log(`WhatsApp Template '${templateName}' successfully queued for ${cleanNumber}`);
    return true;
  } catch (error) {
    console.error("WhatsApp Template API Error:", error);
    return false;
  }
}
