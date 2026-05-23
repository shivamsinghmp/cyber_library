import { NextResponse } from "next/server";
import DOMPurify from "isomorphic-dompurify";
import { sendEmail, sendBulkEmail } from "@/lib/email";
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

    const body = await request.json();
    const { to, toName, subject, html, text, purpose = "MANUAL", signatureId } = body;

    if (!to || !subject || !html) {
      return NextResponse.json({ error: "to, subject, html required" }, { status: 400 });
    }

    let finalHtml = sanitizeEmailHtml(String(html));
    if (signatureId) {
      const sig = await prisma.emailSignature.findUnique({ where: { id: signatureId } });
      if (sig) finalHtml += sig.html;
    }

    const ok = await sendEmail({ to, toName, subject, html: finalHtml, text, purpose });
    return ok
      ? NextResponse.json({ success: true })
      : NextResponse.json({ error: "Failed to send. Check RESEND_API_KEY." }, { status: 500 });
  } catch (e) {
    console.error("POST /api/admin/email/send-custom:", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
