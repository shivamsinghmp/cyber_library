import { NextResponse } from "next/server";
import { requireModule } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";
import { z } from "zod";
import { batchGetAppSettings } from "@/lib/app-settings";

// Tell Vercel/Next.js this function can run up to 60 seconds.
// Without this, Vercel kills the function at the default 10s limit.
export const maxDuration = 60;

// ─── Config ───────────────────────────────────────────────────────────────────
const CACHE_TTL_PROFILE = 300;

// Strip markdown formatting from AI reply — Gemini ignores "no markdown" instructions
// intermittently, so we enforce it server-side as a guarantee.
function stripMarkdown(text: string): string {
  return text
    // Bold+italic: ***text***
    .replace(/\*\*\*([^*]+)\*\*\*/g, '$1')
    // Bold: **text** or __text__
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    // Italic: *text* or _text_ (not inside words)
    .replace(/(?<!\w)\*([^*\n]+)\*(?!\w)/g, '$1')
    .replace(/(?<!\w)_([^_\n]+)_(?!\w)/g, '$1')
    // ATX headers: ## Heading → Heading
    .replace(/^#{1,6}\s+(.+)$/gm, '$1')
    // Horizontal rules
    .replace(/^[-*_]{3,}\s*$/gm, '')
    // Blockquotes
    .replace(/^>\s*/gm, '')
    // Inline code: `code` → code
    .replace(/`([^`]+)`/g, '$1')
    // Fenced code blocks: keep content, remove fences
    .replace(/```[^\n]*\n([\s\S]*?)```/g, '$1')
    // Collapse 3+ blank lines to 2
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

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

// Real API model identifiers (AI Studio uses unversioned aliases)
const API_MODEL: Record<ModelId, string> = {
  "gemini-2.5-flash": "gemini-2.5-flash",
  "gemini-2.0-flash": "gemini-2.5-flash",
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

// ─── Pricing: 1 coin = ₹0.50 | formula: ceil(tokens/1000) × rate ─────────────
// 1000 tokens = 1 unit | 2000 tokens = 2 units | 10000 tokens = 10 units
// All rates guarantee 650%+ profit over actual API cost
const COINS_PER_1000T: Record<ModelId, number> = {
  "gemini-2.5-flash": 1,   // API ₹0.014/1000t → charge ₹0.50  → 3471% profit
  "gemini-2.0-flash": 1,   // API ₹0.019/1000t → charge ₹0.50  → 2531% profit
  "gemini-1.5-pro":   4,   // API ₹0.23/1000t  → charge ₹2.00  →  769% profit
  "gemini-2.5-pro":   6,   // API ₹0.40/1000t  → charge ₹3.00  →  650% profit
  "claude-haiku":     3,   // API ₹0.18/1000t  → charge ₹1.50  →  733% profit
  "claude-sonnet":   10,   // API ₹0.66/1000t  → charge ₹5.00  →  658% profit
  "claude-opus":     50,   // API ₹3.28/1000t  → charge ₹25.00 →  662% profit
  "gpt-4o-mini":      1,   // API ₹0.028/1000t → charge ₹0.50  → 1686% profit
  "gpt-4.1-mini":     2,   // API ₹0.074/1000t → charge ₹1.00  → 1251% profit
  "gpt-4.1":          6,   // API ₹0.37/1000t  → charge ₹3.00  →  711% profit
  "gpt-4o":           7,   // API ₹0.46/1000t  → charge ₹3.50  →  661% profit
  "gpt-o1-mini":      9,   // API ₹0.55/1000t  → charge ₹4.50  →  718% profit
  "gpt-o1":          42,   // API ₹2.77/1000t  → charge ₹21.00 →  658% profit
};

// Example: 10,000 tokens on claude-opus = ceil(10000/1000) × 50 = 500 coins = ₹50
function calcCoins(totalTokens: number, model: ModelId): number {
  return Math.ceil(totalTokens / 1000) * COINS_PER_1000T[model];
}

// Estimate before API call — input (from message chars) + 2048 expected output.
// Used only for the pre-check "can the user afford this?".
// Actual deduction uses the real API-reported (input + output) token count.
function estimateCoins(messages: Array<{ content: string }>, model: ModelId): number {
  const chars = messages.reduce((s, m) => s + m.content.length, 0);
  const estInputTokens  = Math.ceil(chars / 4) + 500; // +500 for system-prompt overhead
  const estOutputTokens = 2048;                        // reasonable expected reply length
  return Math.ceil((estInputTokens + estOutputTokens) / 1000) * COINS_PER_1000T[model];
}

// Fetch AI keys from DB only — env is intentionally ignored (DB is source of truth)
async function getAiKeys() {
  const settings = await batchGetAppSettings([
    "GEMINI_API_KEY", "VERTEX_PROJECT_ID", "VERTEX_LOCATION", "VERTEX_API_KEY",
    "ANTHROPIC_API_KEY", "OPENAI_API_KEY",
  ]);
  // Prefer Gemini AI Studio key; fall back to Vertex API key if configured
  const geminiKey = settings["GEMINI_API_KEY"] || null;
  const vertexKey = settings["VERTEX_API_KEY"] || null;
  return {
    google:    geminiKey ?? vertexKey,
    anthropic: settings["ANTHROPIC_API_KEY"] || null,
    openai:    settings["OPENAI_API_KEY"]    || null,
  };
}

// Which models are available based on configured API keys
function getAvailableModels(keys: { google: string | null; anthropic: string | null; openai: string | null }): ModelId[] {
  const list: ModelId[] = [];
  if (keys.google)    list.push("gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-pro", "gemini-2.5-pro");
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
): string {
  const ctx = [
    profile.name && `Student naam: ${profile.name}`,
    profile.targetExam && `Target exam: ${profile.targetExam}`,
    profile.targetYear && `Target year: ${profile.targetYear}`,
    profile.studyGoal && `Study goal: ${profile.studyGoal}`,
    profile.totalStudyHours && `Total study hours: ${profile.totalStudyHours} hours`,
    profile.currentStreak && `Current streak: ${profile.currentStreak} days 🔥`,
  ].filter(Boolean).join("\n");

  return `You are StudyMate AI — Let's Study's personal AI study buddy. You are a caring elder sibling who genuinely wants the student to succeed.

STUDENT INFO (personalize every response using this):
${ctx || "(profile not yet collected — pick up details naturally from the conversation)"}

PROFILE COLLECTION — SILENT RULE:
Never explicitly ask the student for their name, exam, or year. Profile details are extracted automatically from the conversation.
If the student has mentioned their name, exam, or year themselves, use that — otherwise help them directly without asking.

LANGUAGE — MANDATORY:
ALWAYS respond in plain English. Never mix in Hindi or Hinglish.

FORMATTING — STRICTLY FORBIDDEN:
NEVER use: ** bold ** | ## headers | * bullets | _italic_ | --- dividers | markdown of any kind.
Write plain conversational text only. No structured formatting whatsoever.
WRONG: "**Statement 1 Analysis:**"
RIGHT: "Let's talk about Statement 1 —"

PERSONALITY:
- Casual, warm, like a best friend / elder sibling
- Use the student's name when known
- Never be robotic
- Emojis occasionally (1-2 max per reply)

MOOD DETECTION:
If the student writes something like "I want to quit" / "it's not working" / "I'm exhausted" / "frustrated" / "stressed":
First acknowledge the feeling, then give one small actionable step.

IMAGE QUESTIONS (when a photo is provided):
Solve the question directly — in plain text, using numbered steps (1. 2. 3.).
Share a shortcut or elimination trick if it's an MCQ.
End with one clear line: "Answer: (option)".

80/20 RULE:
In study plans — share Top 20% topics → 80% marks.

RESPONSE FORMAT:
- Plain text only, no markdown ever
- Problem solving: numbered steps (1. 2. 3.) are OK, but no ** or ##
- General advice: 4-8 sentences max
- End every response with 1 actionable step`;
}

// ─── Profile Extraction (fire-and-forget after student's first reply) ─────────
async function extractAndSaveProfile(userId: string, conversation: Msg[], apiKey: string): Promise<void> {

  const snippet = conversation.slice(-6)
    .map(m => `${m.role === "user" ? "Student" : "AI"}: ${m.content.slice(0, 400)}`)
    .join("\n");

  try {
    const { geminiUrl, vertexAuthHeaders } = await import("@/lib/vertex-auth");
    const res = await fetch(
      geminiUrl("gemini-2.5-flash"),
      {
        method: "POST",
        headers: vertexAuthHeaders(apiKey),
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
async function routeToModel(lastMessage: string, available: ModelId[], googleKey: string | null): Promise<ModelId> {
  if (!googleKey || available.length === 0) return available[0] ?? "gemini-2.5-flash";
  if (available.length === 1) {
    console.log(`[AI Router] single model available → ${available[0]}`);
    return available[0];
  }

  // Best available Gemini model (pro > flash) — used for STEM/logical questions
  const stemModel: ModelId =
    available.includes("gemini-2.5-pro")   ? "gemini-2.5-pro"   :
    available.includes("gemini-1.5-pro")   ? "gemini-1.5-pro"   :
    available.includes("gemini-2.5-flash") ? "gemini-2.5-flash" :
    available.find(m => MODEL_PROVIDER[m] === "google") ?? available[0];

  // Group available models by task suitability (cheapest-first within each tier)
  const budget  = available.filter(m => COINS_PER_1000T[m] <= 2)
    .sort((a, b) => COINS_PER_1000T[a] - COINS_PER_1000T[b]);
  const smart   = available.filter(m => COINS_PER_1000T[m] >= 3 && COINS_PER_1000T[m] <= 9)
    .sort((a, b) => COINS_PER_1000T[a] - COINS_PER_1000T[b]);
  const premium = available.filter(m => COINS_PER_1000T[m] >= 10)
    .sort((a, b) => COINS_PER_1000T[a] - COINS_PER_1000T[b]);

  // Best model for each tier (lowest cost that still fits)
  const budgetModel  = budget[0]  ?? smart[0]   ?? available[0];
  const smartModel   = smart[0]   ?? budget[0]  ?? available[0];
  const premiumModel = premium[0] ?? smart[0]   ?? budget[0] ?? available[0];

  const fallback = budgetModel;

  try {
    const { geminiUrl, vertexAuthHeaders } = await import("@/lib/vertex-auth");
    const routerStart = Date.now();
    const res = await fetch(
      geminiUrl("gemini-2.5-flash"),
      {
        method: "POST",
        headers: vertexAuthHeaders(googleKey),
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text:
            `Classify this student message into ONE tier. Reply with ONLY one word.

TIERS:
stem    → ANY Physics, Mathematics, Chemistry, Biology, logical reasoning, numerical problem, equation, derivation, proof, diagram-based question
budget  → motivation, study plan, MCQ tips, general chat, exam strategy
smart   → coding, history/geography concepts, language/grammar, non-STEM subjects
premium → complex multi-step cross-subject research, very long essay analysis

Message: "${lastMessage.slice(0, 400)}"

Reply (stem OR budget OR smart OR premium):` }] }],
          generationConfig: { maxOutputTokens: 8, temperature: 0 },
        }),
        signal: AbortSignal.timeout(3000),
      }
    );

    if (!res.ok) {
      console.warn(`[AI Router] classifier returned ${res.status} — fallback to ${fallback}`);
      return fallback;
    }

    const data = await res.json();
    const raw  = (data.candidates?.[0]?.content?.parts?.[0]?.text ?? "").trim().toLowerCase();

    // Robust parsing: use startsWith to handle "stem.", "budget\n", etc.
    const tier = raw.startsWith("stem")    ? "stem"
               : raw.startsWith("premium") ? "premium"
               : raw.startsWith("smart")   ? "smart"
               : "budget";

    const chosen = tier === "stem"    ? stemModel
                 : tier === "premium" ? premiumModel
                 : tier === "smart"   ? smartModel
                 : budgetModel;

    console.log(
      `[AI Router] "${lastMessage.slice(0, 60)}" → tier=${tier} model=${chosen} ` +
      `(${Date.now() - routerStart}ms) raw="${raw}"`
    );
    return chosen;

  } catch (e) {
    console.warn(`[AI Router] classifier failed — fallback to ${fallback}:`, (e as Error).message);
    return fallback;
  }
}

// ─── Provider Callers ─────────────────────────────────────────────────────────
type Msg = { role: "user" | "assistant"; content: string };

// ─── Streaming Types & Helpers ────────────────────────────────────────────────
// ← ADDED: streaming support
type StreamChunk =
  | { type: "delta"; text: string }
  | { type: "done";  inputTokens: number; outputTokens: number };

function buildGeminiContents(messages: Msg[], imageBase64?: string, mediaType?: string) {
  return messages.map((m, i) => {
    const role = m.role === "assistant" ? "model" : "user";
    if (imageBase64 && i === messages.length - 1 && m.role === "user") {
      return { role, parts: [
        { inlineData: { mimeType: mediaType ?? "image/jpeg", data: imageBase64 } },
        { text: m.content || "Please solve this question and share any shortcuts" },
      ]};
    }
    return { role, parts: [{ text: m.content }] };
  });
}

// ← ADDED: Gemini SSE streaming via streamGenerateContent
async function* streamGoogle(
  apiKey: string, model: ModelId, messages: Msg[], system: string,
  imageBase64?: string, mediaType?: string,
): AsyncGenerator<StreamChunk> {
  const { vertexAuthHeaders } = await import("@/lib/vertex-auth");
  const streamUrl = `https://generativelanguage.googleapis.com/v1beta/models/${API_MODEL[model]}:streamGenerateContent?alt=sse`;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 55_000);
  const res = await fetch(streamUrl, {
    method: "POST", signal: ctrl.signal,
    headers: vertexAuthHeaders(apiKey),
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: buildGeminiContents(messages, imageBase64, mediaType),
      generationConfig: { maxOutputTokens: 8192, temperature: 0.7 },
    }),
  }).finally(() => clearTimeout(timer));

  if (!res.ok) {
    const body = await res.text();
    let apiMsg = body.slice(0, 300);
    try { apiMsg = (JSON.parse(body) as { error?: { message?: string } }).error?.message ?? apiMsg; } catch {}
    if (res.status === 429) throw new Error("AI quota limit reached. Please try again later.");
    if (res.status === 401 || res.status === 403) throw new Error("Gemini API auth failed. Please check the API key.");
    if (res.status === 404) throw new Error(`Gemini model '${API_MODEL[model]}' not found. Please contact admin.`);
    throw new Error(`Gemini API error (${res.status}): ${apiMsg}`);
  }

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "", inputTokens = 0, outputTokens = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const jsonStr = line.slice(6).trim();
        if (!jsonStr) continue;
        try {
          const chunk = JSON.parse(jsonStr);
          const text = chunk.candidates?.[0]?.content?.parts
            ?.filter((p: { text?: string }) => p.text)
            ?.map((p: { text: string }) => p.text)?.join("") ?? "";
          if (text) yield { type: "delta", text };
          if (chunk.usageMetadata) {
            inputTokens  = chunk.usageMetadata.promptTokenCount    ?? inputTokens;
            outputTokens = chunk.usageMetadata.candidatesTokenCount ?? outputTokens;
          }
        } catch { /* skip malformed chunk */ }
      }
    }
  } finally { reader.releaseLock(); }
  yield { type: "done", inputTokens, outputTokens };
}

