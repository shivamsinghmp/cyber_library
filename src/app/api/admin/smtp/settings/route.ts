import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/api-helpers";

/** GET: Returns SMTP status from .env (never exposes credentials). */
export async function GET() {
  try {
    const auth = await requireSuperAdmin();
    if (auth.error) return auth.error;

    const host    = process.env.SMTP_HOST?.trim()  || null;
    const port    = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : null;
    const user    = process.env.SMTP_USER?.trim()  || null;
    const from    = process.env.SMTP_FROM?.trim()  || null;
    const hasPass = !!process.env.SMTP_PASS?.trim();

    return NextResponse.json({ host, port, user, from, hasPass, source: "env" });
  } catch (e) {
    console.error("GET /api/admin/smtp/settings:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
