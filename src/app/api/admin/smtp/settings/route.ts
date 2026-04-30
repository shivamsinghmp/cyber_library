import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/encrypt";
import { z } from "zod";
import { requireSuperAdmin } from "@/lib/api-helpers";

const bodySchema = z.object({
  host: z.string().max(500).optional(),
  port: z.number().int().min(1).max(65535).optional(),
  user: z.string().max(500).optional(),
  pass: z.string().max(2000).optional(),
  from: z.string().max(500).optional(),
});

/** GET: Return SMTP values (no password, only hasPass boolean). */
export async function GET() {
  try {
    const auth = await requireSuperAdmin();
    if (auth.error) return auth.error;
    const { user: adminUser } = auth;
    const row = await prisma.smtpSetting.findFirst({
      orderBy: { updatedAt: "desc" },
    });
    if (!row) {
      return NextResponse.json({
        host: process.env.SMTP_HOST ?? null,
        port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : null,
        user: process.env.SMTP_USER ?? null,
        from: process.env.SMTP_FROM ?? null,
        hasPass: !!process.env.SMTP_PASS,
        source: process.env.SMTP_HOST ? "env" : null,
      });
    }
    return NextResponse.json({
      host: row.host ?? null,
      port: row.port ?? null,
      user: row.user ?? null,
      from: row.from ?? null,
      hasPass: !!(row.passEncrypted && row.iv),
      source: "admin",
    });
  } catch (e) {
    console.error("GET /api/admin/smtp/settings:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

/** POST: Save SMTP settings (password encrypted). */
export async function POST(request: Request) {
  try {
    const auth = await requireSuperAdmin();
    if (auth.error) return auth.error;
    const { user: adminUser } = auth;
    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const { host, port, user: smtpUser, pass, from } = parsed.data;

    const existing = await prisma.smtpSetting.findFirst({
      orderBy: { updatedAt: "desc" },
    });

    let passEncrypted: string | null = null;
    let iv: string | null = null;
    if (pass != null && pass.trim() !== "") {
      try {
        const { encrypted, iv: newIv } = encrypt(pass.trim());
        passEncrypted = encrypted;
        iv = newIv;
      } catch (err) {
        console.error("SMTP encryption error:", err);
        return NextResponse.json(
          {
            error:
              "ENCRYPTION_KEY or AUTH_SECRET must be set in .env for secure SMTP storage",
          },
          { status: 500 }
        );
      }
    }

    const data: {
      host?: string | null;
      port?: number | null;
      user?: string | null;
      passEncrypted?: string | null;
      iv?: string | null;
      from?: string | null;
    } = {};
    if (host !== undefined) data.host = host.trim() || null;
    if (port !== undefined) data.port = Number.isFinite(port) ? port : null;
    if (smtpUser !== undefined) data.user = smtpUser ? smtpUser.trim() || null : null;
    if (from !== undefined) data.from = from.trim() || null;
    if (pass != null && pass.trim() !== "") {
      data.passEncrypted = passEncrypted;
      data.iv = iv;
    }

    if (existing) {
      await prisma.smtpSetting.update({
        where: { id: existing.id },
        data,
      });
    } else {
      await prisma.smtpSetting.create({
        data: {
          host: data.host ?? null,
          port: data.port ?? null,
          user: data.user ?? null,
          passEncrypted: data.passEncrypted ?? null,
          iv: data.iv ?? null,
          from: data.from ?? null,
        },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("POST /api/admin/smtp/settings:", e);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}

