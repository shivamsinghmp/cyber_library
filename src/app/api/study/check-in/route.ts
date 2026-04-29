import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { requireUser } from "@/lib/api-helpers";

const bodySchema = z.object({ studySlotId: z.string().min(1) });

const SUBSCRIPTION_DAYS = 30;

/** POST: Record a room check-in for the current user. Requires active subscription to the slot. */
export async function POST(request: Request) {
  try {
    const auth = await requireUser();
    if (auth.error) return auth.error;
    const { user } = auth;
    const userId = user.id;

    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid studySlotId" }, { status: 400 });
    }
    const { studySlotId } = parsed.data;

    const sub = await prisma.roomSubscription.findUnique({
      where: { userId_studySlotId: { userId, studySlotId } },
    });
    if (!sub) {
      return NextResponse.json({ error: "Not subscribed to this room" }, { status: 403 });
    }

    const endDate = new Date(sub.createdAt);
    endDate.setDate(endDate.getDate() + SUBSCRIPTION_DAYS);
    if (endDate < new Date()) {
      return NextResponse.json({ error: "Subscription expired" }, { status: 403 });
    }

    await prisma.roomCheckIn.create({
      data: { userId, studySlotId },
    });

    return NextResponse.json({ ok: true, message: "Checked in successfully" });
  } catch (e) {
    console.error("POST /api/study/check-in:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
