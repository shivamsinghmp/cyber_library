import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/api-helpers";
import { setAppSetting, getAppSetting } from "@/lib/app-settings";
import { z } from "zod";

const schema = z.object({
  trialDays: z.number().int().min(1).max(365),
});

/** POST /api/admin/settings/trial-days — Update free trial duration */
export async function POST(request: Request) {
  try {
    const auth = await requireSuperAdmin();
    if (auth.error) return auth.error;

    const body   = await request.json().catch(() => ({}));
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "trialDays must be 1-365" }, { status: 400 });
    }

    await setAppSetting("TRIAL_DAYS", String(parsed.data.trialDays));
    return NextResponse.json({ ok: true, trialDays: parsed.data.trialDays });
  } catch (e) {
    console.error("POST /api/admin/settings/trial-days:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

/** GET /api/admin/settings/trial-days — Get current trial duration */
export async function GET() {
  try {
    const auth = await requireSuperAdmin();
    if (auth.error) return auth.error;

    const raw  = await getAppSetting("TRIAL_DAYS");
    const days = raw ? parseInt(raw, 10) : 7;
    return NextResponse.json({ trialDays: Number.isFinite(days) && days > 0 ? days : 7 });
  } catch (e) {
    console.error("GET /api/admin/settings/trial-days:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
