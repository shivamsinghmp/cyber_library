import { NextResponse } from "next/server";
import { getAppSetting } from "@/lib/app-settings";

/** GET: Public. Returns support WhatsApp number, email, and community join links. */
export async function GET() {
  try {
    const [whatsapp, email, whatsappGroupLink, whatsappChannelLink, telegramChannelLink, googleMeetAppLink] = await Promise.all([
      getAppSetting("SUPPORT_WHATSAPP_NUMBER"),
      getAppSetting("SUPPORT_EMAIL"),
      getAppSetting("WHATSAPP_GROUP_LINK"),
      getAppSetting("WHATSAPP_CHANNEL_LINK"),
      getAppSetting("TELEGRAM_CHANNEL_LINK"),
      getAppSetting("GOOGLE_MEET_APP_LINK"),
    ]);
    const whatsappClean = whatsapp?.replace(/\D/g, "") || null;
    return NextResponse.json({
      whatsapp: whatsappClean,
      email: email?.trim() || null,
      whatsappGroupLink: whatsappGroupLink?.trim() || null,
      whatsappChannelLink: whatsappChannelLink?.trim() || null,
      telegramChannelLink: telegramChannelLink?.trim() || null,
      googleMeetAppLink: googleMeetAppLink?.trim() || null,
    });
  } catch {
    return NextResponse.json({
      whatsapp: null, email: null, whatsappGroupLink: null,
      whatsappChannelLink: null, telegramChannelLink: null, googleMeetAppLink: null,
    });
  }
}
