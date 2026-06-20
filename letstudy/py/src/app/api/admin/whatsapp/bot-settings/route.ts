import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSuperAdmin } from "@/lib/api-helpers";
import { batchGetAppSettings, setAppSetting } from "@/lib/app-settings";
import { logAdminAction } from "@/lib/audit-logger";

const PYTHON_URL    = process.env.PYTHON_SERVER_URL    ?? "http://localhost:8001";
const PYTHON_SECRET = process.env.PYTHON_SERVER_SECRET ?? "";

const SETTING_KEYS: Array<
  "WA_BOT_ENABLED" | "WA_BOT_SYSTEM_PROMPT" | "WA_BOT_DEFAULT_MODEL" | "WA_BOT_BUDGET_MODE" | "WA_BOT_RATE_LIMIT_PER_MIN"
> = ["WA_BOT_ENABLED", "WA_BOT_SYSTEM_PROMPT", "WA_BOT_DEFAULT_MODEL", "WA_BOT_BUDGET_MODE", "WA_BOT_RATE_LIMIT_PER_MIN"];

async function getModelOptions(): Promise<{ available: string[]; pricing: Record<string, number> }> {
  const providerKeys = await batchGetAppSettings(["GEMINI_API_KEY", "ANTHROPIC_API_KEY", "OPENAI_API_KEY"]);
  try {
    const res = await fetch(`${PYTHON_URL}/models`, {
      method: "POST",
      headers: { Authorization: `Bearer ${PYTHON_SECRET}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        keys: {
          google:    providerKeys["GEMINI_API_KEY"]    || null,
          anthropic: providerKeys["ANTHROPIC_API_KEY"]  || null,
          openai:    providerKeys["OPENAI_API_KEY"]     || null,
        },
      }),
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return { available: [], pricing: {} };
    return await res.json() as { available: string[]; pricing: Record<string, number> };
  } catch {
    return { available: [], pricing: {} };
  }
}

// ─── GET: current bot settings + which models are actually usable today ───────
export async function GET() {
  try {
    const auth = await requireSuperAdmin();
    if (auth.error) return auth.error;

    const [settings, models] = await Promise.all([
      batchGetAppSettings(SETTING_KEYS),
      getModelOptions(),
    ]);

    return NextResponse.json({
      enabled:        settings["WA_BOT_ENABLED"] !== "false", // default enabled
      systemPrompt:   settings["WA_BOT_SYSTEM_PROMPT"] ?? "",
      defaultModel:   settings["WA_BOT_DEFAULT_MODEL"] ?? "gemini-2.5-flash",
      budgetMode:     settings["WA_BOT_BUDGET_MODE"] ?? "strict",
      rateLimitPerMin: Number(settings["WA_BOT_RATE_LIMIT_PER_MIN"]) || 6,
      availableModels: models.available,
      pricing:         models.pricing,
    });
  } catch (e) {
    console.error("GET /api/admin/whatsapp/bot-settings:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

const putSchema = z.object({
  enabled:         z.boolean().optional(),
  systemPrompt:    z.string().max(4000).optional(),
  defaultModel:    z.string().min(1).max(64).optional(),
  budgetMode:      z.enum(["strict", "balanced", "quality"]).optional(),
  rateLimitPerMin: z.number().int().min(1).max(60).optional(),
});

// ─── PUT: update bot settings ──────────────────────────────────────────────────
export async function PUT(request: Request) {
  try {
    const auth = await requireSuperAdmin();
    if (auth.error) return auth.error;
    const { user } = auth;

    const body = await request.json();
    const parsed = putSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }
    const updates = parsed.data;

    const writes: Promise<void>[] = [];
    if (updates.enabled !== undefined) writes.push(setAppSetting("WA_BOT_ENABLED", String(updates.enabled)));
    if (updates.systemPrompt !== undefined) writes.push(setAppSetting("WA_BOT_SYSTEM_PROMPT", updates.systemPrompt));
    if (updates.defaultModel !== undefined) writes.push(setAppSetting("WA_BOT_DEFAULT_MODEL", updates.defaultModel));
    if (updates.budgetMode !== undefined) writes.push(setAppSetting("WA_BOT_BUDGET_MODE", updates.budgetMode));
    if (updates.rateLimitPerMin !== undefined) {
      writes.push(setAppSetting("WA_BOT_RATE_LIMIT_PER_MIN", String(updates.rateLimitPerMin)));
    }
    await Promise.all(writes);

    await logAdminAction(user.id, "UPDATE", "ENGAGEMENT", `wa_bot_settings: ${JSON.stringify(updates)}`);

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("PUT /api/admin/whatsapp/bot-settings:", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
