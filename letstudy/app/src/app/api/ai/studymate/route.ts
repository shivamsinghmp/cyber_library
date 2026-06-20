import { NextResponse } from "next/server";
import { requireModule } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";
import { z } from "zod";
import { batchGetAppSettings } from "@/lib/app-settings";

export const maxDuration = 60;

const CACHE_TTL_PROFILE = 300;
const PYTHON_URL = process.env.PYTHON_SERVER_URL ?? "http://localhost:8001";
const PYTHON_SECRET = process.env.PYTHON_SERVER_SECRET ?? "";

// ─── DB helpers ───────────────────────────────────────────────────────────────

async function getCoins(userId: string) {
  const p = await prisma.profile.findUnique({ where: { userId }, select: { coinBalance: true, dailyCoinLimit: true } });
  return { balance: p?.coinBalance ?? 0, dailyLimit: p?.dailyCoinLimit ?? null };
}

async function getProfile(userId: string) {
  const key = `ai:profile:${userId}`;
  try {
    const cached = await redis.get<object>(key);
    if (cached) return cached as Record<string, unknown>;
  } catch {}
  const p = await prisma.profile.findUnique({
    where: { userId },
    select: { fullName: true, targetExam: true, targetYear: true, studyGoal: true, totalStudyHours: true, currentStreak: true },
  });
  const result = {
    name: p?.fullName ?? null,
    targetExam: p?.targetExam ?? null,
    targetYear: p?.targetYear ?? null,
    studyGoal: p?.studyGoal ?? null,
    totalStudyHours: p?.totalStudyHours ?? 0,
    currentStreak: p?.currentStreak ?? 0,
  };
  try { await redis.setex(key, CACHE_TTL_PROFILE, result); } catch {}
  return result;
}

async function getAiKeys() {
  const s = await batchGetAppSettings([
    "GEMINI_API_KEY", "VERTEX_API_KEY", "ANTHROPIC_API_KEY", "OPENAI_API_KEY",
  ]);
  return {
    google:    s["GEMINI_API_KEY"]    || s["VERTEX_API_KEY"] || null,
    anthropic: s["ANTHROPIC_API_KEY"] || null,
    openai:    s["OPENAI_API_KEY"]    || null,
  };
}