// ← ADDED: Anthropic SSE streaming
async function* streamAnthropic(
  apiKey: string, model: ModelId, messages: Msg[], system: string,
): AsyncGenerator<StreamChunk> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 55_000);
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST", signal: ctrl.signal,
    headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: API_MODEL[model], max_tokens: 8192, system, stream: true,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
    }),
  }).finally(() => clearTimeout(timer));

  if (!res.ok) {
    const body = await res.text();
    console.error(`Anthropic ${model} error:`, res.status, body);
    if (res.status === 429) throw new Error("AI quota limit reached. Please try again later.");
    throw new Error("AI service unavailable. Please try again later.");
  }

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "", eventType = "", inputTokens = 0, outputTokens = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (line.startsWith("event: ")) { eventType = line.slice(7).trim(); continue; }
        if (!line.startsWith("data: ")) continue;
        const jsonStr = line.slice(6).trim();
        if (!jsonStr) continue;
        try {
          const chunk = JSON.parse(jsonStr);
          if (eventType === "content_block_delta" && chunk.delta?.type === "text_delta")
            yield { type: "delta", text: chunk.delta.text };
          if (eventType === "message_start" && chunk.message?.usage)
            inputTokens = chunk.message.usage.input_tokens ?? inputTokens;
          if (eventType === "message_delta" && chunk.usage)
            outputTokens = chunk.usage.output_tokens ?? outputTokens;
        } catch { /* skip */ }
      }
    }
  } finally { reader.releaseLock(); }
  yield { type: "done", inputTokens, outputTokens };
}

