import nodemailer from "nodemailer";
import { prisma } from "./prisma";
import { decrypt } from "./encrypt";

type OtpContext = "verify" | "reset";

// Transporter Cache: account ID -> Transporter
const transporters = new Map<string, nodemailer.Transporter>();

/**
 * Load Mailer based on purpose.
 * If multiple exist, take the first active one.
 * Supported purposes: "OTP", "SUPPORT", "GENERAL"
 */
async function getMailerForPurpose(purposeOrAccountId: string, isAccountId: boolean = false) {
  try {
    const account = await prisma.emailAccount.findFirst({
      where: isAccountId ? { id: purposeOrAccountId, isActive: true } : { purpose: purposeOrAccountId, isActive: true },
      orderBy: { createdAt: "desc" },
    });

    if (account) {
      if (!transporters.has(account.id)) {
        const pass = decrypt(account.passwordEncrypted, account.iv);
        const host = (account as typeof account & { smtpHost?: string }).smtpHost || "smtp.gmail.com";
        const port = (account as typeof account & { smtpPort?: number }).smtpPort ?? 2525;
        const secure = port === 465;
        const transporter = nodemailer.createTransport({
          host,
          port,
          secure,
          auth: {
            user: account.email,
            pass: pass,
          },
          xMailer: false,
        });
        transporters.set(account.id, transporter);
      }
      return { 
        transporter: transporters.get(account.id)!, 
        from: `"${account.senderName}" <${account.email}>` 
      };
    }
  } catch (e) {
    console.error(`Failed to load DB EmailAccount for purpose ${purposeOrAccountId}:`, e);
  }

  // Fallback to legacy SMTP Setting or Env Vars
  let host = process.env.SMTP_HOST;
  let user = process.env.SMTP_USER;
  let pass = process.env.SMTP_PASS;
  let port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 2525;
  let from = process.env.SMTP_FROM || "The Cyber Library <no-reply@virtuallibrary.com>";

  try {
    const oldRow = await prisma.smtpSetting.findFirst({ orderBy: { updatedAt: "desc" } });
    if (oldRow?.host && oldRow?.user && oldRow?.passEncrypted && oldRow?.iv) {
      host = oldRow.host;
      user = oldRow.user;
      pass = decrypt(oldRow.passEncrypted, oldRow.iv);
      port = oldRow.port ?? port;
      from = oldRow.from || from;
    }
  } catch {}

  if (host && user && pass) {
    const fallbackId = "fallback";
    if (!transporters.has(fallbackId)) {
      transporters.set(fallbackId, nodemailer.createTransport({
        host, port, secure: port === 465, auth: { user, pass }
      }));
    }
    return { transporter: transporters.get(fallbackId)!, from };
  }

  return null;
}

export async function sendOtpEmail(to: string, code: string, context: OtpContext) {
  const mailer = await getMailerForPurpose("OTP");
  if (!mailer) {
    console.warn("[The Cyber Library] Email account not configured. Email not sent.");
    return;
  }

  const templatePurpose = context === "verify" ? "OTP_VERIFY" : "OTP_RESET";
  let subject = context === "verify" ? "Verify your The Cyber Library account" : "The Cyber Library password reset OTP";
  let html = "";
  let text = "";

  try {
    const template = await prisma.emailTemplate.findUnique({ where: { purpose: templatePurpose } });
    if (template) {
      subject = template.subject;
      html = template.bodyHtml.replace(/\{\{code\}\}/g, code);
      text = `Your OTP: ${code}`;
    }
  } catch (e) {
    console.error("Failed to load email template", e);
  }

  // Hardcoded Fallback if no template in DB
  if (!html) {
    const headline = context === "verify" ? "Verify your email" : "Reset your password";
    html = `
      <div style="font-family: sans-serif; padding: 24px; background:#0b0b0d;">
        <div style="max-width:480px;margin:0 auto;background:#030308;border-radius:16px;border:1px solid rgba(255,255,255,0.06);padding:24px;">
          <h1 style="color:#f5f2ea;">${headline}</h1>
          <div style="margin:20px 0;padding:16px;background:rgba(216,180,120,0.08);text-align:center;">
            <div style="font-size:28px;font-weight:700;color:#f5f2ea;letter-spacing:4px;">${code}</div>
          </div>
          <p style="color:#c3bfb3;">This code will expire in 10 minutes.</p>
        </div>
      </div>
    `;
    text = `Your OTP is ${code}. It expires in 10 minutes.`;
  }

  try {
    await mailer.transporter.sendMail({
      from: mailer.from,
      to,
      subject,
      text,
      html,
    });
    await prisma.emailLog.create({
      data: {
        toEmail: to,
        subject,
        purpose: "OTP",
        status: "SUCCESS",
        senderEmail: mailer.from
      }
    });
  } catch (err: any) {
    console.error("OTP email error", err);
    await prisma.emailLog.create({
      data: {
        toEmail: to,
        subject,
        purpose: "OTP",
        status: "FAILED",
        errorMessage: err?.message || String(err),
        senderEmail: mailer.from
      }
    });
  }
}

/** General purpose email sender (can be used for Support tickets or Contact Form replies) */
export async function sendEmail({
  to,
  subject,
  html,
  text,
  purpose = "GENERAL",
  accountId
}: {
  to: string;
  subject: string;
  html: string;
  text?: string;
  purpose?: string;
  accountId?: string;
}) {
  const mailer = await getMailerForPurpose(accountId || purpose, !!accountId);
  if (!mailer) {
    console.warn(`[Email] No configuration found for ${accountId ? 'account '+accountId : 'purpose '+purpose}`);
    return false;
  }

  try {
    await mailer.transporter.sendMail({
      from: mailer.from,
      to,
      subject,
      text: text || "Please open this email in an HTML compatible client.",
      html,
    });
    await prisma.emailLog.create({
      data: {
        toEmail: to,
        subject,
        purpose,
        status: "SUCCESS",
        senderEmail: mailer.from
      }
    });
    return true;
  } catch (e: any) {
    console.error("Send grid failed", e);
    await prisma.emailLog.create({
      data: {
        toEmail: to,
        subject,
        purpose,
        status: "FAILED",
        errorMessage: e?.message || String(e),
        senderEmail: mailer.from
      }
    });
    return false;
  }
}


