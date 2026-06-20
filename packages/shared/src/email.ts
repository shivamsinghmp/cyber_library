/**
 * Email via Resend API only.
 * RESEND_API_KEY and RESEND_FROM must be set in .env.
 * Every sent email is logged to EmailLog with resendId for webhook tracking.
 */

import { Resend } from "resend";
import { prisma } from "./prisma";
import { getAppSetting } from "./app-settings";

type OtpContext = "verify" | "reset";

// ─── Resend client ─────────────────────────────────────────────────────────────

async function getResendClient(): Promise<Resend | null> {
  const apiKey = process.env.RESEND_API_KEY?.trim() || (await getAppSetting("RESEND_API_KEY"));
  if (!apiKey) return null;
  return new Resend(apiKey);
}

async function getFromAddress(): Promise<string> {
  return (
    process.env.RESEND_FROM?.trim() ||
    (await getAppSetting("RESEND_FROM")) ||
    "Let's Study <no-reply@lstudy.in>"
  );
}

// ─── Core send + log ───────────────────────────────────────────────────────────

async function sendAndLog({
  to,
  toName,
  subject,
  html,
  text,
  purpose,
}: {
  to: string;
  toName?: string | null;
  subject: string;
  html: string;
  text?: string;
  purpose: string;
}): Promise<boolean> {
  const resend = await getResendClient();
  const from = await getFromAddress();

  if (!resend) {
    console.warn("[Email] RESEND_API_KEY not set — email not sent.");
    await prisma.emailLog.create({
      data: { toEmail: to, toName: toName ?? null, subject, purpose, status: "FAILED", errorMessage: "RESEND_API_KEY not configured" },
    }).catch(() => {});
    return false;
  }

  try {
    const { data, error } = await resend.emails.send({ from, to, subject, html, text: text ?? "" });

    if (error || !data?.id) {
      const msg = error ? JSON.stringify(error) : "No ID returned";
      console.error("[Email] Resend error:", msg);
      await prisma.emailLog.create({
        data: { toEmail: to, toName: toName ?? null, subject, purpose, status: "FAILED", errorMessage: msg },
      }).catch(() => {});
      return false;
    }

    await prisma.emailLog.create({
      data: { resendId: data.id, toEmail: to, toName: toName ?? null, subject, purpose, status: "SENT" },
    }).catch(() => {});

    return true;
  } catch (e) {
    const msg = (e as Error)?.message ?? "Unknown error";
    console.error("[Email] Send failed:", msg);
    await prisma.emailLog.create({
      data: { toEmail: to, toName: toName ?? null, subject, purpose, status: "FAILED", errorMessage: msg },
    }).catch(() => {});
    return false;
  }
}

// ─── Template helpers ──────────────────────────────────────────────────────────

function escHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

function applyVars(template: string, vars: Record<string, string>): string {
  return Object.entries(vars).reduce(
    (str, [key, val]) => str.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), val),
    template
  );
}

async function getDefaultSignature(): Promise<string> {
  try {
    const sig = await prisma.emailSignature.findFirst({ where: { isDefault: true } });
    return sig?.html ?? "";
  } catch {
    return "";
  }
}

function defaultOtpHtml(code: string, name: string | null | undefined, context: OtpContext): string {
  const headline = context === "verify" ? "Verify Your Email" : "Reset Your Password";
  const greeting = name ? `Hi ${name},` : "Hi,";
  const subtext  = context === "verify"
    ? "Use the OTP below to verify your email and complete signup."
    : "Use this OTP to reset your password. Do not share it with anyone.";
  return `
<div style="font-family:Inter,sans-serif;padding:32px;background:#f4f4f5;">
  <div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:16px;border:1px solid #e4e4e7;padding:36px;">
    <p style="font-size:13px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#6366f1;margin:0 0 12px;">Let's Study</p>
    <h1 style="font-size:22px;font-weight:800;color:#09090b;margin:0 0 8px;">${headline}</h1>
    <p style="color:#52525b;font-size:14px;margin:0 0 28px;">${greeting}<br/>${subtext}</p>
    <div style="background:#f4f4f5;border-radius:12px;padding:20px;text-align:center;margin-bottom:28px;">
      <span style="font-size:36px;font-weight:900;letter-spacing:8px;color:#09090b;font-family:monospace;">${code}</span>
      <p style="font-size:12px;color:#71717a;margin:10px 0 0;">Expires in 10 minutes</p>
    </div>
    <p style="font-size:12px;color:#a1a1aa;margin:0;">If you didn't request this, ignore this email.</p>
  </div>
</div>`;
}

