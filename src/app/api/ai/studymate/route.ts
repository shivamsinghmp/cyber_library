import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";
import { z } from "zod";

// ─── Config ──────────────────────────────────────────────────────────────────
const FREE_MESSAGES_PER_DAY = 5;
const COINS_PER_10_MESSAGES = 5;
const CACHE_TTL_PROFILE = 300;

// ─── System Prompt ────────────────────────────────────────────────────────────
function buildSystemPrompt(profile: {
  name?: string | null;
  targetExam?: string | null;
  targetYear?: string | null;
  studyGoal?: string | null;
  totalStudyHours?: number;
  currentStreak?: number;
}) {
  const ctx = [
    profile.name && `Student naam: ${profile.name}`,
    profile.targetExam && `Target exam: ${profile.targetExam}`,
    profile.targetYear && `Target year: ${profile.targetYear}`,
    profile.studyGoal && `Study goal: ${profile.studyGoal}`,
    profile.totalStudyHours && `Total padhai: ${profile.totalStudyHours} hours`,
    profile.currentStreak && `Current streak: ${profile.currentStreak} days 🔥`,
  ]
    .filter(Boolean)
    .join("\n");

  return `You are StudyMate AI — Cyber Library ka personal AI study buddy. Tum ek caring elder sibling ho jo genuinely student ki success chahta hai.

STUDENT INFO (personalize every response using this):
${ctx || "Profile incomplete hai — poochho kaunsi class aur kab exam hai"}

PERSONALITY:
- Natural Hinglish (Hindi + English mix) — casual, warm, like a best friend
- Naam se bulao jab pata ho
- Kabhi robotic/formal mat bano
- Emojis occasionally use karo

MOOD DETECTION (most important feature):
Agar student likhe: "chhod deta hoon" / "nahi ho raha" / "bahut mushkil" / "thak gaya" / "frustrated" / "stressed" / "kya fayda" / "depressed" / "anxiety":
→ Step 1: Pehle feeling warmly acknowledge karo
→ Step 2: Study band — sirf baat karo abhi
→ Step 3: Ek CHHOTA sa actionable step do — sirf ek
→ Step 4: Remind karo kyun unhone start kiya

80/20 RULE — ALWAYS:
Har study plan mein clearly batao:
- TOP 20% topics → 80% marks (ye pehle karo)
- Quick win topics (easy + high marks)
- Skip karne wale topics (agar time kam ho)

SHORTCUT ENGINE — for every problem:
3 methods dikhao:
1. Standard method (safe)
2. Shortcut method (fast — 2x speed)
3. Elimination trick for MCQ (fastest)

RESPONSE FORMAT:
- 4-8 sentences max for general advice
- Plain text only — NO ** or ## markdown
- Study plans: day/subject/hours clearly
- Har response ke end mein 1 actionable step`;
}

// ─── Schema ──────────────────────────────────────────────────────────────────
const bodySchema = z.object({
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(5000) }))
    .min(1)
    .max(50),
  imageBase64: z.string().optional(),
  mediaType: z
    .enum(["image/jpeg", "image/png", "image/webp", "image/gif"])
    .optional(),
});

// ─── Helpers ─────────────────────────────────────────────────────────────────
async function getTodayCount(userId: string) {
  const key = `ai:count:${userId}:${new Date().toISOString().slice(0, 10)}`;
  try {
    const v = await redis.get<number>(key);
    if (v !== null) return v;
  } catch {}
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const count = await prisma.studyCoinLog.count({
    where: { userId, reason: { startsWith: "AI_MSG" }, createdAt: { gte: start } },
  });
  try { await redis.setex(key, 60, count); } catch {}
  return count;
}

async function getCoins(userId: string) {
  // Use materialized Profile.coinBalance — O(1) vs SUM(StudyCoinLog)
  const profile = await prisma.profile.findUnique({
    where: { userId },
    select: { coinBalance: true },
  });
  return profile?.coinBalance ?? 0;
}

async function getProfile(userId: string) {
  const key = `ai:profile:${userId}`;
  try {
    const c = await redis.get<object>(key);
    if (c) return c as ReturnType<typeof _fetchProfile>;
  } catch {}
  const result = await _fetchProfile(userId);
  try { await redis.setex(key, CACHE_TTL_PROFILE, result); } catch {}
  return result;
}

