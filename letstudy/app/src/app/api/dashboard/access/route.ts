import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api-helpers";
import { getAllowedModules } from "@/lib/student-modules";

export const dynamic = "force-dynamic";

// Drives the dashboard's payment/feature gate — same DB-backed RBAC model
// (global disable → per-student override → plan-feature-map) used to gate
// the underlying API routes, so the UI never shows a page the API would
// then reject.
export async function GET() {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  try {
    const allowedModules = await getAllowedModules(auth.user.id);
    return NextResponse.json({ allowedModules });
  } catch (e) {
    console.error("GET /api/dashboard/access:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
