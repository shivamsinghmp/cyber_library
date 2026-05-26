import { NextResponse } from "next/server";
import { requireModule } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";
import { z } from "zod";
import { batchGetAppSettings } from "@/lib/app-settings";

// ─── Config ───────────────────────────────────────────────────────────────────
const CACHE_TTL_PROFILE = 300;

// ─── Model Registry ───────────────────────────────────────────────────────────
type ModelId =
  | "gemini-2.5-flash" | "gemini-2.0-flash" | "gemini-1.5-pro" | "gemini-2.5-pro"
  | "claude-haiku"     | "claude-sonnet"     | "claude-opus"
  | "gpt-4o-mini"      | "gpt-4.1-mini"      | "gpt-4.1" | "gpt-4o"
  | "gpt-o1-mini"      | "gpt-o1";

type Provider = "google" | "anthropic" | "openai";

const MODEL_PROVIDER: Record<ModelId, Provider> = {
  "gemini-2.5-flash": "google",   "gemini-2.0-flash": "google",
  "gemini-1.5-pro":   "google",   "gemini-2.5-pro":   "google",
  "claude-haiku":     "anthropic","claude-sonnet":     "anthropic", "claude-opus": "anthropic",
  "gpt-4o-mini":      "openai",   "gpt-4.1-mini":      "openai",
  "gpt-4.1":          "openai",   "gpt-4o":            "openai",
  "gpt-o1-mini":      "openai",   "gpt-o1":            "openai",
};

// Real API model identifiers
const API_MODEL: Record<ModelId, string> = {
  "gemini-2.5-flash": "gemini-2.5-flash",
  "gemini-2.0-flash": "gemini-2.0-flash",
  "gemini-1.5-pro":   "gemini-1.5-pro",
  "gemini-2.5-pro":   "gemini-2.5-pro",
  "claude-haiku":     "claude-haiku-4-5-20251001",
  "claude-sonnet":    "claude-sonnet-4-6",
  "claude-opus":      "claude-opus-4-7",
  "gpt-4o-mini":      "gpt-4o-mini",
  "gpt-4.1-mini":     "gpt-4.1-mini",
  "gpt-4.1":          "gpt-4.1",
  "gpt-4o":           "gpt-4o",
  "gpt-o1-mini":      "o1-mini",
  "gpt-o1":           "o1",
};

// ─── Pricing: 1 coin = ₹0.10 | formula: ceil(tokens/1000) × rate ─────────────
// 1000 tokens = 1 unit | 2000 tokens = 2 units | 10000 tokens = 10 units
// All rates guarantee 50%+ profit over actual API cost
const COINS_PER_1000T: Record<ModelId, number> = {
  "gemini-2.5-flash": 1,   // API ₹0.014/1000t → charge ₹0.10  → 614% profit
  "gemini-2.0-flash": 1,   // API ₹0.019/1000t → charge ₹0.10  → 426% profit
  "gemini-1.5-pro":   4,   // API ₹0.23/1000t  → charge ₹0.40  →  74% profit
  "gemini-2.5-pro":   6,   // API ₹0.40/1000t  → charge ₹0.60  →  50% profit
  "claude-haiku":     3,   // API ₹0.18/1000t  → charge ₹0.30  →  67% profit
  "claude-sonnet":   10,   // API ₹0.66/1000t  → charge ₹1.00  →  52% profit
  "claude-opus":     50,   // API ₹3.28/1000t  → charge ₹5.00  →  52% profit
  "gpt-4o-mini":      1,   // API ₹0.028/1000t → charge ₹0.10  → 257% profit
  "gpt-4.1-mini":     2,   // API ₹0.074/1000t → charge ₹0.20  → 170% profit
  "gpt-4.1":          6,   // API ₹0.37/1000t  → charge ₹0.60  →  62% profit
  "gpt-4o":           7,   // API ₹0.46/1000t  → charge ₹0.70  →  52% profit
  "gpt-o1-mini":      9,   // API ₹0.55/1000t  → charge ₹0.90  →  64% profit
  "gpt-o1":          42,   // API ₹2.77/1000t  → charge ₹4.20  →  52% profit
};

