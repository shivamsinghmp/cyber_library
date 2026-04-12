import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { sendEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";

const role = (u: unknown) => (u as { role?: string })?.role;

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user || role(session.user) !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { to, subject, message, accountId } = await request.json();

    if (!to || !subject || !message) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Attempt to parse support template if exists, else generic fallback
    let finalHtml = "";
    try {
      const template = await prisma.emailTemplate.findUnique({
        where: { purpose: "SUPPORT_REPLY" },
      });
      if (template) {
        finalHtml = template.bodyHtml
          .replace(/\{\{message\}\}/g, message.replace(/\n/g, "<br>"))
          .replace(/\{\{email\}\}/g, to);
      }
    } catch {}

    if (!finalHtml) {
      finalHtml = `
        <div style="font-family: sans-serif; padding: 20px; color: #111;">
          <p>${message.replace(/\n/g, "<br>")}</p>
          <hr style="margin-top: 30px; border-color: #eee;" />
          <p style="font-size: 12px; color: #777;">The Cyber Library Support Team</p>
        </div>
      `;
    }

    const success = await sendEmail({
      purpose: "SUPPORT",
      accountId,
      to,
      subject,
      html: finalHtml,
      text: message,
    });

    if (success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: "Failed to send email. Check SMTP/Gmail account config." }, { status: 500 });
    }
  } catch (e) {
    console.error("POST /api/admin/email/send-custom error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