// ← ADDED: OpenAI SSE streaming
async function* streamOpenAI(
  apiKey: string, model: ModelId, messages: Msg[], system: string,
): AsyncGenerator<StreamChunk> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 55_000);
  const isO1 = model === "gpt-o1" || model === "gpt-o1-mini";
  const systemMsg = isO1
    ? { role: "developer", content: system }
    : { role: "system",    content: system };

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST", signal: ctrl.signal,
    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: API_MODEL[model], max_completion_tokens: 8192,
      stream: true, stream_options: { include_usage: true },
      messages: [systemMsg, ...messages.map(m => ({ role: m.role, content: m.content }))],
    }),
  }).finally(() => clearTimeout(timer));

  if (!res.ok) {
    const body = await res.text();
    console.error(`OpenAI ${model} error:`, res.status, body);
    if (res.status === 429) throw new Error("AI quota limit reached. Please try again later.");
    throw new Error("AI service unavailable. Please try again later.");
  }

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "", inputTokens = 0, outputTokens = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const jsonStr = line.slice(6).trim();
        if (jsonStr === "[DONE]" || !jsonStr) continue;
        try {
          const chunk = JSON.parse(jsonStr);
          const text = chunk.choices?.[0]?.delta?.content;
          if (text) yield { type: "delta", text };
          if (chunk.usage) {
            inputTokens  = chunk.usage.prompt_tokens     ?? inputTokens;
            outputTokens = chunk.usage.completion_tokens ?? outputTokens;
          }
        } catch { /* skip */ }
      }
    }
  } finally { reader.releaseLock(); }
  yield { type: "done", inputTokens, outputTokens };
}