// Example: 10,000 tokens on claude-opus = ceil(10000/1000) × 50 = 500 coins = ₹50
function calcCoins(totalTokens: number, model: ModelId): number {
  return Math.ceil(totalTokens / 1000) * COINS_PER_1000T[model];
}

// Estimate before API call — always assumes WORST-CASE output (1024 tokens = our max_tokens cap)
// This guarantees estimate >= actual cost, so we never call the API and then fail the post-check
function estimateCoins(messages: Array<{ content: string }>, model: ModelId): number {
  const chars = messages.reduce((s, m) => s + m.content.length, 0);
  const estTokens = Math.ceil(chars / 4) + 1024; // 1024 = max_tokens cap
  return Math.ceil(estTokens / 1000) * COINS_PER_1000T[model];
}

// Fetch AI keys from DB only — env is intentionally ignored (DB is source of truth)
async function getAiKeys() {
  const settings = await batchGetAppSettings(["GEMINI_API_KEY", "ANTHROPIC_API_KEY", "OPENAI_API_KEY"]);
  return {
    gemini:    settings["GEMINI_API_KEY"]    || null,
    anthropic: settings["ANTHROPIC_API_KEY"] || null,
    openai:    settings["OPENAI_API_KEY"]    || null,
  };
}

// Which models are available based on configured API keys
function getAvailableModels(keys: { gemini: string | null; anthropic: string | null; openai: string | null }): ModelId[] {
  const list: ModelId[] = [];
  if (keys.gemini)    list.push("gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-pro", "gemini-2.5-pro");
  if (keys.anthropic) list.push("claude-haiku", "claude-sonnet", "claude-opus");
  if (keys.openai)    list.push("gpt-4o-mini", "gpt-4.1-mini", "gpt-4.1", "gpt-4o", "gpt-o1-mini", "gpt-o1");
  return list;
}

// ─── System Prompt ────────────────────────────────────────────────────────────
function isProfileIncomplete(profile: { name?: string | null; targetExam?: string | null }): boolean {
  return !profile.name?.trim() || !profile.targetExam?.trim();
}