async function getAvailableModels(keys: { google: string | null; anthropic: string | null; openai: string | null }) {
  try {
    const r = await fetch(`${PYTHON_URL}/models`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${PYTHON_SECRET}`, "Content-Type": "application/json" },
      body: JSON.stringify({ keys }),
      signal: AbortSignal.timeout(4000),
    });
    if (r.ok) {
      const data = await r.json() as { available: string[]; pricing: Record<string, number> };
      return data;
    }
  } catch {}
  // Fallback: derive locally if Python server is down
  const available: string[] = [];
  if (keys.google)    available.push("gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-2.5-pro", "gemini-1.5-pro");
  if (keys.anthropic) available.push("claude-haiku", "claude-sonnet", "claude-opus");
  if (keys.openai)    available.push("gpt-4o-mini", "gpt-4.1-mini", "gpt-4.1", "gpt-4o");
  return { available, pricing: {} as Record<string, number> };
}

async function logUsage(userId: string, coins: number, model: string) {
  // Conditional decrement — two concurrent streams must never push the
  // balance negative (each was pre-checked against the same starting balance)
  await prisma.$transaction(async (tx) => {
    const updated = await tx.profile.updateMany({
      where: { userId, coinBalance: { gte: coins } },
      data:  { coinBalance: { decrement: coins } },
    });
    const charged = updated.count > 0 ? coins : 0;
    if (charged === 0) {
      // Balance ran out mid-stream — drain whatever is left instead of going negative
      const p = await tx.profile.findUnique({ where: { userId }, select: { coinBalance: true } });
      const remaining = Math.max(0, p?.coinBalance ?? 0);
      if (remaining > 0) {
        await tx.profile.update({ where: { userId }, data: { coinBalance: 0 } });
      }
      if (remaining === 0) return;
      await tx.studyCoinLog.create({
        data: { userId, coins: -remaining, reason: `AI_MSG_${model.toUpperCase().replace(/-/g, "_")}_${Date.now()}` },
      });
      return;
    }
    await tx.studyCoinLog.create({
      data: { userId, coins: -charged, reason: `AI_MSG_${model.toUpperCase().replace(/-/g, "_")}_${Date.now()}` },
    });
  });
}

// ─── Schema ───────────────────────────────────────────────────────────────────

const bodySchema = z.object({
  messages:           z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(5000) })).min(1).max(20),
  imageBase64:        z.string().max(2_000_000).optional(),
  mediaType:          z.enum(["image/jpeg", "image/png", "image/webp", "image/gif"]).optional(),
  acceptLowerQuality: z.boolean().optional().default(false),
  budgetMode:         z.enum(["strict", "balanced", "quality"]).optional().default("balanced"),
  sessionId:          z.string().optional(),   // if provided, messages are saved to DB
});

// ─── POST — proxy to Python AI server ─────────────────────────────────────────

export async function POST(request: Request) {
  try {
    let userId: string;

    // Meet addon: authenticate via Bearer HMAC JWT
    const bearerToken = request.headers.get("authorization")?.startsWith("Bearer ")
      ? request.headers.get("authorization")!.slice(7) : null;

    if (bearerToken) {
      const { verifyMeetAddonToken } = await import("@/lib/meet-addon-token");
      const payload = verifyMeetAddonToken(bearerToken);
      if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      userId = payload.userId;
    } else {
      const auth = await requireModule("studymate");
      if (auth.error) return auth.error;
      userId = auth.user.id;
    }

    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    const { messages, imageBase64, mediaType, acceptLowerQuality, budgetMode, sessionId } = parsed.data;

    // Fetch everything in parallel
    const [coinInfo, profile, keys] = await Promise.all([
      getCoins(userId),
      getProfile(userId),
      getAiKeys(),
    ]);
    const coins = coinInfo.balance;

    // Daily budget limit check
    if (coinInfo.dailyLimit != null) {
      const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
      const todaySpent = await prisma.aIUsageLog.aggregate({
        where: { userId, createdAt: { gte: todayStart }, status: "success" },
        _sum:  { coinsCharged: true },
      });
      const spent = todaySpent._sum.coinsCharged ?? 0;
      if (spent >= coinInfo.dailyLimit) {
        return NextResponse.json({
          error:       "daily_limit_reached",
          message:     `You've reached your daily AI limit of ${coinInfo.dailyLimit} coins. Come back tomorrow! 🌙`,
          dailyLimit:  coinInfo.dailyLimit,
          todaySpent:  spent,
        }, { status: 402 });
      }
    }
    const { available: availableModels } = await getAvailableModels(keys);

    if (availableModels.length === 0) {
      return NextResponse.json({ error: "AI not configured" }, { status: 503 });
    }

    // ── Forward to Python server and pipe SSE back to client ──────────────────
    const pythonResponse = await fetch(`${PYTHON_URL}/chat`, {
      method: "POST",
      headers: {
        "Authorization":  `Bearer ${PYTHON_SECRET}`,
        "Content-Type":   "application/json",
      },
      body: JSON.stringify({
        messages,
        imageBase64:        imageBase64 ?? null,
        mediaType:          mediaType   ?? null,
        availableModels,
        currentCoins:       coins,
        acceptLowerQuality,
        budgetMode,
        keys,
        profile,
      }),
      signal: AbortSignal.timeout(59_000),
    });

    if (!pythonResponse.ok || !pythonResponse.body) {
      return NextResponse.json({ error: "AI service unavailable" }, { status: 502 });
    }

    // ── Stream back with coin deduction on "done" event ───────────────────────
    const encoder  = new TextEncoder();
    let usedModel    = "";
    let coinsCharged = 0;
    let inputTokens  = 0;
    let outputTokens = 0;
    let fullText     = "";
    const aiStartTime = Date.now();

    const passThrough = new ReadableStream<Uint8Array>({
      async start(controller) {
        const reader = pythonResponse.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            buffer += chunk;
            controller.enqueue(encoder.encode(chunk));

            // Parse SSE events to capture metadata
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";
            for (const line of lines) {
              if (!line.startsWith("data: ")) continue;
              try {
                const ev = JSON.parse(line.slice(6));
                if (ev.t === "model" && ev.m) usedModel = ev.m;
                if (ev.t === "done") {
                  coinsCharged = ev.coins       ?? 0;
                  inputTokens  = ev.inputTokens  ?? 0;
                  outputTokens = ev.outputTokens ?? 0;
                  fullText     = ev.full         ?? "";
                }
              } catch {}
            }
          }
        } finally {
          reader.releaseLock();
          controller.close();

          // Post-stream: deduct coins + fire-and-forget logging
          if (usedModel && coinsCharged > 0) {
            logUsage(userId, coinsCharged, usedModel).catch(console.error);
          }

          // Log AI usage
          if (usedModel) {
            import("@/lib/ai-logger").then(({ logAIUsage }) =>
              logAIUsage({
                userId,
                feature:       "studymate",
                provider:      usedModel.startsWith("gemini") ? "google" :
                               usedModel.startsWith("claude") ? "anthropic" : "openai",
                model:         usedModel,
                inputTokens,
                outputTokens,
                coinsCharged,
                latencyMs:     Date.now() - aiStartTime,
                status:        "success",
              })
            ).catch(() => {});
          }

          // Save chat messages to DB if sessionId was provided
          if (sessionId && usedModel && fullText) {
            void (async () => {
              try {
                const session = await prisma.chatSession.findFirst({
                  where: { id: sessionId, userId }, select: { id: true, title: true },
                });
                if (!session) return;

                const lastUser = messages.findLast((m: { role: string }) => m.role === "user");
                await prisma.$transaction([
                  // Save user message (last one)
                  ...(lastUser ? [prisma.chatMessage.create({
                    data: { sessionId, role: "user", content: lastUser.content },
                  })] : []),
                  // Save assistant reply
                  prisma.chatMessage.create({
                    data: { sessionId, role: "assistant", content: fullText, model: usedModel, coins: coinsCharged },
                  }),
                  // Update session title (first user message) + updatedAt
                  prisma.chatSession.update({
                    where: { id: sessionId },
                    data: {
                      updatedAt: new Date(),
                      ...(!session.title && lastUser ? { title: lastUser.content.slice(0, 80) } : {}),
                    },
                  }),
                ]);
              } catch (e) { console.error("[StudyMate] save chat error:", e); }
            })();
          }

          // Budget low alert — send WA if coins drop to ≤20
          if (coinsCharged > 0) {
            const newBalance = coins - coinsCharged;
            const ALERT_THRESHOLD = 20;
            if (newBalance <= ALERT_THRESHOLD && (coins > ALERT_THRESHOLD || coins === coinsCharged)) {
              void (async () => {
                try {
                  const profileRow = await prisma.profile.findUnique({
                    where: { userId },
                    select: { whatsappNumber: true, phone: true, fullName: true },
                  });
                  const phone = profileRow?.whatsappNumber ?? profileRow?.phone;
                  if (!phone) return;
                  const { sendWhatsAppText } = await import("@/lib/whatsapp");
                  const name = profileRow?.fullName ? profileRow.fullName.split(" ")[0] : "there";
                  await sendWhatsAppText(phone,
                    `Hey ${name}! 🪙 Your StudyMate AI coins are running low — only *${newBalance} coins* left.\n\nTop up now so you never stop learning: https://lstudy.in/dashboard/wallet/buy-coins 🚀`
                  );
                } catch {}
              })();
            }
          }

          // Fire-and-forget profile extraction
          if (keys.google && messages.length >= 2) {
            fetch(`${PYTHON_URL}/profile/extract`, {
              method:  "POST",
              headers: { "Authorization": `Bearer ${PYTHON_SECRET}`, "Content-Type": "application/json" },
              body:    JSON.stringify({ conversation: messages, apiKey: keys.google }),
              signal:  AbortSignal.timeout(10_000),
            })
              .then(r => r.json())
              .then(async (extracted: Record<string, string>) => {
                const updateData: Record<string, string> = {};
                if (extracted.fullName?.trim())   updateData.fullName   = extracted.fullName.trim();
                if (extracted.targetExam?.trim()) updateData.targetExam = extracted.targetExam.trim();
                if (extracted.targetYear?.trim()) updateData.targetYear = extracted.targetYear.trim();
                if (extracted.studyGoal?.trim())  updateData.studyGoal  = extracted.studyGoal.trim();
                if (Object.keys(updateData).length === 0) return;
                await prisma.profile.upsert({
                  where:  { userId },
                  create: { userId, ...updateData },
                  update: updateData,
                });
                try { await redis.del(`ai:profile:${userId}`); } catch {}
              })
              .catch(() => {});
          }
        }
      },
    });

    return new Response(passThrough, {
      headers: {
        "Content-Type":      "text/event-stream",
        "Cache-Control":     "no-cache",
        "Connection":        "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });

  } catch (e) {
    if ((e as Error).name === "AbortError" || (e as Error).name === "TimeoutError") {
      return NextResponse.json({ error: "AI response timed out. Please try again." }, { status: 504 });
    }
    console.error("StudyMate POST error:", e);
    return NextResponse.json({ error: "AI service error. Please try again." }, { status: 500 });
  }
}

// ─── GET — stats (coins, profile, available models, pricing) ─────────────────

export async function GET(request: Request) {
  try {
    let userId: string;

    const bearerToken = request.headers.get("authorization")?.startsWith("Bearer ")
      ? request.headers.get("authorization")!.slice(7) : null;

    if (bearerToken) {
      const { verifyMeetAddonToken } = await import("@/lib/meet-addon-token");
      const payload = verifyMeetAddonToken(bearerToken);
      if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      userId = payload.userId;
    } else {
      const auth = await requireModule("studymate");
      if (auth.error) return auth.error;
      userId = auth.user.id;
    }

    const [profileRow, keys] = await Promise.all([
      prisma.profile.findUnique({
        where: { userId },
        select: { coinBalance: true, fullName: true, targetExam: true, targetYear: true, studyGoal: true, totalStudyHours: true, currentStreak: true },
      }),
      getAiKeys(),
    ]);

    const { available, pricing } = await getAvailableModels(keys);

    return NextResponse.json({
      totalCoins:    profileRow?.coinBalance ?? 0,
      studentName:   profileRow?.fullName ?? null,
      targetExam:    profileRow?.targetExam ?? null,
      currentStreak: profileRow?.currentStreak ?? 0,
      profileComplete: !!(profileRow?.fullName?.trim() && profileRow?.targetExam?.trim()),
      availableModels: available,
      pricing,
      configuredProviders: {
        gemini:    !!keys.google,
        anthropic: !!keys.anthropic,
        openai:    !!keys.openai,
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
