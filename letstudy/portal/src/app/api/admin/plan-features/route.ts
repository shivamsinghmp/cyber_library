import { NextResponse } from "next/server";
import { requireAdminModule } from "@/lib/permissions";
import {
  getPlanFeatureMap, setPlanFeatureMap,
  isPlanGatingEnabled, setPlanGatingEnabled,
  KNOWN_PLANS, DEFAULT_PLAN_FEATURES,
} from "@/lib/plan-features";
import { STUDENT_MODULES } from "@/lib/student-modules";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdminModule("FINANCE");
    const [map, enabled] = await Promise.all([
      getPlanFeatureMap(),
      isPlanGatingEnabled(),
    ]);
    return NextResponse.json({
      map,
      enabled,
      plans: KNOWN_PLANS,
      modules: STUDENT_MODULES.map(m => ({ id: m.id, label: m.label, section: m.section })),
      defaults: DEFAULT_PLAN_FEATURES,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unauthorized" }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    await requireAdminModule("FINANCE");
    const body = await req.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const validModuleIds = new Set(STUDENT_MODULES.map(m => m.id));
    const sanitized: Record<string, string[]> = {};

    for (const plan of Object.keys(body)) {
      if (plan === "__enabled") continue; // handled separately
      const features = body[plan];
      if (!Array.isArray(features)) continue;
      sanitized[plan] = features.filter((f: unknown) => typeof f === "string" && validModuleIds.has(f));
    }

    await setPlanFeatureMap(sanitized);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unauthorized" }, { status: 401 });
  }
}

export async function PATCH(req: Request) {
  try {
    await requireAdminModule("FINANCE");
    const { enabled } = await req.json();
    if (typeof enabled !== "boolean") {
      return NextResponse.json({ error: "enabled must be boolean" }, { status: 400 });
    }
    await setPlanGatingEnabled(enabled);
    return NextResponse.json({ ok: true, enabled });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unauthorized" }, { status: 401 });
  }
}
