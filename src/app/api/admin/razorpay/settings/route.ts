import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/encrypt";
import { z } from "zod";
import { requireSuperAdmin } from "@/lib/api-helpers";

const bodySchema = z.object({
  keyId: z.string().min(1).max(500).optional(),
  keySecret: z.string().max(2000).optional(),
});

/** GET: Return key ID and whether secret is set (never the actual secret). */
export async function GET() {
  try {
    const auth = await requireSuperAdmin();
    if (auth.error) return auth.error;
    // auth verified (user identity confirmed by requireSuperAdmin/requireAdmin)
    const row = await prisma.razorpaySetting.findFirst({
      orderBy: { updatedAt: "desc" },
    });
    if (!row) {
      return NextResponse.json({ keyId: null, hasSecret: false });
    }
    return NextResponse.json({
      keyId: row.keyId ?? null,
      hasSecret: !!(row.keySecretEncrypted && row.iv),
    });
  } catch (e) {
    console.error("GET /api/admin/razorpay/settings:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

/** POST: Save Key ID and/or Key Secret (secret is encrypted at rest). */
export async function POST(request: Request) {
  try {
    const auth = await requireSuperAdmin();
    if (auth.error) return auth.error;
    // auth verified (user identity confirmed by requireSuperAdmin/requireAdmin)
    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const { keyId, keySecret } = parsed.data;

    const existing = await prisma.razorpaySetting.findFirst({
      orderBy: { updatedAt: "desc" },
    });

    let keySecretEncrypted: string | null = null;
    let iv: string | null = null;
    if (keySecret != null && keySecret.trim() !== "") {
      try {
        const { encrypted, iv: newIv } = encrypt(keySecret.trim());
        keySecretEncrypted = encrypted;
        iv = newIv;
      } catch (err) {
        console.error("Encryption error:", err);
        return NextResponse.json(
          { error: "ENCRYPTION_KEY or AUTH_SECRET must be set in .env for secure storage" },
          { status: 500 }
        );
      }
    }

    const data: {
      keyId?: string | null;
      keySecretEncrypted?: string | null;
      iv?: string | null;
    } = {};
    if (keyId !== undefined) data.keyId = keyId.trim() || null;
    if (keySecret != null && keySecret.trim() !== "") {
      data.keySecretEncrypted = keySecretEncrypted;
      data.iv = iv;
    }

    if (existing) {
      await prisma.razorpaySetting.update({
        where: { id: existing.id },
        data,
      });
    } else {
      await prisma.razorpaySetting.create({
        data: {
          keyId: data.keyId ?? null,
          keySecretEncrypted: data.keySecretEncrypted ?? null,
          iv: data.iv ?? null,
        },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("POST /api/admin/razorpay/settings:", e);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}