function buildSystemPrompt(
  profile: {
    name?: string | null; targetExam?: string | null; targetYear?: string | null;
    studyGoal?: string | null; totalStudyHours?: number; currentStreak?: number;
  },
  onboarding: boolean,
): string {
  // ── Onboarding mode: profile incomplete, collect details first ──
  if (onboarding) {
    return `You are StudyMate AI — Cyber Library ka personal AI study buddy.

PRIORITY TASK: Yeh student abhi naya hai — unki study profile collect karni hai. Ek friendly, excited message mein yeh 4 cheezein puchho:

1. Naam kya hai?
2. Kaunsa exam prepare kar rahe ho? (JEE / NEET / UPSC / SSC / CAT / GATE / Board / Other)
3. Exam kab hai? (month + year, jaise "May 2026")
4. Is waqt kaunsa subject ya topic sabse mushkil lag raha hai?

RULES:
- Tone: Excited, warm, jaise koi best friend mil gaya ho
- Numbered list use karo — ek hi message mein
- Mention karo ki ye details hamesha yaad rakhoge
- 6-8 lines max
- Plain text only — no markdown`;
  }

  // ── Normal mode: personalised study buddy ──
  const ctx = [
    profile.name && `Student naam: ${profile.name}`,
    profile.targetExam && `Target exam: ${profile.targetExam}`,
    profile.targetYear && `Target year: ${profile.targetYear}`,
    profile.studyGoal && `Study goal: ${profile.studyGoal}`,
    profile.totalStudyHours && `Total padhai: ${profile.totalStudyHours} hours`,
    profile.currentStreak && `Current streak: ${profile.currentStreak} days 🔥`,
  ].filter(Boolean).join("\n");

  return `You are StudyMate AI — Cyber Library ka personal AI study buddy. Tum ek caring elder sibling ho jo genuinely student ki success chahta hai.

STUDENT INFO (personalize every response using this):
${ctx}

PERSONALITY:
- Natural Hinglish (Hindi + English mix) — casual, warm, like a best friend
- Naam se bulao hamesha
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

// ─── Profile Extraction (fire-and-forget after student's first reply) ─────────
async function extractAndSaveProfile(userId: string, conversation: Msg[], geminiKey: string): Promise<void> {

  const snippet = conversation.slice(-6)
    .map(m => `${m.role === "user" ? "Student" : "AI"}: ${m.content.slice(0, 400)}`)
    .join("\n");

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text:
            `Extract student profile from this conversation. Return ONLY valid JSON, nothing else.

Conversation:
${snippet}

Return this JSON (use null if info not mentioned):
{"fullName": string|null, "targetExam": string|null, "targetYear": string|null, "studyGoal": string|null}` }] }],
          generationConfig: { maxOutputTokens: 150, temperature: 0 },
        }),
        signal: AbortSignal.timeout(8000),
      }
    );
    if (!res.ok) return;
    const data = await res.json();
    const text: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return;

    const extracted = JSON.parse(jsonMatch[0]) as {
      fullName?: string | null; targetExam?: string | null;
      targetYear?: string | null; studyGoal?: string | null;
    };

    const updateData: Record<string, string> = {};
    if (extracted.fullName?.trim())   updateData.fullName   = extracted.fullName.trim();
    if (extracted.targetExam?.trim()) updateData.targetExam = extracted.targetExam.trim();
    if (extracted.targetYear?.trim()) updateData.targetYear = extracted.targetYear.trim();
    if (extracted.studyGoal?.trim())  updateData.studyGoal  = extracted.studyGoal.trim();
    if (Object.keys(updateData).length === 0) return;

    await prisma.profile.upsert({
      where: { userId },
      create: { userId, ...updateData },
      update: updateData,
    });
    // Bust the profile cache so next message uses fresh data
    try { await redis.del(`ai:profile:${userId}`); } catch {}
  } catch {
    // fire-and-forget — never throw
  }
}

// ─── DB Helpers ───────────────────────────────────────────────────────────────
async function getCoins(userId: string) {
  const p = await prisma.profile.findUnique({ where: { userId }, select: { coinBalance: true } });
  return p?.coinBalance ?? 0;
}

async function getProfile(userId: string) {
  const key = `ai:profile:${userId}`;
  try { const c = await redis.get<object>(key); if (c) return c as Awaited<ReturnType<typeof _fetchProfile>>; } catch {}
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
    name: p?.fullName ?? null, targetExam: p?.targetExam ?? null,
    targetYear: p?.targetYear ?? null, studyGoal: p?.studyGoal ?? null,
    totalStudyHours: p?.totalStudyHours ?? 0, currentStreak: p?.currentStreak ?? 0,
  };
}

async function logUsage(userId: string, coins: number, model: ModelId) {
  await prisma.$transaction([
    prisma.studyCoinLog.create({
      data: { userId, coins: -coins, reason: `AI_MSG_${model.toUpperCase().replace(/-/g, "_")}_${Date.now()}` },
    }),
    prisma.profile.update({ where: { userId }, data: { coinBalance: { decrement: coins } } }),
  ]);
}

// ─── AI Router (Gemini picks best model from available list) ──────────────────
async function routeToModel(lastMessage: string, available: ModelId[], geminiKey: string | null): Promise<ModelId> {
  if (!geminiKey || available.length === 0) return available[0] ?? "gemini-2.5-flash";
  if (available.length === 1) return available[0];

  // Group available models by task suitability
  const budget  = available.filter(m => COINS_PER_1000T[m] <= 2);
  const smart   = available.filter(m => COINS_PER_1000T[m] >= 3 && COINS_PER_1000T[m] <= 7);
  const premium = available.filter(m => COINS_PER_1000T[m] >= 8);

  const fallback = budget[0] ?? smart[0] ?? available[0];

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text:
            `Classify this student message into ONE tier. Reply with ONLY one word: budget | smart | premium

budget  → quick MCQ, motivation, general chat, simple doubt, study plan
smart   → math derivation, physics/chemistry, step-by-step reasoning, code
premium → complex multi-step proof, research paper, very long analysis

Message: "${lastMessage.slice(0, 400)}"

Reply:` }] }],
          generationConfig: { maxOutputTokens: 5, temperature: 0 },
        }),
        signal: AbortSignal.timeout(3000),
      }
    );
    if (!res.ok) return fallback;
    const data = await res.json();
    const tier = (data.candidates?.[0]?.content?.parts?.[0]?.text ?? "").trim().toLowerCase();

    if (tier === "premium" && premium.length > 0) return premium[0];
    if (tier === "smart"   && smart.length > 0)   return smart[0];
    return budget[0] ?? fallback;
  } catch {
    return fallback;
  }
}

// ─── Provider Callers ─────────────────────────────────────────────────────────
type Msg = { role: "user" | "assistant"; content: string };

async function callGoogle(
  apiKey: string, model: ModelId, messages: Msg[], system: string,
  imageBase64?: string, mediaType?: string,
): Promise<{ reply: string; totalTokens: number }> {;
  const geminiContents = messages.map((m, i) => {
    const role = m.role === "assistant" ? "model" : "user";
    if (imageBase64 && i === messages.length - 1 && m.role === "user") {
      return { role, parts: [
        { inline_data: { mime_type: mediaType ?? "image/jpeg", data: imageBase64 } },
        { text: m.content || "Yeh question solve karo aur shortcut bhi batao" },
      ]};
    }
    return { role, parts: [{ text: m.content }] };
  });

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 30_000);
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${API_MODEL[model]}:generateContent?key=${apiKey}`,
    {
      method: "POST", signal: ctrl.signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: geminiContents,
        generationConfig: { maxOutputTokens: 1024, temperature: 0.7 },
      }),
    }
  ).finally(() => clearTimeout(timer));

  if (!res.ok) {
    const body = await res.text();
    console.error(`Google ${model} error:`, res.status, body);
    let apiMsg = body.slice(0, 300);
    try { apiMsg = (JSON.parse(body) as { error?: { message?: string } }).error?.message ?? apiMsg; } catch {}
    if (res.status === 429) throw new Error("AI quota limit ho gayi. Thodi der baad try karo.");
    if (res.status === 403) throw new Error(`Gemini API key invalid ya expired hai. Admin panel mein key check karo.`);
    if (res.status === 404) throw new Error(`Gemini model '${API_MODEL[model]}' available nahi hai. Admin se contact karo.`);
    throw new Error(`Gemini error (${res.status}): ${apiMsg}`);
  }
  const data = await res.json();
  const reply = data.candidates?.[0]?.content?.parts?.filter((p: {text?:string}) => p.text)
    ?.map((p: {text:string}) => p.text)?.join("") ?? "Kuch error aa gaya, dobara try karo.";
  return { reply, totalTokens: data.usageMetadata?.totalTokenCount ?? 500 };
}

