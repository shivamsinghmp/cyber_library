import { NextResponse } from "next/server";
import { requireSales } from "@/lib/api-helpers";

// Lets the login page check, BEFORE redirecting, whether the current
// session can actually reach the dashboard (ADMIN, or EMPLOYEE with the
// SALES module). Without this, an EMPLOYEE session lacking SALES would
// bounce login -> dashboard -> login forever, since DashboardShell's
// redirect and the login page's "already logged in" redirect would keep
// disagreeing with each other.
export async function GET() {
  const auth = await requireSales();
  return NextResponse.json({ canAccess: !auth.error });
}