function defaultVerifyHtml(verifyUrl: string, name: string | null | undefined): string {
  const greeting = name ? `Hi ${name},` : "Hi,";
  return `
<div style="font-family:Inter,sans-serif;padding:32px;background:#f4f4f5;">
  <div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:16px;border:1px solid #e4e4e7;padding:36px;">
    <p style="font-size:13px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#6366f1;margin:0 0 12px;">Let's Study</p>
    <h1 style="font-size:22px;font-weight:800;color:#09090b;margin:0 0 8px;">Verify Your Email</h1>
    <p style="color:#52525b;font-size:14px;margin:0 0 28px;">${greeting}<br/>Click the button below to verify your email address.</p>
    <a href="${verifyUrl}" style="display:inline-block;background:#6366f1;color:#fff;font-weight:700;font-size:14px;padding:14px 28px;border-radius:12px;text-decoration:none;">Verify Email →</a>
    <p style="font-size:12px;color:#a1a1aa;margin:24px 0 8px;">This link expires in 24 hours.</p>
    <p style="font-size:11px;color:#d4d4d8;word-break:break-all;">Or copy: ${verifyUrl}</p>
  </div>
</div>`;
}

// ─── OTP Email ─────────────────────────────────────────────────────────────────

export async function sendOtpEmail(
  to: string,
  code: string,
  context: OtpContext,
  name?: string | null
) {
  const templatePurpose = context === "verify" ? "OTP_VERIFY" : "OTP_RESET";
  const defaultSubject  = context === "verify"
    ? "Verify your Let's Study account"
    : "Your password reset OTP — Let's Study";

  let subject = defaultSubject;
  let html    = "";

  try {
    const tpl = await prisma.emailTemplate.findUnique({ where: { purpose: templatePurpose } });
    if (tpl) {
      subject = tpl.subject;
      html    = applyVars(tpl.bodyHtml, { code, name: name ?? "there" });
    }
  } catch {}

  if (!html) html = defaultOtpHtml(code, name, context);

  const sig = await getDefaultSignature();
  if (sig) html += sig;

  return sendAndLog({ to, toName: name, subject, html, text: `Your OTP: ${code} (expires in 10 min)`, purpose: "OTP" });
}

// ─── Email Verification (magic link) ──────────────────────────────────────────

export async function sendMagicLinkEmail(to: string, verifyUrl: string, name?: string | null) {
  let subject = "Verify your Let's Study account";
  let html    = "";

  try {
    const tpl = await prisma.emailTemplate.findUnique({ where: { purpose: "MAGIC_LINK_VERIFY" } });
    if (tpl) {
      subject = tpl.subject;
      html    = applyVars(tpl.bodyHtml, { name: name ?? "there", verify_url: verifyUrl });
    }
  } catch {}

  if (!html) html = defaultVerifyHtml(verifyUrl, name);

  const sig = await getDefaultSignature();
  if (sig) html += sig;

  return sendAndLog({ to, toName: name, subject, html, text: `Verify your email: ${verifyUrl}`, purpose: "MAGIC_LINK" });
}

// ─── Purchase Receipt ──────────────────────────────────────────────────────────

type ReceiptItem = { name: string; price: number };
type EnrolledRoom = { name: string; timeLabel: string; meetLink: string | null };

