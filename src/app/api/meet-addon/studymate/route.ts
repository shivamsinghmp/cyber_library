import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyMeetAddonToken } from "@/lib/meet-addon-token";
import { getMeetAddonCorsHeaders } from "../cors";
import { getAppSetting } from "@/lib/app-settings";
import { z } from "zod";

const FREE_MESSAGES_PER_DAY = 5;
const COINS_PER_10_MESSAGES = 5;

function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*\*([^*]+)\*\*\*/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/(?<!\w)\*([^*\n]+)\*(?!\w)/g, '$1')
    .replace(/(?<!\w)_([^_\n]+)_(?!\w)/g, '$1')
    .replace(/^#{1,6}\s+(.+)$/gm, '$1')
    .replace(/^[-*_]{3,}\s*$/gm, '')
    .replace(/^>\s*/gm, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/```[^\n]*\n([\s\S]*?)```/g, '$1')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

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
    profile.name        && `Student name: ${profile.name}`,
    profile.targetExam  && `Target exam: ${profile.targetExam}`,
    profile.studyGoal   && `Study goal: ${profile.studyGoal}`,
    profile.currentStreak && `Current streak: ${profile.currentStreak} days 🔥`,
  ].filter(Boolean).join("\n");

  return `You are StudyMate AI — the personal AI study buddy for Let's Study. You are a caring, supportive guide who genuinely wants the student to succeed.

STUDENT INFO:
${ctx || "Profile incomplete"}

LANGUAGE — MANDATORY:
ALWAYS respond in plain English. Never mix in Hindi or Hinglish.
Example: "In this question we need to calculate the friction force. First, let's find the normal force..."
NOT: "Let's break down this physics problem step-by-step in Hinglish!"

FORMATTING — STRICTLY FORBIDDEN:
NEVER use: ** bold ** | ## headers | * bullets | _italic_ | markdown of any kind.
Plain text only. Numbered steps (1. 2. 3.) are OK for solutions.
WRONG: "**Statement 1 Analysis:**"
RIGHT: "About Statement 1 — "

PERSONALITY:
- Casual, warm, like a best friend
- Use the student's name when known
- Never be robotic
- Emojis occasionally (1-2 max)

MOOD DETECTION:
If the student writes something like "I want to quit" / "it's not working" / "I'm tired" / "frustrated":
First acknowledge the feeling, then give one small actionable step.

80/20 RULE:
In study plans — share Top 20% topics → 80% marks.

IMAGE QUESTIONS:
Solve the question in plain text, using numbered steps.
For MCQs, explain the elimination trick. End with "Answer: (option)".

RESPONSE FORMAT:
- Plain text only, no markdown ever
- 4-8 sentences for general advice
- End every response with 1 actionable step`;
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
    const bearerToken = request.headers.get("authorization")?.startsWith("Bearer ")
      ? request.headers.get("authorization")!.slice(7) : "";
    const payload = verifyMeetAddonToken(bearerToken);
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
            message: `You've used all ${FREE_MESSAGES_PER_DAY} free messages for today! Earn coins in the study room 🪙`,
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

    const [geminiKey, vertexKey] = await Promise.all([
      getAppSetting("GEMINI_API_KEY"),
      getAppSetting("VERTEX_API_KEY"),
    ]);
    const apiKey = geminiKey ?? vertexKey ?? null;
    if (!apiKey) {
      return NextResponse.json({ error: "AI not configured" }, { status: 503, headers: cors });
    }

    const { geminiUrl, vertexAuthHeaders } = await import("@/lib/vertex-auth");

    const contents = messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const body = JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents,
      generationConfig: { maxOutputTokens: 800, temperature: 0.7 },
    });

    // Retry up to 2 times on 429 with exponential backoff (1s, 2s)
    let res: Response | null = null;
    for (let attempt = 0; attempt <= 2; attempt++) {
      if (attempt > 0) await new Promise((r) => setTimeout(r, attempt * 1000));
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 25_000);
      res = await fetch(
        geminiUrl("gemini-2.5-flash"),
        {
          method: "POST",
          signal: controller.signal,
          headers: vertexAuthHeaders(apiKey),
          body,
        }
      ).finally(() => clearTimeout(timer));
      if (res.status !== 429) break;
    }

    if (!res!.ok) {
      const errBody = await res!.text();
      console.error("[meet-addon/studymate] Vertex AI error:", res!.status, errBody);
      if (res!.status === 429) {
        return NextResponse.json(
          { error: "AI is very busy right now. Please try again shortly 🙏", retryable: true },
          { status: 502, headers: cors }
        );
      }
      let apiMsg = errBody.slice(0, 300);
      try { apiMsg = (JSON.parse(errBody) as { error?: { message?: string } }).error?.message ?? apiMsg; } catch {}
      let userMsg = `Vertex AI error (${res!.status}): ${apiMsg}`;
      if (res!.status === 401 || res!.status === 403) userMsg = "Vertex AI auth failed. Please check service account permissions.";
      if (res!.status === 404) userMsg = "Vertex AI model is not available. Please check location/project settings.";
      return NextResponse.json({ error: userMsg }, { status: 502, headers: cors });
    }

    const data = await res!.json();
    const reply: string = data.candidates?.[0]?.content?.parts
      ?.filter((p: { text?: string }) => p.text)
      ?.map((p: { text: string }) => p.text)
      ?.join("") ?? "An error occurred. Please try again.";

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
      { reply: stripMarkdown(reply), freeMessagesLeft: Math.max(0, FREE_MESSAGES_PER_DAY - todayCount - 1) },
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