// ← ADDED: Dispatch to correct provider's streaming generator
async function* streamModel(
  keys: { google: string | null; anthropic: string | null; openai: string | null },
  model: ModelId, messages: Msg[], system: string,
  imageBase64?: string, mediaType?: string,
): AsyncGenerator<StreamChunk> {
  const provider = MODEL_PROVIDER[model];
  if (provider === "google")    yield* streamGoogle(keys.google!, model, messages, system, imageBase64, mediaType);
  else if (provider === "anthropic") yield* streamAnthropic(keys.anthropic!, model, messages, system);
  else yield* streamOpenAI(keys.openai!, model, messages, system);
}

// ─── Schema ───────────────────────────────────────────────────────────────────
const bodySchema = z.object({
  messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(5000) })).min(1).max(20),
  // ~1.5 MB image max after client-side compression (base64 is ~33% larger than binary).
  imageBase64: z.string().max(2_000_000).optional(),
  mediaType:   z.enum(["image/jpeg", "image/png", "image/webp", "image/gif"]).optional(),
  acceptLowerQuality: z.boolean().optional().default(false),
});

// ─── POST ─────────────────────────────────────────────────────────────────────
export async function POST(request: Request) {
  const aiStartTime = Date.now();
  try {
    let userId: string;

    // Meet add-on: authenticate via bearer token (custom HMAC JWT)
    const bearerToken = request.headers.get("authorization")?.startsWith("Bearer ")
      ? request.headers.get("authorization")!.slice(7) : null;

    if (bearerToken) {
      const { verifyMeetAddonToken } = await import("@/lib/meet-addon-token");
      const payload = verifyMeetAddonToken(bearerToken);
      if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      userId = payload.userId;
    } else {
      // Dashboard: session auth + module access check
      const auth = await requireModule("studymate");
      if (auth.error) return auth.error;
      userId = auth.user.id;
    }

    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    const { messages, imageBase64, mediaType, acceptLowerQuality } = parsed.data;


    const coins = await getCoins(userId);

    // Get available models & route
    const keys = await getAiKeys();
    const available = getAvailableModels(keys);
    if (available.length === 0) return NextResponse.json({ error: "AI not configured" }, { status: 503 });

    const lastUserMsg = messages.findLast(m => m.role === "user")?.content ?? "";
    let modelId = await routeToModel(lastUserMsg, available, keys.google);

    // Image input: always use the best available Gemini model (vision + STEM reasoning).
    if (imageBase64) {
      const bestGoogle: ModelId | undefined =
        available.includes("gemini-2.5-pro")   ? "gemini-2.5-pro"   :
        available.includes("gemini-1.5-pro")   ? "gemini-1.5-pro"   :
        available.includes("gemini-2.5-flash") ? "gemini-2.5-flash" :
        available.find(m => MODEL_PROVIDER[m] === "google");
      if (bestGoogle) { modelId = bestGoogle; }
      else return NextResponse.json(
        { error: "Please configure the Gemini API key to enable image uploads." },
        { status: 503 }
      );
    }

    // Pre-check: enough coins for chosen model?
    let estimated = estimateCoins(messages, modelId);
    if (coins < estimated) {
      const byRate = [...available].sort((a, b) => COINS_PER_1000T[a] - COINS_PER_1000T[b]);
      const affordable = byRate.find(m => coins >= estimateCoins(messages, m));

      if (!affordable) {
        // Can't afford even the cheapest model
        return NextResponse.json({
          error: "coins_required",
          message: "Out of coins! Please top up your wallet 🪙",
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
    const system = buildSystemPrompt(profile);
    let usedModel = modelId;

    // ← MODIFIED: return SSE stream instead of JSON
    const encoder = new TextEncoder();
    const send = (ctrl: ReadableStreamDefaultController<Uint8Array>, data: object) =>
      ctrl.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));

    const responseStream = new ReadableStream<Uint8Array>({
      async start(controller) {
        let inputTokens = 0, outputTokens = 0, accText = "";

        const runGen = async (gen: AsyncGenerator<StreamChunk>) => {
          for await (const ev of gen) {
            if (ev.type === "delta") {
              accText += ev.text;
              send(controller, { t: "c", d: ev.text });   // raw chunk — frontend accumulates
            } else if (ev.type === "done") {
              inputTokens  = ev.inputTokens;
              outputTokens = ev.outputTokens;
            }
          }
        };

        try {
          // Primary model attempt
          try {
            await runGen(streamModel(keys, modelId, messages, system, imageBase64, mediaType));
          } catch (primaryErr) {
            const eMsg = (primaryErr as Error).message ?? "";
            const isQuota = eMsg.includes("quota");
            const failedProvider = MODEL_PROVIDER[modelId];
            let fallback: ModelId | undefined;
            if (isQuota) {
              fallback = available.find(m => MODEL_PROVIDER[m] !== failedProvider && COINS_PER_1000T[m] <= 2)
                ?? available.find(m => MODEL_PROVIDER[m] !== failedProvider);
            }
            fallback = fallback ?? available.find(m => COINS_PER_1000T[m] === 1) ?? available[0];
            if (fallback && fallback !== modelId) {
              usedModel = fallback;
              await runGen(streamModel(keys, fallback, messages, system, imageBase64, mediaType));
            } else { throw primaryErr; }
          }

          // Coin deduction on actual input+output tokens
          const totalTokens   = (inputTokens + outputTokens) || 500;
          const coinsToCharge = Math.min(calcCoins(totalTokens, usedModel), coins);
          const latencyMs     = Date.now() - aiStartTime;
          await logUsage(userId, coinsToCharge, usedModel);

          // ← ADDED: done event — send stripped full text + metadata
          send(controller, {
            t:    "done",
            i:    inputTokens,
            o:    outputTokens,
            coins: coinsToCharge,
            model: usedModel,
            full:  stripMarkdown(accText),     // final clean text replaces accumulated raw
            profileComplete: !isProfileIncomplete(profile),
          });

          // Fire-and-forget
          const { logAIUsage } = await import("@/lib/ai-logger");
          void logAIUsage({ userId, feature: "studymate", provider: MODEL_PROVIDER[usedModel],
            model: usedModel, inputTokens, outputTokens, coinsCharged: coinsToCharge,
            latencyMs, status: "success" });
          if (keys.google && messages.length >= 2)
            extractAndSaveProfile(userId, messages, keys.google).catch(() => {});

        } catch (err) {
          const eMsg = (err as Error).message ?? "";
          const userMsg = eMsg.includes("quota") || eMsg.includes("limit")
            ? "AI service is temporarily busy. Please try again later."
            : eMsg.includes("auth") || eMsg.includes("key")
              ? "AI service configuration error. Contact support."
              : (err as Error).name === "AbortError"
                ? "AI response timed out. Please try again."
                : "AI service error. Please try again.";
          send(controller, { t: "err", msg: userMsg });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(responseStream, {
      headers: {
        "Content-Type":    "text/event-stream",
        "Cache-Control":   "no-cache",
        "Connection":      "keep-alive",
        "X-Accel-Buffering": "no",   // disable nginx buffering for true streaming
      },
    });
  } catch (e) {
    if ((e as Error).name === "AbortError") {
      return NextResponse.json({ error: "AI response timed out. Please try again." }, { status: 504 });
    }
    const msg = (e as Error).message ?? "";
    // Log full error server-side; return only safe user-facing messages to the client.
    // Raw provider errors can leak API key details, internal URLs, or billing info.
    if (msg.includes("quota") || msg.includes("limit")) {
      console.warn("StudyMate quota error:", msg);
      return NextResponse.json({ error: "AI service is temporarily busy. Please try again later.", retryable: true }, { status: 502 });
    }
    if (msg.includes("invalid") || msg.includes("key") || msg.includes("expired")) {
      console.error("StudyMate API key error:", msg);
      return NextResponse.json({ error: "AI service configuration error. Please contact support.", retryable: false }, { status: 502 });
    }
    if (msg.includes("available") || msg.includes("model")) {
      console.error("StudyMate model error:", msg);
      return NextResponse.json({ error: "Requested AI model is not available. Please contact admin.", retryable: false }, { status: 502 });
    }
    console.error("StudyMate POST error:", e);
    return NextResponse.json({ error: "AI service error. Please try again." }, { status: 500 });
  }
}

// ─── GET — initial stats ──────────────────────────────────────────────────────
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
      gemini:    !!keys.google,
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
