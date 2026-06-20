import { NextResponse } from "next/server";
import DOMPurify from "isomorphic-dompurify";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/api-helpers";

// Server-side sanitizer — strip scripts, event handlers, and dangerous URLs
// while preserving the rich HTML email clients need (tables, inline images, anchors).
function sanitizeSignatureHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    FORBID_TAGS: ["script", "iframe", "object", "embed", "form", "input", "button", "meta", "link"],
    FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover", "onfocus", "onblur"],
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel|cid):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
  });
}

export async function GET() {
  try {
    const auth = await requireSuperAdmin();
    if (auth.error) return auth.error;
    const sigs = await prisma.emailSignature.findMany({ orderBy: { createdAt: "desc" } });
    return NextResponse.json(sigs);
  } catch (e) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireSuperAdmin();
    if (auth.error) return auth.error;
    const { name, html, isDefault } = await request.json();
    if (!name || !html) return NextResponse.json({ error: "name and html required" }, { status: 400 });
    const safeHtml = sanitizeSignatureHtml(String(html));

    if (isDefault) {
      await prisma.emailSignature.updateMany({ data: { isDefault: false } });
    }

    const sig = await prisma.emailSignature.create({ data: { name, html: safeHtml, isDefault: isDefault ?? false } });
    return NextResponse.json(sig, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const auth = await requireSuperAdmin();
    if (auth.error) return auth.error;
    const { id, name, html, isDefault } = await request.json();
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    const safeHtml = html === undefined ? undefined : sanitizeSignatureHtml(String(html));

    if (isDefault) {
      await prisma.emailSignature.updateMany({ where: { id: { not: id } }, data: { isDefault: false } });
    }

    const sig = await prisma.emailSignature.update({ where: { id }, data: { name, html: safeHtml, isDefault } });
    return NextResponse.json(sig);
  } catch (e) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await requireSuperAdmin();
    if (auth.error) return auth.error;
    const { id } = await request.json();
    await prisma.emailSignature.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
