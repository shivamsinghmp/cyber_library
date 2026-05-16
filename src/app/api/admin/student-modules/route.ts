import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getDisabledModules, setDisabledModules, STUDENT_MODULES } from "@/lib/student-modules";

async function requireAdmin() {
  const session = await auth();
  const role = (session?.user as { role?: string })?.role;
  if (!session?.user || (role !== "ADMIN" && !(session.user as { isSuperAdmin?: boolean }).isSuperAdmin)) {
    return null;
  }
  return session;
}

export async function GET() {
  if (!await requireAdmin()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const disabled = await getDisabledModules();
  const disabledSet = new Set(disabled);

  const modules = STUDENT_MODULES.map(m => ({
    id:      m.id,
    label:   m.label,
    href:    m.href,
    section: m.section,
    enabled: !disabledSet.has(m.id),
  }));

  return NextResponse.json({ modules, disabled });
}

export async function PUT(request: Request) {
  if (!await requireAdmin()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const disabled: string[] = Array.isArray(body.disabled) ? body.disabled : [];

  await setDisabledModules(disabled);
  return NextResponse.json({ success: true, disabled });
}
