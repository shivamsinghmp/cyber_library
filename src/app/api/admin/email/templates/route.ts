import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/api-helpers";

export async function GET() {
  try {
    const auth = await requireSuperAdmin();
    if (auth.error) return auth.error;
    const { user } = auth;

    const templates = await prisma.emailTemplate.findMany({
      orderBy: { purpose: "asc" },
    });

    return NextResponse.json(templates);
  } catch (e) {
    console.error("GET /api/admin/email/templates:", e);
    return NextResponse.json({ error: "Failed to fetch templates" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireSuperAdmin();
    if (auth.error) return auth.error;
    const { user } = auth;

    const { purpose, subject, bodyHtml, variables } = await request.json();
    if (!purpose || !subject || !bodyHtml) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const template = await prisma.emailTemplate.upsert({
      where: { purpose },
      create: {
        purpose,
        subject,
        bodyHtml,
        variables: variables || [],
      },
      update: {
        subject,
        bodyHtml,
        variables: variables || [],
      },
    });

    return NextResponse.json({ template });
  } catch (e: any) {
    console.error("POST /api/admin/email/templates:", e);
    return NextResponse.json({ error: "Failed to save template" }, { status: 500 });
  }
}
