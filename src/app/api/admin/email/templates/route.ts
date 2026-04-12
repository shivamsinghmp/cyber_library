import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const role = (u: unknown) => (u as { role?: string })?.role;

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || role(session.user) !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

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
    const session = await auth();
    if (!session?.user || role(session.user) !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

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
