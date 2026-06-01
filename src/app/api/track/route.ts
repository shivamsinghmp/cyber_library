import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { type InputJsonValue } from "@prisma/client/runtime/library";
import { z } from "zod";

const VALID_EVENTS = [
  "PAGE_VIEW", "BUTTON_CLICK", "FEATURE_USED", "FORM_SUBMIT",
  "ERROR", "PAYMENT_INITIATED", "PAYMENT_SUCCESS", "PAYMENT_FAILED", "CUSTOM",
] as const;

const schema = z.object({
  event: z.enum(VALID_EVENTS),
  page:  z.string().max(500).optional(),
  // Zod v4: z.record() requires key schema + value schema
  meta:  z.record(z.string(), z.unknown()).optional(),
});

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({}, { status: 204 });

    const body = await request.json().catch(() => ({}));
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({}, { status: 204 });

    const { event, page, meta } = parsed.data;

    // Fire-and-forget style — don't block the client
    await prisma.studentEvent.create({
      data: { userId: session.user.id, event, page: page ?? null, meta: meta as InputJsonValue | undefined },
    });

    return NextResponse.json({ ok: true });
  } catch {
    // Never throw — tracking should never break the app
    return NextResponse.json({}, { status: 204 });
  }
}
