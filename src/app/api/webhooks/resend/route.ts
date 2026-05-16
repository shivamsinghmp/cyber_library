import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Resend webhook — receives delivery/open/click events.
 * Setup in Resend Dashboard → Webhooks → POST https://yourdomain.com/api/webhooks/resend
 * Events to enable: email.sent, email.delivered, email.opened, email.clicked, email.bounced, email.complained
 */

type ResendWebhookEvent = {
  type: string;
  data: {
    email_id: string;
    created_at?: string;
    [key: string]: unknown;
  };
};

export async function POST(request: Request) {
  try {
    const body = await request.json() as ResendWebhookEvent;
    const { type, data } = body;
    const resendId = data?.email_id;

    if (!resendId) {
      return NextResponse.json({ ok: false, error: "No email_id" }, { status: 400 });
    }

    const now = new Date();

    switch (type) {
      case "email.delivered":
        await prisma.emailLog.updateMany({
          where: { resendId },
          data: { status: "DELIVERED", deliveredAt: now },
        });
        break;

      case "email.opened":
        await prisma.emailLog.updateMany({
          where: { resendId },
          data: { status: "OPENED", openedAt: now },
        });
        break;

      case "email.clicked":
        await prisma.emailLog.updateMany({
          where: { resendId },
          data: { clickedAt: now },
        });
        break;

      case "email.bounced":
      case "email.complained":
        await prisma.emailLog.updateMany({
          where: { resendId },
          data: { status: "BOUNCED", bouncedAt: now },
        });
        break;

      case "email.failed":
        await prisma.emailLog.updateMany({
          where: { resendId },
          data: { status: "FAILED" },
        });
        break;

      default:
        // Unknown event type — ignore
        break;
    }

    return NextResponse.json({ ok: true, type });
  } catch (e) {
    console.error("Resend webhook error:", e);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
