import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/api-helpers";
import { logAdminAction } from "@/lib/audit-logger";

const postSchema = z.object({
  userId:  z.string().min(1),
  blocked: z.boolean(),
});

/**
 * POST: block/unblock a user from the interactive WhatsApp AI bot.
 * Orthogonal to Profile.whatsappMarketing (the STOP/UNSUBSCRIBE opt-out,
 * which only gates marketing broadcasts) — this gates the AI bot only.
 */
export async function POST(request: Request) {
  try {
    const auth = await requireSuperAdmin();
    if (auth.error) return auth.error;
    const { user } = auth;

    const body = await request.json();
    const parsed = postSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }
    const { userId, blocked } = parsed.data;

    await prisma.profile.update({
      where: { userId },
      data:  { whatsappBotBlocked: blocked },
    });

    await logAdminAction(
      user.id, "UPDATE", "ENGAGEMENT",
      `whatsapp_bot_block userId=${userId} blocked=${blocked}`
    );

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("POST /api/admin/whatsapp/block:", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
