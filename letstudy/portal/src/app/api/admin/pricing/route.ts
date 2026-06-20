import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-helpers";
import { getAppSetting, setAppSetting } from "@/lib/app-settings";
import { DEFAULT_PRICING } from "@/lib/pricing-defaults";

export async function GET() {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const raw = await getAppSetting("PRICING_DATA");
    if (!raw) return NextResponse.json(DEFAULT_PRICING);
    try {
      return NextResponse.json(JSON.parse(raw));
    } catch {
      return NextResponse.json(DEFAULT_PRICING);
    }
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const body = await request.json();
    const { planName, subtitle, currency, monthly, yearly, ctaText, ctaUrl, features } = body;

    if (!planName || !monthly || !yearly) {
      return NextResponse.json({ error: "Invalid pricing data" }, { status: 400 });
    }

    const data = { planName, subtitle, currency, monthly, yearly, ctaText, ctaUrl, features };
    await setAppSetting("PRICING_DATA", JSON.stringify(data));

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
