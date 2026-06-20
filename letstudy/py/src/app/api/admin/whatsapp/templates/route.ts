import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/api-helpers";
import { getAppSetting } from "@/lib/app-settings";
// Note: add WHATSAPP_BUSINESS_ACCOUNT_ID to your .env file

/** GET /api/admin/whatsapp/templates — Return all templates from DB */
export async function GET() {
  try {
    const auth = await requireSuperAdmin();
    if (auth.error) return auth.error;

    const templates = await prisma.whatsAppTemplate.findMany({
      orderBy: [{ status: "asc" }, { name: "asc" }],
    });
    return NextResponse.json(templates);
  } catch (e) {
    console.error("GET /api/admin/whatsapp/templates:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

/** POST /api/admin/whatsapp/templates — Sync templates from Meta Graph API */
export async function POST() {
  try {
    const auth = await requireSuperAdmin();
    if (auth.error) return auth.error;

    const wabaId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID?.trim();
    const token  = process.env.WHATSAPP_ACCESS_TOKEN?.trim()
      || (await getAppSetting("WHATSAPP_ACCESS_TOKEN"));

    if (!wabaId || !token) {
      return NextResponse.json(
        { error: "Please configure WHATSAPP_BUSINESS_ACCOUNT_ID and WHATSAPP_ACCESS_TOKEN" },
        { status: 400 }
      );
    }

    const url = `https://graph.facebook.com/v20.0/${wabaId}/message_templates` +
      `?fields=id,name,status,category,language,components&limit=100`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Meta template sync failed:", err);
      return NextResponse.json({ error: "Meta API error. Please check your token or WABA ID." }, { status: 502 });
    }

    const { data: metaTemplates } = await res.json() as {
      data: {
        id: string; name: string; status: string; category: string; language: string;
        components: { type: string; text?: string; buttons?: unknown[] }[];
      }[];
    };

    let synced = 0;

    for (const t of metaTemplates ?? []) {
      const body   = t.components.find(c => c.type === "BODY");
      const header = t.components.find(c => c.type === "HEADER");
      const footer = t.components.find(c => c.type === "FOOTER");
      const btns   = t.components.find(c => c.type === "BUTTONS");

      const bodyText    = body?.text    ?? "";
      const varCount    = (bodyText.match(/\{\{(\d+)\}\}/g) ?? []).length;

      await prisma.whatsAppTemplate.upsert({
        where:  { name: t.name },
        create: {
          metaId:        t.id,
          name:          t.name,
          status:        t.status,
          category:      t.category,
          language:      t.language,
          bodyText,
          headerText:    header?.text ?? null,
          footerText:    footer?.text ?? null,
          variableCount: varCount,
          buttons:       btns?.buttons ? JSON.parse(JSON.stringify(btns.buttons)) : null,
          syncedAt:      new Date(),
        },
        update: {
          metaId:        t.id,
          status:        t.status,
          bodyText,
          headerText:    header?.text ?? null,
          footerText:    footer?.text ?? null,
          variableCount: varCount,
          buttons:       btns?.buttons ? JSON.parse(JSON.stringify(btns.buttons)) : null,
          syncedAt:      new Date(),
        },
      });
      synced++;
    }

    return NextResponse.json({ ok: true, synced, message: `${synced} templates synced from Meta` });
  } catch (e) {
    console.error("POST /api/admin/whatsapp/templates:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