async function callAnthropic(
  apiKey: string, model: ModelId, messages: Msg[], system: string,
): Promise<{ reply: string; totalTokens: number }> {;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 30_000);
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST", signal: ctrl.signal,
    headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: API_MODEL[model], max_tokens: 1024, system,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
    }),
  }).finally(() => clearTimeout(timer));

  if (!res.ok) {
    const body = await res.text(); console.error(`Anthropic ${model} error:`, res.status, body);
    if (res.status === 429) throw new Error("AI quota limit ho gayi. Thodi der baad try karo.");
    throw new Error("AI service unavailable. Thodi der baad try karo.");
  }
  const data = await res.json();
  const reply = data.content?.[0]?.text ?? "Kuch error aa gaya, dobara try karo.";
  const totalTokens = (data.usage?.input_tokens ?? 0) + (data.usage?.output_tokens ?? 0);
  return { reply, totalTokens };
}

async function callOpenAI(
  apiKey: string, model: ModelId, messages: Msg[], system: string,
): Promise<{ reply: string; totalTokens: number }> {;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 30_000);

  // o1/o1-mini use developer role; others use system role
  const isO1 = model === "gpt-o1" || model === "gpt-o1-mini";
  const systemMsg = isO1
    ? { role: "developer", content: system }
    : { role: "system",    content: system };

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST", signal: ctrl.signal,
    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: API_MODEL[model],
      max_completion_tokens: 1024,
      messages: [systemMsg, ...messages.map(m => ({ role: m.role, content: m.content }))],
    }),
  }).finally(() => clearTimeout(timer));

  if (!res.ok) {
    const body = await res.text(); console.error(`OpenAI ${model} error:`, res.status, body);
    if (res.status === 429) throw new Error("AI quota limit ho gayi. Thodi der baad try karo.");
    throw new Error("AI service unavailable. Thodi der baad try karo.");
  }
  const data = await res.json();
  const reply = data.choices?.[0]?.message?.content ?? "Kuch error aa gaya, dobara try karo.";
  const totalTokens = data.usage?.total_tokens ?? 500;
  return { reply, totalTokens };
}

