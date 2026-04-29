import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/encrypt";
import { requireSuperAdmin } from "@/lib/api-helpers";

export async function GET() {
  try {
    const auth = await requireSuperAdmin();
    if (auth.error) return auth.error;
    const { user } = auth;

    const accounts = await prisma.emailAccount.findMany({
      orderBy: { createdAt: "desc" },
    });

    // Strip passwords before returning
    const safeAccounts = accounts.map((act) => ({
      id: act.id,
      email: act.email,
      purpose: act.purpose,
      isActive: act.isActive,
      senderName: act.senderName,
      createdAt: act.createdAt,
    }));

    return NextResponse.json(safeAccounts);
  } catch (e) {
    console.error("GET /api/admin/email/accounts:", e);
    return NextResponse.json({ error: "Failed to fetch accounts" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireSuperAdmin();
    if (auth.error) return auth.error;
    const { user } = auth;

    const { email, password, purpose, senderName } = await request.json();
    if (!email || !password || !purpose) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const { encrypted, iv } = encrypt(password);

    const newAccount = await prisma.emailAccount.create({
      data: {
        email,
        passwordEncrypted: encrypted,
        iv,
        purpose,
        senderName: senderName || "The Cyber Library",
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        purpose: true,
        isActive: true,
        senderName: true,
      }
    });

    return NextResponse.json({ account: newAccount });
  } catch (e: any) {
    console.error("POST /api/admin/email/accounts:", e);
    if (e.code === 'P2002') return NextResponse.json({ error: "Email already exists" }, { status: 400 });
    return NextResponse.json({ error: "Failed to create account" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await requireSuperAdmin();
    if (auth.error) return auth.error;
    const { user } = auth;

    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "No ID provided" }, { status: 400 });

    await prisma.emailAccount.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("DELETE /api/admin/email/accounts:", e);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await requireSuperAdmin();
    if (auth.error) return auth.error;
    const { user } = auth;

    const body = await request.json();
    const { id, isActive, purpose, senderName } = body;
    if (!id) return NextResponse.json({ error: "No ID provided" }, { status: 400 });

    const updated = await prisma.emailAccount.update({
      where: { id },
      data: {
        ...(isActive !== undefined && { isActive }),
        ...(purpose !== undefined && { purpose }),
        ...(senderName !== undefined && { senderName }),
      },
      select: {
        id: true, email: true, purpose: true, isActive: true, senderName: true
      }
    });

    return NextResponse.json({ account: updated });
  } catch (e) {
    console.error("PATCH /api/admin/email/accounts:", e);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}
