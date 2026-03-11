import { NextResponse } from "next/server";
import { getAppSetting } from "@/lib/app-settings";

/** GET: Public. Returns current announcement message (null if none). */
export async function GET() {
  try {
    const message = await getAppSetting("ANNOUNCEMENT");
    return NextResponse.json({
      message: message && message.trim() ? message.trim() : null,
    });
  } catch {
    return NextResponse.json({ message: null });
  }
}
