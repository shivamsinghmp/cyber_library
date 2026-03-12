import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** POST: Public. Save a new landing-form (lead) submission, then frontend can redirect to WhatsApp. */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object" || body === null) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const rawFields = (body as any).fields ?? {};
    const rawSource = (body as any).source;

    const fields: Record<string, string> = {};
    if (rawFields && typeof rawFields === "object") {
      for (const [k, v] of Object.entries(rawFields as Record<string, unknown>)) {
        if (typeof k === "string" && typeof v === "string") {
          fields[k] = v.slice(0, 500);
        }
      }
    }
    const source =
      typeof rawSource === "string" && rawSource.trim()
        ? rawSource.trim().slice(0, 500)
        : null;

    await prisma.leadSubmission.create({
      data: {
        data: fields,
        source,
      },
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("POST /api/lead-form/submit:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

