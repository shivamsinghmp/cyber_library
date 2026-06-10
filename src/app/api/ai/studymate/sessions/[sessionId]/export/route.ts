import { NextResponse } from "next/server";
import { requireModule } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ sessionId: string }> };

/**
 * GET /api/ai/studymate/sessions/[sessionId]/export?format=text|whatsapp|json
 * Returns chat history in the requested format.
 */
export async function GET(req: Request, { params }: Ctx) {
  const auth = await requireModule("studymate");
  if (auth.error) return auth.error;

  const { sessionId } = await params;
  const format = new URL(req.url).searchParams.get("format") ?? "text";

  const session = await prisma.chatSession.findFirst({
    where:  { id: sessionId, userId: auth.user.id },
    select: {
      title:    true,
      createdAt: true,
      messages: {
        orderBy: { createdAt: "asc" },
        select:  { role: true, content: true, model: true, coins: true, createdAt: true },
      },
    },
  });

  if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (format === "json") {
    return NextResponse.json(session);
  }

  // Plain text / WhatsApp format
  const title = session.title ?? "StudyMate Chat";
  const date  = session.createdAt.toLocaleDateString("en-IN", { dateStyle: "long" });

  const header = format === "whatsapp"
    ? `🎓 *StudyMate AI — ${title}*\n📅 ${date}\n\n`
    : `StudyMate AI — ${title}\n${date}\n${"─".repeat(40)}\n\n`;

  const body = session.messages
    .map((m) => {
      const role = m.role === "user" ? "You" : "StudyMate AI";
      const time = m.createdAt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
      const meta = m.model ? ` (${m.model}${m.coins ? `, ${m.coins}🪙` : ""})` : "";
      if (format === "whatsapp") {
        return `*${role}* [${time}]${meta}\n${m.content}\n`;
      }
      return `${role} [${time}]${meta}\n${m.content}\n`;
    })
    .join("\n");

  const footer = format === "whatsapp"
    ? "\n— Exported from Let's Study"
    : "\n" + "─".repeat(40) + "\nExported from Let's Study";

  const text = header + body + footer;

  return new Response(text, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="studymate-${sessionId}.txt"`,
    },
  });
}