// Dispatch to correct provider
async function callModel(
  keys: { gemini: string | null; anthropic: string | null; openai: string | null },
  model: ModelId, messages: Msg[], system: string,
  imageBase64?: string, mediaType?: string,
): Promise<{ reply: string; totalTokens: number }> {
  const provider = MODEL_PROVIDER[model];
  if (provider === "google")    return callGoogle(keys.gemini!, model, messages, system, imageBase64, mediaType);
  if (provider === "anthropic") return callAnthropic(keys.anthropic!, model, messages, system);
  return callOpenAI(keys.openai!, model, messages, system);
}

// ─── Schema ───────────────────────────────────────────────────────────────────
const bodySchema = z.object({
  messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(5000) })).min(1).max(20),
  imageBase64: z.string().optional(),
  mediaType:   z.enum(["image/jpeg", "image/png", "image/webp", "image/gif"]).optional(),
  acceptLowerQuality: z.boolean().optional().default(false),
});

// ─── POST ─────────────────────────────────────────────────────────────────────
export async function POST(request: Request) {
  try {
    const auth = await requireModule("studymate");
    if (auth.error) return auth.error;
    const userId = auth.user.id;

    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    const { messages, imageBase64, mediaType, acceptLowerQuality } = parsed.data;

    // Rate limit: 5 per minute
    const { rateLimit } = await import("@/lib/rate-limit");
    const rl = rateLimit(`ai_burst:${userId}`, 5, 60);
    if (!rl.success) return NextResponse.json({ error: "Thoda ruko — ek minute mein 5 se zyada messages nahi." }, { status: 429 });

    const coins = await getCoins(userId);

    // Get available models & route
    const keys = await getAiKeys();
    const available = getAvailableModels(keys);
    if (available.length === 0) return NextResponse.json({ error: "AI not configured" }, { status: 503 });

    const lastUserMsg = messages.findLast(m => m.role === "user")?.content ?? "";
    let modelId = await routeToModel(lastUserMsg, available, keys.gemini);

    // Pre-check: enough coins for chosen model?
    let estimated = estimateCoins(messages, modelId);
    if (coins < estimated) {
      const byRate = [...available].sort((a, b) => COINS_PER_1000T[a] - COINS_PER_1000T[b]);
      const affordable = byRate.find(m => coins >= estimateCoins(messages, m));

      if (!affordable) {
        // Can't afford even the cheapest model
        return NextResponse.json({
          error: "coins_required",
          message: "Coins khatam! Wallet top-up karo 🪙",
          coinsNeeded: estimateCoins(messages, byRate[0]),
          currentCoins: coins,
        }, { status: 402 });
      }

      if (!acceptLowerQuality) {
        // Preferred model is too expensive — warn user, let them choose
        return NextResponse.json({
          error: "quality_warning",
          preferredModel: modelId,
          preferredModelCoins: estimated,
          fallbackModel: affordable,
          fallbackModelCoins: estimateCoins(messages, affordable),
          currentCoins: coins,
        }, { status: 402 });
      }

      // User accepted lower quality — step down
      modelId = affordable;
      estimated = estimateCoins(messages, modelId);
    }

    const profile = await getProfile(userId);
    const onboarding = isProfileIncomplete(profile);
    const system = buildSystemPrompt(profile, onboarding);

    // Call model with fallback to cheapest available
    let reply: string;
    let totalTokens: number;
    let usedModel = modelId;

    try {
      ({ reply, totalTokens } = await callModel(keys, modelId, messages, system, imageBase64, mediaType));
    } catch (err) {
      // Fallback: try cheapest available model
      const fallback = available.find(m => COINS_PER_1000T[m] === 1) ?? available[0];
      if (fallback !== modelId) {
        try {
          ({ reply, totalTokens } = await callModel(keys, fallback, messages, system, imageBase64, mediaType));
          usedModel = fallback;
        } catch { throw err; }
      } else { throw err; }
    }

    // Exact coin charge after actual token usage
    // estimateCoins uses worst-case 1024 output buffer, so actual should always be <= estimate.
    // But if somehow actual > user balance (edge case: image tokens not estimated), cap to balance.
    const coinsToCharge = Math.min(calcCoins(totalTokens, usedModel), coins);

    await logUsage(userId, coinsToCharge, usedModel);

    // If profile was incomplete and student has replied to onboarding, extract and save silently
    if (onboarding && messages.length >= 3 && keys.gemini) {
      extractAndSaveProfile(userId, messages, keys.gemini).catch(() => {});
    }

    return NextResponse.json({
      reply,
      modelUsed: usedModel,
      coinsUsed: coinsToCharge,
      tokensUsed: totalTokens,
      profileComplete: !onboarding,
    });
  } catch (e) {
    if ((e as Error).name === "AbortError") {
      return NextResponse.json({ error: "AI response timed out. Dobara try karo." }, { status: 504 });
    }
    const msg = (e as Error).message ?? "";
    // Forward all AI provider errors as 502 so the frontend shows the actual reason
    if (msg.includes("Gemini") || msg.includes("quota") || msg.includes("invalid") || msg.includes("key") || msg.includes("available") || msg.includes("error")) {
      return NextResponse.json({ error: msg }, { status: 502 });
    }
    console.error("StudyMate POST error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ─── GET — initial stats ──────────────────────────────────────────────────────
export async function GET() {
  try {
    const auth = await requireModule("studymate");
    if (auth.error) return auth.error;
    const userId = auth.user.id;

    // Single DB query for profile + coins, parallel with AI key lookup
    const [profileRow, keys] = await Promise.all([
      prisma.profile.findUnique({
        where: { userId },
        select: { coinBalance: true, fullName: true, targetExam: true, targetYear: true, studyGoal: true, totalStudyHours: true, currentStreak: true },
      }),
      getAiKeys(),
    ]);
    const coins = profileRow?.coinBalance ?? 0;
    const profile = {
      name: profileRow?.fullName ?? null,
      targetExam: profileRow?.targetExam ?? null,
      targetYear: profileRow?.targetYear ?? null,
      studyGoal: profileRow?.studyGoal ?? null,
      totalStudyHours: profileRow?.totalStudyHours ?? 0,
      currentStreak: profileRow?.currentStreak ?? 0,
    };

    const available = getAvailableModels(keys);

    const configuredProviders = {
      gemini:    !!keys.gemini,
      anthropic: !!keys.anthropic,
      openai:    !!keys.openai,
    };

    return NextResponse.json({
      totalCoins: coins,
      studentName: profile.name,
      targetExam: profile.targetExam,
      currentStreak: profile.currentStreak,
      profileComplete: !isProfileIncomplete(profile),
      availableModels: available,
      pricing: Object.fromEntries(available.map(m => [m, COINS_PER_1000T[m]])),
      configuredProviders,
    });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
