import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/api-helpers";

export async function GET() {
  try {
    const auth = await requireSuperAdmin();
    if (auth.error) return auth.error;
    const sigs = await prisma.emailSignature.findMany({ orderBy: { createdAt: "desc" } });
    return NextResponse.json(sigs);
  } catch (e) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireSuperAdmin();
    if (auth.error) return auth.error;
    const { name, html, isDefault } = await request.json();
    if (!name || !html) return NextResponse.json({ error: "name and html required" }, { status: 400 });

    if (isDefault) {
      await prisma.emailSignature.updateMany({ data: { isDefault: false } });
    }

    const sig = await prisma.emailSignature.create({ data: { name, html, isDefault: isDefault ?? false } });
    return NextResponse.json(sig, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const auth = await requireSuperAdmin();
    if (auth.error) return auth.error;
    const { id, name, html, isDefault } = await request.json();
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    if (isDefault) {
      await prisma.emailSignature.updateMany({ where: { id: { not: id } }, data: { isDefault: false } });
    }

    const sig = await prisma.emailSignature.update({ where: { id }, data: { name, html, isDefault } });
    return NextResponse.json(sig);
  } catch (e) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await requireSuperAdmin();
    if (auth.error) return auth.error;
    const { id } = await request.json();
    await prisma.emailSignature.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
