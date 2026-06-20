import { NextResponse } from "next/server";
import DOMPurify from "isomorphic-dompurify";
import { sendBulkEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/api-helpers";

function sanitizeEmailHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    FORBID_TAGS: ["script", "iframe", "object", "embed", "form", "input", "button", "meta", "link"],
    FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover", "onfocus", "onblur"],
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel|cid):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
  });
}

export async function POST(request: Request) {
  try {
    const auth = await requireSuperAdmin();
    if (auth.error) return auth.error;

    const { recipientFilter, subject, html, signatureId } = await request.json();

    if (!subject || !html) {
      return NextResponse.json({ error: "subject and html required" }, { status: 400 });
    }

    let finalHtml = sanitizeEmailHtml(String(html));
    if (signatureId) {
      const sig = await prisma.emailSignature.findUnique({ where: { id: signatureId as string } });
      if (sig) finalHtml += sig.html;
    }

    // Get all users matching filter
    const users = await prisma.user.findMany({
      where: recipientFilter === "subscribed"
        ? { userSubscriptions: { some: { status: "ACTIVE" } } }
        : {},
      select: {
        email: true,
        profile: { select: { fullName: true } },
      },
      take: 2000,
    });

    const recipients = users.map((u) => ({ email: u.email, name: u.profile?.fullName ?? null }));

    if (recipients.length === 0) {
      return NextResponse.json({ error: "No recipients found" }, { status: 400 });
    }

    const result = await sendBulkEmail({ recipients, subject, html: finalHtml, purpose: "BULK" });

    return NextResponse.json({ success: true, ...result, total: recipients.length });
  } catch (e) {
    console.error("POST /api/admin/email/bulk-send:", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
