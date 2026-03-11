import { NextResponse } from "next/server";
import { getAppSetting } from "@/lib/app-settings";

/** GET: Public. Returns support WhatsApp number, email, and WhatsApp group join link. */
export async function GET() {
  try {
    const whatsapp = await getAppSetting("SUPPORT_WHATSAPP_NUMBER");
    const email = await getAppSetting("SUPPORT_EMAIL");
    const whatsappGroupLink = await getAppSetting("WHATSAPP_GROUP_LINK");
    const whatsappClean = whatsapp?.replace(/\D/g, "") || null;
    return NextResponse.json({
      whatsapp: whatsappClean,
      email: email?.trim() || null,
      whatsappGroupLink: whatsappGroupLink?.trim() || null,
    });
  } catch {
    return NextResponse.json({ whatsapp: null, email: null, whatsappGroupLink: null });
  }
}
