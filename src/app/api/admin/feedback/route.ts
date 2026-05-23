import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/api-helpers";

export async function GET() {
  try {
    const auth = await requireSuperAdmin();
    if (auth.error) return auth.error;

    const feedbacks = await prisma.feedback.findMany({
      include: {
        user: { select: { id: true, studentId: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 500,
    });

    return NextResponse.json({ feedbacks });
  } catch (error) {
    console.error("Admin Feedback Fetch Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

const ALLOWED_FEEDBACK_STATUS = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"] as const;

export async function PATCH(req: Request) {
  try {
    const auth = await requireSuperAdmin();
    if (auth.error) return auth.error;

    const { id, status } = await req.json();
    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }
    if (!status || !ALLOWED_FEEDBACK_STATUS.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

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
