import { NextResponse } from "next/server";
import { getAppSetting } from "@/lib/app-settings";
import { DEFAULT_PRICING } from "@/lib/pricing-defaults";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const raw = await getAppSetting("PRICING_DATA");
    if (!raw) return NextResponse.json(DEFAULT_PRICING);
    try {
      const parsed = JSON.parse(raw);
      return NextResponse.json(parsed);
    } catch {
      return NextResponse.json(DEFAULT_PRICING);
    }
  } catch {
    return NextResponse.json(DEFAULT_PRICING);
  }
}
