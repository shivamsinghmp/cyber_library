import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/api-helpers";

export async function GET() {
  try {
    const auth = await requireSuperAdmin();
    if (auth.error) return auth.error;
    const { user } = auth;

    const feedbacks = await prisma.feedback.findMany({
      include: {
        user: { select: { id: true, studentId: true, name: true, email: true } }
      },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json({ feedbacks });
  } catch (error) {
    console.error("Admin Feedback Fetch Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const auth = await requireSuperAdmin();
    if (auth.error) return auth.error;
    const { user } = auth;
    
    const { id, status } = await req.json();
    if (!id || !status) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

    const updated = await prisma.feedback.update({
      where: { id },
      data: { status }
    });

    return NextResponse.json({ success: true, feedback: updated });
  } catch (error) {
    console.error("Admin Feedback Update Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
