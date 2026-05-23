import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";

/**
 * Resend webhook — receives delivery/open/click events.
 * Setup in Resend Dashboard → Webhooks → POST https://yourdomain.com/api/webhooks/resend
 * Events to enable: email.sent, email.delivered, email.opened, email.clicked, email.bounced, email.complained
 *
 * Set RESEND_WEBHOOK_SECRET in env (the `whsec_...` value from Resend dashboard).
 * Signature scheme is Svix-compatible (the provider Resend uses).
 */

type ResendWebhookEvent = {
  type: string;
  data: {
    email_id: string;
    created_at?: string;
    [key: string]: unknown;
  };
};

const MAX_TIMESTAMP_SKEW_SECONDS = 5 * 60; // 5 min

function verifySvixSignature(
  rawBody: string,
  headers: Headers,
  secret: string
): boolean {
  const svixId = headers.get("svix-id");
  const svixTimestamp = headers.get("svix-timestamp");
  const svixSignature = headers.get("svix-signature");
  if (!svixId || !svixTimestamp || !svixSignature) return false;

  // Reject stale/future-dated messages to prevent replay
  const ts = Number(svixTimestamp);
  if (!Number.isFinite(ts)) return false;
  const nowSec = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSec - ts) > MAX_TIMESTAMP_SKEW_SECONDS) return false;

  // Strip "whsec_" prefix and base64-decode to get the raw signing key
  const key = secret.startsWith("whsec_")
    ? Buffer.from(secret.slice("whsec_".length), "base64")
    : Buffer.from(secret, "utf8");

  const signedPayload = `${svixId}.${svixTimestamp}.${rawBody}`;
  const expected = createHmac("sha256", key).update(signedPayload).digest();

  // Header format: "v1,<b64sig> v1,<b64sig> ..." — accept if any matches
  const candidates = svixSignature.split(" ");
  for (const candidate of candidates) {
    const [version, sig] = candidate.split(",");
    if (version !== "v1" || !sig) continue;
    let actual: Buffer;
    try {
      actual = Buffer.from(sig, "base64");
    } catch {
      continue;
    }
    if (actual.length !== expected.length) continue;
    if (timingSafeEqual(actual, expected)) return true;
  }
  return false;
}

export async function POST(request: Request) {
  try {
    const secret = process.env.RESEND_WEBHOOK_SECRET;
    if (!secret) {
      console.error("[resend-webhook] RESEND_WEBHOOK_SECRET not configured — rejecting all events");
      return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
    }

    // Must read raw body for signature verification BEFORE JSON.parse
    const rawBody = await request.text();
    if (!verifySvixSignature(rawBody, request.headers, secret)) {
      console.warn("[resend-webhook] Invalid signature — rejecting");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const body = JSON.parse(rawBody) as ResendWebhookEvent;
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
