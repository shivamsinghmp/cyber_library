import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/api-helpers";

export async function GET() {
  try {
    const auth = await requireSuperAdmin();
    if (auth.error) return auth.error;
    const { user } = auth;

    const drafts = await prisma.emailDraft.findMany({ orderBy: { createdAt: "desc" } });
    return NextResponse.json(drafts);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch drafts" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireSuperAdmin();
    if (auth.error) return auth.error;
    const { user } = auth;

    const { id, name, subject, bodyHtml } = await req.json();
    if (!name || !subject || !bodyHtml) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

    if (id) {
      const updated = await prisma.emailDraft.update({
        where: { id },
        data: { name, subject, bodyHtml },
      });
      return NextResponse.json(updated);
    } else {
      const created = await prisma.emailDraft.create({
        data: { name, subject, bodyHtml },
      });
      return NextResponse.json(created);
    }
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to save draft" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const auth = await requireSuperAdmin();
    if (auth.error) return auth.error;
    const { user } = auth;

    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

    await prisma.emailDraft.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to delete draft" }, { status: 500 });
  }
}
