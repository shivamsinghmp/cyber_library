import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyMeetAddonToken } from "@/lib/meet-addon-token";
import { getMeetAddonCorsHeaders } from "../cors";
import { getAppSetting } from "@/lib/app-settings";
import { z } from "zod";

const FREE_MESSAGES_PER_DAY = 5;
const COINS_PER_10_MESSAGES = 5;

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}

function buildSystemPrompt(profile: {
  name?: string | null;
  targetExam?: string | null;
  studyGoal?: string | null;
  currentStreak?: number;
}) {
  const ctx = [
    profile.name        && `Student naam: ${profile.name}`,
    profile.targetExam  && `Target exam: ${profile.targetExam}`,
    profile.studyGoal   && `Study goal: ${profile.studyGoal}`,
    profile.currentStreak && `Current streak: ${profile.currentStreak} days 🔥`,
  ].filter(Boolean).join("\n");

  return `You are StudyMate AI — Cyber Library ka personal AI study buddy. Tum ek caring elder sibling ho jo genuinely student ki success chahta hai.

STUDENT INFO:
${ctx || "Profile incomplete hai"}

PERSONALITY:
- Natural Hinglish (Hindi + English mix) — casual, warm, like a best friend
- Naam se bulao jab pata ho
- Kabhi robotic/formal mat bano
- Emojis occasionally use karo

MOOD DETECTION:
Agar student likhe "chhod deta hoon" / "nahi ho raha" / "thak gaya" / "frustrated" / "stressed":
→ Pehle feeling warmly acknowledge karo, sirf ek chhota sa step do.

80/20 RULE — ALWAYS:
Har study plan mein clearly batao: TOP 20% topics → 80% marks.

RESPONSE FORMAT:
- 4-8 sentences max
- Plain text only — NO ** or ## markdown
- Har response ke end mein 1 actionable step`;
}

const bodySchema = z.object({
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(3000) }))
    .min(1)
    .max(30),
});

export async function POST(request: NextRequest) {
  const cors = getMeetAddonCorsHeaders(request);
  try {
    const token = request.headers.get("authorization")?.startsWith("Bearer ")
      ? request.headers.get("authorization")!.slice(7) : "";
    const payload = verifyMeetAddonToken(token);
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: cors });
    const userId = payload.userId;

    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400, headers: cors });
    const { messages } = parsed.data;

    // Rate limit check
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const [todayCount, profile] = await Promise.all([
      prisma.studyCoinLog.count({
        where: { userId, reason: { startsWith: "AI_MSG" }, createdAt: { gte: today } },
      }),
      prisma.profile.findUnique({
        where: { userId },
        select: { fullName: true, targetExam: true, studyGoal: true, currentStreak: true, coinBalance: true },
      }),
    ]);

    let paid = false;
    if (todayCount >= FREE_MESSAGES_PER_DAY) {
      const coins = profile?.coinBalance ?? 0;
      if (coins < COINS_PER_10_MESSAGES) {
        return NextResponse.json(
          {
            error: "coins_required",
            message: `Aaj ke ${FREE_MESSAGES_PER_DAY} free messages khatam! Coins kamao study room mein 🪙`,
            coinsNeeded: COINS_PER_10_MESSAGES,
            currentCoins: coins,
          },
          { status: 402, headers: cors }
        );
      }
      paid = true;
    }

    const system = buildSystemPrompt({
      name:          profile?.fullName,
      targetExam:    profile?.targetExam,
      studyGoal:     profile?.studyGoal,
      currentStreak: profile?.currentStreak ?? 0,
    });

    const apiKey = await getAppSetting("GEMINI_API_KEY");
    if (!apiKey) return NextResponse.json({ error: "AI not configured" }, { status: 503, headers: cors });

    const geminiContents = messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const geminiBody = JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: geminiContents,
      generationConfig: { maxOutputTokens: 800, temperature: 0.7 },
    });

    // Retry up to 2 times on 429 with exponential backoff (1s, 2s)
    let res: Response | null = null;
    for (let attempt = 0; attempt <= 2; attempt++) {
      if (attempt > 0) await new Promise((r) => setTimeout(r, attempt * 1000));
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 25_000);
      res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          signal: controller.signal,
          headers: { "Content-Type": "application/json" },
          body: geminiBody,
        }
      ).finally(() => clearTimeout(timer));
      if (res.status !== 429) break;
    }

    if (!res!.ok) {
      const errBody = await res!.text();
      console.error("[meet-addon/studymate] Gemini error:", res!.status, errBody);
      let apiMsg = errBody.slice(0, 300);
      try { apiMsg = (JSON.parse(errBody) as { error?: { message?: string } }).error?.message ?? apiMsg; } catch {}
      let userMsg = `Gemini error (${res!.status}): ${apiMsg}`;
      if (res!.status === 429) userMsg = "Abhi bahut log AI use kar rahe hain. 30 second baad dobara try karo 🙏";
      if (res!.status === 403) userMsg = "Gemini API key invalid ya expired hai. Admin panel mein key check karo.";
      if (res!.status === 404) userMsg = "Gemini model available nahi hai. Admin se contact karo.";
      return NextResponse.json({ error: userMsg }, { status: 502, headers: cors });
    }

    const data = await res!.json();
    const reply: string = data.candidates?.[0]?.content?.parts
      ?.filter((p: { text?: string }) => p.text)
      ?.map((p: { text: string }) => p.text)
      ?.join("") ?? "Kuch error aa gaya, dobara try karo.";

    // Log usage
    if (paid) {
      await prisma.$transaction([
        prisma.studyCoinLog.create({ data: { userId, coins: -COINS_PER_10_MESSAGES, reason: `AI_MSG_PAID_${Date.now()}` } }),
        prisma.profile.update({ where: { userId }, data: { coinBalance: { decrement: COINS_PER_10_MESSAGES } } }),
      ]);
    } else {
      await prisma.studyCoinLog.create({ data: { userId, coins: 0, reason: `AI_MSG_FREE_${Date.now()}` } });
    }

    return NextResponse.json(
      { reply, freeMessagesLeft: Math.max(0, FREE_MESSAGES_PER_DAY - todayCount - 1) },
      { headers: cors }
    );
  } catch (e) {
    if ((e as Error).name === "AbortError") {
      return NextResponse.json({ error: "AI response timed out." }, { status: 504, headers: cors });
    }
    console.error("[meet-addon/studymate]:", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500, headers: cors });
  }
}