export async function sendPurchaseReceipt({
  to,
  customerName,
  transactionId,
  items,
  totalAmount,
  paymentId,
  planType,
  membershipStart,
  membershipEnd,
  enrolledRooms,
}: {
  to: string;
  customerName?: string | null;
  transactionId: string;
  items: ReceiptItem[];
  totalAmount: number;
  paymentId?: string | null;
  planType?: "MONTHLY" | "YEARLY" | null;
  membershipStart?: Date | null;
  membershipEnd?: Date | null;
  enrolledRooms?: EnrolledRoom[] | null;
}) {
  const siteUrl    = process.env.NEXT_PUBLIC_SITE_URL ?? "https://lstudy.in";
  const logoUrl    = `${siteUrl}/logo.png`;
  const receiptUrl = `${siteUrl}/dashboard/receipt/${transactionId}`;
  const isSubscription = !!planType;

  const firstName = escHtml(customerName?.split(" ")[0] ?? "Student");
  const safeEmail = escHtml(to);
  const date      = new Date().toLocaleString("en-IN", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });

  const fmtDate = (d: Date) =>
    d.toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });

  const subject = isSubscription
    ? `🎉 Welcome to Premium — Let's Study`
    : `Payment Confirmed — Let's Study`;

  const rows = items
    .map(
      (i) => `
      <tr>
        <td style="padding:12px 16px;border-bottom:1px solid #ede9fe;color:#374151;font-size:14px;">${i.name}</td>
        <td style="padding:12px 16px;border-bottom:1px solid #ede9fe;text-align:right;color:#111827;font-weight:700;font-size:14px;">₹${i.price.toLocaleString("en-IN")}</td>
      </tr>`
    )
    .join("");

  const subscriptionBadge = isSubscription
    ? `<div style="text-align:center;margin-bottom:24px;">
        <span style="display:inline-block;background:linear-gradient(135deg,#fbbf24,#f59e0b);color:#fff;font-size:11px;font-weight:800;letter-spacing:3px;text-transform:uppercase;padding:6px 18px;border-radius:100px;">
          ✦ PREMIUM MEMBER ✦
        </span>
       </div>`
    : "";

  const membershipBlock = isSubscription && membershipStart && membershipEnd
    ? `<div style="margin:20px 0;background:linear-gradient(135deg,#ede9fe,#ddd6fe);border-radius:12px;padding:20px 24px;">
        <p style="margin:0 0 12px;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#7c3aed;">Membership Details</p>
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="font-size:13px;color:#4c1d95;padding:4px 0;">Plan</td>
            <td style="font-size:13px;font-weight:700;color:#1e1b4b;text-align:right;">${planType === "MONTHLY" ? "Monthly" : "Yearly"} Membership</td>
          </tr>
          <tr>
            <td style="font-size:13px;color:#4c1d95;padding:4px 0;">Start Date</td>
            <td style="font-size:13px;font-weight:700;color:#1e1b4b;text-align:right;">${fmtDate(membershipStart)}</td>
          </tr>
          <tr>
            <td style="font-size:13px;color:#4c1d95;padding:4px 0;">Valid Until</td>
            <td style="font-size:13px;font-weight:700;color:#1e1b4b;text-align:right;">${fmtDate(membershipEnd)}</td>
          </tr>
        </table>
       </div>`
    : "";

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f5f3ff;font-family:'Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:560px;margin:32px auto;padding:0 16px 48px;">

    <!-- Header with gradient -->
    <div style="background:linear-gradient(135deg,#1e1b4b 0%,#3730a3 60%,#4c1d95 100%);border-radius:20px 20px 0 0;padding:32px 36px 28px;text-align:center;">
      <img src="${logoUrl}" alt="Let's Study" width="64" height="64" style="border-radius:16px;margin-bottom:16px;display:block;margin-left:auto;margin-right:auto;" />
      <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:4px;text-transform:uppercase;color:#a5b4fc;">LET'S STUDY</p>
      <p style="margin:4px 0 0;font-size:12px;color:#6366f1;letter-spacing:3px;opacity:0.7;">LEARN · GROW · CONNECT</p>
    </div>

    <!-- White card body -->
    <div style="background:#ffffff;padding:36px 36px 28px;border-left:1px solid #e0d7ff;border-right:1px solid #e0d7ff;">

      <!-- Hero check -->
      <div style="text-align:center;margin-bottom:28px;">
        <div style="width:56px;height:56px;background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:50%;display:inline-flex;align-items:center;justify-content:center;margin-bottom:14px;">
          <span style="font-size:26px;line-height:1;">✓</span>
        </div>
        <h1 style="margin:0 0 6px;font-size:22px;font-weight:800;color:#111827;">
          ${isSubscription ? "Welcome to Premium! 🎉" : "Payment Confirmed ✓"}
        </h1>
        <p style="margin:0;color:#6b7280;font-size:14px;">
          ${isSubscription
            ? `${firstName}, you're now a Premium Member of Let's Study.`
            : `Hi ${firstName}, your payment was successful.`}
        </p>
      </div>

      ${subscriptionBadge}
      ${membershipBlock}

      <!-- Items table -->
      <table style="width:100%;border-collapse:collapse;margin-bottom:4px;">
        <thead>
          <tr style="background:#f5f3ff;">
            <th style="padding:10px 16px;text-align:left;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#7c3aed;border-radius:8px 0 0 8px;">Description</th>
            <th style="padding:10px 16px;text-align:right;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#7c3aed;border-radius:0 8px 8px 0;">Amount</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
        <tfoot>
          <tr style="background:#f5f3ff;">
            <td style="padding:14px 16px;font-weight:800;font-size:15px;color:#111827;border-radius:8px 0 0 8px;">Total Paid</td>
            <td style="padding:14px 16px;text-align:right;font-size:20px;font-weight:900;color:#6366f1;border-radius:0 8px 8px 0;">₹${totalAmount.toLocaleString("en-IN")}</td>
          </tr>
        </tfoot>
      </table>

      <!-- Transaction details -->
      <div style="margin:24px 0;background:#fafafa;border:1px solid #e5e7eb;border-radius:12px;padding:16px 20px;">
        <p style="margin:0 0 10px;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#9ca3af;">Transaction Details</p>
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <tr>
            <td style="color:#6b7280;padding:3px 0;">Transaction ID</td>
            <td style="font-family:monospace;font-size:12px;font-weight:600;color:#111827;text-align:right;">${transactionId}</td>
          </tr>
          ${paymentId ? `<tr><td style="color:#6b7280;padding:3px 0;">Payment ID</td><td style="font-family:monospace;font-size:12px;font-weight:600;color:#111827;text-align:right;">${paymentId}</td></tr>` : ""}
          <tr>
            <td style="color:#6b7280;padding:3px 0;">Date & Time</td>
            <td style="font-weight:600;color:#111827;text-align:right;">${date}</td>
          </tr>
          <tr>
            <td style="color:#6b7280;padding:3px 0;">Email</td>
            <td style="font-weight:600;color:#111827;text-align:right;">${safeEmail}</td>
          </tr>
        </table>
      </div>

      <!-- View receipt button -->
      <div style="text-align:center;margin-bottom:24px;">
        <a href="${receiptUrl}" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;padding:14px 32px;border-radius:12px;">
          View & Download Receipt →
        </a>
      </div>

      ${enrolledRooms && enrolledRooms.length > 0 ? `
      <!-- Study Room Meet Links -->
      <div style="margin:0 0 24px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:16px 20px;">
        <p style="margin:0 0 12px;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#16a34a;">Your Study Rooms</p>
        ${enrolledRooms.map(r => {
          const safeName = escHtml(r.name);
          const safeTime = escHtml(r.timeLabel);
          const safeLink = r.meetLink && /^https:\/\//i.test(r.meetLink) ? escHtml(r.meetLink) : null;
          return `
        <div style="margin-bottom:12px;padding:12px 14px;background:#ffffff;border:1px solid #d1fae5;border-radius:10px;">
          <p style="margin:0 0 2px;font-size:14px;font-weight:700;color:#111827;">${safeName}</p>
          <p style="margin:0 0 10px;font-size:12px;color:#6b7280;">${safeTime}</p>
          ${safeLink
            ? `<a href="${safeLink}" style="display:inline-block;background:#16a34a;color:#fff;text-decoration:none;font-weight:700;font-size:13px;padding:8px 18px;border-radius:8px;">Join Google Meet →</a>`
            : `<span style="font-size:12px;color:#9ca3af;">Meet link will be shared soon</span>`
          }
        </div>`;
        }).join("")}
        <p style="margin:8px 0 0;font-size:11px;color:#15803d;">✓ You will be auto-admitted to these sessions. A Google Calendar invite is also being sent.</p>
      </div>` : ""}

      ${isSubscription ? `
      <!-- What's included -->
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:16px 20px;margin-bottom:24px;">
        <p style="margin:0 0 10px;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#16a34a;">What You Get</p>
        <ul style="margin:0;padding:0 0 0 16px;font-size:13px;color:#166534;line-height:1.9;">
          <li>Unlimited access to all study rooms</li>
          <li>StudyMate AI — unlimited messages</li>
          <li>Live Google Meet sessions with auto-admit</li>
          <li>Leaderboard, streaks & coin rewards</li>
          <li>Priority support</li>
        </ul>
      </div>` : ""}

      <!-- Support -->
      <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">
        Questions? Reach us at <a href="mailto:support@lstudy.in" style="color:#6366f1;text-decoration:none;">support@lstudy.in</a>
      </p>
    </div>

    <!-- Footer -->
    <div style="background:#1e1b4b;border-radius:0 0 20px 20px;padding:20px 36px;text-align:center;">
      <p style="margin:0 0 4px;font-size:11px;color:#6366f1;letter-spacing:2px;text-transform:uppercase;">Let's Study</p>
      <p style="margin:0;font-size:11px;color:#4c4477;">© ${new Date().getFullYear()} lstudy.in — All rights reserved</p>
    </div>

  </div>
