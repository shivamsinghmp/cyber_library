import nodemailer from "nodemailer";
import { prisma } from "./prisma";
import { decrypt } from "./encrypt";

type OtpContext = "verify" | "reset";

type SmtpConfig = {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
};

let cachedConfig: SmtpConfig | null = null;
let configLoaded = false;
let transporter: nodemailer.Transporter | null = null;

async function loadSmtpConfig(): Promise<SmtpConfig | null> {
  if (configLoaded) return cachedConfig;
  configLoaded = true;

  // 1) Try DB (admin settings)
  try {
    const row = await prisma.smtpSetting.findFirst({
      orderBy: { updatedAt: "desc" },
    });
    if (
      row &&
      row.host &&
      row.user &&
      row.passEncrypted &&
      row.iv
    ) {
      try {
        const pass = decrypt(row.passEncrypted, row.iv);
        const port =
          row.port ??
          (process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587);
        const from =
          row.from ||
          process.env.SMTP_FROM ||
          "The Cyber Library <no-reply@virtuallibrary.com>";
        cachedConfig = {
          host: row.host,
          port,
          user: row.user,
          pass,
          from,
        };
        return cachedConfig;
      } catch (e) {
        console.error("Failed to decrypt SMTP password:", e);
      }
    }
  } catch (e) {
    console.error("Error loading SMTP settings from DB:", e);
  }

  // 2) Fallback to environment variables
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587;
  const from =
    process.env.SMTP_FROM || "The Cyber Library <no-reply@virtuallibrary.com>";

  if (host && user && pass) {
    cachedConfig = { host, port, user, pass, from };
  } else {
    cachedConfig = null;
  }
  return cachedConfig;
}

export async function sendOtpEmail(to: string, code: string, context: OtpContext) {
  const subject =
    context === "verify"
      ? "Verify your The Cyber Library account"
      : "The Cyber Library password reset OTP";

  const headline =
    context === "verify"
      ? "Verify your email to activate your account"
      : "Use this OTP to reset your password";

  const intro =
    context === "verify"
      ? "Thank you for signing up for The Cyber Library. Use the code below to verify your email address."
      : "We received a request to reset the password for your The Cyber Library account.";

  const outro =
    context === "verify"
      ? "If you did not try to create an account, you can safely ignore this email."
      : "If you did not request this reset, you can safely ignore this email.";

  const html = `
  <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 24px; background:#0b0b0d;">
    <div style="max-width:480px;margin:0 auto;background:#030308;border-radius:16px;border:1px solid rgba(255,255,255,0.06);padding:24px;">
      <h1 style="margin:0 0 8px;font-size:20px;color:#f5f2ea;">${headline}</h1>
      <p style="margin:0 0 12px;font-size:14px;color:#c3bfb3;">${intro}</p>
      <div style="margin:20px 0;padding:16px 20px;border-radius:12px;background:rgba(216,180,120,0.08);border:1px solid rgba(216,180,120,0.4);text-align:center;">
        <div style="font-size:12px;text-transform:uppercase;letter-spacing:0.12em;color:#d8b478;margin-bottom:4px;">Your OTP</div>
        <div style="font-size:28px;font-weight:700;letter-spacing:0.28em;color:#f5f2ea;">${code}</div>
      </div>
      <p style="margin:0 0 8px;font-size:12px;color:#c3bfb3;">This code will expire in 10 minutes.</p>
      <p style="margin:0 0 16px;font-size:12px;color:#a6a094;">${outro}</p>
      <p style="margin:0;font-size:11px;color:#736f63;">– The Cyber Library Team</p>
    </div>
  </div>
  `;

  const text = `${headline}

${intro}

Your OTP: ${code}

This code will expire in 10 minutes.

${outro}

– The Cyber Library Team`;

  const cfg = await loadSmtpConfig();
  if (!cfg) {
    console.warn(
      "[The Cyber Library] SMTP is not configured. OTP email not sent. Code:",
      code,
      "to:",
      to
    );
    return;
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: cfg.host,
      port: cfg.port,
      secure: cfg.port === 465,
      auth: {
        user: cfg.user,
        pass: cfg.pass,
      },
    });
  }

  await transporter.sendMail({
    from: cfg.from,
    to,
    subject,
    text,
    html,
  });
}