async function _fetchProfile(userId: string) {
  const p = await prisma.profile.findUnique({
    where: { userId },
    select: { fullName: true, targetExam: true, targetYear: true, studyGoal: true, totalStudyHours: true, currentStreak: true },
  });
  return {
    name: p?.fullName ?? null,
    targetExam: p?.targetExam ?? null,
    targetYear: p?.targetYear ?? null,
    studyGoal: p?.studyGoal ?? null,
    totalStudyHours: p?.totalStudyHours ?? 0,
    currentStreak: p?.currentStreak ?? 0,
  };
}

async function logUsage(userId: string, paid: boolean) {
  if (paid) {
    // Deduct from materialized balance atomically
    await prisma.$transaction([
      prisma.studyCoinLog.create({
        data: { userId, coins: -COINS_PER_10_MESSAGES, reason: `AI_MSG_PAID_${Date.now()}` },
      }),
      prisma.profile.update({
        where: { userId },
        data: { coinBalance: { decrement: COINS_PER_10_MESSAGES } },
      }),
    ]);
  } else {
    await prisma.studyCoinLog.create({
      data: { userId, coins: 0, reason: `AI_MSG_FREE_${Date.now()}` },
    });
  }
  try { await redis.del(`ai:count:${userId}:${new Date().toISOString().slice(0, 10)}`); } catch {}
}

// ─── POST ─────────────────────────────────────────────────────────────────────
export async function POST(request: Request) {
  try {
    const auth = await requireUser();
    if (auth.error) return auth.error;
    const userId = auth.user.id;

    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    const { messages, imageBase64, mediaType } = parsed.data;

    // Quota + coins check
    const [todayCount, coins] = await Promise.all([getTodayCount(userId), getCoins(userId)]);
    let paid = false;
    if (todayCount >= FREE_MESSAGES_PER_DAY) {
      if (coins < COINS_PER_10_MESSAGES) {
        return NextResponse.json(
          {
            error: "coins_required",
            message: `Aaj ke ${FREE_MESSAGES_PER_DAY} free messages khatam! Study room mein jaao coins kamao 🪙`,
            coinsNeeded: COINS_PER_10_MESSAGES,
            currentCoins: coins,
          },
          { status: 402 }
        );
      }
      paid = true;
    }

    // Personalized system prompt
    const profile = await getProfile(userId);
    const system = buildSystemPrompt(profile);

    // Build Claude messages (with optional image on last user msg)
    const claudeMessages = messages.map((m, i) => {
      if (imageBase64 && i === messages.length - 1 && m.role === "user") {
        return {
          role: m.role,
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType ?? "image/jpeg", data: imageBase64 } },
            { type: "text", text: m.content || "Yeh question solve karo aur shortcut bhi batao" },
          ],
        };
      }
      return { role: m.role, content: m.content };
    });

    // Claude API call (30s timeout — Anthropic can be slow on long responses)
    const aiController = new AbortController();
    const aiTimer = setTimeout(() => aiController.abort(), 30_000);
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      signal: aiController.signal,
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1024, system, messages: claudeMessages }),
    }).finally(() => clearTimeout(aiTimer));

    if (!res.ok) {
      console.error("Claude API error:", await res.text());
      return NextResponse.json({ error: "AI service unavailable" }, { status: 502 });
    }

    const data = await res.json();
    const reply = data.content.filter((c: {type:string}) => c.type === "text").map((c: {text:string}) => c.text).join("");

    await logUsage(userId, paid);

    return NextResponse.json({
      reply,
      coinsUsed: paid ? COINS_PER_10_MESSAGES : 0,
      freeMessagesLeft: Math.max(0, FREE_MESSAGES_PER_DAY - todayCount - 1),
    });
  } catch (e) {
    if ((e as Error).name === "AbortError") {
      console.error("StudyMate: Anthropic API timeout");
      return NextResponse.json({ error: "AI response timed out. Please try again." }, { status: 504 });
    }
    console.error("StudyMate POST error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ─── GET — fetch initial stats ────────────────────────────────────────────────
export async function GET() {
  try {
    const auth = await requireUser();
    if (auth.error) return auth.error;
    const userId = auth.user.id;

    const [todayCount, coins, profile] = await Promise.all([
      getTodayCount(userId),
      getCoins(userId),
      getProfile(userId),
    ]);

    return NextResponse.json({
      freeMessagesLeft: Math.max(0, FREE_MESSAGES_PER_DAY - todayCount),
      totalCoins: coins,
      studentName: profile.name,
      targetExam: profile.targetExam,
      currentStreak: profile.currentStreak,
    });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