</body>
</html>`;

  const text = `${isSubscription ? "Welcome to Premium! — Let's Study" : "Payment Confirmed — Let's Study"}\n\nHi ${firstName},\n\nTotal: ₹${totalAmount}\nTransaction: ${transactionId}\nDate: ${date}\n\nView receipt: ${receiptUrl}\n\nSupport: support@lstudy.in`;

  return sendAndLog({ to, toName: customerName, subject, html, text, purpose: "RECEIPT" });
}

// ─── General / custom send ─────────────────────────────────────────────────────

export async function sendEmail({
  to,
  toName,
  subject,
  html,
  text,
  purpose = "GENERAL",
}: {
  to: string;
  toName?: string | null;
  subject: string;
  html: string;
  text?: string;
  purpose?: string;
}): Promise<boolean> {
  return sendAndLog({ to, toName, subject, html, text, purpose });
}

// ─── Bulk send ─────────────────────────────────────────────────────────────────

export async function sendBulkEmail({
  recipients,
  subject,
  html,
  purpose = "BULK",
}: {
  recipients: { email: string; name?: string | null }[];
  subject: string;
  html: string;
  purpose?: string;
}): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;

  for (const r of recipients) {
    const personalizedHtml = applyVars(html, { name: r.name ?? "there", email: r.email });
    const ok = await sendAndLog({ to: r.email, toName: r.name, subject, html: personalizedHtml, purpose });
    ok ? sent++ : failed++;
    // Small delay to avoid Resend rate limits
    await new Promise((res) => setTimeout(res, 100));
  }

  return { sent, failed };
}
